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
 * UN SEUL SIGNAL DEPUIS LE RETRAIT DE D17 : l'avancement du statut au-delà
 * de « nouvelle », c'est-à-dire le moment où un humain a appelé le client et
 * confirmé la commande. C'est la seule preuve dont dispose une boutique qui
 * encaisse à la livraison — aucun paiement n'a lieu en ligne.
 *
 * Il existait une seconde branche : une commande D17 comptait dès qu'un
 * administrateur approuvait la capture de virement. D17 est retiré, et
 * aucune commande ne l'a jamais emprunté.
 *
 * « paid » (l'argent encaissé par le livreur) ne déclenche RIEN ici : c'est
 * une écriture de gestion qui arrive après coup, et la commande a de toute
 * façon déjà été signalée au moment de sa confirmation. */
export function shouldReportMetaPurchase(order: ReportableOrder): boolean {
  if (order.metaPurchaseReportedAt) return false;
  if (order.status === "annulee") return false;
  return order.status !== "nouvelle";
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
  totalMillimes: number;
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
 * toujours « tn » : la boutique ne livre qu'en Tunisie. */
function matchFields(ev: MetaPurchaseEvent): Record<string, string[]> {
  const out: Record<string, string[]> = { country: [sha256("tn")] };
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
 * appelée sans await après la création de la commande. */
export async function sendMetaPurchaseEvent(ev: MetaPurchaseEvent): Promise<void> {
  if (!isMetaConversionsApiConfigured()) {
    console.log(`[meta-capi] non configuré — commande #${ev.orderId} non envoyée à Meta`);
    return;
  }
  const eventId = `order-${ev.orderId}`;
  const body = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
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
          value: ev.totalMillimes / 1000,
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
      console.error(`[meta-capi] échec (${res.status}) pour la commande #${ev.orderId}: ${await res.text()}`);
    } else {
      console.log(`[meta-capi] Purchase envoyé pour la commande #${ev.orderId} (event_id=${eventId})`);
    }
  } catch (err) {
    console.error(`[meta-capi] erreur réseau pour la commande #${ev.orderId}:`, err);
  }
}
