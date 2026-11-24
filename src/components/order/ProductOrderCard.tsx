import { useState } from 'react'
import ProductImage from '@/components/ProductImage'
import PriceSticker from '@/components/PriceSticker'
import type { CatalogProduct } from '@/lib/orderLines'
import { ALLOWED_WEIGHTS_KG, formatWeight, priceForWeight, type WeightKg } from '@contracts/shop'
import { formatPriceDT } from '@contracts/packs'
import { useLang } from '@/lib/i18n'
import { productBadge, productName, productDescription } from '@contracts/productText'

const stepperBtnCls =
  'flex h-11 w-11 items-center justify-center rounded-full border border-sand bg-surface text-xl transition-colors hover:border-gold hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 disabled:opacity-30'

/** Carte « à la carte » : un produit, un poids au choix (500 g à 2,5 kg,
 * prix calculé depuis le prix au kilo), une quantité libre. Toutes les
 * lignes déjà dans la commande pour ce produit restent visibles. */
export default function ProductOrderCard({
  product,
  qtyByWeight,
  onAdd,
  onSetQty,
  sizes = '(max-width: 640px) 45vw, 320px',
}: {
  product: CatalogProduct
  /** Quantité déjà commandée pour chaque poids de ce produit. */
  qtyByWeight: Partial<Record<WeightKg, number>>
  onAdd: (weightKg: WeightKg) => void
  onSetQty: (weightKg: WeightKg, qty: number) => void
  /** Place réelle de la photo. Par défaut celle de la grille à deux
   * colonnes ; la carte mise en avant, elle, prend toute la largeur. */
  sizes?: string
}) {
  const lang = useLang()
  const isAr = lang === 'ar'
  const displayName = productName(product, lang)
  const displayDescription = productDescription(product, lang)
  const badge = productBadge(product, lang)
  const inCart = (Object.keys(qtyByWeight) as unknown as string[]).map(Number) as WeightKg[]
  const [weight, setWeight] = useState<WeightKg>(inCart[0] ?? 1)
  const qty = qtyByWeight[weight] ?? 0
  const price = priceForWeight(product.priceMillimes, weight)
  const otherLines = inCart.filter((w) => w !== weight && (qtyByWeight[w] ?? 0) > 0)

  return (
    <article
      className={`flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-surface ${
        inCart.length > 0 ? 'border-gold ring-1 ring-gold/40' : 'border-sand/60'
      }`}
      aria-label={`${displayName} — ${formatPriceDT(product.priceMillimes, lang)} ${isAr ? 'للكيلوغرام' : 'le kilo'}`}
    >
      {/* La photo et, à cheval sur son bord, l'étiquette de prix. L'étiquette
          est hors du cadre rogné de la photo — sinon elle serait coupée en
          deux — mais dans la carte. */}
      <div className="relative">
        <div className="aspect-square w-full overflow-hidden bg-cream">
          <ProductImage src={product.imageUrl} alt={displayName} compact sizes={sizes} />
        </div>
        {badge && (
          // Pas d'interlettrage forcé en arabe : il casse les ligatures.
          <span className={`absolute start-2.5 top-2.5 rounded-full bg-paper/90 px-2.5 py-1 text-[9px] font-semibold text-accent backdrop-blur-sm ${isAr ? 'tracking-normal' : 'uppercase tracking-[0.16em]'}`}>
            {badge}
          </span>
        )}
        {inCart.length > 0 && (
          <span className="absolute end-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-gold text-on-gold shadow" aria-hidden="true">
            ✓
          </span>
        )}
        {/* Le prix au kilo, là où l'œil se pose d'abord : sur la photo. Il
            était une ligne grise sous la description, la moins lisible de la
            carte, alors que c'est la première question de quiconque arrive
            d'une publicité. */}
        <PriceSticker
          millimes={product.priceMillimes}
          lang={lang}
          per={isAr ? 'الكيلو' : 'le kilo'}
          className="absolute -bottom-4 end-2.5 z-10"
        />
      </div>

      <div className="flex flex-1 flex-col p-3.5 pt-6 md:p-4 md:pt-7">
        <p className="break-words text-[15px] font-medium leading-snug">
          {displayName}
          {product.isExclusiveCreation && (
            <sup className="ms-0.5 text-xs font-semibold text-accent" title={isAr ? 'اسم حصري لعند لعزيز' : 'Création exclusive Chez Laziz'}>
              ™
            </sup>
          )}
        </p>
        {displayDescription && (
          // dir="auto" : une description saisie en arabe sur la page
          // française (ou l'inverse) se lit dans son propre sens, ponctuation
          // comprise, au lieu d'avoir ses guillemets renvoyés du mauvais côté.
          <p dir="auto" className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink/60">{displayDescription}</p>
        )}
        {/* Huit produits sur seize sont des créations de la maison, et cela
            ne se voyait qu'à un « ™ » minuscule collé au nom. C'est la
            différence la plus forte avec n'importe quelle autre boutique de
            makroudh du pays — elle mérite une ligne, pas un exposant. */}
        {product.isExclusiveCreation && (
          <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-accent">
            <span aria-hidden="true">✦</span>
            {isAr ? 'إبداع دار لعزيز' : 'Création Chez Laziz'}
          </p>
        )}

        {/* Pas d'étiquette « Poids » au-dessus : le menu affiche déjà
            « 1 kg — 40 DT ». Un mot en moins est un mot de moins à lire, et
            c'est le silence qui fait la tenue d'une page, pas l'abondance.
            Le lecteur d'écran, lui, garde son intitulé complet. */}
        <label className="relative mt-auto block pt-3">
          <span className="sr-only">{isAr ? 'الوزن' : 'Poids'}</span>
          <select
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value) as WeightKg)}
            aria-label={`${isAr ? 'الوزن' : 'Poids'} — ${displayName}`}
            // 16 px, pas 14 : en dessous, Safari sur iPhone AGRANDIT la page
            // dès qu'on touche un champ, et ne la remet jamais d'elle-même.
            // Le tout premier geste de la cliente — choisir son poids — faisait
            // déborder la grille et sortir à moitié la barre « Commander » de
            // l'écran. (Interdire le zoom dans le viewport corrigerait l'effet
            // en supprimant aussi le zoom manuel, dont les clientes se servent
            // pour lire : on règle la cause.)
            //
            // appearance-none + chevron dessiné : la flèche native prenait
            // 24 px dans une carte de 147, et « 2,5 kg — 30 DT » s'affichait
            // « 2,5 kg — 30 I ». Avec un point médian à la place du tiret et
            // une flèche plus fine, le poids et son prix tiennent en entier.
            className="h-11 w-full appearance-none rounded-lg border border-sand bg-paper pe-7 ps-2.5 text-base text-ink outline-none focus:border-gold focus:ring-2 focus:ring-gold/25"
          >
            {ALLOWED_WEIGHTS_KG.map((w) => (
              <option key={w} value={w}>
                {formatWeight(w, lang)} · {formatPriceDT(priceForWeight(product.priceMillimes, w), lang)}
              </option>
            ))}
          </select>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            aria-hidden="true"
            className="pointer-events-none absolute bottom-[15px] end-2.5 text-accent"
          >
            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </label>

        {/* Avant le premier ajout : UN bouton, sur toute la largeur, qui dit
            exactement ce qu'il fait — « Ajouter 500 g — 4 DT ». Le prix
            n'est plus à côté du bouton, il est DANS la décision : le client
            n'a pas à relier deux éléments pour savoir ce qu'il va payer. Et
            pleine largeur, c'est aussi une cible qu'un pouce ne rate pas. */}
        {qty === 0 ? (
          <button
            type="button"
            onClick={() => onAdd(weight)}
            // flex-wrap + py-2 : « أضف 2.5 كغ — 100 د.ت » dépassait la
            // pastille et se coupait sous 390 px, sur la seule cible qui
            // compte. Il passe à la ligne au lieu d'être tronqué.
            className="mt-2.5 flex min-h-11 w-full flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 rounded-full border border-gold/50 bg-gold/10 px-2 py-2 text-[12.5px] font-semibold text-accent transition-colors hover:bg-gold hover:text-on-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 active:bg-gold active:text-on-gold"
          >
            <span className="whitespace-nowrap">
              {isAr ? 'أضف' : 'Ajouter'} {formatWeight(weight, lang)}
            </span>
            <span className="chiffres whitespace-nowrap text-[13.5px] font-bold">{formatPriceDT(price, lang)}</span>
          </button>
        ) : (
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-2.5">
          {/* LE TOTAL DE LA LIGNE, pas le prix d'un exemplaire. À trois
              paquets, la carte affichait le prix d'UN seul juste à côté du
              « 3 » : la cliente lisait un montant que son panier ne
              confirmait pas, et devait faire la multiplication elle-même
              pour savoir ce qu'elle allait payer. */}
          <span className="chiffres whitespace-nowrap text-lg font-bold text-accent">{formatPriceDT(qty * price, lang)}</span>
          {(
            <div className="flex items-center gap-1.5" role="group" aria-label={`${isAr ? 'الكمية' : 'Quantité'} — ${displayName} ${formatWeight(weight, lang)}`}>
              <button type="button" aria-label={isAr ? `إنقاص ${displayName}` : `Retirer un ${displayName}`} onClick={() => onSetQty(weight, qty - 1)} className={stepperBtnCls}>
                −
              </button>
              <span className="chiffres w-7 text-center text-lg font-semibold" aria-live="polite">
                {qty}
              </span>
              <button type="button" aria-label={isAr ? `زيادة ${displayName}` : `Ajouter un ${displayName}`} onClick={() => onSetQty(weight, qty + 1)} className={stepperBtnCls}>
                +
              </button>
            </div>
          )}
        </div>
        )}

        {otherLines.length > 0 && (
          <p className="mt-2 text-[11px] text-ink/55">
            {isAr ? 'أيضًا في الطلب: ' : 'Aussi dans la commande : '}
            {otherLines.map((w) => `${qtyByWeight[w]} × ${formatWeight(w, lang)}`).join(', ')}
          </p>
        )}
      </div>
    </article>
  )
}
