import { getDb } from "../connection";
import { orders, pageViews, products } from "@db/schema";
import { and, gte, lt, sql } from "drizzle-orm";
import {
  computeCoreTotals,
  computeCustomerSplit,
  computeDeliveryImpact,
  computeGovernorateStats,
  computeProductStats,
  isValidOrder,
  normalizePhone,
  percentChange,
  orderRevenueMillimes,
  type AnalyticsOrder,
  type CoreTotals,
  type OrderItem,
} from "./metrics";
import { dayKey, daysInPeriod, type Period, type PeriodPair } from "./period";
import { buildCustomerHistories, computeCustomerMetrics } from "./customers";
import { computeMargins, type CostsByProductId } from "./margin";
import { computeAcquisition } from "./acquisition";
import {
  attachGrowth,
  computeGovernorateDelivery,
  computeProductGovernorateMatrix,
  governorateKey,
  productKey,
} from "./breakdowns";

export * from "./metrics";
export * from "./period";
export * from "./customers";
export * from "./breakdowns";
export * from "./margin";
export * from "./acquisition";

function parseItems(json: string): OrderItem[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Colonnes strictement nécessaires à l'analytique.
 *
 * `findMany()` sans sélection ramenait aussi l'adresse, la note et la clé
 * d'idempotence de chaque commande — des données personnelles inutiles ici,
 * et un transfert bien plus lourd. */
const ANALYTICS_COLUMNS = {
  id: orders.id,
  phone: orders.phone,
  customerName: orders.customerName,
  governorate: orders.governorate,
  status: orders.status,
  paymentMethod: orders.paymentMethod,
  paymentStatus: orders.paymentStatus,
  subtotalMillimes: orders.subtotalMillimes,
  deliveryFeeMillimes: orders.deliveryFeeMillimes,
  items: orders.items,
  acquisitionSource: orders.acquisitionSource,
  acquisitionCampaign: orders.acquisitionCampaign,
  acquisitionContent: orders.acquisitionContent,
  deviceType: orders.deviceType,
  createdAt: orders.createdAt,
} as const;

async function fetchOrdersInPeriod(period: Period): Promise<AnalyticsOrder[]> {
  const rows = await getDb()
    .select(ANALYTICS_COLUMNS)
    .from(orders)
    .where(and(gte(orders.createdAt, period.start), lt(orders.createdAt, period.end)));
  return rows.map((r) => ({ ...r, items: parseItems(r.items) }));
}

/** Historique client complet, toutes périodes confondues.
 *
 * La fidélité ne se lit pas dans une fenêtre de 30 jours : savoir qu'un
 * client revient suppose de regarder avant elle. On ne ramène que les
 * colonnes nécessaires — ni adresse, ni note, ni articles. */
async function fetchCustomerOrderHistory(): Promise<AnalyticsOrder[]> {
  const rows = await getDb()
    .select({
      id: orders.id,
      phone: orders.phone,
      customerName: orders.customerName,
      governorate: orders.governorate,
      status: orders.status,
      paymentMethod: orders.paymentMethod,
      paymentStatus: orders.paymentStatus,
      subtotalMillimes: orders.subtotalMillimes,
      deliveryFeeMillimes: orders.deliveryFeeMillimes,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(sql`${orders.status} <> 'annulee' AND ${orders.paymentStatus} <> 'rejected'`);
  return rows.map((r) => ({ ...r, items: [] }));
}

/** Catalogue réduit à ce dont l'analytique a besoin : le coût de revient
 * (marges) et la photo (vignettes des produits les plus vendus).
 *
 * Les produits sans coût saisi sont volontairement ABSENTS de la Map des
 * coûts plutôt que présents à 0 : le calcul de marge doit pouvoir
 * distinguer « coûte 0 » de « on ne sait pas ». */
async function fetchProductCatalog(): Promise<{
  costs: CostsByProductId;
  images: Map<number, string>;
}> {
  const rows = await getDb()
    .select({ id: products.id, cost: products.costPerKgMillimes, imageUrl: products.imageUrl })
    .from(products);
  const costs: CostsByProductId = new Map();
  const images = new Map<number, string>();
  for (const r of rows) {
    if (r.cost !== null) costs.set(r.id, r.cost);
    if (r.imageUrl) images.set(r.id, r.imageUrl);
  }
  return { costs, images };
}

async function countPageViews(period: Period): Promise<number> {
  const [row] = await getDb()
    .select({ count: sql<number>`count(*)` })
    .from(pageViews)
    .where(and(gte(pageViews.createdAt, period.start), lt(pageViews.createdAt, period.end)));
  return Number(row?.count ?? 0);
}

export type MetricWithTrend = {
  value: number;
  previous: number;
  /** null = pas de base de comparaison (période précédente à zéro). */
  changePercent: number | null;
};

function withTrend(value: number, previous: number): MetricWithTrend {
  return { value, previous, changePercent: percentChange(value, previous) };
}

export type RevenuePoint = { day: string; revenueMillimes: number; orders: number };

/** Dernières commandes de la période — le fil d'activité du tableau de bord.
 *
 * Volontairement RÉDUIT : ni téléphone, ni adresse, ni note. Le carnet de
 * commandes affiche tout cela, avec ses actions ; ici on ne montre que de
 * quoi reconnaître une commande et cliquer pour l'ouvrir. */
export type RecentOrder = {
  id: number;
  customerName: string;
  /** Premier article, celui qui identifie la commande d'un coup d'œil. */
  firstItemName: string;
  /** Articles supplémentaires, pour écrire « +2 » sans les énumérer. */
  extraItems: number;
  /** Sous-total + livraison : c'est le montant que le client paie, et
   * celui que le carnet de commandes affiche sur la même ligne. */
  totalMillimes: number;
  status: string;
  createdAt: string;
};

function recentOrders(allOrders: AnalyticsOrder[], limit = 5): RecentOrder[] {
  return [...allOrders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
    .map((o) => ({
      id: o.id,
      customerName: o.customerName,
      firstItemName: o.items[0]?.name ?? "—",
      extraItems: Math.max(o.items.length - 1, 0),
      totalMillimes: o.subtotalMillimes + o.deliveryFeeMillimes,
      status: o.status,
      createdAt: new Date(o.createdAt).toISOString(),
    }));
}

function revenueByDay(validOrders: AnalyticsOrder[], period: Period): RevenuePoint[] {
  const byDay = new Map<string, { revenueMillimes: number; orders: number }>();
  for (const o of validOrders) {
    const key = dayKey(new Date(o.createdAt));
    const entry = byDay.get(key) ?? { revenueMillimes: 0, orders: 0 };
    entry.revenueMillimes += orderRevenueMillimes(o);
    entry.orders++;
    byDay.set(key, entry);
  }
  // Jours sans vente inclus à 0, sinon la courbe ment sur la régularité.
  return daysInPeriod(period).map((day) => ({
    day,
    revenueMillimes: byDay.get(day)?.revenueMillimes ?? 0,
    orders: byDay.get(day)?.orders ?? 0,
  }));
}

/** Fiabilité de l'analytique elle-même.
 *
 * Le tableau de bord doit dire quand il ne sait pas : un taux de conversion
 * calculé sur des commandes dont 30 % n'ont pas de gouvernorat exploitable
 * n'est pas un chiffre sur lequel décider. */
export type DataQuality = {
  ordersTotal: number;
  customerIdCoverage: number;
  governorateCoverage: number;
  /** Part du chiffre d'affaires dont le coût de revient est saisi. */
  productCostCoverage: number;
  /** Part du chiffre d'affaires dont l'origine est connue. */
  acquisitionSourceCoverage: number;
};

function computeDataQuality(
  allOrders: AnalyticsOrder[],
  costCoverage: number,
  sourceCoverage: number,
): DataQuality {
  const total = allOrders.length;
  let withCustomerId = 0;
  let withGovernorate = 0;
  for (const o of allOrders) {
    if (normalizePhone(o.phone)) withCustomerId++;
    if (o.governorate && o.governorate.trim() !== "") withGovernorate++;
  }
  return {
    ordersTotal: total,
    customerIdCoverage: total === 0 ? 0 : withCustomerId / total,
    governorateCoverage: total === 0 ? 0 : withGovernorate / total,
    productCostCoverage: costCoverage,
    acquisitionSourceCoverage: sourceCoverage,
  };
}

export type OverviewData = {
  revenueMillimes: MetricWithTrend;
  orders: MetricWithTrend;
  aovMillimes: MetricWithTrend;
  customers: MetricWithTrend;
  unitsSold: MetricWithTrend;
  revenueTrend: RevenuePoint[];
  /** `imageUrl` : la photo du catalogue, pour la vignette du tableau de
   * bord. null quand le produit n'en a pas — l'interface montre alors un
   * emplacement neutre, jamais la photo d'un autre produit. */
  topProducts: (ReturnType<typeof computeProductStats>[number] & {
    imageUrl: string | null;
  })[];
  topGovernorates: ReturnType<typeof computeGovernorateStats>;
  recentOrders: RecentOrder[];
  customerSplit: ReturnType<typeof computeCustomerSplit>;
  delivery: ReturnType<typeof computeDeliveryImpact>;
  statusCounts: Record<string, number>;
  /** Vues de page de la période. NOTE : dédupliquées par chemin et par
   * session côté client (voir src/hooks/useTrackVisit.ts) — ce n'est donc
   * ni un nombre de visiteurs ni un nombre de pages vues, et aucun taux de
   * conversion fiable ne peut en être dérivé. Exposé tel quel, étiqueté
   * honnêtement dans l'interface. */
  pageViews: MetricWithTrend;
  dataQuality: DataQuality;
  products: ReturnType<typeof attachGrowth<ReturnType<typeof computeProductStats>[number]>>;
  governorates: ReturnType<
    typeof attachGrowth<ReturnType<typeof computeGovernorateStats>[number]>
  >;
  productByGovernorate: ReturnType<typeof computeProductGovernorateMatrix>;
  governorateDelivery: ReturnType<typeof computeGovernorateDelivery>;
  customerMetrics: ReturnType<typeof computeCustomerMetrics>;
  /** Mêmes métriques clients sur la période précédente : sans elles, une
   * carte « clients récurrents » ne peut afficher aucune variation. */
  previousCustomerMetrics: ReturnType<typeof computeCustomerMetrics>;
  margins: ReturnType<typeof computeMargins>;
  previousMargins: ReturnType<typeof computeMargins>;
  acquisition: ReturnType<typeof computeAcquisition>;
};

/** Toutes les données de la Vue d'ensemble en UNE passe.
 *
 * Remplace trois `findMany()` sans filtre (chiffre d'affaires, statuts,
 * top produits) qui chargeaient la table entière en mémoire, chacun de son
 * côté, toutes les 30 secondes. */
export async function getOverview(periods: PeriodPair): Promise<OverviewData> {
  const [currentAll, previousAll, history, catalog, viewsNow, viewsBefore] = await Promise.all([
    fetchOrdersInPeriod(periods.current),
    fetchOrdersInPeriod(periods.previous),
    fetchCustomerOrderHistory(),
    fetchProductCatalog(),
    countPageViews(periods.current),
    countPageViews(periods.previous),
  ]);
  const costs = catalog.costs;

  const current = currentAll.filter(isValidOrder);
  const previous = previousAll.filter(isValidOrder);

  const histories = buildCustomerHistories(history);
  // Identités connues AVANT la période : base du « nouveau vs revenant ».
  const priorIds = new Set<string>();
  for (const h of histories.values()) {
    if (h.firstOrderAt < periods.current.start) priorIds.add(h.id);
  }

  const margins = computeMargins(current, costs);
  const acquisition = computeAcquisition(current);
  const productsNow = computeProductStats(current);
  const governoratesNow = computeGovernorateStats(current);

  const totals: CoreTotals = computeCoreTotals(current);
  const prevTotals: CoreTotals = computeCoreTotals(previous);

  const statusCounts: Record<string, number> = {
    nouvelle: 0,
    en_preparation: 0,
    prete: 0,
    terminee: 0,
    annulee: 0,
  };
  for (const o of currentAll) {
    statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;
  }

  return {
    revenueMillimes: withTrend(totals.revenueMillimes, prevTotals.revenueMillimes),
    orders: withTrend(totals.orders, prevTotals.orders),
    aovMillimes: withTrend(totals.aovMillimes, prevTotals.aovMillimes),
    customers: withTrend(totals.customers, prevTotals.customers),
    unitsSold: withTrend(totals.unitsSold, prevTotals.unitsSold),
    revenueTrend: revenueByDay(current, periods.current),
    topProducts: productsNow.slice(0, 8).map((p) => ({
      ...p,
      imageUrl: p.productId === null ? null : (catalog.images.get(p.productId) ?? null),
    })),
    topGovernorates: governoratesNow.slice(0, 8),
    recentOrders: recentOrders(currentAll),
    customerSplit: computeCustomerSplit(current, priorIds),
    delivery: computeDeliveryImpact(currentAll),
    statusCounts,
    pageViews: withTrend(viewsNow, viewsBefore),
    dataQuality: computeDataQuality(currentAll, margins.revenueCoverage, acquisition.revenueCoverage),

    // Détail consommé par les pages Ventes / Clients / Produits / Géographie.
    // Servi dans la même réponse pour qu'aucune page ne recalcule un chiffre
    // d'affaires de son côté : elles ne peuvent pas diverger si elles lisent
    // toutes le même objet.
    products: attachGrowth(productsNow, computeProductStats(previous), productKey),
    governorates: attachGrowth(
      governoratesNow,
      computeGovernorateStats(previous),
      governorateKey,
    ),
    productByGovernorate: computeProductGovernorateMatrix(current),
    governorateDelivery: computeGovernorateDelivery(currentAll),
    customerMetrics: computeCustomerMetrics(current, histories, periods.current.start),
    previousCustomerMetrics: computeCustomerMetrics(previous, histories, periods.previous.start),
    margins,
    previousMargins: computeMargins(previous, costs),
    acquisition,
  };
}
