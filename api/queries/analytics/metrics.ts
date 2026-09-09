/** Définitions métier et calculs purs du tableau de bord.
 *
 * SOURCE UNIQUE DE VÉRITÉ : toute page de l'admin qui affiche un chiffre
 * d'affaires, un nombre de commandes, un panier moyen ou un client doit
 * passer par ce module. Deux pages ne doivent jamais calculer la même
 * métrique différemment.
 *
 * Aucune fonction ici ne touche la base : elles sont pures et testées, pour
 * que les définitions restent vérifiables sans base de données. */

/** Ligne de commande telle que stockée en JSON dans `orders.items`. */
export type OrderItem = {
  kind?: "product" | "pack" | "custom";
  productId?: number;
  packId?: string;
  name: string;
  qty: number;
  unitPriceMillimes: number;
};

/** Les seuls champs d'une commande dont l'analytique a besoin. */
export type AnalyticsOrder = {
  id: number;
  phone: string;
  customerName: string;
  governorate: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotalMillimes: number;
  deliveryFeeMillimes: number;
  items: OrderItem[];
  createdAt: Date;
};

/* --------------------------- Définitions --------------------------- */

/** Commande VALIDE = celle qui compte comme une vente réelle.
 *
 * Exclut les commandes annulées ET les paiements D17 rejetés : une capture
 * D17 refusée signifie que l'argent n'est jamais arrivé, la compter en
 * chiffre d'affaires gonflerait le CA d'une vente qui n'a pas eu lieu. */
export function isValidOrder(o: Pick<AnalyticsOrder, "status" | "paymentStatus">): boolean {
  return o.status !== "annulee" && o.paymentStatus !== "rejected";
}

/** CHIFFRE D'AFFAIRES d'une commande = sous-total, HORS frais de livraison.
 *
 * Les 8 DT de livraison sont encaissés pour le transporteur, pas pour Chez
 * Laziz : les inclure gonflait le CA de 8 DT par commande et le rendait
 * incohérent avec le CA par produit (calculé, lui, sur les prix unitaires). */
export function orderRevenueMillimes(o: Pick<AnalyticsOrder, "subtotalMillimes">): number {
  return o.subtotalMillimes;
}

/** Identité client = numéro de téléphone normalisé.
 *
 * Il n'existe ni table clients ni e-mail : le téléphone est le seul
 * identifiant disponible. Il est stocké brut (`z.string().min(6)`), donc
 * « +216 20 123 456 », « 20123456 » et « 20 123 456 » désignent la même
 * personne sous trois formes. On garde les 8 derniers chiffres, qui sont le
 * numéro national tunisien, quel que soit l'indicatif saisi.
 *
 * Renvoie null si le numéro est inexploitable — ces commandes sont alors
 * comptées dans le CA mais exclues des métriques clients, et signalées dans
 * la couverture des données plutôt que rattachées à un faux client. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8) return null;
  return digits.slice(-8);
}

/* ---------------------------- Agrégats ---------------------------- */

export type CoreTotals = {
  revenueMillimes: number;
  orders: number;
  unitsSold: number;
  aovMillimes: number;
  customers: number;
  /** Commandes dont le téléphone est inexploitable (voir normalizePhone). */
  ordersWithoutCustomerId: number;
};

/** Totaux d'une période. N'accepte QUE des commandes déjà filtrées valides. */
export function computeCoreTotals(validOrders: AnalyticsOrder[]): CoreTotals {
  let revenueMillimes = 0;
  let unitsSold = 0;
  let ordersWithoutCustomerId = 0;
  const customers = new Set<string>();

  for (const o of validOrders) {
    revenueMillimes += orderRevenueMillimes(o);
    for (const it of o.items) unitsSold += it.qty;
    const id = normalizePhone(o.phone);
    if (id) customers.add(id);
    else ordersWithoutCustomerId++;
  }

  const orders = validOrders.length;
  return {
    revenueMillimes,
    orders,
    unitsSold,
    // Panier moyen = CA / commandes valides. Jamais de division par zéro.
    aovMillimes: orders === 0 ? 0 : Math.round(revenueMillimes / orders),
    customers: customers.size,
    ordersWithoutCustomerId,
  };
}

/** Variation en pourcentage entre deux périodes équivalentes.
 *
 * Renvoie null quand la période précédente est à zéro : « +100 % » à partir
 * de rien n'informe sur rien, et « +∞ % » est faux. L'interface affiche
 * alors « pas de comparaison » au lieu d'un pourcentage inventé. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

/* ------------------------- Clients ------------------------- */

export type CustomerSplit = {
  newCustomers: number;
  returningCustomers: number;
  newRevenueMillimes: number;
  returningRevenueMillimes: number;
  /** Part des commandes valides passées par un client déjà connu. */
  repeatOrderRate: number;
};

/** Nouveau vs revenant, sur la période.
 *
 * NOUVEAU  : sa toute première commande valide tombe dans la période.
 * REVENANT : il avait déjà une commande valide AVANT le début de la période.
 *
 * `priorCustomerIds` = identités vues strictement avant la période. Sans
 * cet historique la distinction est impossible, donc on l'exige en entrée
 * plutôt que de la deviner. */
export function computeCustomerSplit(
  validOrders: AnalyticsOrder[],
  priorCustomerIds: ReadonlySet<string>,
): CustomerSplit {
  const newIds = new Set<string>();
  const returningIds = new Set<string>();
  let newRevenueMillimes = 0;
  let returningRevenueMillimes = 0;
  let ordersFromReturning = 0;
  let attributableOrders = 0;

  for (const o of validOrders) {
    const id = normalizePhone(o.phone);
    if (!id) continue;
    attributableOrders++;
    const revenue = orderRevenueMillimes(o);
    if (priorCustomerIds.has(id)) {
      returningIds.add(id);
      returningRevenueMillimes += revenue;
      ordersFromReturning++;
    } else {
      newIds.add(id);
      newRevenueMillimes += revenue;
    }
  }

  return {
    newCustomers: newIds.size,
    returningCustomers: returningIds.size,
    newRevenueMillimes,
    returningRevenueMillimes,
    repeatOrderRate:
      attributableOrders === 0 ? 0 : ordersFromReturning / attributableOrders,
  };
}

/* ------------------------- Produits ------------------------- */

/** Clé de regroupement d'une ligne de commande.
 *
 * Un pack ne porte pas de productId, un Custom Pack n'en porte aucun des
 * deux : regrouper sur le seul productId ferait tomber tous les packs dans
 * la même entrée, fusionnés sous le nom du premier rencontré. */
export function itemKey(it: OrderItem): string {
  if (it.packId) return `pack:${it.packId}`;
  if (it.productId != null) return `product:${it.productId}`;
  return `name:${it.name}`;
}

export type ProductStats = {
  /** Identifiant stable et unique — sert aussi de clé de liste côté React. */
  key: string;
  productId: number | null;
  name: string;
  revenueMillimes: number;
  unitsSold: number;
  /** Commandes distinctes contenant cet article. */
  orders: number;
  /** Part du CA total de la période, entre 0 et 1. */
  revenueShare: number;
};

export function computeProductStats(validOrders: AnalyticsOrder[]): ProductStats[] {
  const map = new Map<string, Omit<ProductStats, "revenueShare">>();
  let totalRevenue = 0;

  for (const o of validOrders) {
    const seenInThisOrder = new Set<string>();
    for (const it of o.items) {
      const key = itemKey(it);
      const revenue = it.qty * it.unitPriceMillimes;
      totalRevenue += revenue;
      const existing = map.get(key);
      if (existing) {
        existing.revenueMillimes += revenue;
        existing.unitsSold += it.qty;
        if (!seenInThisOrder.has(key)) existing.orders++;
      } else {
        map.set(key, {
          key,
          productId: it.productId ?? null,
          name: it.name,
          revenueMillimes: revenue,
          unitsSold: it.qty,
          orders: 1,
        });
      }
      seenInThisOrder.add(key);
    }
  }

  return Array.from(map.values())
    .map((p) => ({
      ...p,
      revenueShare: totalRevenue === 0 ? 0 : p.revenueMillimes / totalRevenue,
    }))
    .sort((a, b) => b.revenueMillimes - a.revenueMillimes);
}

/* ------------------------ Géographie ------------------------ */

export type GovernorateStats = {
  governorate: string;
  revenueMillimes: number;
  orders: number;
  customers: number;
  aovMillimes: number;
  topProductName: string | null;
};

export function computeGovernorateStats(validOrders: AnalyticsOrder[]): GovernorateStats[] {
  const map = new Map<
    string,
    {
      revenueMillimes: number;
      orders: number;
      customers: Set<string>;
      productUnits: Map<string, { name: string; units: number }>;
    }
  >();

  for (const o of validOrders) {
    let entry = map.get(o.governorate);
    if (!entry) {
      entry = {
        revenueMillimes: 0,
        orders: 0,
        customers: new Set(),
        productUnits: new Map(),
      };
      map.set(o.governorate, entry);
    }
    entry.revenueMillimes += orderRevenueMillimes(o);
    entry.orders++;
    const id = normalizePhone(o.phone);
    if (id) entry.customers.add(id);
    for (const it of o.items) {
      const key = itemKey(it);
      const prev = entry.productUnits.get(key);
      if (prev) prev.units += it.qty;
      else entry.productUnits.set(key, { name: it.name, units: it.qty });
    }
  }

  return Array.from(map.entries())
    .map(([governorate, e]) => {
      let top: { name: string; units: number } | null = null;
      for (const p of e.productUnits.values()) {
        if (!top || p.units > top.units) top = p;
      }
      return {
        governorate,
        revenueMillimes: e.revenueMillimes,
        orders: e.orders,
        customers: e.customers.size,
        aovMillimes: e.orders === 0 ? 0 : Math.round(e.revenueMillimes / e.orders),
        topProductName: top?.name ?? null,
      };
    })
    .sort((a, b) => b.revenueMillimes - a.revenueMillimes);
}

/* -------------------- Impact livraison -------------------- */

/** Effet de la livraison sur le business — PAS une gestion de livraison.
 *
 * Chez Laziz sous-traite le transport : le tableau de bord mesure seulement
 * ce que l'entreprise perd ou gagne, jamais les tournées ni les livreurs. */
export type DeliveryImpact = {
  completed: number;
  cancelled: number;
  inProgress: number;
  completionRate: number;
  cancellationRate: number;
  /** CA des commandes annulées — chiffre d'affaires perdu. */
  lostRevenueMillimes: number;
  deliveryCostMillimes: number;
};

/** Prend TOUTES les commandes de la période, annulées comprises : le taux
 * d'annulation n'a aucun sens calculé sur un lot d'où elles sont exclues. */
export function computeDeliveryImpact(allOrders: AnalyticsOrder[]): DeliveryImpact {
  let completed = 0;
  let cancelled = 0;
  let inProgress = 0;
  let lostRevenueMillimes = 0;
  let deliveryCostMillimes = 0;

  for (const o of allOrders) {
    if (o.status === "annulee") {
      cancelled++;
      lostRevenueMillimes += orderRevenueMillimes(o);
      continue;
    }
    if (o.status === "terminee") completed++;
    else inProgress++;
    deliveryCostMillimes += o.deliveryFeeMillimes;
  }

  const total = allOrders.length;
  return {
    completed,
    cancelled,
    inProgress,
    completionRate: total === 0 ? 0 : completed / total,
    cancellationRate: total === 0 ? 0 : cancelled / total,
    lostRevenueMillimes,
    deliveryCostMillimes,
  };
}
