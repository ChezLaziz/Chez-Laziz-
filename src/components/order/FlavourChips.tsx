import { useEffect, useRef } from 'react'
import ProductImage from '@/components/ProductImage'
import { flavourName } from '@contracts/flavourName'
import { productName, type TextLang, type TranslatableProduct } from '@contracts/productText'

type Choisissable = TranslatableProduct & { id: number; imageUrl?: string | null }

/** Le raccourci vers la saveur qu'on est venu chercher.
 *
 * Seize produits, c'est six écrans de défilement sur un téléphone. Le client
 * qui vient pour la pistache n'a aucune raison de traverser les quinze
 * autres : il abandonne avant, ou il achète le premier qu'il voit — et le
 * premier n'est pas forcément celui qui l'aurait fait revenir.
 *
 * Des PHOTOS, pas du texte : les seize noms commencent par les mêmes mots
 * (« Makroudh Blanc à la… ») et se lisent tous pareil au coin de l'œil. Une
 * photo de fraise, elle, se reconnaît sans lire — y compris par quelqu'un qui
 * lit mal le français, et ils sont nombreux parmi les clients visés.
 *
 * Rien n'est caché définitivement : « Tous » revient au catalogue entier, et
 * c'est l'état par défaut. Un filtre qui s'impose serait une régression.
 */
export default function FlavourChips({
  products,
  selectedId,
  onSelect,
  lang,
}: {
  products: Choisissable[]
  selectedId: number | null
  onSelect: (id: number | null) => void
  lang: TextLang
}) {
  const barre = useRef<HTMLDivElement>(null)
  const actif = useRef<HTMLButtonElement>(null)

  // La puce choisie doit rester visible : sur un téléphone, la quinzième est
  // hors de l'écran, et un filtre actif qu'on ne voit pas ressemble à un
  // catalogue vide.
  useEffect(() => {
    if (!selectedId || !actif.current) return
    actif.current.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [selectedId])

  if (products.length < 3) return null

  const tout = lang === 'ar' ? 'الكل' : 'Tous'

  return (
    // Le conteneur relatif porte le fondu de bord : la barre de défilement
    // est cachée, et sans ce signal le dernier bouton semblait simplement
    // coupé — rien ne disait qu'il y en avait d'autres derrière.
    <div className="relative -mx-5 mb-5 md:-mx-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 end-0 z-10 w-12 bg-gradient-to-r from-transparent to-[var(--bg)] rtl:bg-gradient-to-l"
      />
    <div
      ref={barre}
      role="group"
      aria-label={lang === 'ar' ? 'اختاروا النكهة' : 'Choisir une saveur'}
      // `overflow-x-auto` seul laisse la barre flotter au milieu d'un geste ;
      // l'accrochage donne la même sensation qu'un carrousel natif.
      // Un peu d'air à droite (pe-14) : le dernier bouton sort entièrement
      // du fondu quand on arrive au bout.
      className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-5 pb-2 pe-14 md:px-10 md:pe-20 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <button
        type="button"
        onClick={() => onSelect(null)}
        aria-pressed={selectedId === null}
        className={`flex min-h-[76px] w-[68px] shrink-0 snap-start flex-col items-center justify-center gap-1 rounded-2xl border px-1 text-[11px] font-medium transition-colors ${
          selectedId === null
            ? 'border-[#b8912e] bg-[#b8912e]/10 text-ink'
            : 'border-sand bg-white text-ink/60 hover:border-[#b8912e]/50'
        }`}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
          <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
          <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
          <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
        </svg>
        {tout}
      </button>

      {products.map((p) => {
        const complet = productName(p, lang)
        const choisi = selectedId === p.id
        return (
          <button
            key={p.id}
            ref={choisi ? actif : undefined}
            type="button"
            // Un deuxième appui relâche le filtre : c'est le geste attendu,
            // et il évite d'aller rechercher « Tous » à l'autre bout.
            onClick={() => onSelect(choisi ? null : p.id)}
            aria-pressed={choisi}
            // Le nom complet pour les lecteurs d'écran : la puce n'en montre
            // que la saveur, mais « Vanille » seul ne dit pas ce que c'est.
            aria-label={complet}
            title={complet}
            className={`flex w-[68px] shrink-0 snap-start flex-col items-center gap-1 rounded-2xl border p-1.5 transition-colors ${
              choisi ? 'border-[#b8912e] bg-[#b8912e]/10' : 'border-sand bg-white hover:border-[#b8912e]/50'
            }`}
          >
            <span className="h-11 w-11 overflow-hidden rounded-xl">
              <ProductImage src={p.imageUrl} alt="" compact />
            </span>
            <span
              className={`line-clamp-2 text-center text-[10.5px] font-medium leading-tight ${
                choisi ? 'text-ink' : 'text-ink/60'
              }`}
            >
              {flavourName(complet)}
            </span>
          </button>
        )
      })}
    </div>
    </div>
  )
}
