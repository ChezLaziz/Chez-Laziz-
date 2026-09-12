// Préchauffage des vignettes du catalogue au démarrage.
//
// Le 11 septembre, en pleine campagne publicitaire, le jeton du stockage a
// cessé de fonctionner : pendant des heures, chaque visiteur de la page de
// commande a vu seize cases vides à la place des photos — 4 000 réponses
// 404 par heure. La surveillance (r2Health) prévient désormais sur Telegram
// dans l'heure, mais prévenir n'est pas servir.
//
// Ici, dès que le serveur démarre, il demande lui-même chaque vignette du
// catalogue : elles entrent dans le cache mémoire de r2.ts. Si le stockage
// lâche ensuite, les photos continuent d'être servies de mémoire jusqu'au
// prochain déploiement — le temps de réparer le jeton sans perdre une
// journée de ventes. Séquentiel, pour ne pas assaillir le stockage au
// démarrage : une cinquantaine de requêtes, quelques secondes.

import { listProducts } from "../queries/products";
import { LARGEURS_VIGNETTES, getResizedImage, vignettesEnMemoire } from "./r2";

const PREFIXE_UPLOADS = "/api/uploads/";

/** Clé de stockage d'une URL d'image uploadée, ou null pour toute autre URL
 * (photo statique du thème, lien externe, vide). */
export function cleDepuisUrl(url: string | null | undefined): string | null {
  if (!url || !url.startsWith(PREFIXE_UPLOADS)) return null;
  const cle = url.slice(PREFIXE_UPLOADS.length).replace(/[?#].*$/, "");
  return /^(products|gallery|site)\/[a-zA-Z0-9_-]+\.(jpg|png|webp)$/.test(cle) ? cle : null;
}

/** Ne lève jamais : un préchauffage raté n'est qu'une ligne de journal, le
 * site sert alors les photos comme avant, à la demande. */
export async function warmProductThumbnails(): Promise<void> {
  try {
    const produits = await listProducts();
    const cles = produits.map((p) => cleDepuisUrl(p.imageUrl)).filter((c): c is string => c !== null);
    let servies = 0;
    for (const cle of cles) {
      for (const largeur of LARGEURS_VIGNETTES) {
        const r = await getResizedImage(cle, largeur).catch(() => null);
        if (r) servies++;
      }
    }
    console.log(`[r2] ${servies} vignettes préchauffées (${vignettesEnMemoire()} en mémoire)`);
  } catch (err) {
    console.error("[r2] préchauffage des vignettes impossible :", err instanceof Error ? err.message : err);
  }
}
