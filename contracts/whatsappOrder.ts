/** Le message WhatsApp d'une commande, écrit à la place du client.
 *
 * POURQUOI. Un lien wa.me sans texte ouvre une conversation VIDE : le client
 * doit alors retaper ce qu'il vient de choisir, article par article, poids
 * compris. Presque personne ne le fait — il ferme. En Tunisie, où WhatsApp
 * est la messagerie par défaut et où une partie des acheteurs ne remplira
 * jamais un formulaire, ce message pré-écrit est la différence entre une
 * commande et un abandon.
 *
 * Le message est LISIBLE PAR UN HUMAIN, pas une charge utile : c'est le
 * commerçant qui le lit sur son téléphone et rappelle. Aucun identifiant
 * technique, aucun code — des noms, des poids, des dinars. */

export type WhatsAppLine = {
  /** Déjà traduit et formaté : « 1 كغ مقروض بالتمر ». */
  label: string;
  /** Contenu d'un pack, déjà formaté. Vide pour un produit simple. */
  contents: string[];
  /** Prix de la ligne entière, en millimes. */
  totalMillimes: number;
};

/** Millimes → « 8 » ou « 12,5 » (virgule décimale, usage tunisien). */
function dt(millimes: number): string {
  const v = millimes / 1000;
  return Number.isInteger(v) ? String(v) : v.toFixed(3).replace(/0+$/, "").replace(".", ",");
}

/** Compose le message. Le client n'a plus qu'à appuyer sur « envoyer ».
 *
 * Il se termine par une question ouverte plutôt qu'un point final : un
 * message qui attend une réponse obtient une réponse. */
export function whatsAppOrderMessage(
  lines: WhatsAppLine[],
  totals: { subtotalMillimes: number; deliveryMillimes: number; totalMillimes: number },
  lang: "fr" | "ar",
): string {
  if (lines.length === 0) {
    return lang === "ar"
      ? "السلام عليكم، نحب نستفسر على المقروض متاعكم."
      : "Bonjour, je souhaite des informations sur vos makroudh.";
  }

  const items = lines.map((l) => {
    const contents = l.contents.length > 0 ? `\n   (${l.contents.join(" · ")})` : "";
    return `• ${l.label} — ${dt(l.totalMillimes)} ${lang === "ar" ? "د.ت" : "DT"}${contents}`;
  });

  if (lang === "ar") {
    return [
      "السلام عليكم، نحب نطلب من عند لعزيز :",
      "",
      ...items,
      "",
      `التوصيل : ${dt(totals.deliveryMillimes)} د.ت`,
      `المجموع : ${dt(totals.totalMillimes)} د.ت`,
      "",
      "نعطيكم العنوان متاعي ؟",
    ].join("\n");
  }
  return [
    "Bonjour, je souhaite commander chez Laziz :",
    "",
    ...items,
    "",
    `Livraison : ${dt(totals.deliveryMillimes)} DT`,
    `Total : ${dt(totals.totalMillimes)} DT`,
    "",
    "Je vous donne mon adresse ?",
  ].join("\n");
}

/** Lien wa.me prêt à ouvrir, message compris.
 *
 * `encodeURIComponent` et non `encodeURI` : sans lui, les retours à la ligne
 * et le « + » d'un prix casseraient la mise en forme du message. */
export function whatsAppOrderUrl(phoneDigits: string, message: string): string {
  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
}
