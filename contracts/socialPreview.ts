/** Ce que lisent WhatsApp, Facebook et Google AVANT le moindre JavaScript.
 *
 * index.html est servi TEL QUEL pour toutes les routes, et les robots
 * d'aperçu n'exécutent pas de JavaScript : useSEO corrige bien le titre et
 * l'adresse côté navigateur, mais trop tard pour eux. Chaque lien de la
 * boutique collé dans un groupe WhatsApp ou une publication Facebook
 * s'annonçait donc comme la page d'accueil — y compris /ar/commande, la
 * page vers laquelle pointent les publicités.
 *
 * Une seule source pour les deux côtés : la page React lit les mêmes
 * chaînes (voir src/pages/OrderPage.tsx), sinon les deux finissent par
 * diverger et personne ne s'en aperçoit — un aperçu ne se regarde jamais
 * depuis le site. */
export type SocialPreview = {
  /** Chemin exact, sans barre finale. */
  path: string;
  title: string;
  description: string;
  locale: "fr_FR" | "ar_TN";
};

export const SITE_ORIGIN = "https://chezlaziz.com";

export const ORDER_PREVIEW_FR: SocialPreview = {
  path: "/commande",
  title: "Commander — Chez Laziz | Makroudh au poids, packs et pack sur mesure",
  description:
    "Commandez vos makroudh Chez Laziz : à la carte (500 g à 2,5 kg), packs Laziz VIP, Premium, Délice, Classique ou pack sur mesure (4 × 500 g). Livraison partout en Tunisie sous 24h, paiement en espèces à la livraison.",
  locale: "fr_FR",
};

export const ORDER_PREVIEW_AR: SocialPreview = {
  path: "/ar/commande",
  title: "اطلبوا — Chez Laziz | مقروض بالوزن، حزم جاهزة وحزمة على المقاس",
  description:
    "اطلبوا مقروض Chez Laziz: بالوزن (500 غ إلى 2.5 كغ)، حزم لعزيز الملكية والفاخرة والشهية والكلاسيكية، أو حزمة على مقاسكم (4 × 500 غ). توصيل في جميع أنحاء تونس خلال 24 ساعة، الدفع نقدًا عند التسليم.",
  locale: "ar_TN",
};

/** Les pages dont l'aperçu doit être juste dans le HTML brut. Les
 * publicités pointent vers /ar/commande : c'est celle qui compte le plus. */
const PREVIEWS: readonly SocialPreview[] = [ORDER_PREVIEW_FR, ORDER_PREVIEW_AR];

export function socialPreviewFor(pathname: string): SocialPreview | undefined {
  const sansBarre = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  return PREVIEWS.find((p) => p.path === sansBarre);
}

export function previewUrl(preview: SocialPreview): string {
  return `${SITE_ORIGIN}${preview.path}`;
}
