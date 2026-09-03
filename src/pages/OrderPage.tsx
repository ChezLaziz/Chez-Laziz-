import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { trpc } from '@/providers/trpc'
import { useCart } from '@/providers/cart'
import { useSEO } from '@/hooks/useSEO'
import { formatTND, PHONE_DISPLAY, PHONE_TEL } from '@/lib/shop'
import {
  ALLOWED_WEIGHTS_KG,
  DELIVERY_FEE_MILLIMES,
  DELIVERY_METHOD_LABEL,
  DELIVERY_REGION,
  DELIVERY_TIME_LABEL,
  D17_NUMBER_DISPLAY,
  PAYMENT_PROOF_ALLOWED_MIME,
  PAYMENT_PROOF_MAX_SIZE_BYTES,
  TUNISIA_GOVERNORATES,
  formatWeight,
  priceForWeight,
  type PaymentMethod,
  type WeightKg,
} from '@contracts/shop'

function TopBar({ title }: { title: string }) {
  return (
    <header className="border-b border-sand/60 bg-[#faf6f3]">
      <div className="h-[3px] bg-gradient-to-r from-[#8f6f22] via-[#b8912e] to-[#8f6f22]" />
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:h-20 md:px-10">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/images/logo.webp" alt="Chez Laziz" className="h-9 w-9 md:h-10 md:w-10" />
          <span className="font-display text-xl tracking-[0.14em] text-ink md:text-2xl">
            CHEZ&nbsp;LAZIZ
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="hidden text-[11px] font-medium uppercase tracking-[0.35em] text-accent sm:inline">
            {title}
          </span>
          <a
            href={PHONE_TEL}
            className="hidden items-center gap-2 rounded-full border border-ink/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70 transition-colors hover:border-[#b8912e] hover:text-accent md:flex"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" strokeLinejoin="round" />
            </svg>
            {PHONE_DISPLAY}
          </a>
        </div>
      </div>
    </header>
  )
}

const inputCls =
  'w-full rounded-lg border border-sand bg-white px-4 py-3 text-[15px] text-ink outline-none transition-colors placeholder:text-ink/35 focus:border-[#b8912e]'
const labelCls = 'mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-ink/45'

type DbProduct = {
  id: number
  name: string
  description: string | null
  priceMillimes: number
  category: string
  badge: string | null
  imageUrl: string | null
  available: boolean
}

/** Une ligne produit : sélecteur de poids (500 g à 2,5 kg, prix recalculé en
 * direct depuis le prix pour 1 kg) + quantité. Le poids affiché suit la
 * ligne déjà présente dans le panier ; le changer déplace la quantité vers
 * le nouveau poids plutôt que d'ajouter une ligne séparée. */
function ProductRow({ product }: { product: DbProduct }) {
  const { qtyFor, add, setQty, setWeight } = useCart()
  const [weight, setLocalWeight] = useState<WeightKg>(1)
  const qty = qtyFor(product.id, weight)
  const unitPrice = priceForWeight(product.priceMillimes, weight)

  return (
    <div
      className={`rounded-xl border p-5 shadow-sm transition-colors ${
        qty > 0 ? 'border-[#b8912e] bg-[#f5ece5]' : 'border-sand bg-white'
      }`}
    >
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-sand bg-[#faf6f3]">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-[9px] text-ink/30">Chez Laziz</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-medium">{product.name}</span>
            {product.badge && (
              <span className="rounded-full border border-[#b8912e] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-accent">
                {product.badge}
              </span>
            )}
          </div>
          {product.description && (
            <p className="mt-1 line-clamp-2 text-sm font-light text-ink/55">{product.description}</p>
          )}
          <span className="mt-1 block font-display text-accent">
            {formatTND(unitPrice)} <span className="text-xs">TND</span>
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-sand/60 pt-4">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-ink/50">Poids</span>
          <select
            value={weight}
            onChange={(e) => {
              const next = Number(e.target.value) as WeightKg
              if (qty > 0) setWeight(product.id, weight, next)
              setLocalWeight(next)
            }}
            className="rounded-lg border border-sand bg-white px-3 py-1.5 text-sm outline-none focus:border-[#b8912e]"
          >
            {ALLOWED_WEIGHTS_KG.map((w) => (
              <option key={w} value={w}>
                {formatWeight(w)}
              </option>
            ))}
          </select>
        </label>

        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            aria-label="Moins"
            onClick={() => setQty(product.id, weight, qty - 1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-sand text-lg transition-colors hover:border-[#b8912e] hover:text-accent disabled:opacity-30"
            disabled={qty === 0}
          >
            −
          </button>
          <span className="w-6 text-center font-display text-lg">{qty}</span>
          <button
            type="button"
            aria-label="Plus"
            onClick={() => (qty === 0 ? add(product.id, weight) : setQty(product.id, weight, qty + 1))}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-sand text-lg transition-colors hover:border-[#b8912e] hover:text-accent"
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}

function digitsOnly(s: string) {
  return s.replace(/\D/g, '')
}

/** Numéro tunisien : 8 chiffres (fixe/mobile), avec ou sans indicatif +216. */
function isValidTunisianPhone(phone: string): boolean {
  const digits = digitsOnly(phone)
  const local = digits.startsWith('216') ? digits.slice(3) : digits
  return local.length === 8
}

export default function OrderPage() {
  useSEO({
    title: 'Commander — Chez Laziz | Livraison de makroudh partout en Tunisie',
    description:
      'Composez votre commande de makroudh Chez Laziz — livraison à domicile partout en Tunisie sous 24h (8.000 TND), paiement à la livraison ou par D17.',
    path: '/commande',
    breadcrumb: 'Commander',
  })
  const { data: products, isLoading } = trpc.products.list.useQuery()
  const createOrder = trpc.orders.create.useMutation()
  const sendMessage = trpc.contact.send.useMutation()

  const { lines, clear } = useCart()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [governorate, setGovernorate] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [note, setNote] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod')
  const [proofKey, setProofKey] = useState<string | null>(null)
  const [proofPreview, setProofPreview] = useState<string | null>(null)
  const [proofUploading, setProofUploading] = useState(false)
  const [proofError, setProofError] = useState<string | null>(null)
  const [placed, setPlaced] = useState<{ id: number; waUrl: string; paymentMethod: PaymentMethod } | null>(null)

  const [msgName, setMsgName] = useState('')
  const [msgPhone, setMsgPhone] = useState('')
  const [msgText, setMsgText] = useState('')
  const [msgSent, setMsgSent] = useState(false)

  const items = useMemo(
    () =>
      lines
        .map((l) => {
          const p = (products ?? []).find((pr) => pr.id === l.productId)
          if (!p) return null
          return { ...p, weightKg: l.weightKg, qty: l.qty, unitPriceMillimes: priceForWeight(p.priceMillimes, l.weightKg) }
        })
        .filter((x): x is NonNullable<typeof x> => x != null),
    [products, lines],
  )
  const subtotal = items.reduce((s, p) => s + p.qty * p.unitPriceMillimes, 0)
  const total = subtotal + DELIVERY_FEE_MILLIMES

  const phoneValid = isValidTunisianPhone(phone)
  const addressValid = name.trim().length >= 2 && phoneValid && !!governorate && city.trim().length > 0 && address.trim().length >= 5
  const paymentValid = paymentMethod === 'cod' || !!proofKey
  const canSubmit = items.length > 0 && addressValid && paymentValid && !createOrder.isPending

  const handleProofChange = async (file: File | null) => {
    setProofError(null)
    setProofKey(null)
    if (proofPreview) URL.revokeObjectURL(proofPreview)
    setProofPreview(null)
    if (!file) return
    if (!PAYMENT_PROOF_ALLOWED_MIME.has(file.type)) {
      setProofError('Format non supporté — utilisez une image JPG, PNG ou WEBP.')
      return
    }
    if (file.size > PAYMENT_PROOF_MAX_SIZE_BYTES) {
      setProofError('Image trop lourde (8 Mo maximum).')
      return
    }
    setProofPreview(URL.createObjectURL(file))
    setProofUploading(true)
    try {
      const body = new FormData()
      body.append('file', file)
      const res = await fetch('/api/uploads/payment-proof', { method: 'POST', body })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Échec de l'envoi de la capture")
      setProofKey(data.key)
    } catch (e) {
      setProofError(e instanceof Error ? e.message : "Échec de l'envoi de la capture")
    } finally {
      setProofUploading(false)
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    createOrder.mutate(
      {
        customerName: name.trim(),
        phone: phone.trim(),
        governorate: governorate as (typeof TUNISIA_GOVERNORATES)[number],
        city: city.trim(),
        address: address.trim(),
        postalCode: postalCode.trim() || undefined,
        note: note.trim() || undefined,
        items: items.map((p) => ({ productId: p.id, weightKg: p.weightKg, qty: p.qty })),
        paymentMethod,
        paymentProofKey: paymentMethod === 'd17' ? (proofKey ?? undefined) : undefined,
      },
      {
        onSuccess: (order) => {
          const lines = items
            .map((p) => `• ${p.qty} × ${p.name} (${formatWeight(p.weightKg)})`)
            .join('\n')
          const text = `Bonjour Chez Laziz ! Commande n°${order?.id ?? ''} — ${name.trim()} :\n${lines}\nLivraison : ${city.trim()}, ${governorate}\nTotal (livraison incluse) : ${formatTND(total)} TND\nPaiement : ${paymentMethod === 'd17' ? 'D17 (capture envoyée)' : 'À la livraison'}`
          setPlaced({
            id: order?.id ?? 0,
            waUrl: 'https://wa.me/21623691039?text=' + encodeURIComponent(text),
            paymentMethod,
          })
          clear()
          window.scrollTo({ top: 0 })
        },
      },
    )
  }

  const submitMessage = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage.mutate(
      { name: msgName.trim(), phone: msgPhone.trim() || undefined, message: msgText.trim() },
      { onSuccess: () => { setMsgSent(true); setMsgName(''); setMsgPhone(''); setMsgText('') } },
    )
  }

  if (placed) {
    return (
      <div className="min-h-screen bg-[#faf6f3]">
        <TopBar title="Commande" />
        <main className="mx-auto flex max-w-2xl flex-col items-center px-5 py-24 text-center md:py-32">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#b8912e]/15 text-accent">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12.5l5 5L20 6.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <h1 className="mt-8 font-display text-4xl md:text-5xl">
            Merci, commande n°{placed.id} reçue&nbsp;!
          </h1>
          <p className="mt-5 max-w-md text-[15px] font-light leading-relaxed text-ink/70">
            {placed.paymentMethod === 'd17'
              ? "Votre preuve de paiement D17 a bien été reçue et est en attente de vérification. Nous vous appelons très vite pour confirmer votre commande."
              : 'Nous vous appelons très vite pour confirmer votre commande. Paiement en espèces à la livraison.'}
          </p>
          <p className="mt-3 max-w-md text-sm font-light text-ink/50">
            Livraison {DELIVERY_REGION.toLowerCase()}, sous {DELIVERY_TIME_LABEL}.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <a
              href={placed.waUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-3 rounded-full bg-[#25D366] px-8 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-[#12351f] transition-transform duration-300 hover:scale-[1.03]"
            >
              Confirmer sur WhatsApp
            </a>
            <Link
              to="/"
              className="flex items-center justify-center rounded-full border border-ink/25 px-8 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-ink transition-colors hover:bg-ink hover:text-[#faf6f3]"
            >
              Retour au site
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#faf6f3]">
      <TopBar title="Commande en ligne" />

      {/* Bandeau photo — pose le décor avant le formulaire, au lieu d'un
          simple titre sur fond blanc (page destinée aussi au trafic publicitaire). */}
      <div className="relative h-[220px] overflow-hidden md:h-[300px]">
        <img
          src="/images/box.webp"
          alt="Coffret de Makroudh Chez Laziz, pâtisserie traditionnelle tunisienne de Kairouan"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#2e2a27]/85 via-[#2e2a27]/35 to-[#2e2a27]/10" />
        <div className="absolute inset-0 flex flex-col justify-end px-5 pb-8 md:px-10 md:pb-10">
          <div className="mx-auto w-full max-w-6xl">
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.35em] text-[#b8912e]">
              Commander
            </p>
            <h1
              className="font-display text-4xl leading-tight text-[#faf6f3] md:text-6xl"
              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.7), 0 4px 16px rgba(0,0,0,0.45)' }}
            >
              Votre commande
            </h1>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-5 py-14 md:px-10 md:py-20">
        <div className="max-w-2xl">
          <p className="text-[15px] font-light leading-relaxed text-ink/70">
            Choisissez vos makroudh et leur poids, laissez vos coordonnées de
            livraison — nous vous rappelons pour confirmer.
          </p>
        </div>

        {/* Repères de confiance + livraison — utiles pour un visiteur qui
            arrive directement ici (publicité), sans être passé par l'accueil. */}
        <div className="mt-8 grid grid-cols-2 gap-4 rounded-2xl border border-sand/70 bg-white py-6 text-center shadow-sm sm:grid-cols-4">
          {[
            ['100%', 'Fait main'],
            [formatTND(DELIVERY_FEE_MILLIMES), 'TND livraison'],
            [DELIVERY_TIME_LABEL, 'Toute la Tunisie'],
            ['COD / D17', 'Paiement'],
          ].map(([n, label]) => (
            <div key={label}>
              <div className="font-display text-xl text-[#b8912e] md:text-2xl">{n}</div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-ink/50 md:text-[11px]">
                {label}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={submit} className="mt-12 grid gap-10 lg:grid-cols-12">
          {/* Products */}
          <div className="space-y-4 lg:col-span-7">
            {isLoading && (
              <p className="text-sm text-ink/50">Chargement du catalogue…</p>
            )}
            {(products ?? []).map((p) => (
              <ProductRow key={p.id} product={p as DbProduct} />
            ))}
          </div>

          {/* Summary + form */}
          <div className="lg:col-span-5">
            <div className="bg-ink-deep p-7 text-[#faf6f3] lg:sticky lg:top-8 md:p-9">
              <h2 className="font-display text-2xl">Récapitulatif</h2>

              <ul className="mt-6 space-y-3 border-t border-[#faf6f3]/15 pt-6">
                {items.length === 0 && (
                  <li className="text-sm font-light text-[#faf6f3]/50">
                    Aucun produit sélectionné pour l'instant.
                  </li>
                )}
                {items.map((p) => (
                  <li key={`${p.id}:${p.weightKg}`} className="flex items-baseline text-[15px] font-light">
                    <span>
                      {p.qty} × {p.name} <span className="text-[#faf6f3]/50">({formatWeight(p.weightKg)})</span>
                    </span>
                    <span className="mx-3 flex-1 border-b border-dotted border-[#faf6f3]/25" aria-hidden="true" />
                    <span className="font-display text-[#b8912e]">
                      {formatTND(p.qty * p.unitPriceMillimes)}
                    </span>
                  </li>
                ))}
              </ul>

              {items.length > 0 && (
                <div className="mt-4 space-y-1.5 border-t border-[#faf6f3]/15 pt-4 text-sm font-light text-[#faf6f3]/70">
                  <div className="flex items-baseline">
                    <span>Sous-total</span>
                    <span className="mx-3 flex-1" />
                    <span>{formatTND(subtotal)} TND</span>
                  </div>
                  <div className="flex items-baseline">
                    <span>Livraison ({DELIVERY_METHOD_LABEL.toLowerCase()})</span>
                    <span className="mx-3 flex-1" />
                    <span>{formatTND(DELIVERY_FEE_MILLIMES)} TND</span>
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-baseline border-t border-[#faf6f3]/15 pt-5">
                <span className="text-sm uppercase tracking-[0.2em]">Total</span>
                <span className="mx-3 flex-1 border-b border-dotted border-[#faf6f3]/25" aria-hidden="true" />
                <span className="font-display text-2xl text-[#b8912e]">
                  {formatTND(total)} <span className="text-xs">TND</span>
                </span>
              </div>

              {/* Coordonnées + livraison */}
              <div className="mt-8 space-y-4">
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Votre nom"
                  className={inputCls}
                />
                <div>
                  <input
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Téléphone (ex : 23 691 039)"
                    type="tel"
                    className={inputCls}
                  />
                  {phone.length > 0 && !phoneValid && (
                    <p className="mt-1.5 text-xs text-red-300">Numéro tunisien invalide (8 chiffres).</p>
                  )}
                </div>
                <select
                  required
                  value={governorate}
                  onChange={(e) => setGovernorate(e.target.value)}
                  className={`${inputCls} ${governorate ? '' : 'text-ink/35'}`}
                >
                  <option value="" disabled>
                    Gouvernorat
                  </option>
                  {TUNISIA_GOVERNORATES.map((g) => (
                    <option key={g} value={g} className="text-ink">
                      {g}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ville / délégation"
                    className={inputCls}
                  />
                  <input
                    value={postalCode}
                    onChange={(e) => setPostalCode(digitsOnly(e.target.value).slice(0, 4))}
                    placeholder="Code postal"
                    inputMode="numeric"
                    className={inputCls}
                  />
                </div>
                <textarea
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Adresse complète (rue, numéro, repère...)"
                  rows={2}
                  className={`${inputCls} resize-none`}
                />
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Précision ? (date souhaitée, occasion…)"
                  rows={2}
                  className={`${inputCls} resize-none`}
                />
              </div>

              {/* Paiement */}
              <div className="mt-6 border-t border-[#faf6f3]/15 pt-6">
                <p className={labelCls.replace('text-ink/45', 'text-[#faf6f3]/50')}>Paiement</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cod')}
                    className={`rounded-lg border px-4 py-3 text-sm font-semibold transition-colors ${
                      paymentMethod === 'cod'
                        ? 'border-[#b8912e] bg-[#b8912e]/15 text-[#b8912e]'
                        : 'border-[#faf6f3]/20 text-[#faf6f3]/70 hover:border-[#faf6f3]/40'
                    }`}
                  >
                    À la livraison
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('d17')}
                    className={`rounded-lg border px-4 py-3 text-sm font-semibold transition-colors ${
                      paymentMethod === 'd17'
                        ? 'border-[#b8912e] bg-[#b8912e]/15 text-[#b8912e]'
                        : 'border-[#faf6f3]/20 text-[#faf6f3]/70 hover:border-[#faf6f3]/40'
                    }`}
                  >
                    D17
                  </button>
                </div>

                {paymentMethod === 'd17' && (
                  <div className="mt-4 rounded-lg border border-[#b8912e]/40 bg-[#b8912e]/10 p-4">
                    <p className="text-sm font-light text-[#faf6f3]/85">
                      Envoyez <strong className="font-semibold text-[#b8912e]">{formatTND(total)} TND</strong> au
                      numéro D17&nbsp;:
                    </p>
                    <p className="mt-1 font-display text-2xl tracking-wide text-[#b8912e]">{D17_NUMBER_DISPLAY}</p>
                    <p className="mt-2 text-xs font-light text-[#faf6f3]/60">
                      Puis joignez ci-dessous la capture d'écran du paiement (obligatoire).
                    </p>
                    <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[#faf6f3]/30 bg-[#faf6f3]/5 px-4 py-4 text-sm text-[#faf6f3]/70 transition-colors hover:border-[#b8912e]">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => handleProofChange(e.target.files?.[0] ?? null)}
                      />
                      {proofUploading
                        ? 'Envoi de la capture…'
                        : proofKey
                          ? '✓ Capture envoyée — cliquez pour la remplacer'
                          : 'Joindre la capture d’écran du paiement'}
                    </label>
                    {proofPreview && (
                      <img src={proofPreview} alt="Capture du paiement D17" className="mt-3 max-h-40 rounded-lg border border-[#faf6f3]/20 object-contain" />
                    )}
                    {proofError && <p className="mt-2 text-xs text-red-300">{proofError}</p>}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="gold-cta mt-6 w-full rounded-full px-7 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-white transition-transform duration-300 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {createOrder.isPending ? 'Envoi…' : 'Envoyer la commande'}
              </button>
              {createOrder.isError && (
                <p className="mt-3 text-center text-sm text-red-300">
                  {createOrder.error.message || `Une erreur est survenue — réessayez ou appelez le ${PHONE_DISPLAY}.`}
                </p>
              )}
              <p className="mt-5 text-center text-xs font-light tracking-wide text-[#faf6f3]/50">
                Ou appelez directement : <a href={PHONE_TEL} className="underline">{PHONE_DISPLAY}</a>
              </p>
            </div>
          </div>
        </form>

        {/* Contact message */}
        <div className="mt-24 grid gap-10 border-t border-sand/60 pt-16 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.35em] text-accent">
              Contact
            </p>
            <h2 className="font-display text-3xl leading-tight md:text-4xl">
              Une question ?
              <br />
              Écrivez-nous
            </h2>
            <p className="mt-4 max-w-sm text-[15px] font-light leading-relaxed text-ink/70">
              Commande spéciale, mariage, Aïd, grande quantité — laissez un
              message, on vous répond vite. Vous pouvez aussi passer à la
              boutique, ouverte 7j/7 de 07h00 à minuit.
            </p>
          </div>
          <div className="lg:col-span-7">
            {msgSent ? (
              <div className="rounded-xl border border-[#b8912e] bg-[#f5ece5] p-8 text-center">
                <p className="font-display text-2xl">Message envoyé, merci !</p>
                <p className="mt-2 text-sm font-light text-ink/60">
                  Nous vous répondrons très vite.
                </p>
              </div>
            ) : (
              <form onSubmit={submitMessage} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    required
                    value={msgName}
                    onChange={(e) => setMsgName(e.target.value)}
                    placeholder="Votre nom"
                    className={inputCls}
                  />
                  <input
                    value={msgPhone}
                    onChange={(e) => setMsgPhone(e.target.value)}
                    placeholder="Téléphone (facultatif)"
                    type="tel"
                    className={inputCls}
                  />
                </div>
                <textarea
                  required
                  value={msgText}
                  onChange={(e) => setMsgText(e.target.value)}
                  placeholder="Votre message…"
                  rows={5}
                  className={`${inputCls} resize-none`}
                />
                <button
                  type="submit"
                  disabled={sendMessage.isPending}
                  className="rounded-full bg-ink px-8 py-3.5 text-sm font-semibold uppercase tracking-[0.12em] text-[#faf6f3] transition-transform duration-300 hover:scale-[1.03] disabled:opacity-40"
                >
                  {sendMessage.isPending ? 'Envoi…' : 'Envoyer le message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
