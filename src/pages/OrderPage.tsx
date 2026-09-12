import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { trpc } from '@/providers/trpc'
import { detectDevice, getAttribution } from '@/lib/attribution'
import { useCart, type CustomLine } from '@/providers/cart'
import { useSEO } from '@/hooks/useSEO'
import { PHONE_DISPLAY, PHONE_TEL, MESSENGER_URL, WHATSAPP_DIGITS } from '@/lib/shop'
import { whatsAppOrderMessage, whatsAppOrderUrl } from '@contracts/whatsappOrder'
import { orderErrorMessage } from '@contracts/orderErrors'
import { unresolvableLines } from '@contracts/cartPruning'
import { orderIdempotencyKey } from '@contracts/orderKey'
import { itemsLabelAr } from '@contracts/arabicPlural'
import { isValidTunisianPhone } from '@contracts/phone'
import { metaContentId } from '@contracts/metaContentId'
import {
  CUSTOMER_DRAFT_KEY,
  CUSTOMER_MEMORY_KEY,
  parseRememberedCustomer,
  serializeRememberedCustomer,
} from '@contracts/customerMemory'
import ProductImage from '@/components/ProductImage'
import { track } from '@/lib/analytics'
import { trackMeta, type MetaContentItem } from '@/lib/metaPixel'
import { buildDisplayLines, kgLabel, type CatalogProduct, type DisplayLine } from '@/lib/orderLines'
import PackCard from '@/components/order/PackCard'
import CustomPackComposer from '@/components/order/CustomPackComposer'
import ProductOrderCard from '@/components/order/ProductOrderCard'
import FlavourChips from '@/components/order/FlavourChips'
import { useLang } from '@/lib/i18n'
import { CATEGORY_LABELS_AR } from '@/lib/categories'
import LanguageSwitch from '@/components/LanguageSwitch'
import { productName } from '@contracts/productText'
import {
  DELIVERY_FEE_MILLIMES,
  DELIVERY_REGION,
  formatDinars,
  DELIVERY_TIME_LABEL,
  DEFAULT_PAYMENT_METHOD,
  TUNISIA_GOVERNORATES,
  governorateLabel,
  priceForWeight,
  type PaymentMethod,
  type WeightKg,
} from '@contracts/shop'
import {
  CUSTOM_PACK_PACKAGING_LABEL,
  CUSTOM_PACK_PACKAGING_LABEL_AR,
  CUSTOM_PACK_SIZE,
  CUSTOM_PACK_WEIGHT_KG,
  FIXED_PACKS,
  packIsAvailable,
  customPackTotal,
  formatPriceDT,
  type FixedPackId,
} from '@contracts/packs'

/** Ce que le client a écrit la dernière fois.
 *
 * Un habitué qui recommande ne doit pas retaper son nom, son téléphone et
 * son adresse : c'est cinq champs de friction pour une information qui n'a
 * pas changé. Rien de sensible n'est rangé : ni paiement, ni panier —
 * ni panier. */
function readRememberedCustomer() {
  let saved: ReturnType<typeof parseRememberedCustomer> = null
  try {
    // Le brouillon d'abord : s'il existe, c'est ce que le client était en
    // train d'écrire à l'instant, et il prime sur la commande d'avant-hier.
    saved =
      parseRememberedCustomer(localStorage.getItem(CUSTOMER_DRAFT_KEY)) ??
      parseRememberedCustomer(localStorage.getItem(CUSTOMER_MEMORY_KEY))
  } catch {
    return null
  }
  if (!saved) return null
  // Un gouvernorat qui ne figure plus dans la liste laisserait le sélecteur
  // vide alors que l'état le croit rempli : le client cliquerait
  // « Commander » et se ferait refuser par le serveur. On repart alors de
  // zéro sur toute l'adresse, qui n'a plus de sens sans son gouvernorat.
  if (!(TUNISIA_GOVERNORATES as readonly string[]).includes(saved.governorate)) {
    return { ...saved, governorate: '', city: '', delegationId: '' }
  }
  return saved
}

/** `count` vient de la page, pas du panier brut : voir « le panier fantôme »
 * plus bas. Le badge doit dire ce que la commande contient vraiment. */
function TopBar({ whatsAppHref, count }: { whatsAppHref: string; count: number }) {
  const lang = useLang()
  const isAr = lang === 'ar'
  return (
    <header className="sticky top-0 z-40 border-b border-sand/60 bg-[#faf6f3]/95 backdrop-blur">
      <div className="h-[3px] bg-gradient-to-r from-[#8f6f22] via-[#b8912e] to-[#8f6f22]" />
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:h-20 md:px-10">
        {/* Le nom écrit disparaît sous 640 px : avec le sélecteur de langue,
            WhatsApp et le panier sur la même ligne, il se réduisait à
            « …IZ » — un mot tronqué dit moins que le seul logo, qui, lui,
            reste entier. */}
        <Link to={isAr ? '/ar' : '/'} className="flex min-w-0 items-center gap-2 md:gap-2.5">
          <img src="/images/logo.webp" alt="Chez Laziz" className="h-9 w-9 shrink-0 md:h-10 md:w-10" width="40" height="40" />
          <span className="hidden truncate font-display tracking-[0.14em] text-ink sm:inline sm:text-xl md:text-2xl">
            CHEZ&nbsp;LAZIZ
          </span>
        </Link>
        <div className="flex items-center gap-2 md:gap-3">
          <LanguageSwitch tone="light" />
          {/* WhatsApp visible sur TOUS les écrans : c'est la voie d'achat que
              prend un client qui ne veut pas remplir de formulaire, et le
              lien téléphone ci-dessous est masqué sur mobile. */}
          <a
            href={whatsAppHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={isAr ? 'اطلبوا عبر واتساب' : 'Commander par WhatsApp'}
            className="flex h-11 items-center gap-2 rounded-full border border-[#25D366]/40 bg-[#25D366]/10 px-3 text-xs font-semibold text-[#128C4A] transition-colors hover:bg-[#25D366]/20 md:px-4"
          >
            <WhatsAppIcon />
            <span className="hidden sm:inline">WhatsApp</span>
          </a>
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
            aria-label={isAr ? `طلبكم، ${itemsLabelAr(count)}` : `Votre commande, ${count} article${count > 1 ? 's' : ''}`}
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

/** Au-delà, on rend son bouton au client plutôt que de le laisser attendre. */
const SUBMIT_STALL_MS = 20_000

const GENERIC_ERROR = `Une erreur est survenue — réessayez, ou appelez-nous au ${PHONE_DISPLAY}.`
const GENERIC_ERROR_AR = `حدث خطأ — أعيدوا المحاولة، أو اتصلوا بنا على ⁦${PHONE_DISPLAY}⁩.`
const MAPS_URL =
  'https://www.google.com/maps/place/Chez+laziz+%D8%A7%D9%84%D9%82%D9%8A%D8%B1%D9%88%D8%A7%D9%86/data=!4m2!3m1!1s0x12fdcf004a648cdf:0xacd6eabb156c7203'

/** Les messages métier du serveur ("produit indisponible", "délégation
 * indisponible") sont lisibles tels quels ; une erreur de validation
 * technique (JSON, zod) est remplacée par un message humain. */
/** Ce que le client lit quand ça rate.
 *
 * Liste BLANCHE, pas noire : seuls les refus que NOUS avons écrits sont
 * affichés, traduits dans sa langue ; tout le reste devient le message
 * générique. L'ancienne liste noire laissait passer ce qu'elle n'avait pas
 * prévu — un vrai navigateur affichait « Unable to transform response from
 * server » à la place de la commande. Voir contracts/orderErrors.ts. */
function friendlyError(message: string | undefined, isAr: boolean): string {
  const generic = isAr ? GENERIC_ERROR_AR : GENERIC_ERROR
  return orderErrorMessage(message, isAr ? 'ar' : 'fr', generic)
}

function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${Math.random().toString(36).slice(2, 12)}`
}

/** Numéro tunisien : 8 chiffres (fixe/mobile), avec ou sans indicatif +216. */
function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/** Logo WhatsApp, tracé à la main : la marque est reconnue à sa forme, un
 * simple « W » ne la remplace pas. Monochrome, il prend la couleur du
 * bouton qui le contient. */
function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="shrink-0">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.23 8.23 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23a8.2 8.2 0 0 1 5.82 2.42 8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.69 8.23-8.23 8.23Zm4.52-6.16c-.25-.13-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.84-.2-.49-.4-.42-.56-.43h-.47c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07s.89 2.4 1.02 2.56c.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.11-.22-.17-.47-.29Z" />
    </svg>
  )
}

type Tab = 'produits' | 'packs' | 'custom'
const TAB_HASH: Record<Tab, string> = {
  produits: '#produits',
  packs: '#packs',
  custom: '#custom',
}
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
/** Raccourcis publicitaires : /commande?produit=<slug> ouvre la page avec
 * ce makroudh présenté seul, en haut, prêt à être ajouté.
 *
 * Une entrée par produit du catalogue. Le rapprochement se fait par MOT-CLÉ
 * et non par identifiant : un produit recréé depuis l'admin change d'id, son
 * nom beaucoup plus rarement — et un lien publicitaire mort coûte cher.
 * Un slug inconnu n'est pas une erreur : la page s'affiche normalement. */
const SPOTLIGHT_KEYWORDS: Record<string, string> = {
  dattes: 'dattes',
  jwayed: 'jwayed',
  'fruits-secs': 'fruits secs',
  pistache: 'pistache',
  fraise: 'fraise',
  vanille: 'vanille',
  figues: 'figues',
  ananas: 'ananas',
  cafe: 'café',
  noisettes: 'noisettes',
  samsa: 'samsa',
  'blanc-laziz': 'blanc laziz',
  ble: 'blé',
  amandes: 'amandes',
  zgougou: 'zgougou',
  chamia: 'chamia',
}
function findSpotlightProduct(catalog: CatalogProduct[], slug: string | null): CatalogProduct | undefined {
  const keyword = slug ? SPOTLIGHT_KEYWORDS[slug.toLowerCase()] : undefined
  if (!keyword) return undefined
  return catalog.find((p) => p.name.toLowerCase().includes(keyword))
}

type Placed = {
  id: number
  recapText: string
  recap: {
    lines: {
      key: string
      label: string
      contents: string[]
      totalMillimes: number
    }[]
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
            'اطلبوا مقروض Chez Laziz: بالوزن (500 غ إلى 2.5 كغ)، حزم لعزيز الملكية والفاخرة والشهية والكلاسيكية، أو حزمة على مقاسكم (4 × 500 غ). توصيل في جميع أنحاء تونس خلال 24 ساعة، الدفع نقدًا عند التسليم.',
          path: '/ar/commande',
          breadcrumb: 'اطلبوا',
        }
      : {
          title: 'Commander — Chez Laziz | Makroudh au poids, packs et pack sur mesure',
          description:
            'Commandez vos makroudh Chez Laziz : à la carte (500 g à 2,5 kg), packs Laziz VIP, Premium, Délice, Classique ou pack sur mesure (4 × 500 g). Livraison partout en Tunisie sous 24h, paiement en espèces à la livraison.',
          path: '/commande',
          breadcrumb: 'Commander',
        },
  )
  const { data: products, isLoading, isError: catalogError } = trpc.products.list.useQuery()
  const createOrder = trpc.orders.create.useMutation()
  const sendMessage = trpc.contact.send.useMutation()
  const catalog = useMemo(() => (products ?? []) as CatalogProduct[], [products])

  const { lines, add, setQty, packQty, addPack, addCustom, setLineQty, removeLine, dropUnresolvable, clear } =
    useCart()

  /** La saveur choisie dans la barre de puces, ou null pour tout le
   * catalogue. Volontairement PAS dans l'URL : c'est un geste de survol, pas
   * une page — et une URL filtrée partagée sur Facebook cacherait quinze
   * produits à celui qui l'ouvre. */
  const [flavour, setFlavour] = useState<number | null>(null)
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
      items: [
        {
          item_id: String(spotlight.id),
          item_name: spotlight.name,
          price: spotlight.priceMillimes / 1000,
        },
      ],
    })
    // Signal Meta équivalent à celui de la page produit dédiée — nécessaire
    // ici car les publicités pointent désormais directement vers /commande.
    trackMeta('ViewContent', {
      value: spotlight.priceMillimes / 1000,
      contents: [
        {
          id: String(spotlight.id),
          item_price: spotlight.priceMillimes / 1000,
        },
      ],
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

  // Lu une seule fois, à la construction — jamais dans un effet, sinon on
  // écraserait une saisie en cours.
  const [remembered] = useState(readRememberedCustomer)

  const [name, setName] = useState(remembered?.name ?? '')
  const [phone, setPhone] = useState(remembered?.phone ?? '')
  const [governorate, setGovernorate] = useState(remembered?.governorate ?? '')
  const [city, setCity] = useState(remembered?.city ?? '')
  // L'identifiant de la délégation chez le transporteur. La ville n'est plus
  // écrite par le client : il la choisit dans la liste du gouvernorat.
  const [delegationId, setDelegationId] = useState(remembered?.delegationId ?? '')
  const delegationsQuery = trpc.orders.delegations.useQuery(
    { governorate: governorate as (typeof TUNISIA_GOVERNORATES)[number] },
    { enabled: !!governorate, staleTime: 60 * 60 * 1000 },
  )
  const delegations = delegationsQuery.data ?? []
  // La saisie libre ne revient que si, POUR LE GOUVERNORAT CHOISI, la liste
  // s'est révélée vide ou injoignable : mieux vaut une ville écrite à la
  // main qu'un client qui ne peut pas commander. Avant tout choix de
  // gouvernorat, c'est le sélecteur (désactivé) qui s'affiche, pas un champ
  // texte — sinon la page changerait de forme sous les doigts du client.
  const listUnavailable =
    !!governorate && !delegationsQuery.isLoading && (delegationsQuery.isError || delegations.length === 0)
  const useDelegationList = !listUnavailable
  const [address, setAddress] = useState(remembered?.address ?? '')
  const [note, setNote] = useState('')
  // Un seul moyen de paiement : plus rien à choisir, plus rien à téléverser.
  // Voir le retrait de D17 dans contracts/shop.ts.
  const paymentMethod: PaymentMethod = DEFAULT_PAYMENT_METHOD
  // Renouvelé après chaque commande réussie ; voir orderIdempotencyKey.
  const [idempotencySalt, setIdempotencySalt] = useState(() => newIdempotencyKey())
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
  /** Le détail des articles, replié dès qu'on entre dans la commande.
   *
   * Le client vient de les choisir : les lui remontrer en grand entre lui et
   * le formulaire ajoutait 1,8 écran de défilement avant le bouton final.
   * Replié, il reste une ligne — vignettes, quantité, total — dépliable d'un
   * geste par qui veut vérifier. */
  const [linesOpen, setLinesOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  /** Le vrai bouton « Commander », observé.
   *
   * La barre flottante ne s'efface que lorsque CE bouton est à l'écran :
   * tant qu'il ne l'est pas — y compris au milieu du formulaire — le client
   * garde son total et son bouton sous le pouce. C'est la seule règle qui
   * garantit qu'il n'existe aucun moment du tunnel sans moyen de valider. */
  const [submitVisible, setSubmitVisible] = useState(false)
  const submitObserverRef = useRef<IntersectionObserver | null>(null)
  /** Ref de rappel, pas useEffect : le bouton n'existe pas au montage — le
   * panier est vide et le formulaire n'est pas rendu. Un effet lancé une
   * fois n'observerait donc jamais rien, et la barre resterait collée à
   * l'écran par-dessus le vrai bouton. */
  const attachSubmit = useCallback((el: HTMLDivElement | null) => {
    submitObserverRef.current?.disconnect()
    submitObserverRef.current = null
    if (!el || typeof IntersectionObserver === 'undefined') {
      setSubmitVisible(false)
      return
    }
    const io = new IntersectionObserver(([entry]) => setSubmitVisible(entry.isIntersecting), { threshold: 0.6 })
    io.observe(el)
    submitObserverRef.current = io
  }, [])
  useEffect(() => {
    const el = recapRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([entry]) => setRecapVisible(entry.isIntersecting), { threshold: 0.15 })
    io.observe(el)
    return () => io.disconnect()
  }, [placed])

  const items: DisplayLine[] = useMemo(() => buildDisplayLines(lines, catalog, lang), [lines, catalog, lang])
  /** Le panier fantôme.
   *
   * Un panier vit des jours dans le navigateur. Si un produit est supprimé
   * ou masqué depuis l'admin entre-temps, sa ligne devient introuvable :
   * elle disparaît du récapitulatif MAIS restait comptée dans le panier. Le
   * client voyait « 1 article », un total de 8 DT — les frais de port seuls —
   * et, en dessous, « votre commande est vide ». Constaté dans un vrai
   * navigateur, capture à l'appui : plus aucun moyen d'avancer.
   *
   * Ici, tout ce que la page affiche est DÉRIVÉ des lignes réellement
   * chiffrées. Le fantôme ne peut donc plus apparaître nulle part. On le
   * signale au client et on lui laisse le geste : retirer une ligne de son
   * panier sans qu'il l'ait demandé est une décision qui lui appartient.
   *
   * La garde compte : rien n'est déclaré orphelin tant que le catalogue n'a
   * pas réellement répondu — sinon une panne réseau accuserait un panier
   * parfaitement valide. */
  const catalogReady = !isLoading && !catalogError && catalog.length > 0
  const orphelines = useMemo(
    () => (catalogReady ? unresolvableLines(lines, catalog.map((p) => p.id)) : []),
    [catalogReady, lines, catalog],
  )
  const orphanCount = orphelines.reduce((s, l) => s + l.qty, 0)

  /** Les packs qu'on peut RÉELLEMENT préparer aujourd'hui.
   *
   * Le prix d'un pack est figé, mais son contenu vient du catalogue. Un
   * makroudh marqué indisponible depuis l'administration laissait le pack
   * qui le contient en vente : le client l'ajoutait, remplissait tout le
   * formulaire, et se faisait refuser au dernier instant. Mieux vaut ne pas
   * le montrer que le refuser après coup — un refus à la validation est la
   * pire place possible pour dire non.
   *
   * Même garde qu'ailleurs : tant que le catalogue n'a pas répondu, on
   * n'enlève rien, sinon une panne réseau viderait le rayon. */
  const packsVendables = useMemo(
    () =>
      catalogReady
        ? FIXED_PACKS.filter((p) => packIsAvailable(p, catalog.map((c) => c.name)))
        : FIXED_PACKS,
    [catalogReady, catalog],
  )
  /** Ce que le client a VRAIMENT dans sa commande, fantômes exclus. */
  const itemCount = items.reduce((s, l) => s + l.qty, 0)

  /** La clé d'idempotence suit le CONTENU du panier.
   *
   * Elle protège du double envoi : même clé, même commande côté serveur.
   * Mais elle n'était renouvelée qu'APRÈS un succès. Si l'envoi échouait,
   * que le client modifiait son panier puis réessayait, le serveur
   * retrouvait la clé et renvoyait la PREMIÈRE commande — pendant que
   * l'écran affichait le nouveau panier. Le client recevait et payait autre
   * chose que ce qu'on venait de lui confirmer. Voir contracts/orderKey.ts. */
  const idempotencyKey = useMemo(
    () => orderIdempotencyKey(idempotencySalt, JSON.stringify(lines)),
    [idempotencySalt, lines],
  )

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
    items.map((l) => ({
      id: l.analyticsId,
      quantity: l.qty,
      item_price: l.unitPriceMillimes / 1000,
    }))

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
      items: [
        {
          item_id: `pack:${packId}`,
          item_name: pack.name,
          price: pack.priceMillimes / 1000,
          quantity: 1,
        },
      ],
    })
    trackMeta('AddToCart', {
      value: pack.priceMillimes / 1000,
      contents: [
        {
          id: `pack:${packId}`,
          quantity: 1,
          item_price: pack.priceMillimes / 1000,
        },
      ],
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
  /** DEUX rayons, pas trois.
   *
   * « Les nouveautés » a disparu comme titre : au bout de quelques mois
   * tout y devient ancien, et un client venu d'une publicité ne cherche pas
   * la nouveauté — il cherche du makroudh. Ces produits rejoignent les
   * signatures, qui sont de toute façon des créations elles aussi.
   *
   * Les classiques d'abord, et c'est délibéré : ce sont les moins chers
   * (8 à 12 DT contre 17 à 40). Sur du trafic froid, le premier prix vu
   * décide si la page paraît accessible ou hors de portée.
   *
   * Une catégorie inconnue, créée un jour depuis l'admin, ne disparaît pas :
   * elle rejoint les signatures plutôt que de laisser ses produits invisibles. */
  const categories = useMemo(() => {
    const classiques: CatalogProduct[] = []
    const signatures: CatalogProduct[] = []
    // Le filtre de saveur s'applique ICI plutôt que dans le rendu : une
    // catégorie devenue vide disparaît alors avec son titre, au lieu de
    // laisser « Les classiques » suivi de rien.
    const visibles = flavour === null ? catalog : catalog.filter((p) => p.id === flavour)
    for (const p of visibles) (p.category === 'Les classiques' ? classiques : signatures).push(p)
    return [
      ['Les classiques', classiques],
      ['Les signatures', signatures],
    ].filter(([, items]) => (items as CatalogProduct[]).length > 0) as [string, CatalogProduct[]][]
  }, [catalog, flavour])

  const handleAddCustom = () => {
    if (selected.length !== CUSTOM_PACK_SIZE) return
    const chosen = selected.map((id) => catalog.find((p) => p.id === id)).filter((p): p is CatalogProduct => !!p)
    if (chosen.length !== CUSTOM_PACK_SIZE) return
    const price = customPackTotal(chosen.map((p) => p.priceMillimes))
    addCustom(selected)
    // La référence DOIT passer par metaContentId : elle trie les
    // identifiants. Construite ici à la main, elle suivait l'ordre des CLICS,
    // alors que l'achat (serveur) et InitiateCheckout la trient. Le même pack
    // composé dans un autre ordre devenait donc deux produits différents pour
    // Meta — panier et achat jamais rapprochés, reciblage cassé.
    const customId = metaContentId({ kind: 'custom', productIds: selected })
    track('add_to_cart', {
      value: price / 1000,
      items: [
        {
          item_id: customId,
          item_name: 'Custom Pack',
          price: price / 1000,
          quantity: 1,
        },
      ],
    })
    trackMeta('AddToCart', {
      value: price / 1000,
      contents: [
        {
          id: customId,
          quantity: 1,
          item_price: price / 1000,
        },
      ],
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
  /** La commande est-elle COMPLÈTE ? Rien d'autre.
   *
   * Elle contenait aussi `!createOrder.isPending`. Résultat : une fois le
   * bouton rendu au client après un envoi qui traîne, son second appui
   * repartait en silence — un bouton mort de plus, à l'endroit exact où on
   * venait d'en supprimer un. L'envoi en cours se garde à l'entrée de
   * submit(), pas ici. */
  const canSubmit = items.length > 0 && addressValid

  /** Le premier champ qui manque, avec de quoi le montrer.
   *
   * UN BOUTON GRISÉ EST UNE IMPASSE : le client voit qu'il ne peut pas
   * commander et n'apprend jamais pourquoi — il s'en va. Le bouton reste
   * donc actif ; au clic, on l'emmène au champ qui bloque et on le nomme. */
  const firstMissing = (): { id: string; message: string } | null => {
    if (name.trim().length < 2)
      return {
        id: 'f-name',
        message: isAr ? 'أدخلوا اسمكم.' : 'Indiquez votre nom.',
      }
    if (!phoneValid)
      return {
        id: 'f-phone',
        message: isAr ? 'رقم هاتف تونسي (8 أرقام).' : 'Un numéro tunisien à 8 chiffres.',
      }
    if (!governorate)
      return {
        id: 'f-gov',
        message: isAr ? 'اختاروا الولاية.' : 'Choisissez le gouvernorat.',
      }
    if (useDelegationList ? !delegationId : city.trim().length === 0)
      return {
        id: 'f-city',
        message: isAr ? 'اختاروا المعتمدية.' : 'Choisissez la délégation.',
      }
    if (address.trim().length < 5)
      return {
        id: 'f-address',
        message: isAr ? 'أدخلوا العنوان الكامل.' : 'Indiquez votre adresse complète.',
      }
    return null
  }
  /** L'envoi qui n'en finit pas.
   *
   * Piloté dans un navigateur : requête laissée sans réponse, le bouton
   * affichait « ENVOI… » indéfiniment. Sur du mobile tunisien, une requête
   * qui n'aboutit jamais est banale ; le client attend, puis s'en va, et il
   * n'a AUCUN moyen de savoir quoi faire. Passé le délai, on lui rend son
   * bouton et on lui montre la sortie. Réessayer est sans danger : la clé
   * d'idempotence est liée au contenu du panier, donc une commande partie
   * deux fois n'en crée qu'une (voir contracts/orderKey.ts). */
  const [submitStalled, setSubmitStalled] = useState(false)
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [missingHint, setMissingHint] = useState<{
    id: string
    message: string
  } | null>(null)

  /** Le lien WhatsApp, panier compris.
   *
   * Un lien wa.me nu ouvre une conversation vide et demande au client de
   * retaper sa commande : il ne le fait pas. Ici le message est déjà écrit,
   * il ne reste qu'à l'envoyer — c'est la porte de sortie de ceux qui ne
   * rempliront jamais un formulaire, et en Tunisie ils sont nombreux. */
  const whatsAppHref = useMemo(
    () =>
      whatsAppOrderUrl(
        WHATSAPP_DIGITS,
        whatsAppOrderMessage(
          items.map((l) => ({
            label: `${l.qty > 1 ? `${l.qty} × ` : ''}${l.variant} ${l.name}`,
            contents: l.contents,
            totalMillimes: l.qty * l.unitPriceMillimes,
          })),
          {
            subtotalMillimes: subtotal,
            deliveryMillimes: DELIVERY_FEE_MILLIMES,
            totalMillimes: total,
          },
          lang,
        ),
      ),
    [items, subtotal, total, lang],
  )

  /** Le départ vers WhatsApp, mesuré.
   *
   * Ce bouton emmène le client HORS du site : la commande se conclut dans une
   * conversation, donc rien n'atteint la base, ni Telegram, ni le tableau de
   * bord. Sans cet événement, cette porte serait totalement AVEUGLE — on
   * verrait le trafic entrer et disparaître, et la publicité n'apprendrait
   * rien de ces acheteurs-là, qui sont pourtant de vrais acheteurs.
   *
   * « Contact », pas « Purchase » : personne n'a encore acheté. Envoyer un
   * achat ici apprendrait à Meta que cliquer vaut vendre, et le budget
   * partirait sur des gens qui cliquent sans jamais commander. */
  const noterDepartWhatsApp = () => {
    track('contact_whatsapp', { value: total / 1000, items: analyticsItems() })
    trackMeta('Contact', {
      value: total / 1000,
      contents: metaContents(),
    })
  }

  /** Le message est affiché AU CHAMP, pas trois écrans plus bas.
   *
   * On l'emmène au champ qui bloque : s'il y arrive sans rien lire, il voit
   * un curseur clignoter et ne sait toujours pas ce qu'on lui demande. Le
   * message disparaît de lui-même dès que le champ est rempli — pas besoin
   * d'un second clic pour l'effacer. */
  const activeHint = missingHint && firstMissing()?.id === missingHint.id ? missingHint : null
  const hintFor = (id: string) =>
    activeHint?.id === id ? (
      <p className="mt-1.5 text-xs font-medium text-amber-200" role="alert">
        {activeHint.message}
      </p>
    ) : null

  /** Range le brouillon à chaque frappe.
   *
   * Écrit dans un gestionnaire d'événement, jamais dans un effet : c'est le
   * geste du client qui déclenche l'enregistrement. Le stockage peut être
   * refusé (navigation privée, quota) — on continue sans, la commande
   * compte plus que le confort. */
  const saveDraft = (champs: Partial<Parameters<typeof serializeRememberedCustomer>[0]>) => {
    try {
      localStorage.setItem(
        CUSTOMER_DRAFT_KEY,
        serializeRememberedCustomer({
          name,
          phone,
          governorate,
          city,
          delegationId,
          address,
          ...champs,
        }),
      )
    } catch {
      // stockage indisponible — tant pis, rien de vital n'en dépend
    }
  }

  const goToMissing = (miss: { id: string; message: string }) => {
    setMissingHint(miss)
    const el = document.getElementById(miss.id)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // Le focus après le défilement : sur iOS, ouvrir le clavier pendant
    // l'animation la fait sauter et le champ finit hors écran.
    //
    // Et jamais sur un champ DÉSACTIVÉ. Le sélecteur de délégation l'est tant
    // que sa liste charge : on aurait dit au client « choisissez la
    // délégation » en posant le curseur sur quelque chose d'incliquable. Le
    // défilement et le message, eux, ont lieu dans tous les cas — c'est ce
    // qu'il doit voir.
    setTimeout(() => {
      const cible = el as HTMLElement & { disabled?: boolean }
      if (!cible.disabled) cible.focus({ preventScroll: true })
    }, 350)
  }

  const onCheckoutStart = () => {
    if (checkoutStartedRef.current || items.length === 0) return
    checkoutStartedRef.current = true
    track('begin_checkout', { value: total / 1000, items: analyticsItems() })
    trackMeta('InitiateCheckout', {
      value: total / 1000,
      contents: metaContents(),
    })
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (createOrder.isPending && !submitStalled) return
    const miss = firstMissing()
    if (miss) {
      goToMissing(miss)
      return
    }
    setMissingHint(null)
    if (!canSubmit) return
    setSubmitStalled(false)
    if (stallTimerRef.current) clearTimeout(stallTimerRef.current)
    stallTimerRef.current = setTimeout(() => setSubmitStalled(true), SUBMIT_STALL_MS)
    const snapshot = items.map((l) => ({
      key: l.key,
      label: `${l.qty} × ${l.name} (${kgLabel(l.weightKg, lang)})`,
      contents: l.contents,
      totalMillimes: l.qty * l.unitPriceMillimes,
    }))
    const addressLine = `${address.trim()}, ${city.trim()}, ${governorate}`
    const attribution = getAttribution()
    createOrder.mutate(
      {
        customerName: name.trim(),
        phone: phone.trim(),
        governorate: governorate as (typeof TUNISIA_GOVERNORATES)[number],
        city: city.trim(),
        delegationExternalId: delegationId || undefined,
        address: address.trim(),
        note: note.trim() || undefined,
        items: items.map(({ line }) =>
          line.kind === 'product'
            ? {
                kind: 'product' as const,
                productId: line.productId,
                weightKg: line.weightKg,
                qty: line.qty,
              }
            : line.kind === 'pack'
              ? { kind: 'pack' as const, packId: line.packId, qty: line.qty }
              : {
                  kind: 'custom' as const,
                  productIds: line.productIds,
                  qty: line.qty,
                },
        ),
        paymentMethod,
        idempotencyKey,
        // Origine de la visite, captée à l'arrivée sur le site. Rien n'est
        // demandé au client et rien n'est affiché ici.
        ...(attribution
          ? {
              acquisitionSource: attribution.source,
              acquisitionCampaign: attribution.campaign,
              acquisitionContent: attribution.content,
            }
          : {}),
        deviceType: detectDevice(),
      },
      {
        onSuccess: (order) => {
          if (stallTimerRef.current) clearTimeout(stallTimerRef.current)
          setSubmitStalled(false)
          // Rangé seulement après une commande RÉELLEMENT acceptée : une
          // adresse que le serveur a refusée n'a rien à revenir toute seule
          // dans le formulaire de la prochaine.
          try {
            // Le brouillon a fait son office : la commande est enregistrée.
            localStorage.removeItem(CUSTOMER_DRAFT_KEY)
            localStorage.setItem(
              CUSTOMER_MEMORY_KEY,
              serializeRememberedCustomer({
                name: name.trim(),
                phone: phone.trim(),
                governorate,
                city: city.trim(),
                delegationId,
                address: address.trim(),
              }),
            )
          } catch {
            // Navigation privée ou stockage plein : la commande est passée,
            // c'est tout ce qui compte.
          }
          // Même règle que pour l'écran : le montant écrit au client est
          // celui que le serveur a enregistré.
          const totalReel = order?.totalMillimes ?? total
          const text = isAr
            ? `مرحبًا Chez Laziz! الطلب رقم ${order?.id ?? ''} — ${name.trim()} :\n${snapshot
                .map((l) => `• ${l.label}${l.contents.length ? ` : ${l.contents.join(', ')}` : ''}`)
                .join('\n')}\nالتوصيل: ${addressLine}\nالمجموع (التوصيل مشمول): ${formatPriceDT(totalReel, lang)}\nالدفع: عند التسليم`
            : `Bonjour Chez Laziz ! Commande n°${order?.id ?? ''} — ${name.trim()} :\n${snapshot
                .map((l) => `• ${l.label}${l.contents.length ? ` : ${l.contents.join(', ')}` : ''}`)
                .join('\n')}\nLivraison : ${addressLine}\nTotal (livraison incluse) : ${formatPriceDT(totalReel, lang)}\nPaiement : à la livraison`
          track('purchase', {
            transaction_id: String(order?.id ?? ''),
            // Même source que l'écran et le message WhatsApp : le montant
            // enregistré par le serveur. Le total calculé ici en diffère dès
            // qu'un prix change pendant la saisie, et le chiffre d'affaires
            // rapporté à GA4 se met alors à dériver du réel.
            value: totalReel / 1000,
            shipping: DELIVERY_FEE_MILLIMES / 1000,
            items: analyticsItems(),
          })
          // Pas de "Purchase" Meta ici : une commande qui vient d'être créée
          // n'est pas encore confirmée : personne n'a encore appelé le client.
          // L'événement est envoyé côté serveur uniquement une fois la
          // commande réellement confirmée — voir api/lib/metaConversionsApi.ts
          // et maybeReportMetaPurchase dans api/ordersRouter.ts.
          // LES MONTANTS DU SERVEUR, PAS CEUX DU NAVIGATEUR.
          //
          // Le serveur recalcule tout et enregistre SON total : c'est celui
          // que le livreur encaissera. Si un prix a changé depuis
          // l'administration pendant que le client remplissait le formulaire,
          // les deux chiffres diffèrent — et le client repartirait avec une
          // promesse que sa commande ne tient pas. Discussion à la porte,
          // colis refusé, transport payé pour rien.
          //
          // Le calcul local reste le repli : si la réponse arrivait sans ses
          // montants, mieux vaut le chiffre affiché pendant la saisie que
          // rien du tout.
          setPlaced({
            id: order?.id ?? 0,
            recapText: text,
            recap: {
              lines: snapshot,
              subtotalMillimes: order?.subtotalMillimes ?? subtotal,
              totalMillimes: order?.totalMillimes ?? total,
              address: addressLine,
            },
          })
          clear()
          setIdempotencySalt(newIdempotencyKey())
          window.scrollTo({ top: 0 })
        },
        // LE DÉFAUT LE PLUS COÛTEUX DE TOUT LE TUNNEL, constaté à l'écran :
        // le message de refus s'affiche sous le bouton « Commander ». Or
        // depuis la barre flottante, ce bouton est HORS ÉCRAN par
        // construction — c'est même la seule raison d'être de la barre. Le
        // client appuyait, le serveur refusait, et il ne voyait STRICTEMENT
        // RIEN. Il appuyait encore, puis partait. On le ramène donc au
        // message, comme on le fait déjà pour un champ manquant.
        onError: () => {
          if (stallTimerRef.current) clearTimeout(stallTimerRef.current)
          setSubmitStalled(false)
          scrollToId('cl-submit')
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
      {
        name: msgName.trim(),
        phone: msgPhone.trim() || undefined,
        message: msgText.trim(),
      },
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
        <TopBar whatsAppHref={whatsAppHref} count={itemCount} />
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
              ? 'سنتصل بكم في أقرب وقت لتأكيد طلبكم. الدفع نقدًا عند التسليم.'
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
  // La barre reste tant que le bouton final n'est pas sous les yeux du
  // client — pas seulement avant d'atteindre le récapitulatif.
  const showBar = composing || (itemCount > 0 && !submitVisible)

  return (
    <div className="min-h-screen bg-[#faf6f3]">
      <TopBar whatsAppHref={whatsAppHref} count={itemCount} />

      {/* ── En-tête ──
          COURT PAR NÉCESSITÉ. Mesuré sur un téléphone de 844 px : l'ancienne
          version plaçait le premier bouton « ajouter » à 1337 px, soit une
          page et demie de défilement avant de pouvoir acheter quoi que ce
          soit. Sur du trafic publicitaire — un visiteur qui vient de VOIR le
          makroudh en vidéo et le veut — chaque ligne de préambule est une
          vente perdue.
          Le titre reste (il confirme qu'on est au bon endroit), le reste
          fond : la promesse tient sur une ligne, et les quatre arguments
          (fait main, livraison, délai, paiement) deviennent une bande fine
          au lieu d'une carte de 120 px. ── */}
      <section className="relative border-b border-sand/60">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#f3e9dc] to-transparent" />
        <div className="relative mx-auto max-w-3xl px-5 pb-4 pt-6 text-center md:px-10 md:pb-6 md:pt-14">
          <h1 className="font-display text-[26px] leading-[1.1] md:text-5xl">{isAr ? 'اطلبوا مقروضكم' : 'Commandez vos makroudh'}</h1>
          <p className="mx-auto mt-2 max-w-xl text-[13px] font-light leading-snug text-ink/65 md:mt-3 md:text-[15px]">
            {isAr
              ? `يُصنع يدويًا في القيروان ويُوصَّل في كل تونس خلال ${
                  DELIVERY_TIME_LABEL === '24h' ? '24 ساعة' : DELIVERY_TIME_LABEL
                }.`
              : `Façonnés à la main à Kairouan, livrés partout en Tunisie sous ${DELIVERY_TIME_LABEL}.`}
          </p>
          <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[11px] text-ink/60 md:mt-4 md:text-xs">
            {(
              isAr
                ? [
                    ['100%', 'صناعة يدوية'],
                    [formatDinars(DELIVERY_FEE_MILLIMES), 'د.ت توصيل'],
                    [DELIVERY_TIME_LABEL === '24h' ? '24 س' : DELIVERY_TIME_LABEL, 'كل تونس'],
                    ['نقدًا عند التسليم', 'الدفع'],
                  ]
                : [
                    ['100%', 'Fait main'],
                    [formatDinars(DELIVERY_FEE_MILLIMES), 'DT livraison'],
                    [DELIVERY_TIME_LABEL, 'Toute la Tunisie'],
                    ['À la livraison', 'Paiement'],
                  ]
            ).map(([n, label], i) => (
              <li key={label} className="flex items-center gap-1.5">
                {i > 0 && <span aria-hidden="true" className="text-sand">·</span>}
                <span className="font-semibold text-[#b8912e]">{n}</span>
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Onglets */}
        <div className="mx-auto max-w-7xl px-5 pb-4 md:px-10 md:pb-6">
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

      {/* Le bandeau de cookies est en position fixe au bas de l'écran. La
          barre flottante s'en écarte déjà ; le contenu, lui, passait dessous
          — et le bouton « Commander » pouvait s'y retrouver caché à l'instant
          exact où la barre disparaît, parce qu'il venait d'entrer dans le
          champ de vision. On réserve donc sa hauteur en bas de page. */}
      <main
        className={`mx-auto max-w-7xl px-5 py-6 md:px-10 md:py-12 ${showBar ? 'pb-32' : ''}`}
        style={{ paddingBottom: `calc(var(--cookie-banner-h, 0px) + ${showBar ? '8rem' : '1.5rem'})` }}
      >
        {/* ── Nos produits (à la carte, au poids) ──
            Sans titre de section : l'onglet actif, à trois centimètres
            au-dessus, dit déjà « Produits ». Le répéter en grand coûtait
            250 px de défilement avant le premier makroudh, sur une page où
            le visiteur arrive en sachant déjà ce qu'il veut. Le mode
            d'emploi du poids tient sur une ligne discrète — et le sélecteur
            de poids, lui, est dans chaque carte. ── */}
        <section id="panel-produits" role="tabpanel" aria-labelledby="tab-produits" hidden={tab !== 'produits'}>
          <p className="mb-4 text-center text-xs font-light text-ink/50 md:mb-5 md:text-sm">
            {isAr
              ? 'اختاروا الوزن والكمية. الأسعار لـ 1 كغ.'
              : 'Choisissez le poids et la quantité. Prix affichés pour 1 kg.'}
          </p>
          {catalog.length > 0 && (
            <FlavourChips products={catalog} selectedId={flavour} onSelect={setFlavour} lang={lang} />
          )}
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
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
            categories.map(([category, items], ci) => (
              // La toute première catégorie colle aux onglets : rien ne doit
              // séparer le visiteur du premier makroudh. Les suivantes
              // gardent leur respiration.
              <div key={category} className={ci === 0 ? '' : 'mt-8 md:mt-10'}>
                <h3 className="mb-3 flex items-center gap-4 font-display text-xl md:mb-4 md:text-2xl">
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
            {packsVendables.map((pack) => (
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
        <section id="recap" ref={recapRef} className="mt-12 scroll-mt-20 border-t border-sand/60 pt-8 md:mt-20 md:scroll-mt-24 md:pt-12">
          <h2 className="text-center font-display text-2xl md:text-3xl">{isAr ? 'إتمام الطلب' : 'Votre commande'}</h2>

          {/* On le dit, on ne le fait pas en douce : un article qui s'évapore
              sans un mot passe pour un bug et fait fuir. */}
          {orphanCount > 0 && (
            <div
              className="mx-auto mt-4 max-w-xl rounded-xl border border-[#b8912e]/40 bg-[#b8912e]/10 px-4 py-3 text-center text-[13px] text-ink/80"
              role="status"
            >
              <p>
                {isAr
                  ? `${orphanCount > 1 ? `${orphanCount} عناصر لم تعد متوفّرة` : 'عنصر لم يعد متوفّرًا'} ولا يمكن طلبها. اتصلوا بنا على ⁦${PHONE_DISPLAY}⁩ إذا كنتم تريدونها.`
                  : `${orphanCount > 1 ? `${orphanCount} articles ne sont plus disponibles` : "Un article n'est plus disponible"} et ne peut plus être commandé. Appelez-nous au ${PHONE_DISPLAY} si vous y tenez.`}
              </p>
              <button
                type="button"
                onClick={() => dropUnresolvable(catalog.map((p) => p.id))}
                className="mt-2 min-h-9 rounded-full border border-ink/25 px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink transition-colors hover:border-[#b8912e] hover:text-accent"
              >
                {isAr ? 'أزيلوه من السلة' : 'Retirer de mon panier'}
              </button>
            </div>
          )}

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
            <form
              onSubmit={submit}
              ref={formRef}
              // La validation native est écartée volontairement. Elle
              // affichait une bulle du navigateur, dans SA langue et non
              // celle du client, qui disparaît au premier geste — et elle
              // court-circuitait firstMissing(), donc nos messages en arabe
              // et en français ne s'affichaient jamais. Les `required`
              // restent : ils portent le sens pour les lecteurs d'écran.
              noValidate
              className="mt-5 grid gap-5 lg:grid-cols-12 lg:gap-10"
            >
              {/* Lignes — repliées sur mobile, toujours ouvertes à partir de
                  lg où la place ne manque pas. */}
              <div className="min-w-0 lg:col-span-7">
                <button
                  type="button"
                  onClick={() => setLinesOpen((v) => !v)}
                  aria-expanded={linesOpen}
                  className="flex w-full items-center gap-3 rounded-2xl border border-sand/80 bg-white px-4 py-3 text-start shadow-sm lg:hidden"
                >
                  <span className="flex shrink-0 -space-x-2 rtl:space-x-reverse">
                    {items.slice(0, 3).map((l) => (
                      <span
                        key={l.key}
                        className="h-9 w-9 overflow-hidden rounded-full border-2 border-white bg-sand/40"
                      >
                        <ProductImage src={l.imageUrl} alt="" compact />
                      </span>
                    ))}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">
                      {isAr
                        ? `${itemsLabelAr(itemCount)} · ${kgLabel(totalWeightKg, lang)}`
                        : `${itemCount} article${itemCount > 1 ? 's' : ''} · ${kgLabel(totalWeightKg, lang)}`}
                    </span>
                    <span className="block text-[11px] text-ink/50">
                      {linesOpen
                        ? isAr
                          ? 'إخفاء التفاصيل'
                          : 'Masquer le détail'
                        : isAr
                          ? 'عرض التفاصيل'
                          : 'Voir le détail'}
                    </span>
                  </span>
                  <span className="shrink-0 font-display text-lg text-accent">{formatPriceDT(total, lang)}</span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                    className={`shrink-0 text-ink/35 transition-transform ${linesOpen ? 'rotate-180' : ''}`}
                  >
                    <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                <ul className={`space-y-4 ${linesOpen ? 'mt-4' : 'hidden lg:block'}`}>
                  {items.map((l) => (
                    <li key={l.key} className="rounded-2xl border border-sand/80 bg-white p-5 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-display text-xl">
                            {l.name}
                            {l.isExclusiveCreation && (
                              <sup className="ms-0.5 text-xs font-semibold text-accent" title={isAr ? 'اسم حصري لعند لعزيز' : 'Création exclusive Chez Laziz'}>
                                ™
                              </sup>
                            )}
                          </p>
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
                              {isAr ? 'المنتجات' : 'Produits'} {formatPriceDT(l.unitPriceMillimes - l.packagingMillimes, lang)} +{' '}
                              {isAr ? CUSTOM_PACK_PACKAGING_LABEL_AR : CUSTOM_PACK_PACKAGING_LABEL}{' '}
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

                {/* Le détail des totaux suit le même pli que les lignes.
                    Déplié il rassure ; replié il n'a plus de raison d'être :
                    la ligne du haut porte déjà le total, la barre du bas
                    précise « livraison incluse », et le pavé de commande
                    reprend le total juste au-dessus du bouton. Trois fois le
                    même chiffre, c'est 350 px de défilement pour rien. */}
                <div
                  className={`rounded-2xl border border-sand/80 bg-white p-5 text-[15px] shadow-sm ${
                    linesOpen ? 'mt-4' : 'hidden lg:mt-6 lg:block'
                  }`}
                >
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
                {/* DEUX DÉFAUTS SUR LA MÊME LIGNE.
                    En arabe, ces liens menaient aux pages FRANÇAISES.
                    Et c'étaient des <Link> : suivre l'un d'eux démontait la
                    page de commande, donc effaçait tout le formulaire déjà
                    rempli. Un client qui va vérifier les frais de port ne
                    doit pas revenir devant un formulaire vide. Nouvel onglet,
                    le tunnel reste intact derrière. */}
                <p className="mt-3 text-xs font-light text-ink/50">
                  <a
                    href={isAr ? '/ar/livraison' : '/livraison'}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent underline underline-offset-2"
                  >
                    {isAr ? 'تفاصيل التوصيل' : 'Détails livraison'}
                  </a>
                  {' · '}
                  <a
                    href={isAr ? '/ar/faq' : '/faq'}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent underline underline-offset-2"
                  >
                    {isAr ? 'الأسئلة الشائعة' : 'Questions fréquentes'}
                  </a>
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
                    <div>
                      <input
                        id="f-name"
                        required
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value)
                          saveDraft({ name: e.target.value })
                        }}
                        onFocus={onCheckoutStart}
                        placeholder={isAr ? 'اسمكم' : 'Votre nom'}
                        aria-label={isAr ? 'اسمكم' : 'Votre nom'}
                        autoComplete="name"
                        className={inputCls}
                      />
                      {hintFor('f-name')}
                    </div>
                    <div>
                      <input
                        id="f-phone"
                        required
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value)
                          saveDraft({ phone: e.target.value })
                        }}
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
                      {phone.length > 0 && !phoneValid ? (
                        <p className="mt-1.5 text-xs text-red-300" role="alert">
                          {isAr ? 'رقم هاتف تونسي غير صحيح (8 أرقام).' : 'Numéro tunisien invalide (8 chiffres).'}
                        </p>
                      ) : (
                        hintFor('f-phone')
                      )}
                    </div>
                    <div>
                      <select
                        id="f-gov"
                        required
                        value={governorate}
                        onChange={(e) => {
                          setGovernorate(e.target.value)
                          // Une délégation appartient à un gouvernorat : en
                          // changer invalide le choix précédent.
                          setDelegationId('')
                          setCity('')
                          saveDraft({ governorate: e.target.value, delegationId: '', city: '' })
                        }}
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
                      {hintFor('f-gov')}
                    </div>
                    {/* La délégation se CHOISIT, elle ne s'écrit plus. Dix-sept
                        commandes avaient donné dix-sept graphies différentes —
                        arabe, nom de quartier, gouvernorat contradictoire — et
                        aucune ne se retrouvait telle quelle chez le
                        transporteur. La liste est la sienne. */}
                    <div>
                      {useDelegationList ? (
                        <select
                          id="f-city"
                          required
                          value={delegationId}
                          disabled={!governorate || delegationsQuery.isLoading}
                          onChange={(e) => {
                            const chosen = delegations.find((d) => d.externalId === e.target.value)
                            setDelegationId(e.target.value)
                            setCity(chosen?.name ?? '')
                            saveDraft({ delegationId: e.target.value, city: chosen?.name ?? '' })
                          }}
                          aria-label={isAr ? 'المعتمدية' : 'Délégation'}
                          autoComplete="address-level2"
                          className={`${inputCls} h-[50px] ${delegationId ? '' : 'text-ink/35'}`}
                        >
                          <option value="" disabled>
                            {!governorate
                              ? isAr
                                ? 'اختاروا الولاية أولاً'
                                : "Choisissez d'abord le gouvernorat"
                              : delegationsQuery.isLoading
                                ? '…'
                                : isAr
                                  ? 'المعتمدية'
                                  : 'Délégation'}
                          </option>
                          {delegations.map((d) => (
                            <option key={d.externalId} value={d.externalId} className="text-ink">
                              {d.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id="f-city"
                          required
                          value={city}
                          onChange={(e) => {
                            setCity(e.target.value)
                            saveDraft({ city: e.target.value })
                          }}
                          placeholder={isAr ? 'المدينة / المعتمدية' : 'Ville / délégation'}
                          aria-label={isAr ? 'المدينة أو المعتمدية' : 'Ville ou délégation'}
                          autoComplete="address-level2"
                          className={inputCls}
                        />
                      )}
                      {hintFor('f-city')}
                    </div>
                    <div>
                      <textarea
                        id="f-address"
                        required
                        value={address}
                        onChange={(e) => {
                          setAddress(e.target.value)
                          saveDraft({ address: e.target.value })
                        }}
                        placeholder={
                          isAr
                            ? 'العنوان الكامل (الشارع، الرقم، معلم قريب…)'
                            : 'Adresse complète (rue, numéro, repère…)'
                        }
                        aria-label={isAr ? 'العنوان الكامل' : 'Adresse complète'}
                        autoComplete="street-address"
                        rows={2}
                        className={`${inputCls} resize-none`}
                      />
                      {hintFor('f-address')}
                    </div>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder={isAr ? 'ملاحظة؟ (تاريخ مرغوب، مناسبة…)' : 'Précision ? (date souhaitée, occasion…)'}
                      aria-label={isAr ? 'ملاحظة (اختياري)' : 'Précision (facultatif)'}
                      rows={2}
                      className={`${inputCls} resize-none`}
                    />
                  </div>

                  <div className="mt-6 flex items-baseline border-t border-[#faf6f3]/15 pt-5">
                    <span className="text-sm uppercase tracking-[0.2em]">{isAr ? 'المجموع' : 'Total'}</span>
                    <span className="mx-3 flex-1 border-b border-dotted border-[#faf6f3]/25" aria-hidden="true" />
                    <span className="font-display text-2xl text-[#b8912e]">{formatPriceDT(total, lang)}</span>
                  </div>
                  {/* Jamais grisé, sauf pendant l'envoi : voir firstMissing. */}
                  <div id="cl-submit" ref={attachSubmit} className="mt-5">
                    <button
                      type="submit"
                      disabled={createOrder.isPending && !submitStalled}
                      className="gold-cta h-13 w-full rounded-full px-7 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-white transition-transform duration-300 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#faf6f3]/70 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {createOrder.isPending && !submitStalled
                        ? isAr
                          ? 'إرسال…'
                          : 'Envoi…'
                        : isAr
                          ? 'اطلب الآن'
                          : 'Commander'}
                    </button>
                  </div>

                  {activeHint && (
                    <p className="mt-2.5 text-center text-xs font-medium text-amber-200" role="alert">
                      {activeHint.message}
                    </p>
                  )}

                  {submitStalled && !createOrder.isError && (
                    <p className="mt-2.5 text-center text-xs font-medium text-amber-200" role="alert">
                      {isAr
                        ? 'الشبكة بطيئة. أعيدوا المحاولة — الطلب ما يتضاعفش — ولا ابعثولنا على واتساب.'
                        : 'Le réseau traîne. Réessayez — la commande ne sera pas doublée — ou écrivez-nous sur WhatsApp.'}
                    </p>
                  )}

                  {/* LA PHRASE QUI LÈVE LE DERNIER DOUTE, à l'endroit exact
                      où il se pose. Un visiteur venu d'une publicité ne
                      connaît pas la maison : en Tunisie, le paiement à la
                      livraison EST la garantie — encore faut-il la lire au
                      moment de confirmer, pas trois écrans plus haut.
                      C'est aussi, depuis le retrait de D17, la SEULE mention
                      du paiement dans le formulaire : il n'y a plus de choix
                      à faire, donc plus de section à lui consacrer. La dire
                      deux fois ne rassurerait pas davantage, et rallongerait
                      un tunnel qu'on a raccourci au pixel près. */}
                  {(
                    <p className="mt-3 flex items-center justify-center gap-2 text-center text-[13px] font-medium text-[#faf6f3]/85">
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        aria-hidden="true"
                        className="shrink-0 text-[#b8912e]"
                      >
                        <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {isAr
                        ? 'ما تخلّصو شي توّا — تخلّصو كي يوصلكم الطلب.'
                        : 'Vous ne payez rien maintenant — vous payez à la livraison.'}
                    </p>
                  )}

                  {/* Un client bloqué devant un formulaire s'en va sans rien
                      dire. Ici il a deux autres portes, à l'endroit exact où
                      il hésite — et elles mènent à une vraie personne. */}
                  <div className="mt-4 flex items-center gap-3">
                    <a
                      href={whatsAppHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={noterDepartWhatsApp}
                      className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
                    >
                      <WhatsAppIcon />
                      {isAr ? 'اطلبوا عبر واتساب' : 'Commander par WhatsApp'}
                    </a>
                    <a
                      href={PHONE_TEL}
                      aria-label={isAr ? 'اتصلوا بنا' : 'Nous appeler'}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#faf6f3]/30 text-[#faf6f3] transition-colors hover:border-[#faf6f3]"
                    >
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
                        <path d="M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" strokeLinejoin="round" />
                      </svg>
                    </a>
                  </div>
                  {!canSubmit && !createOrder.isPending && (
                    <p className="mt-3 text-center text-xs font-light text-[#faf6f3]/50">
                      {isAr
                        ? 'أكملوا معلوماتكم وعنوان التوصيل.'
                        : 'Complétez vos coordonnées et votre adresse de livraison.'}
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
                      ? `${itemsLabelAr(itemCount)} · ${kgLabel(totalWeightKg, lang)} · التوصيل مشمول`
                      : `${itemCount} article${itemCount > 1 ? 's' : ''} · ${kgLabel(totalWeightKg, lang)} · livraison incluse`}
                  </p>
                  <p className="font-display text-lg text-accent">{formatPriceDT(total, lang)}</p>
                </div>
                {/* Un seul bouton, deux moments : avant le formulaire il y
                    conduit ; une fois dedans il envoie vraiment la commande
                    (et, s'il manque un champ, emmène le client dessus — voir
                    firstMissing). Le client n'a jamais à chercher où valider. */}
                <button
                  type="button"
                  disabled={createOrder.isPending && !submitStalled}
                  onClick={() => {
                    // requestSubmit manque encore sur quelques navigateurs
                    // mobiles anciens : sans repli, le bouton lèverait une
                    // exception et resterait inerte.
                    if (!recapVisible || !formRef.current) return scrollToId('recap')
                    if (typeof formRef.current.requestSubmit === 'function') formRef.current.requestSubmit()
                    else submit({ preventDefault: () => {} } as React.FormEvent)
                  }}
                  className="gold-cta shrink-0 rounded-full px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {createOrder.isPending && !submitStalled
                    ? isAr
                      ? 'إرسال…'
                      : 'Envoi…'
                    : isAr
                      ? 'اطلب الآن'
                      : 'Commander'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
