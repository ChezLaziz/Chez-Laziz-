import { getDb } from "../connection";
import { orders, pageViews } from "@db/schema";
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
import {
  attachGrowth,
  computeGovernorateDelivery,
  computePaymentBreakdown,
  computeProductGovernorateMatrix,
  governorateKey,
  productKey,
} from "./breakdowns";

export * from "./metrics";
export * from "./period";
export * from "./customers";
export * from "./breakdowns";

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
  /** Ces deux-là restent à 0 tant que les colonnes n'existent pas en base :
   * coût produit et source d'acquisition ne sont aujourd'hui pas collectés. */
  productCostCoverage: number;
  acquisitionSourceCoverage: number;
};

function computeDataQuality(allOrders: AnalyticsOrder[]): DataQuality {
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
    productCostCoverage: 0,
    acquisitionSourceCoverage: 0,
  };
}

export type OverviewData = {
  revenueMillimes: MetricWithTrend;
  orders: MetricWithTrend;
  aovMillimes: MetricWithTrend;
  customers: MetricWithTrend;
  unitsSold: MetricWithTrend;
  revenueTrend: RevenuePoint[];
  topProducts: ReturnType<typeof computeProductStats>;
  topGovernorates: ReturnType<typeof computeGovernorateStats>;
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
  payments: ReturnType<typeof computePaymentBreakdown>;
  customerMetrics: ReturnType<typeof computeCustomerMetrics>;
};

/** Toutes les données de la Vue d'ensemble en UNE passe.
 *
 * Remplace trois `findMany()` sans filtre (chiffre d'affaires, statuts,
 * top produits) qui chargeaient la table entière en mémoire, chacun de son
 * côté, toutes les 30 secondes. */
export async function getOverview(periods: PeriodPair): Promise<OverviewData> {
  const [currentAll, previousAll, history, viewsNow, viewsBefore] = await Promise.all([
    fetchOrdersInPeriod(periods.current),
    fetchOrdersInPeriod(periods.previous),
    fetchCustomerOrderHistory(),
    countPageViews(periods.current),
    countPageViews(periods.previous),
  ]);

  const current = currentAll.filter(isValidOrder);
  const previous = previousAll.filter(isValidOrder);

  const histories = buildCustomerHistories(history);
  // Identités connues AVANT la période : base du « nouveau vs revenant ».
  const priorIds = new Set<string>();
  for (const h of histories.values()) {
    if (h.firstOrderAt < periods.current.start) priorIds.add(h.id);
  }

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
    topProducts: productsNow.slice(0, 8),
    topGovernorates: governoratesNow.slice(0, 8),
    customerSplit: computeCustomerSplit(current, priorIds),
    delivery: computeDeliveryImpact(currentAll),
    statusCounts,
    pageViews: withTrend(viewsNow, viewsBefore),
    dataQuality: computeDataQuality(currentAll),

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
    payments: computePaymentBreakdown(current),
    customerMetrics: computeCustomerMetrics(current, histories, periods.current.start),
  };
}
