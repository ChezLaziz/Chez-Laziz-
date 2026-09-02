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

    const observeNew = (root: ParentNode) => {
      root.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => {
        if (!el.classList.contains('is-visible')) io.observe(el)
      })
    }

    observeNew(document)

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
