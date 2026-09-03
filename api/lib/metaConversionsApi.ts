// Meta Conversions API (Facebook/Instagram) — événement "Purchase" envoyé
// côté serveur, en complément du Pixel navigateur (src/lib/metaPixel.ts).
// Nécessaire depuis les restrictions iOS 14+ / bloqueurs de pub : le Pixel
// seul rate une partie des conversions.
//
// Activé seulement si META_PIXEL_ID et META_CONVERSIONS_API_TOKEN sont
// définis. Sans configuration, ne fait rien — la commande est quand même
// enregistrée (même principe que l'e-mail, voir api/lib/email.ts).
//
// `eventId` doit être identique à celui envoyé par le Pixel navigateur
// ("order-<id>") pour que Meta déduplique les deux envois d'un même achat.
// Le téléphone du client est haché (SHA-256) avant envoi, comme l'exige
// Meta — jamais transmis en clair.

import { createHash } from "node:crypto";

const GRAPH_API_VERSION = "v21.0";

export function isMetaConversionsApiConfigured(): boolean {
  return Boolean(process.env.META_PIXEL_ID && process.env.META_CONVERSIONS_API_TOKEN);
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

export type MetaPurchaseEvent = {
  orderId: number;
  phone: string;
  totalMillimes: number;
  contentIds: string[];
  sourceUrl?: string;
};

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
        user_data: {
          ph: [sha256(normalizeTunisianPhone(ev.phone))],
        },
        custom_data: {
          currency: "TND",
          value: ev.totalMillimes / 1000,
          content_type: "product",
          content_ids: ev.contentIds,
        },
      },
    ],
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
    }
  } catch (err) {
    console.error(`[meta-capi] erreur réseau pour la commande #${ev.orderId}:`, err);
  }
}
