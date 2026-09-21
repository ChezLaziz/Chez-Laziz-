// Meta Conversions API (Facebook/Instagram) — événement "Purchase" envoyé
// côté serveur uniquement, une fois la commande confirmée réelle (voir
// shouldReportMetaPurchase ci-dessous) — jamais à la simple création de la
// commande, qui ne prouve ni l'intention d'achat ni le paiement :
// Aucune vérification de paiement n'existe : on encaisse à la livraison. Le
// signal le plus fiable est donc la confirmation manuelle par un humain
// (l'appel au client), matérialisée par un statut qui avance au-delà de
// "nouvelle".
// Envoyer "Purchase" dès la création — comme une première version le
// faisait — compte des simples intentions (formulaire rempli, jamais
// livré/payé) comme des ventes auprès de Meta, ce qui dégrade la qualité du
// ciblage publicitaire et gaspille le budget pub sur des profils similaires
// à des non-acheteurs.
//
// Activé seulement si META_PIXEL_ID et META_CONVERSIONS_API_TOKEN sont
// définis. Sans configuration, ne fait rien — la commande est quand même
// enregistrée (même principe que l'e-mail, voir api/lib/email.ts).
//
// Le téléphone du client est haché (SHA-256) avant envoi, comme l'exige
// Meta — jamais transmis en clair.

import { createHash } from "node:crypto";

const GRAPH_API_VERSION = "v21.0";

export function isMetaConversionsApiConfigured(): boolean {
  return Boolean(process.env.META_PIXEL_ID && process.env.META_CONVERSIONS_API_TOKEN);
}

export type ReportableOrder = {
  status: "nouvelle" | "en_preparation" | "prete" | "terminee" | "annulee";
  metaPurchaseReportedAt: Date | null;
};

/** Décide si CETTE commande doit être signalée à Meta maintenant — à
 * appeler après toute mise à jour de statut, jamais à la création.
 * Ne renvoie vrai qu'une seule fois par commande.
 *
 * « TERMINÉE », C'EST-À-DIRE LIVRÉE ET ENCAISSÉE. Pas la confirmation
 * téléphonique, qui ne prouve qu'une intention.
 *
 * Le seuil était l'avancement du statut au-delà de « nouvelle » — le moment
 * où un humain appelle le client. Sur soixante-trois commandes d'un mois,
 * DIX ont été annulées et HUIT de ces dix avaient déjà été signalées comme
 * des achats : elles avaient passé l'appel, puis le colis a été refusé à la
 * porte. Meta apprenait donc à chercher des gens qui commandent et ne
 * paient pas — exactement le contraire de ce qu'on veut lui montrer, et
 * c'est le piège classique du paiement à la livraison.
 *
 * CE QUE ÇA COÛTE, ET POURQUOI ON LE PAIE QUAND MÊME. Une cliente qui
 * demande à être livrée dans dix jours sort de la fenêtre d'attribution de
 * sept jours de Meta : sa vente est réelle, mais la publicité ne s'en verra
 * plus créditée. Une poignée de ventes perdues de vue coûte moins cher
 * qu'un modèle entraîné sur des refus : une fausse conversion oriente
 * activement le ciblage vers les mauvaises personnes, une conversion
 * manquante ne fait que réduire le volume du signal.
 *
 * « paid » (l'argent noté encaissé) ne déclenche toujours RIEN : c'est une
 * écriture de gestion faite après coup, et la boutique la tient de façon
 * irrégulière — cinquante commandes livrées restent marquées « à
 * encaisser ». « terminée » est le seul état tenu à jour fidèlement. */
export function shouldReportMetaPurchase(order: ReportableOrder): boolean {
  if (order.metaPurchaseReportedAt) return false;
  return order.status === "terminee";
}

/** Meta refuse un event_time de plus de sept jours — et il refuse la
 * REQUÊTE ENTIÈRE, pas seulement l'événement fautif. On garde une marge
 * d'une heure : la commande peut attendre dans une file, l'horloge du
 * serveur peut dériver, et un envoi rejeté ne se rattrape jamais. */
const EVENT_TIME_MAX_AGE_S = 7 * 24 * 3600 - 3600;

/** Quand l'achat a EU LIEU, du point de vue de la publicité.
 *
 * Le colis part le lendemain, mais la décision d'acheter date de la
 * commande : c'est elle qui suit le clic publicitaire, et c'est cette
 * date-là que Meta doit rapprocher de l'annonce. Envoyer l'heure de la
 * livraison ferait manquer l'attribution d'une vente pourtant causée par
 * la publicité.
 *
 * Au-delà de sept jours — la cliente qui demande à être livrée « dans dix
 * jours » — on renvoie l'heure réelle de l'envoi. C'est la vérité, et la
 * fenêtre d'attribution est de toute façon dépassée : mieux vaut un achat
 * compté sans être attribué qu'une requête rejetée en bloc. On ne fabrique
 * PAS une date de complaisance à six jours et vingt-trois heures. */
export function eventTimeSeconds(orderedAt: Date | null | undefined, now: number): number {
  const maintenant = Math.floor(now / 1000);
  if (!orderedAt) return maintenant;
  const commande = Math.floor(orderedAt.getTime() / 1000);
  if (!Number.isFinite(commande) || commande > maintenant) return maintenant;
  return maintenant - commande > EVENT_TIME_MAX_AGE_S ? maintenant : commande;
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Numéros tunisiens saisis dans des formats variés (avec ou sans +216,
 * avec ou sans 0 initial, espaces...) → même forme E.164 avant hachage,
 * pour que Meta puisse effectivement faire correspondre l'événement. */
export function normalizeTunisianPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "").replace(/^0+/, "");
  const withCountryCode = digits.startsWith("216") ? digits : `216${digits}`;
  return `+${withCountryCode}`;
}

/** Les champs de correspondance que Meta accepte, normalisés comme il
 * l'exige AVANT hachage : minuscules, sans espaces autour, sans
 * ponctuation pour les noms, pays sur deux lettres. Une valeur mal
 * normalisée est hachée différemment de ce que Meta a de son côté, et
 * l'événement n'est alors rattaché à personne — comme si on n'avait rien
 * envoyé. */
export function normalizeMatchField(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(/[\p{P}\p{S}]/gu, "")
    .replace(/\s+/g, " ");
}

/** « Mohamed habib najjar » → prénom « mohamed », nom « najjar » : Meta
 * attend fn et ln séparés, et un client tunisien écrit presque toujours
 * son prénom d'abord. Un seul mot va dans fn. */
export function splitName(fullName: string): { fn: string; ln: string } {
  const parts = normalizeMatchField(fullName).split(" ").filter(Boolean);
  if (parts.length === 0) return { fn: "", ln: "" };
  if (parts.length === 1) return { fn: parts[0], ln: "" };
  return { fn: parts[0], ln: parts[parts.length - 1] };
}

export type MetaPurchaseEvent = {
  orderId: number;
  phone: string;
  /** La valeur de la vente, HORS frais de livraison : ceux-ci partent au
   * livreur et ne sont pas du chiffre d'affaires. Même base que AddToCart,
   * InitiateCheckout et Lead côté navigateur — un entonnoir qui change
   * d'unité en cours de route n'apprend rien de juste à Meta. */
  subtotalMillimes: number;
  contentIds: string[];
  /** Quantité par référence, dans le même ordre que contentIds. Absent =
   * une unité chacune. */
  quantities?: number[];
  /** Identité et adresse telles que saisies à la commande. Tout est haché
   * avant envoi ; rien ne part en clair. Chaque champ de plus fait monter
   * la « qualité de correspondance » — donc la part des ventes que Meta
   * reconnaît comme venant de la publicité, donc la qualité de ce qu'il
   * apprend. */
  customerName?: string;
  city?: string;
  governorate?: string;
  sourceUrl?: string;
  /** L'heure de la COMMANDE, pas celle de l'envoi à Meta — voir
   * eventTimeSeconds. Absente, on retombe sur l'instant présent. */
  orderedAt?: Date | null;
  /** Signaux captés à la création de la commande — voir
   * contracts/metaSignals.ts. Tous absents si le client a refusé les
   * cookies : on n'envoie alors que le téléphone haché, comme avant. */
  signals?: {
    fbc?: string | null;
    fbp?: string | null;
    clientIp?: string | null;
    clientUserAgent?: string | null;
  };
};

/** fn / ln / ct / st / country — chacun haché, chacun optionnel. Le pays est
 * toujours « tn » : la boutique ne livre qu'en Tunisie.
 *
 * RIEN DE TOUT CELA SANS CONSENTEMENT. La politique de confidentialité
 * promet au client qui refuse les cookies que les outils publicitaires ne
 * reçoivent rien de ce qu'il a écrit dans le formulaire. Le serveur, lui,
 * envoyait quand même son prénom, son nom, sa ville et son gouvernorat —
 * hachés, mais envoyés. Un engagement écrit dans deux langues ne se règle
 * pas par « c'est haché ».
 *
 * Le consentement se lit à l'absence de fbc ET de fbp : ces deux cookies
 * n'existent que si le Pixel s'est chargé, et le Pixel ne se charge
 * qu'après « Accepter » (voir src/hooks/useTrackVisit.ts et
 * contracts/metaSignals.ts). Sans eux, il ne part que le téléphone haché,
 * qui sert d'identifiant de la commande elle-même. */
function matchFields(ev: MetaPurchaseEvent): Record<string, string[]> {
  const out: Record<string, string[]> = { country: [sha256("tn")] };
  const consenti = Boolean(ev.signals?.fbc || ev.signals?.fbp);
  if (!consenti) return out;
  if (ev.customerName) {
    const { fn, ln } = splitName(ev.customerName);
    if (fn) out.fn = [sha256(fn)];
    if (ln) out.ln = [sha256(ln)];
  }
  if (ev.city && normalizeMatchField(ev.city)) out.ct = [sha256(normalizeMatchField(ev.city).replace(/\s/g, ""))];
  if (ev.governorate && normalizeMatchField(ev.governorate)) {
    out.st = [sha256(normalizeMatchField(ev.governorate).replace(/\s/g, ""))];
  }
  return out;
}

/** Envoie l'événement "Purchase" ; ne lève jamais (journalise l'échec) —
 * appelée sans await après la création de la commande.
 *
 * Rend VRAI seulement si Meta a accepté l'envoi. L'appelant réserve le
 * signalement avant d'appeler (verrou anti-doublon) : sans cette réponse, il
 * ne saurait pas qu'il doit rendre la réservation, et une panne réseau de
 * trois secondes effacerait la vente des yeux de Meta pour toujours. */
export async function sendMetaPurchaseEvent(ev: MetaPurchaseEvent): Promise<boolean> {
  return envoyer("Purchase", `order-${ev.orderId}`, ev);
}

/** « Lead » — la commande vient d'être ACCEPTÉE par le serveur — envoyé
 * depuis le serveur, EN PLUS du navigateur.
 *
 * LE PIXEL NE SE CHARGE QU'APRÈS « Accepter » (voir src/hooks/useTrackVisit.ts).
 * Sur trente jours, la publicité a payé 9 631 clics et le Pixel n'a compté
 * que 2 900 vues de page : sept visiteuses sur dix n'acceptent jamais la
 * bannière, et AUCUN de leurs événements de navigateur n'existe pour Meta.
 * Un Lead qui ne vit que dans le navigateur ne rapporterait donc qu'environ
 * une commande sur trois — très en dessous des cinquante par semaine dont
 * Meta a besoin pour sortir de sa phase d'apprentissage. Optimiser une
 * campagne sur un signal amputé des deux tiers, c'est lui apprendre le
 * contraire de ce qu'on veut.
 *
 * Le serveur, lui, connaît CHAQUE commande. Il envoie donc le même
 * événement, avec le MÊME event_id que le navigateur
 * (`lead-order-<id>`, voir src/pages/OrderPage.tsx) : Meta reconnaît les
 * deux comme un seul et ne compte jamais deux fois.
 *
 * Le consentement reste respecté à la lettre : sans fbc ni fbp, il ne part
 * que le téléphone haché et le pays — exactement comme pour Purchase. */
export async function sendMetaLeadEvent(ev: MetaPurchaseEvent): Promise<boolean> {
  return envoyer("Lead", `lead-order-${ev.orderId}`, ev);
}

async function envoyer(
  eventName: "Purchase" | "Lead",
  eventId: string,
  ev: MetaPurchaseEvent,
): Promise<boolean> {
  if (!isMetaConversionsApiConfigured()) {
    console.log(`[meta-capi] non configuré — ${eventName} #${ev.orderId} non envoyé à Meta`);
    return false;
  }
  const body = {
    data: [
      {
        event_name: eventName,
        event_time: eventTimeSeconds(ev.orderedAt, Date.now()),
        event_id: eventId,
        event_source_url: ev.sourceUrl ?? "https://chezlaziz.com/commande",
        action_source: "website",
        // LE TÉLÉPHONE SEUL NE SUFFIT PAS. Beaucoup de comptes Facebook
        // tunisiens n'ont aucun numéro rattaché : la vente n'était alors
        // pas reconnue comme venant de la publicité, et l'algorithme de
        // Meta, qui apprend sur ce qu'on lui rapporte, optimisait à côté.
        // fbc porte le clic publicitaire lui-même — c'est le lien
        // déterministe entre l'annonce et la commande.
        user_data: {
          ph: [sha256(normalizeTunisianPhone(ev.phone))],
          // Le téléphone sert aussi d'identifiant client stable : deux
          // commandes du même numéro sont le même acheteur pour Meta.
          external_id: [sha256(normalizeTunisianPhone(ev.phone))],
          ...matchFields(ev),
          ...(ev.signals?.fbc ? { fbc: ev.signals.fbc } : {}),
          ...(ev.signals?.fbp ? { fbp: ev.signals.fbp } : {}),
          ...(ev.signals?.clientIp ? { client_ip_address: ev.signals.clientIp } : {}),
          ...(ev.signals?.clientUserAgent
            ? { client_user_agent: ev.signals.clientUserAgent }
            : {}),
        },
        custom_data: {
          currency: "TND",
          value: ev.subtotalMillimes / 1000,
          content_type: "product",
          content_ids: ev.contentIds,
          contents: ev.contentIds.map((id, i) => ({ id, quantity: ev.quantities?.[i] ?? 1 })),
          num_items: (ev.quantities ?? ev.contentIds.map(() => 1)).reduce((n, q) => n + q, 0),
        },
      },
    ],
    // Le code « Test Events » du Gestionnaire d'événements : quand il est
    // posé, chaque envoi apparaît en direct dans l'onglet de test, avec ses
    // paramètres et ses avertissements. À retirer une fois vérifié — un
    // événement de test ne compte pas dans les rapports.
    ...(process.env.META_TEST_EVENT_CODE?.trim()
      ? { test_event_code: process.env.META_TEST_EVENT_CODE.trim() }
      : {}),
  };
  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${process.env.META_PIXEL_ID}/events?access_token=${encodeURIComponent(process.env.META_CONVERSIONS_API_TOKEN!)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      console.error(`[meta-capi] échec (${res.status}) — ${eventName} #${ev.orderId}: ${await res.text()}`);
      return false;
    }
    console.log(`[meta-capi] ${eventName} envoyé pour la commande #${ev.orderId} (event_id=${eventId})`);
    return true;
  } catch (err) {
    console.error(`[meta-capi] erreur réseau — ${eventName} #${ev.orderId}:`, err);
    return false;
  }
}
