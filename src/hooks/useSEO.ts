import { useEffect } from 'react'

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

/** Met à jour title/description/canonical/OG pour la page courante (SPA sans SSR :
 * les valeurs statiques d'index.html ne servent que pour "/" et le premier chargement). */
/** JSON-LD à insérer dans un <script> : "</" y est échappé pour qu'une
 * valeur venant de la base (nom de produit, description) ne puisse jamais
 * fermer la balise et injecter du HTML dans la page. */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

/** Insère (ou met à jour) un bloc JSON-LD identifié par id dans <head>.
 * Retourne une fonction de nettoyage à appeler au démontage. */
export function setJsonLd(id: string, data: unknown): () => void {
  let script = document.getElementById(id) as HTMLScriptElement | null
  if (!script) {
    script = document.createElement('script')
    script.id = id
    script.type = 'application/ld+json'
    document.head.appendChild(script)
  }
  script.textContent = safeJsonLd(data)
  return () => {
    document.getElementById(id)?.remove()
  }
}

/** Pose (ou retire) les <link rel="alternate" hreflang="…"> de la page —
 * seules les pages traduites en arabe (voir BILINGUAL_BASE_PATHS) en ont.
 * "x-default" pointe vers le français : c'est le marché principal, la
 * version à montrer à un visiteur dont la langue ne correspond à aucune
 * des deux. */
function setHreflangLinks(alternates?: { fr: string; ar: string }) {
  document.querySelectorAll('link[data-seo-hreflang]').forEach((el) => el.remove())
  if (!alternates) return
  const entries: [string, string][] = [
    ['fr', alternates.fr],
    ['ar', alternates.ar],
    ['x-default', alternates.fr],
  ]
  for (const [hreflang, href] of entries) {
    const link = document.createElement('link')
    link.setAttribute('rel', 'alternate')
    link.setAttribute('hreflang', hreflang)
    link.setAttribute('href', `https://chezlaziz.com${href}`)
    link.setAttribute('data-seo-hreflang', '1')
    document.head.appendChild(link)
  }
}

export function useSEO({
  title,
  description,
  path,
  breadcrumb,
  noindex = false,
  article,
  alternates,
}: {
  title: string
  description: string
  path: string
  /** Nom affiché de la page courante dans le fil d'Ariane (schema.org
   * BreadcrumbList) — omis sur l'accueil, qui n'a pas de fil d'Ariane. */
  breadcrumb?: string
  /** Pages à ne pas indexer (404, admin). */
  noindex?: boolean
  /** Articles du Journal : ajoute un schéma Article (date réelle de
   * publication, auteur = la maison). */
  article?: { datePublished: string; dateModified?: string }
  /** Chemins fr/ar de cette page si elle existe dans les deux langues
   * (ex. { fr: '/collection', ar: '/ar/collection' }). */
  alternates?: { fr: string; ar: string }
}) {
  useEffect(() => {
    const articleId = 'seo-article-jsonld'
    if (article) {
      setJsonLd(articleId, {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: title.replace(/ — Journal Chez Laziz$/, ''),
        description,
        inLanguage: 'fr',
        mainEntityOfPage: `https://chezlaziz.com${path}`,
        image: 'https://chezlaziz.com/images/hero.jpg',
        datePublished: article.datePublished,
        dateModified: article.dateModified ?? article.datePublished,
        author: { '@type': 'Organization', name: 'Chez Laziz', url: 'https://chezlaziz.com/' },
        publisher: { '@id': 'https://chezlaziz.com/#business' },
      })
    } else {
      document.getElementById(articleId)?.remove()
    }
  }, [article, title, description, path])

  useEffect(() => {
    document.title = title
    setMeta('name', 'description', description)
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:url', `https://chezlaziz.com${path}`)
    setMeta('name', 'twitter:title', title)
    setMeta('name', 'twitter:description', description)

    const robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]')
    if (noindex) {
      setMeta('name', 'robots', 'noindex, nofollow')
    } else {
      robots?.remove()
    }

    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.setAttribute('rel', 'canonical')
      document.head.appendChild(canonical)
    }
    canonical.setAttribute('href', `https://chezlaziz.com${path}`)

    setHreflangLinks(alternates)

    const scriptId = 'seo-breadcrumb-jsonld'
    if (breadcrumb) {
      const isAr = path === '/ar' || path.startsWith('/ar/')
      setJsonLd(scriptId, {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: isAr ? 'الرئيسية' : 'Accueil',
            item: isAr ? 'https://chezlaziz.com/ar' : 'https://chezlaziz.com/',
          },
          { '@type': 'ListItem', position: 2, name: breadcrumb, item: `https://chezlaziz.com${path}` },
        ],
      })
    } else {
      document.getElementById(scriptId)?.remove()
    }
  }, [title, description, path, breadcrumb, noindex, alternates])
}
