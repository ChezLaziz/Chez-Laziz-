// Notification e-mail à l'équipe pour chaque nouvelle commande.
//
// Volontairement minimal : un appel HTTP à l'API Resend (pas de dépendance
// supplémentaire), activé seulement si les variables d'environnement sont
// présentes. Sans configuration, la commande est quand même enregistrée
// et l'absence d'e-mail est simplement journalisée — l'e-mail est un
// confort, jamais une condition pour accepter une commande.
//
// Variables : RESEND_API_KEY, EMAIL_FROM (ex. "Chez Laziz <commandes@chezlaziz.com>"),
// ADMIN_NOTIFY_EMAIL (destinataire, ex. contact@chezlaziz.com).

import type { OrderItem } from "../queries/orders";
import { formatWeight } from "@contracts/shop";

type NotifiableOrder = {
  id: number;
  customerName: string;
  phone: string;
  governorate: string;
  city: string;
  address: string;
  postalCode: string | null;
  items: string;
  subtotalMillimes: number;
  deliveryFeeMillimes: number;
  totalMillimes: number;
  paymentMethod: "cod" | "d17";
  paymentStatus: string;
  note: string | null;
};

function tnd(millimes: number): string {
  return `${(millimes / 1000).toFixed(3)} TND`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseItems(json: string): OrderItem[] {
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY && process.env.EMAIL_FROM && process.env.ADMIN_NOTIFY_EMAIL,
  );
}

export function buildNewOrderEmail(order: NotifiableOrder): { subject: string; html: string; text: string } {
  const items = parseItems(order.items);
  const paymentLabel =
    order.paymentMethod === "d17"
      ? "D17 — capture d'écran à vérifier dans l'admin"
      : "Espèces à la livraison";
  const addressLine = `${order.address}, ${order.city}${order.postalCode ? ` ${order.postalCode}` : ""}, ${order.governorate}`;

  const contentsText = (it: OrderItem) =>
    it.contents?.length
      ? ` [${it.contents.map((c) => `${c.name} ${formatWeight(c.weightKg)}`).join(", ")}]`
      : "";
  const lines = items.map(
    (it) =>
      `${it.qty} × ${it.name} (${formatWeight(it.weightKg)})${contentsText(it)} — ${tnd(it.qty * it.unitPriceMillimes)}`,
  );

  const text = [
    `Nouvelle commande #${order.id}`,
    ``,
    `Client : ${order.customerName}`,
    `Téléphone : ${order.phone}`,
    `Livraison : ${addressLine}`,
    ``,
    ...lines,
    ``,
    `Sous-total : ${tnd(order.subtotalMillimes)}`,
    `Livraison : ${tnd(order.deliveryFeeMillimes)}`,
    `Total : ${tnd(order.totalMillimes)}`,
    `Paiement : ${paymentLabel}`,
    order.note ? `Note : ${order.note}` : ``,
    ``,
    `Ouvrir l'admin : https://chezlaziz.com/admin`,
  ]
    .filter((l) => l !== undefined)
    .join("\n");

  const rows = items
    .map(
      (it) =>
        `<tr><td style="padding:6px 0">${it.qty} × ${escapeHtml(it.name)} <span style="color:#756a61">(${formatWeight(it.weightKg)})</span>${
          it.contents?.length
            ? `<br><span style="font-size:13px;color:#756a61">${it.contents.map((c) => `${escapeHtml(c.name)} ${formatWeight(c.weightKg)}`).join(" · ")}</span>`
            : ""
        }</td><td style="padding:6px 0;text-align:right;vertical-align:top">${tnd(it.qty * it.unitPriceMillimes)}</td></tr>`,
    )
    .join("");

  const html = `
<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#2b211b;background:#faf7f0;padding:28px 24px">
  <p style="margin:0;font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:#c88a3d">Chez Laziz</p>
  <h1 style="margin:8px 0 20px;font-size:24px;font-weight:normal">Nouvelle commande #${order.id}</h1>
  ${order.paymentMethod === "d17" ? `<p style="margin:0 0 16px;padding:10px 12px;background:#fff4dd;border:1px solid #e8c98a;border-radius:8px"><strong>D17</strong> — une capture d'écran de paiement est à vérifier dans l'admin.</p>` : ""}
  <p style="margin:0 0 4px"><strong>${escapeHtml(order.customerName)}</strong> · <a href="tel:${escapeHtml(order.phone)}" style="color:#c88a3d">${escapeHtml(order.phone)}</a></p>
  <p style="margin:0 0 20px;color:#756a61">${escapeHtml(addressLine)}</p>
  <table style="width:100%;border-collapse:collapse;border-top:1px solid #e8ded0;border-bottom:1px solid #e8ded0;font-size:15px">${rows}</table>
  <table style="width:100%;margin-top:12px;font-size:14px;color:#756a61">
    <tr><td>Sous-total</td><td style="text-align:right">${tnd(order.subtotalMillimes)}</td></tr>
    <tr><td>Livraison</td><td style="text-align:right">${tnd(order.deliveryFeeMillimes)}</td></tr>
    <tr><td style="padding-top:8px;color:#2b211b;font-size:17px">Total</td><td style="padding-top:8px;text-align:right;color:#2b211b;font-size:17px"><strong>${tnd(order.totalMillimes)}</strong></td></tr>
  </table>
  <p style="margin:16px 0 0">Paiement : ${escapeHtml(paymentLabel)}</p>
  ${order.note ? `<p style="margin:12px 0 0;padding:10px 12px;background:#f2eadf;border-radius:8px">« ${escapeHtml(order.note)} »</p>` : ""}
  <p style="margin:24px 0 0"><a href="https://chezlaziz.com/admin" style="display:inline-block;padding:10px 18px;background:#c88a3d;color:#fff;text-decoration:none;border-radius:999px;font-size:13px;letter-spacing:.1em;text-transform:uppercase">Ouvrir l'admin</a></p>
</div>`;

  return { subject: `Nouvelle commande #${order.id} — ${order.customerName}`, html, text };
}

/** Envoie la notification ; ne lève jamais (journalise l'échec) — appelée
 * sans await après la création de la commande. */
export async function notifyAdminNewOrder(order: NotifiableOrder): Promise<void> {
  if (!isEmailConfigured()) {
    console.log(`[email] non configuré — commande #${order.id} non notifiée par e-mail`);
    return;
  }
  const { subject, html, text } = buildNewOrderEmail(order);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [process.env.ADMIN_NOTIFY_EMAIL],
        subject,
        html,
        text,
      }),
    });
    if (!res.ok) {
      console.error(`[email] échec (${res.status}) pour la commande #${order.id}: ${await res.text()}`);
    }
  } catch (err) {
    console.error(`[email] erreur réseau pour la commande #${order.id}:`, err);
  }
}
