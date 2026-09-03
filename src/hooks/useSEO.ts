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
export function useSEO({
  title,
  description,
  path,
  breadcrumb,
}: {
  title: string
  description: string
  path: string
  /** Nom affiché de la page courante dans le fil d'Ariane (schema.org
   * BreadcrumbList) — omis sur l'accueil, qui n'a pas de fil d'Ariane. */
  breadcrumb?: string
}) {
  useEffect(() => {
    document.title = title
    setMeta('name', 'description', description)
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:url', `https://chezlaziz.com${path}`)
    setMeta('name', 'twitter:title', title)
    setMeta('name', 'twitter:description', description)

    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.setAttribute('rel', 'canonical')
      document.head.appendChild(canonical)
    }
    canonical.setAttribute('href', `https://chezlaziz.com${path}`)

    const scriptId = 'seo-breadcrumb-jsonld'
    let script = document.getElementById(scriptId) as HTMLScriptElement | null
    if (breadcrumb) {
      if (!script) {
        script = document.createElement('script')
        script.id = scriptId
        script.type = 'application/ld+json'
        document.head.appendChild(script)
      }
      script.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://chezlaziz.com/' },
          { '@type': 'ListItem', position: 2, name: breadcrumb, item: `https://chezlaziz.com${path}` },
        ],
      })
    } else {
      script?.remove()
    }
  }, [title, description, path, breadcrumb])
}
