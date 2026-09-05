// Routes publiques du site — partagées entre le routeur React (src/App.tsx)
// et le serveur (api/lib/vite.ts) pour qu'une URL inconnue renvoie un vrai
// statut HTTP 404 au lieu de servir l'accueil en 200 ("soft 404", mauvais
// pour Google et déroutant pour un visiteur qui a fait une faute de frappe).
//
// Une entrée se terminant par "/*" accepte un segment supplémentaire
// (ex. "/journal/*" couvre "/journal/mon-article").
export const PUBLIC_ROUTES = [
  "/",
  "/ar",
  "/la-maison",
  "/collection",
  "/ar/collection",
  "/galerie",
  "/contact",
  "/commande",
  "/ar/commande",
  "/admin",
  "/politique-de-confidentialite",
  "/conditions-generales",
  "/livraison",
  "/faq",
  "/makroudh-tunisien",
  "/makroudh-kairouan",
  "/makroudh-aux-dattes",
  "/makroudh-fruits-secs",
  "/journal",
  "/journal/*",
] as const;

/** Vrai si le chemin correspond à une page connue de l'application. */
export function isKnownPublicPath(pathname: string): boolean {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  for (const route of PUBLIC_ROUTES) {
    if (route.endsWith("/*")) {
      const base = route.slice(0, -2);
      if (path === base) return true;
      if (path.startsWith(base + "/") && !path.slice(base.length + 1).includes("/")) {
        return true;
      }
    } else if (path === route) {
      return true;
    }
  }
  return false;
}
