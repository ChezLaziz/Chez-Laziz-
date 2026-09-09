import { formatDinars } from "./shop";

const formatTND = formatDinars;

/** Forme minimale dont les règles ont besoin. Volontairement structurelle
 * et non importée du serveur : les règles restent testables sans base, et
 * `OverviewData` la satisfait sans couplage. */
export type SignalInput = {
  revenueMillimes: Trend;
  orders: Trend;
  aovMillimes: Trend;
  topProducts: readonly {
    key: string;
    name: string;
    revenueMillimes: number;
    unitsSold: number;
    revenueShare: number;
  }[];
  topGovernorates: readonly {
    governorate: string;
    revenueMillimes: number;
    orders: number;
    customers: number;
    aovMillimes: number;
  }[];
  customerSplit: {
    newCustomers: number;
    returningCustomers: number;
    newRevenueMillimes: number;
    returningRevenueMillimes: number;
    repeatOrderRate: number;
  };
  delivery: {
    completed: number;
    cancelled: number;
    cancellationRate: number;
    lostRevenueMillimes: number;
  };
};

type Trend = { value: number; previous: number; changePercent: number | null };

/** Signaux métier — des RÈGLES sur des chiffres réels, pas une IA.
 *
 * Trois garde-fous, dans cet ordre :
 *
 * 1. SEUIL DE VOLUME. En dessous de MIN_ORDERS commandes, une variation ne
 *    veut rien dire : passer de 2 à 3 commandes est « +50 % » et pourtant
 *    ce n'est que le hasard d'une semaine. Aucun signal n'est émis.
 * 2. SEUIL D'AMPLITUDE. Une variation sous MIN_CHANGE est du bruit.
 * 3. PREUVE OBLIGATOIRE. Chaque phrase porte les nombres qui la fondent.
 *    Jamais « les ventes se portent bien » — toujours « +24 %, 1 240 DT ».
 *
 * Le résultat peut légitimement être vide. Une liste vide est une réponse
 * honnête ; inventer un signal pour remplir la carte ne l'est pas. */

export const MIN_ORDERS_FOR_SIGNALS = 10
const MIN_CHANGE = 12 // %

export type Signal = {
  id: string
  tone: 'good' | 'bad' | 'neutral'
  text: string
}

export function buildSignals(d: SignalInput): Signal[] {
  const signals: Signal[] = []

  // Sous ce volume, aucune variation n'est interprétable.
  if (d.orders.value < MIN_ORDERS_FOR_SIGNALS || d.orders.previous < MIN_ORDERS_FOR_SIGNALS) return signals

  const rev = d.revenueMillimes.changePercent
  if (rev !== null && Math.abs(rev) >= MIN_CHANGE) {
    signals.push({
      id: 'revenue',
      tone: rev > 0 ? 'good' : 'bad',
      text: `Chiffre d'affaires ${rev > 0 ? 'en hausse' : 'en baisse'} de ${Math.abs(rev).toFixed(0)}% : ${formatTND(d.revenueMillimes.value)} DT contre ${formatTND(d.revenueMillimes.previous)} DT sur la période précédente.`,
    })
  }

  // Panier moyen et volume qui divergent : deux causes très différentes
  // d'une même variation de CA, et deux décisions différentes.
  const aov = d.aovMillimes.changePercent
  const ord = d.orders.changePercent
  if (aov !== null && ord !== null && Math.abs(aov) >= MIN_CHANGE && Math.abs(ord) >= MIN_CHANGE) {
    if (aov > 0 && ord < 0) {
      signals.push({
        id: 'aov-vs-orders',
        tone: 'neutral',
        text: `Moins de commandes (${ord.toFixed(0)}%) mais un panier plus élevé (+${aov.toFixed(0)}%, ${formatTND(d.aovMillimes.value)} DT) : le chiffre tient sur moins de clients qui achètent plus.`,
      })
    } else if (aov < 0 && ord > 0) {
      signals.push({
        id: 'aov-vs-orders',
        tone: 'neutral',
        text: `Plus de commandes (+${ord.toFixed(0)}%) mais un panier plus bas (${aov.toFixed(0)}%, ${formatTND(d.aovMillimes.value)} DT) : la croissance vient du volume, pas de la valeur.`,
      })
    }
  }

  // Concentration du CA sur un seul produit : un risque, pas une réussite.
  const top = d.topProducts[0]
  if (top && top.revenueShare >= 0.5 && d.topProducts.length > 1) {
    signals.push({
      id: 'product-concentration',
      tone: 'neutral',
      text: `${top.name} pèse ${(top.revenueShare * 100).toFixed(0)}% du chiffre d'affaires (${formatTND(top.revenueMillimes)} DT). Une baisse sur ce seul produit ferait chuter l'ensemble.`,
    })
  }

  // Gouvernorat au panier nettement supérieur : cible d'effort commercial.
  if (d.topGovernorates.length >= 3 && d.aovMillimes.value > 0) {
    const eligible = d.topGovernorates.filter((g) => g.orders >= 5)
    const best = eligible.reduce<(typeof eligible)[number] | null>(
      (acc, g) => (!acc || g.aovMillimes > acc.aovMillimes ? g : acc),
      null,
    )
    if (best) {
      const lift = ((best.aovMillimes - d.aovMillimes.value) / d.aovMillimes.value) * 100
      if (lift >= MIN_CHANGE) {
        signals.push({
          id: 'governorate-aov',
          tone: 'good',
          text: `${best.governorate} a le panier moyen le plus élevé : ${formatTND(best.aovMillimes)} DT, soit +${lift.toFixed(0)}% au-dessus de la moyenne, sur ${best.orders} commandes.`,
        })
      }
    }
  }

  // Fidélité : un client revenant rapporte-t-il plus qu'un nouveau ?
  const split = d.customerSplit
  if (split.returningCustomers >= 5 && split.newCustomers >= 5) {
    const returningAov = split.returningRevenueMillimes / split.returningCustomers
    const newAov = split.newRevenueMillimes / split.newCustomers
    if (newAov > 0) {
      const lift = ((returningAov - newAov) / newAov) * 100
      if (Math.abs(lift) >= MIN_CHANGE) {
        signals.push({
          id: 'returning-value',
          tone: lift > 0 ? 'good' : 'neutral',
          text: `Un client revenant dépense ${formatTND(Math.round(returningAov))} DT contre ${formatTND(Math.round(newAov))} DT pour un nouveau, soit ${lift > 0 ? '+' : ''}${lift.toFixed(0)}% (${split.returningCustomers} revenants, ${split.newCustomers} nouveaux).`,
        })
      }
    }
  }

  // Annulations : coût réel, pas un simple pourcentage.
  if (d.delivery.cancellationRate >= 0.15 && d.delivery.cancelled >= 3) {
    signals.push({
      id: 'cancellations',
      tone: 'bad',
      text: `${(d.delivery.cancellationRate * 100).toFixed(0)}% des commandes ont été annulées (${d.delivery.cancelled} sur la période), soit ${formatTND(d.delivery.lostRevenueMillimes)} DT de chiffre d'affaires perdu.`,
    })
  }

  return signals
}
