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
import { tunisianLocalPhone } from "@contracts/phone";

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

/** L'heure que porte un événement : celle où il PART.
 *
 * ON A FAIT L'INVERSE PENDANT DEUX MOIS, ET C'ÉTAIT UNE ERREUR DE LECTURE.
 * L'achat partait à la livraison (voir shouldReportMetaPurchase) mais daté
 * de la COMMANDE, un ou deux jours plus tôt — pour que Meta le rapproche
 * du clic publicitaire. Or Meta mesure le retard d'un événement entre
 * l'heure qu'il porte et l'heure où il le reçoit, et l'écrit sans détour :
 * envoyé dans l'heure, un événement sert à l'attribution et à la
 * diffusion ; au-delà de deux heures, les publicités optimisées sur lui
 * perdent en performance ; à vingt-quatre heures et plus, attribution et
 * diffusion peuvent en souffrir nettement. Avec l'heure de la commande,
 * CHAQUE achat de la boutique arrivait chez Meta avec un à trois jours de
 * retard — sur l'événement même que les campagnes optimisent.
 *
 * Pour une conversion qui se conclut longtemps après le clic, la consigne
 * de Meta est de l'envoyer dès qu'elle est COMPLÈTE. Ici, un achat est une
 * commande livrée : il est complet à la livraison, et c'est à cet
 * instant-là qu'il part. Il est donc daté de cet instant.
 *
 * CE QU'ON Y PERD, dit tel quel. Le clic reste dans la fenêtre de sept
 * jours tant que la livraison suit la commande de moins de sept jours —
 * c'était déjà la limite avant. Ce qui sort, ce sont les achats que Meta
 * créditait à une simple VUE de la publicité la veille : livrés plus d'un
 * jour après, ils ne sont plus rattachés à cette vue. C'est une part
 * mineure, et la moins sûre, de ce qu'il attribuait.
 *
 * « Lead » n'a jamais eu ce problème : il part à la commande, daté de la
 * commande. */
export function eventTimeSeconds(now: number): number {
  return Math.floor(now / 1000);
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Le numéro tel que META l'attend avant hachage : des CHIFFRES SEULS,
 * indicatif compris — « 21623691039 ». Pas de « + ».
 *
 * LE « + » A COÛTÉ TOUTES LES VENTES SANS COOKIE. Cette fonction rendait la
 * forme E.164, « +21623691039 ». Or Meta hache de son côté le numéro SANS
 * symbole (sa documentation : « Remove symbols, letters, and any leading
 * zeros », exemple « 16505551212 »). Une empreinte SHA-256 ne se rattrape
 * pas : un seul caractère de plus et elle ne ressemble à aucune autre. Le
 * téléphone haché que nous envoyions n'a donc JAMAIS correspondu à un
 * compte — pas une fois.
 *
 * C'est exactement ce que le compte montrait avant l'enregistrement de
 * fbc/fbp : soixante-deux achats reçus, zéro attribué. Et depuis, toute
 * commande passée sans avoir touché « Accepter » ne part qu'avec ce
 * téléphone : Meta la recevait sans pouvoir la rattacher à personne, donc
 * à aucune publicité, donc sans rien en apprendre.
 *
 * Deuxième défaut, corrigé au passage : « 21 612 345 » est un numéro local
 * valide qui COMMENCE par 216. L'ancien test `startsWith("216")` le prenait
 * pour un numéro déjà international et lui refusait son indicatif.
 * tunisianLocalPhone (contracts/phone.ts) est la règle déjà partagée avec le
 * formulaire : on ne retire l'indicatif que s'il reste huit chiffres. */
export function normalizeTunisianPhone(phone: string): string {
  const local = tunisianLocalPhone(phone);
  if (local) return `216${local}`;
  // Hors gabarit (très ancienne commande, saisie manuelle) : au mieux, mais
  // toujours en chiffres seuls et toujours avec l'indicatif.
  const digits = phone.replace(/\D/g, "").replace(/^0+/, "");
  return digits.length > 8 && digits.startsWith("216") ? digits : `216${digits}`;
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
        event_time: eventTimeSeconds(Date.now()),
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
