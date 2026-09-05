import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { trpc } from '@/providers/trpc'
import { useCart, type CustomLine } from '@/providers/cart'
import { useSEO } from '@/hooks/useSEO'
import { PHONE_DISPLAY, PHONE_TEL, MESSENGER_URL } from '@/lib/shop'
import { track } from '@/lib/analytics'
import { trackMeta, type MetaContentItem } from '@/lib/metaPixel'
import { buildDisplayLines, kgLabel, type CatalogProduct, type DisplayLine } from '@/lib/orderLines'
import PackCard from '@/components/order/PackCard'
import CustomPackComposer from '@/components/order/CustomPackComposer'
import ProductOrderCard from '@/components/order/ProductOrderCard'
import { useLang } from '@/lib/i18n'
import { CATEGORY_LABELS_AR } from '@/lib/categories'
import LanguageSwitch from '@/components/LanguageSwitch'
import { productName } from '@contracts/productText'
import {
  DELIVERY_FEE_MILLIMES,
  DELIVERY_REGION,
  formatDinars,
  DELIVERY_TIME_LABEL,
  D17_NUMBER_DISPLAY,
  PAYMENT_PROOF_ALLOWED_MIME,
  PAYMENT_PROOF_MAX_SIZE_BYTES,
  TUNISIA_GOVERNORATES,
  governorateLabel,
  priceForWeight,
  type PaymentMethod,
  type WeightKg,
} from '@contracts/shop'
import {
  CUSTOM_PACK_PACKAGING_LABEL,
  CUSTOM_PACK_SIZE,
  CUSTOM_PACK_WEIGHT_KG,
  FIXED_PACKS,
  customPackTotal,
  formatPriceDT,
  type FixedPackId,
} from '@contracts/packs'

function TopBar() {
  const { count } = useCart()
  const lang = useLang()
  const isAr = lang === 'ar'
  return (
    <header className="sticky top-0 z-40 border-b border-sand/60 bg-[#faf6f3]/95 backdrop-blur">
      <div className="h-[3px] bg-gradient-to-r from-[#8f6f22] via-[#b8912e] to-[#8f6f22]" />
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:h-20 md:px-10">
        <Link to={isAr ? '/ar' : '/'} className="flex min-w-0 items-center gap-2 md:gap-2.5">
          <img src="/images/logo.webp" alt="Chez Laziz" className="h-9 w-9 shrink-0 md:h-10 md:w-10" width="40" height="40" />
          <span className="truncate font-display text-base tracking-[0.08em] text-ink sm:text-xl sm:tracking-[0.14em] md:text-2xl">
            CHEZ&nbsp;LAZIZ
          </span>
        </Link>
        <div className="flex items-center gap-2 md:gap-3">
          <LanguageSwitch tone="light" />
          <a
            href={PHONE_TEL}
            dir="ltr"
            className="hidden items-center gap-2 rounded-full border border-ink/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70 transition-colors hover:border-[#b8912e] hover:text-accent md:flex"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" strokeLinejoin="round" />
            </svg>
            {PHONE_DISPLAY}
          </a>
          <a
            href="#recap"
            className="relative flex h-11 items-center gap-2 rounded-full border border-ink/15 px-4 text-xs font-semibold uppercase tracking-wide text-ink transition-colors hover:border-[#b8912e] hover:text-accent"
            aria-label={isAr ? `طلبكم، ${count} عنصر` : `Votre commande, ${count} article${count > 1 ? 's' : ''}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h9.6a1 1 0 0 0 1-.8L21 8H7" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="10" cy="20" r="1.2" />
              <circle cx="17" cy="20" r="1.2" />
            </svg>
            <span className="hidden sm:inline">{isAr ? 'طلبي' : 'Ma commande'}</span>
            {count > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#b8912e] px-1.5 text-[11px] text-white">
                {count}
              </span>
            )}
          </a>
        </div>
      </div>
    </header>
  )
}

const inputCls =
  'w-full rounded-lg border border-sand bg-white px-4 py-3 text-[15px] text-ink outline-none transition-colors placeholder:text-ink/35 focus:border-[#b8912e] focus:ring-2 focus:ring-[#b8912e]/25'
const stepperBtnCls =
  'flex h-11 w-11 items-center justify-center rounded-full border border-sand bg-white text-xl transition-colors hover:border-[#b8912e] hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b8912e]/50 disabled:opacity-30'

const GENERIC_ERROR = `Une erreur est survenue — réessayez, ou appelez-nous au ${PHONE_DISPLAY}.`
const GENERIC_ERROR_AR = `حدث خطأ — أعيدوا المحاولة، أو اتصلوا بنا على ⁦${PHONE_DISPLAY}⁩.`
const MAPS_URL =
  'https://www.google.com/maps/place/Chez+laziz+%D8%A7%D9%84%D9%82%D9%8A%D8%B1%D9%88%D8%A7%D9%86/data=!4m2!3m1!1s0x12fdcf004a648cdf:0xacd6eabb156c7203'

/** Les messages métier du serveur ("preuve D17 obligatoire", "produit
 * indisponible") sont lisibles tels quels ; une erreur de validation
 * technique (JSON, zod) est remplacée par un message humain. */
function friendlyError(message: string | undefined, isAr: boolean): string {
  const generic = isAr ? GENERIC_ERROR_AR : GENERIC_ERROR
  if (!message) return generic
  const technical =
    message.startsWith('[') ||
    message.startsWith('{') ||
    /invalid_type|expected|received|zod|undefined|null/i.test(message) ||
    message.length > 180
  return technical ? generic : message
}

function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${Math.random().toString(36).slice(2, 12)}`
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

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function Divider() {
  return (
    <svg viewBox="0 0 120 12" className="mx-auto mt-4 h-3 w-28 text-[#b8912e]" aria-hidden="true" fill="none">
      <path d="M2 6h40M78 6h40" stroke="currentColor" strokeWidth="1" />
      <path d="M60 1l5 5-5 5-5-5 5-5Z" fill="currentColor" />
      <circle cx="48" cy="6" r="1.2" fill="currentColor" />
      <circle cx="72" cy="6" r="1.2" fill="currentColor" />
    </svg>
  )
}

type Tab = 'produits' | 'packs' | 'custom'
const TAB_HASH: Record<Tab, string> = { produits: '#produits', packs: '#packs', custom: '#custom' }
function tabFromHash(hash: string): Tab {
  if (hash === '#packs') return 'packs'
  if (hash === '#custom') return 'custom'
  return 'produits'
}

/** Un lien publicitaire peut pointer vers ?produit=<slug> pour mettre en
 * avant UN article précis dès l'arrivée sur la page — sans jamais retirer
 * le reste du catalogue, qui reste affiché normalement en dessous.
 * On matche par mot-clé plutôt que par ID : l'ID en base peut changer
 * (produit recréé depuis l'admin), le nom affiché beaucoup plus rarement. */
const SPOTLIGHT_KEYWORDS: Record<string, string> = {
  'fruits-secs': 'fruits secs',
}
function findSpotlightProduct(catalog: CatalogProduct[], slug: string | null): CatalogProduct | undefined {
  const keyword = slug ? SPOTLIGHT_KEYWORDS[slug] : undefined
  if (!keyword) return undefined
  return catalog.find((p) => p.name.toLowerCase().includes(keyword))
}

type Placed = {
  id: number
  recapText: string
  paymentMethod: PaymentMethod
  recap: {
    lines: { key: string; label: string; contents: string[]; totalMillimes: number }[]
    subtotalMillimes: number
    totalMillimes: number
    address: string
  }
}

export default function OrderPage() {
  const lang = useLang()
  const isAr = lang === 'ar'
  useSEO(
    isAr
      ? {
          title: 'اطلبوا — Chez Laziz | مقروض بالوزن، حزم جاهزة وحزمة على المقاس',
          description:
            'اطلبوا مقروض Chez Laziz: بالوزن (500 غ إلى 2.5 كغ)، حزم لعزيز الملكية والفاخرة والشهية والكلاسيكية، أو حزمة على مقاسكم (4 × 500 غ). توصيل في جميع أنحاء تونس خلال 24 ساعة، الدفع عند التسليم أو عبر D17.',
          path: '/ar/commande',
          breadcrumb: 'اطلبوا',
          alternates: { fr: '/commande', ar: '/ar/commande' },
        }
      : {
          title: 'Commander — Chez Laziz | Makroudh au poids, packs et pack sur mesure',
          description:
            'Commandez vos makroudh Chez Laziz : à la carte (500 g à 2,5 kg), packs Laziz VIP, Premium, Délice, Classique ou pack sur mesure (4 × 500 g). Livraison partout en Tunisie sous 24h, paiement à la livraison ou D17.',
          path: '/commande',
          breadcrumb: 'Commander',
          alternates: { fr: '/commande', ar: '/ar/commande' },
        },
  )
  const { data: products, isLoading } = trpc.products.list.useQuery()
  const createOrder = trpc.orders.create.useMutation()
  const sendMessage = trpc.contact.send.useMutation()
  const catalog = useMemo(() => (products ?? []) as CatalogProduct[], [products])

  const { lines, count, add, setQty, packQty, addPack, addCustom, setLineQty, removeLine, clear } = useCart()

  const [tab, setTab] = useState<Tab>(() =>
    typeof window !== 'undefined' ? tabFromHash(window.location.hash) : 'produits',
  )

  // Article mis en avant si on arrive depuis un lien publicitaire ciblé
  // (ex. /commande?produit=fruits-secs) — voir SPOTLIGHT_KEYWORDS ci-dessus.
  const [spotlightSlug] = useState<string | null>(() =>
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('produit') : null,
  )
  const spotlight = useMemo(() => findSpotlightProduct(catalog, spotlightSlug), [catalog, spotlightSlug])
  const spotlightTrackedRef = useRef(false)
  useEffect(() => {
    if (!spotlight || spotlightTrackedRef.current) return
    spotlightTrackedRef.current = true
    track('view_item_list', {
      item_list_id: 'order_spotlight',
      item_list_name: 'Commande — article mis en avant (pub)',
      items: [{ item_id: String(spotlight.id), item_name: spotlight.name, price: spotlight.priceMillimes / 1000 }],
    })
    // Signal Meta équivalent à celui de la page produit dédiée — nécessaire
    // ici car les publicités pointent désormais directement vers /commande.
    trackMeta('ViewContent', {
      value: spotlight.priceMillimes / 1000,
      contents: [{ id: String(spotlight.id), item_price: spotlight.priceMillimes / 1000 }],
    })
  }, [spotlight])
  const switchTab = (next: Tab) => {
    setTab(next)
    try {
      window.history.replaceState(null, '', TAB_HASH[next])
    } catch {
      // sans importance
    }
  }

  // Custom Pack : sélection en cours (ordre de sélection conservé).
  const [selected, setSelected] = useState<number[]>([])
  const [customJustAdded, setCustomJustAdded] = useState(false)
  const toggleSelected = (id: number) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < CUSTOM_PACK_SIZE ? [...s, id] : s))
  const removeSelected = (id: number) => setSelected((s) => s.filter((x) => x !== id))

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [governorate, setGovernorate] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [note, setNote] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod')
  const [proofKey, setProofKey] = useState<string | null>(null)
  const [proofPreview, setProofPreview] = useState<string | null>(null)
  const [proofUploading, setProofUploading] = useState(false)
  const [proofError, setProofError] = useState<string | null>(null)
  const [idempotencyKey, setIdempotencyKey] = useState(() => newIdempotencyKey())
  const [placed, setPlaced] = useState<Placed | null>(null)
  const [recapCopied, setRecapCopied] = useState(false)
  const checkoutStartedRef = useRef(false)
  const cartViewedRef = useRef(false)

  const [msgName, setMsgName] = useState('')
  const [msgPhone, setMsgPhone] = useState('')
  const [msgText, setMsgText] = useState('')
  const [msgSent, setMsgSent] = useState(false)

  // La barre flottante disparaît quand le récapitulatif est déjà à l'écran.
  const recapRef = useRef<HTMLDivElement>(null)
  const [recapVisible, setRecapVisible] = useState(false)
  useEffect(() => {
    const el = recapRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([entry]) => setRecapVisible(entry.isIntersecting), { threshold: 0.15 })
    io.observe(el)
    return () => io.disconnect()
  }, [placed])

  const items: DisplayLine[] = useMemo(() => buildDisplayLines(lines, catalog, lang), [lines, catalog, lang])
  const subtotal = items.reduce((s, l) => s + l.qty * l.unitPriceMillimes, 0)
  const total = subtotal + DELIVERY_FEE_MILLIMES
  const totalWeightKg = items.reduce((s, l) => s + l.qty * l.weightKg, 0)

  const analyticsItems = () =>
    items.map((l) => ({
      item_id: l.analyticsId,
      item_name: l.name,
      item_variant: l.variant,
      price: l.unitPriceMillimes / 1000,
      quantity: l.qty,
    }))
  const metaContents = (): MetaContentItem[] =>
    items.map((l) => ({ id: l.analyticsId, quantity: l.qty, item_price: l.unitPriceMillimes / 1000 }))

  useEffect(() => {
    if (items.length > 0 && !cartViewedRef.current) {
      cartViewedRef.current = true
      track('view_cart', { value: total / 1000, items: analyticsItems() })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length])

  // pack.contents relie un pack au catalogue par le nom français exact ;
  // on résout ici la photo ET le nom affiché de chaque produit inclus.
  const packItems = (contents: readonly string[]) =>
    contents.map((n) => {
      const p = catalog.find((c) => c.name === n)
      const label = p ? productName(p, lang) : n
      return { src: p?.imageUrl ?? null, alt: label, label }
    })

  const handleAddPack = (packId: FixedPackId) => {
    const pack = FIXED_PACKS.find((p) => p.id === packId)!
    addPack(packId)
    track('add_to_cart', {
      value: pack.priceMillimes / 1000,
      items: [{ item_id: `pack:${packId}`, item_name: pack.name, price: pack.priceMillimes / 1000, quantity: 1 }],
    })
    trackMeta('AddToCart', {
      value: pack.priceMillimes / 1000,
      contents: [{ id: `pack:${packId}`, quantity: 1, item_price: pack.priceMillimes / 1000 }],
    })
  }

  /** Quantités déjà commandées d'un produit, par poids (cartes à la carte). */
  const qtyByWeightFor = (productId: number): Partial<Record<WeightKg, number>> => {
    const out: Partial<Record<WeightKg, number>> = {}
    for (const l of lines) if (l.kind === 'product' && l.productId === productId) out[l.weightKg] = l.qty
    return out
  }
  const handleAddProduct = (product: CatalogProduct, weightKg: WeightKg) => {
    add(product.id, weightKg, 1)
    const unitPrice = priceForWeight(product.priceMillimes, weightKg) / 1000
    track('add_to_cart', {
      value: unitPrice,
      items: [{ item_id: String(product.id), item_name: product.name, item_variant: `${weightKg} kg`, price: unitPrice, quantity: 1 }],
    })
    trackMeta('AddToCart', {
      value: unitPrice,
      contents: [{ id: String(product.id), quantity: 1, item_price: unitPrice }],
    })
  }
  const categories = useMemo(() => {
    const order = ['Les classiques', 'Les signatures', 'Les nouveautés']
    const groups = new Map<string, CatalogProduct[]>()
    for (const p of catalog) groups.set(p.category, [...(groups.get(p.category) ?? []), p])
    return [...groups.entries()].sort(([a], [b]) => (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 99 : order.indexOf(b)))
  }, [catalog])

  const handleAddCustom = () => {
    if (selected.length !== CUSTOM_PACK_SIZE) return
    const chosen = selected.map((id) => catalog.find((p) => p.id === id)).filter((p): p is CatalogProduct => !!p)
    if (chosen.length !== CUSTOM_PACK_SIZE) return
    const price = customPackTotal(chosen.map((p) => p.priceMillimes))
    addCustom(selected)
    track('add_to_cart', {
      value: price / 1000,
      items: [{ item_id: `custom:${selected.join('-')}`, item_name: 'Custom Pack', price: price / 1000, quantity: 1 }],
    })
    trackMeta('AddToCart', {
      value: price / 1000,
      contents: [{ id: `custom:${selected.join('-')}`, quantity: 1, item_price: price / 1000 }],
    })
    setSelected([])
    setCustomJustAdded(true)
  }

  /** Reprendre un Custom Pack déjà dans la commande pour le modifier, sans
   * repartir de zéro : ses 4 produits reviennent dans le composeur. */
  const editCustom = (line: CustomLine, key: string) => {
    setSelected([...line.productIds])
    removeLine(key)
    setCustomJustAdded(false)
    switchTab('custom')
    setTimeout(() => scrollToId('composer'), 50)
  }

  const phoneValid = isValidTunisianPhone(phone)
  const addressValid =
    name.trim().length >= 2 && phoneValid && !!governorate && city.trim().length > 0 && address.trim().length >= 5
  const paymentValid = paymentMethod === 'cod' || !!proofKey
  const canSubmit = items.length > 0 && addressValid && paymentValid && !createOrder.isPending && !proofUploading

  const onCheckoutStart = () => {
    if (checkoutStartedRef.current || items.length === 0) return
    checkoutStartedRef.current = true
    track('begin_checkout', { value: total / 1000, items: analyticsItems() })
    trackMeta('InitiateCheckout', { value: total / 1000, contents: metaContents() })
  }

  const choosePayment = (method: PaymentMethod) => {
    setPaymentMethod(method)
    track('add_payment_info', { payment_type: method === 'd17' ? 'D17' : 'Cash on delivery', value: total / 1000, items: analyticsItems() })
    trackMeta('AddPaymentInfo', { value: total / 1000, contents: metaContents() })
  }

  const handleProofChange = async (file: File | null) => {
    setProofError(null)
    setProofKey(null)
    if (proofPreview) URL.revokeObjectURL(proofPreview)
    setProofPreview(null)
    if (!file) return
    if (!PAYMENT_PROOF_ALLOWED_MIME.has(file.type)) {
      setProofError(isAr ? 'صيغة غير مدعومة — استخدموا صورة JPG أو PNG أو WEBP.' : 'Format non supporté — utilisez une image JPG, PNG ou WEBP.')
      return
    }
    if (file.size > PAYMENT_PROOF_MAX_SIZE_BYTES) {
      setProofError(isAr ? 'الصورة ثقيلة جدًا (8 ميغا كحد أقصى).' : 'Image trop lourde (8 Mo maximum).')
      return
    }
    setProofPreview(URL.createObjectURL(file))
    setProofUploading(true)
    try {
      const body = new FormData()
      body.append('file', file)
      const res = await fetch('/api/uploads/payment-proof', { method: 'POST', body })
      const data = await res.json().catch(() => ({}))
      const uploadFailedMsg = isAr ? "فشل إرسال الصورة" : "Échec de l'envoi de la capture"
      if (!res.ok) throw new Error(data.error || uploadFailedMsg)
      setProofKey(data.key)
    } catch (e) {
      setProofError(e instanceof Error ? e.message : isAr ? 'فشل إرسال الصورة' : "Échec de l'envoi de la capture")
    } finally {
      setProofUploading(false)
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    const snapshot = items.map((l) => ({
      key: l.key,
      label: `${l.qty} × ${l.name} (${kgLabel(l.weightKg, lang)})`,
      contents: l.contents,
      totalMillimes: l.qty * l.unitPriceMillimes,
    }))
    const addressLine = `${address.trim()}, ${city.trim()}, ${governorate}`
    createOrder.mutate(
      {
        customerName: name.trim(),
        phone: phone.trim(),
        governorate: governorate as (typeof TUNISIA_GOVERNORATES)[number],
        city: city.trim(),
        address: address.trim(),
        note: note.trim() || undefined,
        items: items.map(({ line }) =>
          line.kind === 'product'
            ? { kind: 'product' as const, productId: line.productId, weightKg: line.weightKg, qty: line.qty }
            : line.kind === 'pack'
              ? { kind: 'pack' as const, packId: line.packId, qty: line.qty }
              : { kind: 'custom' as const, productIds: line.productIds, qty: line.qty },
        ),
        paymentMethod,
        paymentProofKey: paymentMethod === 'd17' ? (proofKey ?? undefined) : undefined,
        idempotencyKey,
      },
      {
        onSuccess: (order) => {
          const text = isAr
            ? `مرحبًا Chez Laziz! الطلب رقم ${order?.id ?? ''} — ${name.trim()} :\n${snapshot
                .map((l) => `• ${l.label}${l.contents.length ? ` : ${l.contents.join(', ')}` : ''}`)
                .join('\n')}\nالتوصيل: ${addressLine}\nالمجموع (التوصيل مشمول): ${formatPriceDT(total, lang)}\nالدفع: ${
                paymentMethod === 'd17' ? 'D17 (تم إرسال الصورة)' : 'عند التسليم'
              }`
            : `Bonjour Chez Laziz ! Commande n°${order?.id ?? ''} — ${name.trim()} :\n${snapshot
                .map((l) => `• ${l.label}${l.contents.length ? ` : ${l.contents.join(', ')}` : ''}`)
                .join('\n')}\nLivraison : ${addressLine}\nTotal (livraison incluse) : ${formatPriceDT(total, lang)}\nPaiement : ${
                paymentMethod === 'd17' ? 'D17 (capture envoyée)' : 'À la livraison'
              }`
          track('purchase', {
            transaction_id: String(order?.id ?? ''),
            value: total / 1000,
            shipping: DELIVERY_FEE_MILLIMES / 1000,
            items: analyticsItems(),
          })
          // Pas de "Purchase" Meta ici : une commande qui vient d'être créée
          // n'est ni confirmée (COD) ni payée (D17 en attente de vérification).
          // L'événement est envoyé côté serveur uniquement une fois la
          // commande réellement confirmée — voir api/lib/metaConversionsApi.ts
          // et maybeReportMetaPurchase dans api/ordersRouter.ts.
          setPlaced({
            id: order?.id ?? 0,
            recapText: text,
            paymentMethod,
            recap: { lines: snapshot, subtotalMillimes: subtotal, totalMillimes: total, address: addressLine },
          })
          clear()
          setIdempotencyKey(newIdempotencyKey())
          window.scrollTo({ top: 0 })
        },
      },
    )
  }

  const copyRecap = async () => {
    if (!placed) return
    try {
      await navigator.clipboard.writeText(placed.recapText)
      setRecapCopied(true)
      setTimeout(() => setRecapCopied(false), 2000)
    } catch {
      // Presse-papiers indisponible (permissions navigateur) — le client
      // peut toujours écrire son message lui-même sur Messenger.
    }
  }

  const submitMessage = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage.mutate(
      { name: msgName.trim(), phone: msgPhone.trim() || undefined, message: msgText.trim() },
      {
        onSuccess: () => {
          setMsgSent(true)
          setMsgName('')
          setMsgPhone('')
          setMsgText('')
        },
      },
    )
  }

  if (placed) {
    return (
      <div className="min-h-screen bg-[#faf6f3]">
        <TopBar />
        <main className="mx-auto flex max-w-2xl flex-col items-center px-5 py-20 text-center md:py-28">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#b8912e]/15 text-accent">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12.5l5 5L20 6.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <h1 className="mt-8 font-display text-4xl md:text-5xl">
            {isAr ? <>شكرًا، الطلب رقم {placed.id} استُلم&nbsp;!</> : <>Merci, commande n°{placed.id} reçue&nbsp;!</>}
          </h1>
          <p className="mt-5 max-w-md text-[15px] font-light leading-relaxed text-ink/70">
            {isAr
              ? placed.paymentMethod === 'd17'
                ? 'صورة الدفع عبر D17 وصلتنا — هي الآن قيد التحقق من فريقنا (الدفع لم يُؤكَّد بعد). سنتصل بكم في أقرب وقت لتأكيد طلبكم.'
                : 'سنتصل بكم في أقرب وقت لتأكيد طلبكم. الدفع نقدًا عند التسليم.'
              : placed.paymentMethod === 'd17'
                ? "Votre capture d'écran D17 a bien été reçue — elle est en attente de vérification par notre équipe (le paiement n'est pas encore confirmé). Nous vous appelons très vite pour confirmer votre commande."
                : 'Nous vous appelons très vite pour confirmer votre commande. Paiement en espèces à la livraison.'}
          </p>

          <div className={`mt-10 w-full rounded-2xl border border-sand/70 bg-white p-6 shadow-sm ${isAr ? 'text-right' : 'text-left'}`}>
            <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-accent">{isAr ? 'ملخص الطلب' : 'Récapitulatif'}</p>
            <ul className="mt-4 space-y-3 text-[15px] font-light">
              {placed.recap.lines.map((l) => (
                <li key={l.key}>
                  <div className="flex items-baseline">
                    <span>{l.label}</span>
                    <span className="mx-3 flex-1 border-b border-dotted border-ink/15" aria-hidden="true" />
                    <span className="font-display text-accent">{formatPriceDT(l.totalMillimes, lang)}</span>
                  </div>
                  {l.contents.length > 0 && (
                    <p className="mt-0.5 text-xs text-ink/50">{l.contents.join(' · ')}</p>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-4 space-y-1 border-t border-sand/60 pt-3 text-sm font-light text-ink/60">
              <div className="flex justify-between">
                <span>{isAr ? 'المجموع الجزئي' : 'Sous-total'}</span>
                <span>{formatPriceDT(placed.recap.subtotalMillimes, lang)}</span>
              </div>
              <div className="flex justify-between">
                <span>{isAr ? 'التوصيل' : 'Livraison'}</span>
                <span>{formatPriceDT(DELIVERY_FEE_MILLIMES, lang)}</span>
              </div>
            </div>
            <div className="mt-2 flex justify-between border-t border-sand/60 pt-3">
              <span className="text-xs uppercase tracking-[0.2em] text-ink/50">{isAr ? 'المجموع' : 'Total'}</span>
              <span className="font-display text-xl text-accent">{formatPriceDT(placed.recap.totalMillimes, lang)}</span>
            </div>
            <p className="mt-4 text-sm font-light text-ink/60">
              {isAr
                ? `التوصيل إلى: ${placed.recap.address} — في جميع أنحاء تونس، خلال ${DELIVERY_TIME_LABEL === '24h' ? '24 ساعة' : DELIVERY_TIME_LABEL}.`
                : `Livraison à : ${placed.recap.address} — ${DELIVERY_REGION.toLowerCase()}, sous ${DELIVERY_TIME_LABEL}.`}
            </p>
          </div>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <a
              href={MESSENGER_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-3 rounded-full bg-[#0084FF] px-8 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-white transition-transform duration-300 hover:scale-[1.03]"
            >
              {isAr ? 'راسلونا على Messenger' : 'Nous écrire sur Messenger'}
            </a>
            <Link
              to={isAr ? '/ar' : '/'}
              className="flex items-center justify-center rounded-full border border-ink/25 px-8 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-ink transition-colors hover:bg-ink hover:text-[#faf6f3]"
            >
              {isAr ? 'العودة إلى الموقع' : 'Retour au site'}
            </Link>
          </div>
          <button
            type="button"
            onClick={copyRecap}
            className="mt-4 text-xs uppercase tracking-[0.15em] text-ink/50 underline underline-offset-2 transition-colors hover:text-ink"
          >
            {isAr
              ? recapCopied
                ? 'تم نسخ الملخص ✓'
                : 'انسخوا الملخص للصقه على Messenger'
              : recapCopied
                ? 'Récapitulatif copié ✓'
                : 'Copier le récapitulatif pour le coller sur Messenger'}
          </button>
        </main>
      </div>
    )
  }

  // Barre flottante : progression du Custom Pack pendant la composition,
  // sinon total de la commande + raccourci vers le récapitulatif.
  const composing = tab === 'custom' && selected.length > 0
  const chosenForBar = selected
    .map((id) => catalog.find((p) => p.id === id))
    .filter((p): p is CatalogProduct => !!p)
  const customBarTotal = customPackTotal(chosenForBar.map((p) => p.priceMillimes))
  const showBar = !recapVisible && (composing || count > 0)

  return (
    <div className="min-h-screen bg-[#faf6f3]">
      <TopBar />

      {/* ── En-tête ── */}
      <section className="relative border-b border-sand/60">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-[#f3e9dc] to-transparent" />
        <div className="relative mx-auto max-w-3xl px-5 pb-10 pt-14 text-center md:px-10 md:pt-20">
          <p className="text-[11px] font-medium uppercase tracking-[0.35em] text-accent">{isAr ? 'اطلبوا عبر الإنترنت' : 'Commande en ligne'}</p>
          <h1 className="mt-4 font-display text-4xl leading-[1.05] md:text-6xl">{isAr ? 'اطلبوا مقروضكم' : 'Commandez vos makroudh'}</h1>
          <Divider />
          <p className="mx-auto mt-5 max-w-xl text-[15px] font-light leading-relaxed text-ink/70 md:text-base">
            {isAr
              ? `مقروضنا بالوزن، أربع حزم جاهزة للإهداء، أو حزمة على مقاسكم — تُصنع يدويًا في القيروان وتُوصَّل في جميع أنحاء تونس خلال ${
                  DELIVERY_TIME_LABEL === '24h' ? '24 ساعة' : DELIVERY_TIME_LABEL
                }.`
              : `Nos makroudh au poids, quatre packs prêts à offrir, ou votre pack sur mesure — façonnés à la main à Kairouan et livrés partout en Tunisie sous ${DELIVERY_TIME_LABEL}.`}
          </p>
          <div className="mx-auto mt-8 grid max-w-xl grid-cols-2 gap-3 rounded-2xl border border-sand/70 bg-white py-5 text-center shadow-sm sm:grid-cols-4">
            {(
              isAr
                ? [
                    ['100%', 'صناعة يدوية'],
                    [formatDinars(DELIVERY_FEE_MILLIMES), 'د.ت توصيل'],
                    [DELIVERY_TIME_LABEL === '24h' ? '24 س' : DELIVERY_TIME_LABEL, 'كل تونس'],
                    ['COD / D17', 'الدفع'],
                  ]
                : [
                    ['100%', 'Fait main'],
                    [formatDinars(DELIVERY_FEE_MILLIMES), 'DT livraison'],
                    [DELIVERY_TIME_LABEL, 'Toute la Tunisie'],
                    ['COD / D17', 'Paiement'],
                  ]
            ).map(([n, label]) => (
              <div key={label}>
                <div className="font-display text-xl text-[#b8912e] md:text-2xl">{n}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-ink/50 md:text-[11px]">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Onglets */}
        <div className="mx-auto max-w-7xl px-5 pb-8 md:px-10">
          <div role="tablist" aria-label={isAr ? 'طريقة الطلب' : 'Mode de commande'} className="mx-auto grid max-w-3xl grid-cols-3 gap-1 rounded-2xl border border-sand bg-white p-1.5 shadow-sm">
            {(
              isAr
                ? ([
                    ['produits', 'منتجاتنا', 'المنتجات', 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z'],
                    ['packs', 'حزم جاهزة', 'الحزم', 'M3 8l9-4 9 4-9 4-9-4zm0 0v9l9 4 9-4V8M12 12v9'],
                    ['custom', 'كوّنوا حزمتكم', 'على المقاس', 'M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zm0 0v18M4 7.5l8 4.5 8-4.5'],
                  ] as const)
                : ([
                    ['produits', 'Nos produits', 'Produits', 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z'],
                    ['packs', 'Packs prêts', 'Packs', 'M3 8l9-4 9 4-9 4-9-4zm0 0v9l9 4 9-4V8M12 12v9'],
                    ['custom', 'Composez votre Pack', 'Sur mesure', 'M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zm0 0v18M4 7.5l8 4.5 8-4.5'],
                  ] as const)
            ).map(([id, label, shortLabel, icon]) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`tab-${id}`}
                aria-selected={tab === id}
                aria-controls={`panel-${id}`}
                onClick={() => switchTab(id)}
                className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-2 text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b8912e]/60 sm:px-3 sm:text-sm md:text-[15px] ${
                  tab === id ? 'bg-[#2e2a27] text-[#faf6f3] shadow' : 'text-ink/70 hover:text-ink'
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true" className="hidden shrink-0 sm:block">
                  <path d={icon} />
                </svg>
                <span className="sm:hidden">{shortLabel}</span>
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Article mis en avant (arrivée depuis une publicité ciblée) : un
          chemin d'achat en un clic, sans jamais retirer le reste du
          catalogue, toujours visible juste en dessous. ── */}
      {spotlight && (
        <section aria-label={isAr ? 'المنتج المُوصى به لكم' : 'Article recommandé pour vous'} className="mx-auto max-w-7xl px-5 pt-10 md:px-10">
          <div className="mx-auto max-w-sm">
            <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.25em] text-accent">
              {isAr ? '★ منتج إعلانكم' : "★ L'article de votre publicité"}
            </p>
            <ProductOrderCard
              product={spotlight}
              qtyByWeight={qtyByWeightFor(spotlight.id)}
              onAdd={(w) => handleAddProduct(spotlight, w)}
              onSetQty={(w, q) => setQty(spotlight.id, w, q)}
            />
            <a
              href={MAPS_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-3 flex items-center justify-center gap-1.5 text-xs font-light text-ink/60 hover:text-accent"
            >
              <span aria-hidden="true" className="text-[#b8912e]">★★★★★</span>
              {isAr ? '5.0 — تقييمات Google' : '5,0 — Avis Google'}
            </a>
            <p className="mt-4 text-center text-xs font-light text-ink/50">
              {isAr ? 'أو ' : 'Ou '}
              <button
                type="button"
                onClick={() => {
                  switchTab('produits')
                  setTimeout(() => scrollToId('panel-produits'), 50)
                }}
                className="text-accent underline underline-offset-2"
              >
                {isAr ? 'تصفحوا كامل كاتالوجنا' : 'parcourez tout notre catalogue'}
              </button>{' '}
              {isAr ? 'أدناه.' : 'ci-dessous.'}
            </p>
          </div>
        </section>
      )}

      <main className={`mx-auto max-w-7xl px-5 py-12 md:px-10 md:py-16 ${showBar ? 'pb-32' : ''}`}>
        {/* ── Nos produits (à la carte, au poids) ── */}
        <section id="panel-produits" role="tabpanel" aria-labelledby="tab-produits" hidden={tab !== 'produits'}>
          <div className="text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.35em] text-accent">{isAr ? 'بالوزن' : 'À la carte'}</p>
            <h2 className="mt-3 font-display text-3xl md:text-4xl">{isAr ? 'منتجاتنا' : 'Nos produits'}</h2>
            <p className="mx-auto mt-3 max-w-md text-[15px] font-light leading-relaxed text-ink/65">
              {isAr
                ? 'اختاروا الوزن (500 غ إلى 2.5 كغ) وكمية كل نوع مقروض. الأسعار المعروضة لـ 1 كغ.'
                : 'Choisissez le poids (500 g à 2,5 kg) et la quantité de chaque makroudh. Prix affichés pour 1 kg.'}
            </p>
          </div>
          {isLoading ? (
            <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-sand bg-white">
                  <div className="aspect-square bg-sand/40" />
                  <div className="space-y-2 p-4">
                    <div className="h-4 w-3/4 rounded bg-sand/50" />
                    <div className="h-3 w-1/3 rounded bg-sand/40" />
                    <div className="h-11 rounded bg-sand/30" />
                  </div>
                </div>
              ))}
            </div>
          ) : catalog.length === 0 ? (
            <p className="mt-10 text-center text-sm font-light text-ink/60">
              {isAr ? (
                <>الكاتالوج غير متوفر حاليًا — اتصلوا بنا على <span dir="ltr">{PHONE_DISPLAY}</span>.</>
              ) : (
                <>
                  Le catalogue est momentanément indisponible — appelez-nous au{' '}
                  <a href={PHONE_TEL} className="text-accent underline underline-offset-2">{PHONE_DISPLAY}</a>.
                </>
              )}
            </p>
          ) : (
            categories.map(([category, items]) => (
              <div key={category} className="mt-10">
                <h3 className="mb-4 flex items-center gap-4 font-display text-2xl">
                  {isAr ? CATEGORY_LABELS_AR[category] || category : category}
                  <span className="h-px flex-1 bg-sand" aria-hidden="true" />
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                  {items.map((p) => (
                    <ProductOrderCard
                      key={p.id}
                      product={p}
                      qtyByWeight={qtyByWeightFor(p.id)}
                      onAdd={(w) => handleAddProduct(p, w)}
                      onSetQty={(w, q) => setQty(p.id, w, q)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
          <p className="mt-10 text-center text-sm font-light text-ink/60">
            {isAr ? (
              <>
                للإهداء:{' '}
                <button type="button" onClick={() => switchTab('packs')} className="text-accent underline underline-offset-4">
                  اكتشفوا حزمنا
                </button>{' '}
                أو{' '}
                <button type="button" onClick={() => switchTab('custom')} className="text-accent underline underline-offset-4">
                  كوّنوا حزمتكم الخاصة
                </button>
                .
              </>
            ) : (
              <>
                Pour offrir :{' '}
                <button type="button" onClick={() => switchTab('packs')} className="text-accent underline underline-offset-4">
                  découvrez nos packs
                </button>{' '}
                ou{' '}
                <button type="button" onClick={() => switchTab('custom')} className="text-accent underline underline-offset-4">
                  composez le vôtre
                </button>
                .
              </>
            )}
          </p>
        </section>

        {/* ── A. Packs prêts ── */}
        <section id="panel-packs" role="tabpanel" aria-labelledby="tab-packs" hidden={tab !== 'packs'}>
          <div className="text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.35em] text-accent">{isAr ? 'حزمنا' : 'Nos packs'}</p>
            <h2 className="mt-3 font-display text-3xl md:text-4xl">{isAr ? 'جاهزة للإهداء، جاهزة للتذوق' : 'Prêts à offrir, prêts à savourer'}</h2>
            <p className="mx-auto mt-3 max-w-md text-[15px] font-light leading-relaxed text-ink/65">
              {isAr
                ? 'كل منتج مُعبّأ بـ 500 غ. اختاروا حزمتكم، ونحن نهتم بالباقي.'
                : 'Chaque produit est conditionné par 500 g. Choisissez votre pack, nous nous occupons du reste.'}
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4 xl:gap-6">
            {FIXED_PACKS.map((pack) => (
              <PackCard
                key={pack.id}
                pack={pack}
                photos={packItems(pack.contents)}
                contentsAr={packItems(pack.contents).map((i) => i.label)}
                qty={packQty(pack.id)}
                onAdd={() => handleAddPack(pack.id)}
                onSetQty={(q) => setLineQty(`pack:${pack.id}`, q)}
                onGoToOrder={() => scrollToId('recap')}
              />
            ))}
          </div>
          <p className="mt-8 text-center text-sm font-light text-ink/60">
            {isAr ? 'رغبة في نكهات أخرى؟ ' : "Envie d'autres saveurs ? "}
            <button type="button" onClick={() => switchTab('custom')} className="text-accent underline underline-offset-4">
              {isAr ? 'كوّنوا حزمتكم الخاصة' : 'Composez votre propre pack'}
            </button>
          </p>
        </section>

        {/* ── B. Custom Pack ── */}
        <section id="panel-custom" role="tabpanel" aria-labelledby="tab-custom" hidden={tab !== 'custom'}>
          <CustomPackComposer
            products={catalog}
            isLoading={isLoading}
            selected={selected}
            onToggle={(id) => {
              setCustomJustAdded(false)
              toggleSelected(id)
            }}
            onRemove={removeSelected}
            onAdd={handleAddCustom}
            justAdded={customJustAdded}
          />
        </section>

        {/* ── Votre commande : lignes + coordonnées + paiement ── */}
        <section id="recap" ref={recapRef} className="mt-20 scroll-mt-24 border-t border-sand/60 pt-14 md:mt-24">
          <div className="text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.35em] text-accent">{isAr ? 'طلبكم' : 'Votre commande'}</p>
            <h2 className="mt-3 font-display text-3xl md:text-4xl">{isAr ? 'الملخص والتوصيل' : 'Récapitulatif et livraison'}</h2>
          </div>

          {items.length === 0 ? (
            <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-dashed border-sand bg-white p-8 text-center">
              <p className="font-display text-xl">{isAr ? 'طلبكم فارغ' : 'Votre commande est vide'}</p>
              <p className="mt-2 text-sm font-light text-ink/60">
                {isAr ? 'اختاروا مقروضكم بالوزن، حزمة جاهزة، أو كوّنوا حزمتكم الخاصة.' : 'Choisissez vos makroudh au poids, un pack prêt, ou composez le vôtre.'}
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    switchTab('produits')
                    scrollToId('panel-produits')
                  }}
                  className="gold-cta rounded-full px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white"
                >
                  {isAr ? 'شاهدوا المنتجات' : 'Voir les produits'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    switchTab('packs')
                    scrollToId('panel-packs')
                  }}
                  className="rounded-full border border-ink/25 px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink transition-colors hover:bg-ink hover:text-[#faf6f3]"
                >
                  {isAr ? 'شاهدوا الحزم' : 'Voir les packs'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    switchTab('custom')
                    scrollToId('composer')
                  }}
                  className="rounded-full border border-ink/25 px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink transition-colors hover:bg-ink hover:text-[#faf6f3]"
                >
                  {isAr ? 'كوّنوا حزمتي' : 'Composer mon pack'}
                </button>
              </div>
              <p className="mt-5 text-xs font-light text-ink/50">
                {isAr ? (
                  <>اتصلوا بنا: <a href={PHONE_TEL} dir="ltr" className="text-accent underline underline-offset-2">{PHONE_DISPLAY}</a></>
                ) : (
                  <>Ou appelez-nous : <a href={PHONE_TEL} className="text-accent underline underline-offset-2">{PHONE_DISPLAY}</a></>
                )}
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-10 grid gap-8 lg:grid-cols-12 lg:gap-10">
              {/* Lignes */}
              <div className="min-w-0 lg:col-span-7">
                <ul className="space-y-4">
                  {items.map((l) => (
                    <li key={l.key} className="rounded-2xl border border-sand/80 bg-white p-5 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-display text-xl">{l.name}</p>
                          <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-ink/50">
                            {l.line.kind === 'product'
                              ? l.variant
                              : isAr
                                ? `${l.contents.length} × 500 غ · ${kgLabel(l.weightKg, lang)}`
                                : `${l.contents.length} × 500 g · ${kgLabel(l.weightKg, lang)}`}
                          </p>
                          {l.contents.length > 0 && (
                            <ul className="mt-3 space-y-1 text-sm text-ink/70">
                              {l.contents.map((c) => (
                                <li key={c} className="flex gap-2">
                                  <span className="text-accent" aria-hidden="true">
                                    ✓
                                  </span>
                                  {c}
                                </li>
                              ))}
                            </ul>
                          )}
                          {l.packagingMillimes > 0 && (
                            <p className="mt-2 text-xs text-ink/50">
                              {isAr ? 'المنتجات' : 'Produits'} {formatPriceDT(l.unitPriceMillimes - l.packagingMillimes, lang)} + {CUSTOM_PACK_PACKAGING_LABEL}{' '}
                              {formatPriceDT(l.packagingMillimes, lang)}
                            </p>
                          )}
                        </div>
                        <p className="font-display text-xl text-accent">{formatPriceDT(l.qty * l.unitPriceMillimes, lang)}</p>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-sand/60 pt-4">
                        <div className="flex items-center gap-2" role="group" aria-label={`${isAr ? 'الكمية' : 'Quantité'} — ${l.name}`}>
                          <button type="button" aria-label={isAr ? `إنقاص ${l.name}` : `Retirer un ${l.name}`} onClick={() => setLineQty(l.key, l.qty - 1)} className={stepperBtnCls}>
                            −
                          </button>
                          <span className="w-7 text-center font-display text-lg" aria-live="polite">
                            {l.qty}
                          </span>
                          <button type="button" aria-label={isAr ? `زيادة ${l.name}` : `Ajouter un ${l.name}`} onClick={() => setLineQty(l.key, l.qty + 1)} className={stepperBtnCls}>
                            +
                          </button>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-semibold uppercase tracking-[0.14em]">
                          {l.line.kind === 'custom' && (
                            <button type="button" onClick={() => editCustom(l.line as CustomLine, l.key)} className="text-accent underline-offset-4 hover:underline">
                              {isAr ? 'تعديل' : 'Modifier'}
                            </button>
                          )}
                          <button type="button" onClick={() => removeLine(l.key)} className="text-ink/50 underline-offset-4 hover:text-red-600 hover:underline">
                            {isAr ? 'إزالة' : 'Retirer'}
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 rounded-2xl border border-sand/80 bg-white p-5 text-[15px] shadow-sm">
                  <div className="space-y-2 font-light text-ink/70">
                    <div className="flex items-baseline justify-between">
                      <span>{isAr ? 'الوزن الإجمالي' : 'Poids total'}</span>
                      <span>{kgLabel(totalWeightKg, lang)}</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span>{isAr ? 'المجموع الجزئي' : 'Sous-total'}</span>
                      <span>{formatPriceDT(subtotal, lang)}</span>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <span>{isAr ? 'التوصيل إلى المنزل' : 'Livraison porte-à-porte'}</span>
                      <span className="shrink-0 whitespace-nowrap">{formatPriceDT(DELIVERY_FEE_MILLIMES, lang)}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between border-t border-sand/70 pt-3">
                    <span className="text-sm uppercase tracking-[0.2em] text-ink/60">{isAr ? 'المجموع' : 'Total'}</span>
                    <span className="font-display text-2xl text-accent">{formatPriceDT(total, lang)}</span>
                  </div>
                </div>
                <p className="mt-3 text-xs font-light text-ink/50">
                  <Link to="/livraison" className="text-accent underline underline-offset-2">{isAr ? 'تفاصيل التوصيل' : 'Détails livraison'}</Link>
                  {' · '}
                  <Link to="/faq" className="text-accent underline underline-offset-2">{isAr ? 'الأسئلة الشائعة' : 'Questions fréquentes'}</Link>
                </p>
              </div>

              {/* Coordonnées + paiement */}
              <div className="min-w-0 lg:col-span-5">
                <div className="rounded-2xl bg-ink-deep p-6 text-[#faf6f3] md:p-8 lg:sticky lg:top-24">
                  <h3 className="font-display text-2xl">{isAr ? 'التوصيل' : 'Livraison'}</h3>
                  <p className="mt-1 text-sm font-light text-[#faf6f3]/60">
                    {isAr ? 'سنتصل بكم للتأكيد قبل التحضير.' : 'Nous vous appelons pour confirmer avant préparation.'}
                  </p>
                  <div className="mt-6 space-y-4">
                    <input
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onFocus={onCheckoutStart}
                      placeholder={isAr ? 'اسمكم' : 'Votre nom'}
                      aria-label={isAr ? 'اسمكم' : 'Votre nom'}
                      autoComplete="name"
                      className={inputCls}
                    />
                    <div>
                      <input
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        onFocus={onCheckoutStart}
                        placeholder={isAr ? 'الهاتف (مثال: 23 691 039)' : 'Téléphone (ex : 23 691 039)'}
                        aria-label={isAr ? 'الهاتف' : 'Téléphone'}
                        aria-invalid={phone.length > 0 && !phoneValid}
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        dir="ltr"
                        className={inputCls}
                      />
                      {phone.length > 0 && !phoneValid && (
                        <p className="mt-1.5 text-xs text-red-300" role="alert">
                          {isAr ? 'رقم هاتف تونسي غير صحيح (8 أرقام).' : 'Numéro tunisien invalide (8 chiffres).'}
                        </p>
                      )}
                    </div>
                    <select
                      required
                      value={governorate}
                      onChange={(e) => setGovernorate(e.target.value)}
                      aria-label={isAr ? 'الولاية' : 'Gouvernorat'}
                      autoComplete="address-level1"
                      className={`${inputCls} h-[50px] ${governorate ? '' : 'text-ink/35'}`}
                    >
                      <option value="" disabled>
                        {isAr ? 'الولاية' : 'Gouvernorat'}
                      </option>
                      {TUNISIA_GOVERNORATES.map((g) => (
                        // value = nom français (validé et stocké côté
                        // serveur) ; seul le libellé affiché est traduit.
                        <option key={g} value={g} className="text-ink">
                          {governorateLabel(g, lang)}
                        </option>
                      ))}
                    </select>
                    <input
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder={isAr ? 'المدينة / المعتمدية' : 'Ville / délégation'}
                      aria-label={isAr ? 'المدينة أو المعتمدية' : 'Ville ou délégation'}
                      autoComplete="address-level2"
                      className={inputCls}
                    />
                    <textarea
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder={isAr ? 'العنوان الكامل (الشارع، الرقم، معلم قريب…)' : 'Adresse complète (rue, numéro, repère…)'}
                      aria-label={isAr ? 'العنوان الكامل' : 'Adresse complète'}
                      autoComplete="street-address"
                      rows={2}
                      className={`${inputCls} resize-none`}
                    />
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder={isAr ? 'ملاحظة؟ (تاريخ مرغوب، مناسبة…)' : 'Précision ? (date souhaitée, occasion…)'}
                      aria-label={isAr ? 'ملاحظة (اختياري)' : 'Précision (facultatif)'}
                      rows={2}
                      className={`${inputCls} resize-none`}
                    />
                  </div>

                  <fieldset className="mt-6 border-t border-[#faf6f3]/15 pt-6">
                    <legend className="sr-only">{isAr ? 'طريقة الدفع' : 'Moyen de paiement'}</legend>
                    <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-[#faf6f3]/50">{isAr ? 'الدفع' : 'Paiement'}</p>
                    <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label={isAr ? 'طريقة الدفع' : 'Moyen de paiement'}>
                      {(
                        isAr
                          ? ([
                              ['cod', 'عند التسليم'],
                              ['d17', 'D17'],
                            ] as const)
                          : ([
                              ['cod', 'À la livraison'],
                              ['d17', 'D17'],
                            ] as const)
                      ).map(([method, label]) => (
                        <button
                          key={method}
                          type="button"
                          role="radio"
                          aria-checked={paymentMethod === method}
                          onClick={() => choosePayment(method)}
                          className={`min-h-11 rounded-lg border px-4 py-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b8912e]/60 ${
                            paymentMethod === method
                              ? 'border-[#b8912e] bg-[#b8912e]/15 text-[#b8912e]'
                              : 'border-[#faf6f3]/20 text-[#faf6f3]/70 hover:border-[#faf6f3]/40'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {paymentMethod === 'd17' && (
                      <div className="mt-4 rounded-lg border border-[#b8912e]/40 bg-[#b8912e]/10 p-4">
                        <p className="text-sm font-light text-[#faf6f3]/85">
                          {isAr ? (
                            <>أرسلوا <strong className="font-semibold text-[#b8912e]">{formatPriceDT(total, lang)}</strong> إلى رقم D17&nbsp;:</>
                          ) : (
                            <>Envoyez <strong className="font-semibold text-[#b8912e]">{formatPriceDT(total, lang)}</strong> au numéro D17&nbsp;:</>
                          )}
                        </p>
                        <p className="mt-1 select-all font-display text-2xl tracking-wide text-[#b8912e]" dir="ltr">{D17_NUMBER_DISPLAY}</p>
                        <p className="mt-2 text-xs font-light text-[#faf6f3]/60">
                          {isAr
                            ? 'ثم أرفقوا أدناه صورة الدفع (إلزامي).'
                            : "Puis joignez ci-dessous la capture d'écran du paiement (obligatoire)."}
                        </p>
                        <label className="mt-3 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[#faf6f3]/30 bg-[#faf6f3]/5 px-4 py-4 text-sm text-[#faf6f3]/70 transition-colors hover:border-[#b8912e] focus-within:border-[#b8912e] focus-within:ring-2 focus-within:ring-[#b8912e]/40">
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="sr-only"
                            aria-describedby="proof-help"
                            onChange={(e) => handleProofChange(e.target.files?.[0] ?? null)}
                          />
                          {proofUploading
                            ? isAr
                              ? 'إرسال الصورة…'
                              : 'Envoi de la capture…'
                            : proofKey
                              ? isAr
                                ? '✓ الصورة أُرسلت — انقروا لاستبدالها'
                                : '✓ Capture envoyée — cliquez pour la remplacer'
                              : isAr
                                ? 'أرفقوا صورة الدفع'
                                : 'Joindre la capture d’écran du paiement'}
                        </label>
                        <p id="proof-help" className="sr-only">
                          {isAr ? 'صورة JPG أو PNG أو WEBP، 8 ميغا كحد أقصى.' : 'Image JPG, PNG ou WEBP, 8 Mo maximum.'}
                        </p>
                        {proofPreview && (
                          <img
                            src={proofPreview}
                            alt={isAr ? 'معاينة صورة الدفع D17' : "Aperçu de votre capture d'écran D17"}
                            className="mt-3 max-h-40 rounded-lg border border-[#faf6f3]/20 object-contain"
                          />
                        )}
                        {proofError && <p className="mt-2 text-xs text-red-300" role="alert">{proofError}</p>}
                      </div>
                    )}
                  </fieldset>

                  <div className="mt-6 flex items-baseline border-t border-[#faf6f3]/15 pt-5">
                    <span className="text-sm uppercase tracking-[0.2em]">{isAr ? 'المجموع' : 'Total'}</span>
                    <span className="mx-3 flex-1 border-b border-dotted border-[#faf6f3]/25" aria-hidden="true" />
                    <span className="font-display text-2xl text-[#b8912e]">{formatPriceDT(total, lang)}</span>
                  </div>
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="gold-cta mt-5 h-13 w-full rounded-full px-7 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-white transition-transform duration-300 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#faf6f3]/70 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {createOrder.isPending ? (isAr ? 'إرسال…' : 'Envoi…') : isAr ? 'اطلبوا الآن' : 'Commander'}
                  </button>
                  {!canSubmit && !createOrder.isPending && (
                    <p className="mt-3 text-center text-xs font-light text-[#faf6f3]/50">
                      {!addressValid
                        ? isAr
                          ? 'أكملوا معلوماتكم وعنوان التوصيل.'
                          : 'Complétez vos coordonnées et votre adresse de livraison.'
                        : paymentMethod === 'd17' && !proofKey
                          ? isAr
                            ? 'أرفقوا صورة دفع D17 للمتابعة.'
                            : "Joignez votre capture d'écran de paiement D17 pour continuer."
                          : ''}
                    </p>
                  )}
                  {createOrder.isError && (
                    <p className="mt-3 text-center text-sm text-red-300" role="alert">
                      {friendlyError(createOrder.error.message, isAr)}
                    </p>
                  )}
                  <p className="mt-5 text-center text-xs font-light tracking-wide text-[#faf6f3]/50">
                    {isAr ? (
                      <>أو اتصلوا مباشرة: <a href={PHONE_TEL} dir="ltr" className="underline">{PHONE_DISPLAY}</a></>
                    ) : (
                      <>Ou appelez directement : <a href={PHONE_TEL} className="underline">{PHONE_DISPLAY}</a></>
                    )}
                  </p>
                </div>
              </div>
            </form>
          )}
        </section>

        {/* Contact message */}
        <div className="mt-24 grid gap-10 border-t border-sand/60 pt-16 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-5">
            <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.35em] text-accent">{isAr ? 'اتصل بنا' : 'Contact'}</p>
            <h2 className="font-display text-3xl leading-tight md:text-4xl">
              {isAr ? (
                <>
                  لديكم سؤال؟
                  <br />
                </>
              ) : (
                <>
                  Une question ?
                  <br />
                </>
              )}
              {isAr ? 'راسلونا' : 'Écrivez-nous'}
            </h2>
            <p className="mt-4 max-w-sm text-[15px] font-light leading-relaxed text-ink/70">
              {isAr
                ? 'طلب خاص، زفاف، عيد، كمية كبيرة — اتركوا رسالة، نجيبكم بسرعة. يمكنكم أيضًا المرور إلى المتجر، المفتوح 7 أيام على 7 من الساعة 07:00 حتى منتصف الليل.'
                : 'Commande spéciale, mariage, Aïd, grande quantité — laissez un message, on vous répond vite. Vous pouvez aussi passer à la boutique, ouverte 7j/7 de 07h00 à minuit.'}
            </p>
          </div>
          <div className="min-w-0 lg:col-span-7">
            {msgSent ? (
              <div className="rounded-xl border border-[#b8912e] bg-[#f5ece5] p-8 text-center">
                <p className="font-display text-2xl">{isAr ? 'الرسالة أُرسلت، شكرًا!' : 'Message envoyé, merci !'}</p>
                <p className="mt-2 text-sm font-light text-ink/60">{isAr ? 'سنرد عليكم في أقرب وقت.' : 'Nous vous répondrons très vite.'}</p>
              </div>
            ) : (
              <form onSubmit={submitMessage} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    required
                    value={msgName}
                    onChange={(e) => setMsgName(e.target.value)}
                    placeholder={isAr ? 'اسمكم' : 'Votre nom'}
                    aria-label={isAr ? 'اسمكم' : 'Votre nom'}
                    autoComplete="name"
                    className={inputCls}
                  />
                  <input
                    value={msgPhone}
                    onChange={(e) => setMsgPhone(e.target.value)}
                    placeholder={isAr ? 'الهاتف (اختياري)' : 'Téléphone (facultatif)'}
                    aria-label={isAr ? 'الهاتف (اختياري)' : 'Téléphone (facultatif)'}
                    type="tel"
                    autoComplete="tel"
                    dir="ltr"
                    className={inputCls}
                  />
                </div>
                <textarea
                  required
                  value={msgText}
                  onChange={(e) => setMsgText(e.target.value)}
                  placeholder={isAr ? 'رسالتكم…' : 'Votre message…'}
                  aria-label={isAr ? 'رسالتكم' : 'Votre message'}
                  rows={5}
                  className={`${inputCls} resize-none`}
                />
                {sendMessage.isError && (
                  <p className="text-sm text-red-600" role="alert">{friendlyError(sendMessage.error.message, isAr)}</p>
                )}
                <button
                  type="submit"
                  disabled={sendMessage.isPending}
                  className="rounded-full bg-ink px-8 py-3.5 text-sm font-semibold uppercase tracking-[0.12em] text-[#faf6f3] transition-transform duration-300 hover:scale-[1.03] disabled:opacity-40"
                >
                  {sendMessage.isPending ? (isAr ? 'إرسال…' : 'Envoi…') : isAr ? 'أرسلوا الرسالة' : 'Envoyer le message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Barre flottante (tous écrans) : composition en cours, sinon total + Commander.
          "bottom" suit --cookie-banner-h (mis à jour par CookieConsent.tsx) pour
          rester au-dessus du bandeau de cookies tant qu'il est affiché, au lieu
          de se retrouver caché derrière (même position fixed bottom-0). */}
      {showBar && (
        <div
          className="fixed inset-x-0 z-40 border-t border-sand bg-[#faf6f3]/95 px-5 py-3 backdrop-blur"
          style={{ bottom: 'var(--cookie-banner-h, 0px)' }}
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 md:px-5">
            {composing ? (
              <>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-ink/50" aria-live="polite">
                    {isAr
                      ? `${selected.length} / ${CUSTOM_PACK_SIZE} مُختارة · ${kgLabel(CUSTOM_PACK_WEIGHT_KG, lang)}`
                      : `${selected.length} / ${CUSTOM_PACK_SIZE} sélectionnés · ${kgLabel(CUSTOM_PACK_WEIGHT_KG, lang)}`}
                  </p>
                  <p className="font-display text-lg text-accent">{formatPriceDT(customBarTotal, lang)}</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddCustom}
                  disabled={selected.length !== CUSTOM_PACK_SIZE}
                  className="gold-cta shrink-0 rounded-full px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {selected.length === CUSTOM_PACK_SIZE
                    ? isAr
                      ? 'أضف إلى السلة'
                      : 'Ajouter au panier'
                    : isAr
                      ? `تبقّى ${CUSTOM_PACK_SIZE - selected.length}`
                      : `Encore ${CUSTOM_PACK_SIZE - selected.length}`}
                </button>
              </>
            ) : (
              <>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-ink/50">
                    {isAr
                      ? `${count} عنصر · ${kgLabel(totalWeightKg, lang)} · التوصيل مشمول`
                      : `${count} article${count > 1 ? 's' : ''} · ${kgLabel(totalWeightKg, lang)} · livraison incluse`}
                  </p>
                  <p className="font-display text-lg text-accent">{formatPriceDT(total, lang)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => scrollToId('recap')}
                  className="gold-cta shrink-0 rounded-full px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white"
                >
                  {isAr ? 'اطلبوا الآن' : 'Commander'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
