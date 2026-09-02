import { useEffect } from 'react'

/**
 * Scroll reveal : observe chaque [data-reveal] / .mask-reveal et ajoute
 * .is-visible à l'entrée dans le viewport.
 *
 * Certains éléments (ex. les cartes produits) n'existent pas encore au
 * montage — ils arrivent après une requête réseau (tRPC/React Query).
 * Un MutationObserver surveille donc aussi le DOM en continu pour observer
 * ces éléments dès qu'ils apparaissent, au lieu de les laisser invisibles
 * à jamais (opacity: 0 sans jamais recevoir .is-visible).
 *
 * Filet de sécurité : sur certaines pages (Contact, Galerie), le premier
 * callback de l'IntersectionObserver peut ne jamais arriver pour les
 * éléments déjà visibles au montage (aucune erreur JS, mais .is-visible
 * n'est jamais ajouté et le contenu reste invisible tant que l'utilisateur
 * ne déclenche pas un scroll). Après le premier rendu, on vérifie donc
 * manuellement la position de chaque élément et on révèle immédiatement
 * ceux qui sont déjà dans le viewport, sans attendre l'observer.
 */
export function useReveal() {
  useEffect(() => {
    const SELECTOR = '[data-reveal], .mask-reveal'

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible')
            io.unobserve(e.target)
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    )

    const revealIfInViewport = (el: HTMLElement) => {
      if (el.classList.contains('is-visible')) return
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight || document.documentElement.clientHeight
      if (r.top < vh && r.bottom > 0) {
        el.classList.add('is-visible')
        io.unobserve(el)
      }
    }

    const observeNew = (root: ParentNode) => {
      root.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => {
        if (!el.classList.contains('is-visible')) io.observe(el)
      })
    }

    observeNew(document)

    // Filet de sécurité : après le premier paint, force la révélation de
    // tout ce qui est déjà à l'écran (voir commentaire ci-dessus).
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.querySelectorAll<HTMLElement>(SELECTOR).forEach(revealIfInViewport)
      })
    })

    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return
          if (node.matches(SELECTOR)) io.observe(node)
          observeNew(node)
        })
      }
    })
    mo.observe(document.body, { childList: true, subtree: true })

    return () => {
      io.disconnect()
      mo.disconnect()
    }
  }, [])
}
