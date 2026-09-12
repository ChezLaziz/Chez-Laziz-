import { useMemo, useState } from 'react'
import { cancelReasonAr } from '@contracts/cancelReasons'
import { trpc } from '@/providers/trpc'
import { formatTND } from '@/lib/shop'
import { ErrorState, Skeleton } from '../ui/State'
import DelegationLinks from './DelegationLinks'
import {
  CARRIERS,
  CARRIER_KEYS,
  amountToCollectMillimes,
  buildCsv,
  fullAddress,
  hasCompleteWeight,
  packageContents,
  parseOrderItems,
  totalWeightKg,
  type CarrierKey,
  type ShippableOrder,
} from '@contracts/carriers'

/** Carnet de commandes — pensé pour la seule chose qu'on en fait vraiment :
 * repérer ce qui est nouveau, préparer, remettre au transporteur.
 *
 * L'ancienne version affichait une grande carte par commande : quatre
 * commandes remplissaient l'écran, et à cinquante la page devenait
 * impraticable. Elle mettait aussi en vert vif le bouton « Encaissé » — une
 * action secondaire — pendant que l'ÉTAT de la commande, l'information qu'on
 * vient chercher, dormait dans un menu gris.
 *
 * Ici : une ligne par commande, l'état en couleur et en icône, le détail au
 * clic, et la suppression déplacée hors de portée d'un doigt qui vise le
 * total. */

type Order = {
  id: number
  customerName: string
  phone: string
  governorate: string
  city: string
  address: string
  postalCode: string | null
  items: string
  subtotalMillimes: number
  deliveryFeeMillimes: number
  totalMillimes: number
  paymentMethod: string
  paymentStatus: string
  note: string | null
  status: string
  /** Pourquoi la commande est morte — voir contracts/cancelReasons.ts. NULL
   * pour les annulations d'avant ce champ : « on ne sait pas », pas « autre ». */
  cancelReason: string | null
  carrier: string | null
  trackingNumber: string | null
  // Absent du type jusqu'ici : c'est justement pourquoi un envoi resté
  // « envoi_en_cours » ou « incertain » ne montrait AUCUNE sortie à
  // l'écran — l'admin n'avait même pas la donnée pour le détecter.
  carrierStatus: string | null
  createdAt: Date | string
}

const STATUSES = ['nouvelle', 'en_preparation', 'prete', 'terminee', 'annulee'] as const
type Status = (typeof STATUSES)[number]

/** Libellé, couleur et icône par état.
 *
 * La couleur est réservée à l'état — pas aux boutons. Un carnet se lit d'un
 * coup d'œil quand chaque ligne porte sa propre teinte ; il devient illisible
 * quand cinq boutons verts se disputent le regard. */
const STATUS_META: Record<Status, { label: string; cls: string; icon: React.ReactNode }> = {
  nouvelle: {
    label: 'Nouvelle',
    cls: 'bg-[#b8912e]/12 text-[#8a5527] border-[#b8912e]/40',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <circle cx="12" cy="12" r="5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  en_preparation: {
    label: 'En préparation',
    cls: 'bg-blue-50 text-blue-800 border-blue-200',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 7v5l3 2" strokeLinecap="round" />
        <circle cx="12" cy="12" r="8.5" />
      </svg>
    ),
  },
  prete: {
    label: 'Prête',
    cls: 'bg-violet-50 text-violet-800 border-violet-200',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 8l9-4 9 4v8l-9 4-9-4V8Z" strokeLinejoin="round" />
        <path d="M3 8l9 4 9-4M12 12v8" />
      </svg>
    ),
  },
  terminee: {
    label: 'Terminée',
    cls: 'bg-green-50 text-green-800 border-green-200',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
        <path d="M4 12.5l5.5 5.5L20 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  annulee: {
    label: 'Annulée',
    cls: 'bg-ink/[0.06] text-ink/50 border-ink/15',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
      </svg>
    ),
  },
}

function toShippable(o: Order): ShippableOrder {
  return { ...o, items: parseOrderItems(o.items) }
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString('fr-TN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function OrdersPage({
  token,
  statusFilter,
  onClearFilter,
}: {
  token: string
  statusFilter?: string | null
  onClearFilter?: () => void
}) {
  const utils = trpc.useUtils()
  const { data, isLoading, isError } = trpc.orders.list.useQuery(
    { token },
    { refetchInterval: 30000, refetchOnWindowFocus: true },
  )

  const [actionError, setActionError] = useState<string | null>(null)
  const onError = (e: { message: string }) => setActionError(e.message)
  const done = () => {
    setActionError(null)
    void utils.orders.list.invalidate()
  }
  const setStatus = trpc.orders.setStatus.useMutation({ onSuccess: done, onError })
  const setPaymentStatus = trpc.orders.setPaymentStatus.useMutation({ onSuccess: done, onError })
  const setCarrier = trpc.orders.setCarrier.useMutation({ onSuccess: done, onError })
  const removeOrder = trpc.orders.delete.useMutation({ onSuccess: done, onError })

  const [search, setSearch] = useState('')
  const [payFilter, setPayFilter] = useState<'all' | 'to_collect' | 'to_ship'>('all')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const orders = useMemo(() => (data ?? []) as unknown as Order[], [data])

  /** Le rapprochement ville → délégation, tel que le serveur l'a établi.
   *
   * On le LIT, on ne le recalcule pas : deux règles de correspondance qui
   * divergeraient, c'est un colis exporté avec un numéro que l'écran de
   * liaison n'a jamais validé. */
  const cityLinks = trpc.carriers.cities.useQuery({ token })
  const delegationFor = useMemo(() => {
    const byCity = new Map(
      (cityLinks.data?.lines ?? [])
        .filter((l) => l.match.delegation !== null)
        .map((l) => [`${l.governorate}|${l.city}`, l.match.delegation!.externalId] as const),
    )
    return (o: ShippableOrder) => byCity.get(`${o.governorate}|${o.city}`) ?? null
  }, [cityLinks.data])

  // Toute commande non encaissée et non annulée. L'argent d'une boutique qui
  // encaisse à la livraison se compte ici : oublier une commande dans cette
  // file, c'est un colis remis dont personne n'a vu revenir le paiement.
  const isToCollect = (o: Order) => o.paymentStatus !== 'paid' && o.status !== 'annulee'
  // Prête à partir mais pas encore remise : la file d'attente du transporteur.
  const isToShip = (o: Order) => o.status !== 'annulee' && o.status !== 'terminee' && !o.trackingNumber

  const query = search.trim().toLowerCase()
  const scoped = orders.filter((o) => {
    if (statusFilter && o.status !== statusFilter) return false
    if (!query) return true
    const hay = `#${o.id} ${o.customerName} ${o.phone} ${o.city} ${o.governorate} ${o.address} ${o.trackingNumber ?? ''}`
    return hay.toLowerCase().includes(query)
  })
  const filtered = scoped.filter((o) => {
    if (payFilter === 'to_collect') return isToCollect(o)
    if (payFilter === 'to_ship') return isToShip(o)
    return true
  })

  const toCollect = scoped.filter(isToCollect)
  const toShip = scoped.filter(isToShip).length
  const toCollectMillimes = toCollect.reduce((s, o) => s + o.totalMillimes, 0)

  const savingPayment = setPaymentStatus.isPending
    ? (setPaymentStatus.variables as { id: number } | undefined)?.id
    : undefined

  if (isError) {
    return (
      <ErrorState label="Impossible de charger les commandes. Vérifiez votre connexion — ceci ne veut pas dire que vous n'avez aucune commande." />
    )
  }
  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12" />
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    )
  }

  const selectedOrders = filtered.filter((o) => selected.has(o.id))
  const allVisibleSelected = filtered.length > 0 && filtered.every((o) => selected.has(o.id))

  const toggle = (set: Set<number>, id: number) => {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nom, téléphone, n°, ville, suivi…"
          aria-label="Rechercher une commande"
          className="min-h-11 flex-1 rounded-lg border border-sand bg-white px-3.5 text-sm outline-none focus:border-[#b8912e] sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ['all', `Toutes (${scoped.length})`],
              ['to_ship', `À remettre${toShip ? ` (${toShip})` : ''}`],
              ['to_collect', `À encaisser${toCollect.length ? ` (${toCollect.length})` : ''}`],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setPayFilter(value)}
              className={`min-h-11 rounded-full border px-4 text-xs font-semibold uppercase tracking-wide transition-colors ${
                payFilter === value
                  ? 'border-[#b8912e] bg-[#b8912e]/15 text-[#8a5527]'
                  : 'border-sand text-ink/55 hover:border-[#b8912e]/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {actionError && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          <span className="flex-1">L'action n'a pas été enregistrée : {actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            aria-label="Fermer"
            className="shrink-0 text-lg leading-none text-red-500"
          >
            ×
          </button>
        </div>
      )}

      {statusFilter && (
        <div className="flex items-center gap-3 rounded-lg border border-[#b8912e]/40 bg-[#b8912e]/10 px-4 py-2.5 text-sm">
          <span className="font-medium text-accent">
            Filtré : {STATUS_META[statusFilter as Status]?.label ?? statusFilter}
          </span>
          <button
            onClick={onClearFilter}
            className="ml-auto text-xs font-semibold uppercase tracking-wide text-ink/50 underline underline-offset-4 hover:text-ink"
          >
            Retirer
          </button>
        </div>
      )}

      {toCollect.length > 0 && (
        <button
          type="button"
          onClick={() => setPayFilter(payFilter === 'to_collect' ? 'all' : 'to_collect')}
          className="flex w-full items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-left"
        >
          <span className="text-sm text-amber-800">
            Argent à encaisser · {toCollect.length} commande{toCollect.length > 1 ? 's' : ''} en espèces
          </span>
          <span className="font-display text-lg text-amber-900">{formatTND(toCollectMillimes)} DT</span>
        </button>
      )}

      {selectedOrders.length > 0 && (
        <ShipmentBar
          orders={selectedOrders.map(toShippable)}
          delegationFor={delegationFor}
          token={token}
          onSent={() => void utils.orders.list.invalidate()}
          onAssign={(carrier) => {
            for (const o of selectedOrders) setCarrier.mutate({ token, id: o.id, carrier })
            setSelected(new Set())
          }}
          onClear={() => setSelected(new Set())}
          pending={setCarrier.isPending}
        />
      )}

      <div className="overflow-hidden rounded-xl border border-sand/70 bg-white">
        <div className="flex items-center gap-3 border-b border-sand/60 px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-ink/40">
          <input
            type="checkbox"
            checked={allVisibleSelected}
            onChange={() =>
              setSelected(allVisibleSelected ? new Set() : new Set(filtered.map((o) => o.id)))
            }
            aria-label="Tout sélectionner"
            className="h-4 w-4 accent-[#b8912e]"
          />
          <span>
            {filtered.length} commande{filtered.length > 1 ? 's' : ''}
            {selectedOrders.length > 0 && ` · ${selectedOrders.length} sélectionnée${selectedOrders.length > 1 ? 's' : ''}`}
          </span>
        </div>

        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink/45">
            {statusFilter || query || payFilter !== 'all'
              ? 'Aucune commande ne correspond à ce filtre.'
              : "Aucune commande pour l'instant."}
          </p>
        ) : (
          <ul>
            {filtered.map((o) => (
              <OrderRow
                key={o.id}
                order={o}
                selected={selected.has(o.id)}
                onSelect={() => setSelected((s) => toggle(s, o.id))}
                open={expanded.has(o.id)}
                onToggle={() => setExpanded((s) => toggle(s, o.id))}
                onStatus={(status) => setStatus.mutate({ token, id: o.id, status })}
                onPayment={(paymentStatus) =>
                  setPaymentStatus.mutate({ token, id: o.id, paymentStatus })
                }
                onTracking={(trackingNumber) =>
                  setCarrier.mutate({ token, id: o.id, carrier: o.carrier as CarrierKey, trackingNumber })
                }
                onClearCarrier={() => setCarrier.mutate({ token, id: o.id, carrier: null, clear: true })}
                onDelete={() => removeOrder.mutate({ token, id: o.id })}
                savingPayment={savingPayment === o.id}
              />
            ))}
          </ul>
        )}
      </div>

      <DelegationLinks token={token} />
    </div>
  )
}

/* --------------------------- Remise au transporteur --------------------------- */

/** Ce que l'on peut faire d'une sélection de commandes.
 *
 * DEUX MONDES, parce que les deux transporteurs ne se valent pas :
 *
 *   Team Parcel Express — un vrai envoi. Un clic crée les colis chez eux et
 *   range les numéros de suivi ici. Le bouton fait donc ce qu'il annonce, et
 *   l'avertissement ne dit plus « rien n'est envoyé » : il dit l'inverse, et
 *   rappelle d'appeler le client d'abord, parce qu'un colis créé est un
 *   engagement.
 *
 *   Jetpack — aucune API marchand n'existe (voir contracts/carriers.ts). On
 *   prépare le fichier et le bordereau, et on note qui transporte quoi.
 *   Promettre un envoi qui n'a pas lieu serait pire que ne rien promettre. */
function ShipmentBar({
  orders,
  delegationFor,
  token,
  onSent,
  onAssign,
  onClear,
  pending,
}: {
  orders: ShippableOrder[]
  delegationFor: (o: ShippableOrder) => string | null
  token: string
  onSent: () => void
  onAssign: (carrier: CarrierKey) => void
  onClear: () => void
  pending: boolean
}) {
  const [carrier, setCarrier] = useState<CarrierKey>('tpe')
  const [results, setResults] = useState<SendResult[]>([])
  const [sending, setSending] = useState(false)

  const incompleteWeight = orders.filter((o) => !hasCompleteWeight(o.items)).length
  const alreadyPaid = orders.filter((o) => amountToCollectMillimes(o) === 0).length
  // Team Parcel Express est le seul des deux à travailler par délégation.
  const noDelegation =
    carrier === 'tpe' ? orders.filter((o) => delegationFor(o) === null).length : 0

  const send = trpc.carriers.send.useMutation()

  /** Envoi UNE COMMANDE À LA FOIS, en série.
   *
   * Pas en parallèle : chaque appel crée un vrai colis chez le transporteur,
   * et une rafale simultanée rend impossible de dire lequel est passé si la
   * connexion lâche au milieu. Chaque résultat s'affiche dès qu'il tombe. */
  const sendAll = async () => {
    setSending(true)
    setResults([])
    for (const o of orders) {
      try {
        const r = await send.mutateAsync({ token, id: o.id })
        setResults((prev) => [...prev, { id: o.id, name: o.customerName, ...r }])
      } catch (e) {
        setResults((prev) => [
          ...prev,
          {
            id: o.id,
            name: o.customerName,
            ok: false,
            reason: 'incertain',
            message: e instanceof Error ? e.message : String(e),
          },
        ])
      }
    }
    setSending(false)
    onSent()
  }

  const downloadCsv = () => {
    const forCarrier = carrier === 'tpe' ? delegationFor : () => null
    const blob = new Blob([buildCsv(orders, forCarrier)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chez-laziz-${carrier}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="rounded-xl border border-[#b8912e]/40 bg-[#b8912e]/[0.07] px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-sm font-medium text-ink">
          {orders.length} commande{orders.length > 1 ? 's' : ''} pour
        </span>
        <select
          value={carrier}
          onChange={(e) => setCarrier(e.target.value as CarrierKey)}
          aria-label="Transporteur"
          className="min-h-10 rounded-lg border border-sand bg-white px-3 text-sm outline-none focus:border-[#b8912e]"
        >
          {CARRIER_KEYS.map((k) => (
            <option key={k} value={k}>
              {CARRIERS[k].label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onClear}
          className="ml-auto text-xs text-ink/45 underline underline-offset-4 hover:text-ink"
        >
          Désélectionner
        </button>
      </div>

      {carrier === 'tpe' ? (
        <>
          {/* L'AVERTISSEMENT DIT CE QUI VA SE PASSER, avant le bouton.
           *
           * Il disait l'inverse tant que rien ne partait. Maintenant qu'un
           * clic crée de vrais colis, c'est cela qu'il doit annoncer — et le
           * rappel qui compte vraiment : le client se confirme au téléphone
           * AVANT, pas après. */}
          <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
            <strong className="font-semibold">Ce bouton crée de vrais colis.</strong> Les{' '}
            {orders.length} commande{orders.length > 1 ? 's' : ''} apparaîtront chez Team Parcel
            Express et seront ramassées. Appelez les clients pour confirmer avant d'envoyer.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => void sendAll()}
              disabled={sending}
              className="min-h-10 rounded-full bg-ink px-4 text-xs font-semibold uppercase tracking-wide text-white transition-opacity hover:opacity-85 disabled:opacity-40"
            >
              {sending
                ? `Envoi… ${results.length}/${orders.length}`
                : `Envoyer à Team Parcel Express (${orders.length})`}
            </button>
            <button
              type="button"
              onClick={() => printBordereau(orders, CARRIERS[carrier].label)}
              className="min-h-10 rounded-full border border-ink/25 px-4 text-xs font-semibold uppercase tracking-wide text-ink/70 hover:border-[#b8912e] hover:text-accent"
            >
              Imprimer un bordereau
            </button>
          </div>

          {results.length > 0 && (
            <ul className="mt-3 space-y-1">
              {results.map((r) => (
                <SendLine key={r.id} result={r} />
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          {/* Jetpack : aucune API. Le bouton ne doit rien promettre. */}
          <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
            <strong className="font-semibold">Rien n'est envoyé automatiquement.</strong>{' '}
            {CARRIERS[carrier].label} ne donne aucun accès automatique : pour que le colis arrive
            chez eux, téléchargez le fichier ci-dessous et déposez-le sur{' '}
            {CARRIERS[carrier].platform}.
          </p>

          <ol className="mt-3 space-y-2.5">
            <li className="flex flex-wrap items-center gap-2.5">
              <StepNumber n={1} />
              <button
                type="button"
                onClick={downloadCsv}
                className="min-h-10 rounded-full bg-ink px-4 text-xs font-semibold uppercase tracking-wide text-white transition-opacity hover:opacity-85"
              >
                Télécharger le fichier
              </button>
              <span className="text-xs text-ink/55">puis déposez-le sur leur site</span>
              <button
                type="button"
                onClick={() => printBordereau(orders, CARRIERS[carrier].label)}
                className="min-h-10 rounded-full border border-ink/25 px-4 text-xs font-semibold uppercase tracking-wide text-ink/70 hover:border-[#b8912e] hover:text-accent"
              >
                ou imprimer un bordereau
              </button>
            </li>
            <li className="flex flex-wrap items-center gap-2.5">
              <StepNumber n={2} />
              <button
                type="button"
                onClick={() => onAssign(carrier)}
                disabled={pending}
                className="min-h-10 rounded-full border border-ink/25 px-4 text-xs font-semibold uppercase tracking-wide text-ink/70 hover:border-[#b8912e] hover:text-accent disabled:opacity-40"
              >
                {pending ? 'Enregistrement…' : 'Noter comme confiées'}
              </button>
              <span className="text-xs text-ink/55">
                marque ces commandes « chez {CARRIERS[carrier].label} » — dans votre carnet
                seulement
              </span>
            </li>
          </ol>
        </>
      )}

      {alreadyPaid > 0 && (
        <p className="mt-3 text-[11px] font-medium text-green-700">
          {alreadyPaid} commande{alreadyPaid > 1 ? 's' : ''} déjà payée{alreadyPaid > 1 ? 's' : ''} :
          montant à encaisser mis à 0, pour que le client ne paie pas deux fois.
        </p>
      )}
      {noDelegation > 0 && (
        <p className="mt-1.5 text-[11px] font-medium text-amber-700">
          {noDelegation} commande{noDelegation > 1 ? 's' : ''} sans délégation reconnue :{' '}
          {noDelegation > 1 ? 'elles seront refusées' : 'elle sera refusée'} plutôt qu'envoyée{noDelegation > 1 ? 's' : ''} au hasard. Reliez la ville dans « Villes et délégations », plus bas.
        </p>
      )}
      {incompleteWeight > 0 && (
        <p className="mt-1.5 text-[11px] font-medium text-amber-700">
          {incompleteWeight} commande{incompleteWeight > 1 ? 's' : ''} sans poids complet : le poids
          exporté est sous-estimé, vérifiez-le avant dépôt.
        </p>
      )}
    </div>
  )
}

type SendResult = {
  id: number
  name: string
  ok: boolean
  trackingNumber?: string
  reason?: string
  message?: string
}

/** Le sort d'une commande, dit sans détour.
 *
 * Trois issues, pas deux. « Incertain » existe parce qu'une requête peut
 * partir sans que la réponse revienne : le colis est peut-être créé, et
 * réessayer en ferait un deuxième. Le seul conseil honnête est alors d'aller
 * regarder chez le transporteur — surtout pas de recliquer. */
function SendLine({ result }: { result: SendResult }) {
  if (result.ok) {
    return (
      <li className="flex flex-wrap items-center gap-2 text-[11px] text-green-800">
        <span aria-hidden>✓</span>
        <span className="font-medium">{result.name}</span>
        <span className="text-ink/45">colis</span>
        <span className="font-mono font-semibold">{result.trackingNumber}</span>
      </li>
    )
  }

  const uncertain = result.reason === 'incertain'
  return (
    <li
      className={`flex flex-wrap items-center gap-2 text-[11px] ${uncertain ? 'text-amber-800' : 'text-red-700'}`}
    >
      <span aria-hidden>{uncertain ? '!' : '✗'}</span>
      <span className="font-medium">{result.name}</span>
      <span>{refusalText(result)}</span>
    </li>
  )
}

function refusalText(r: SendResult): string {
  switch (r.reason) {
    case 'already_sent':
      return 'déjà partie — aucun deuxième colis créé'
    case 'in_flight':
      return 'envoi déjà en cours — patientez quelques secondes'
    case 'uncertain':
      return "un envoi précédent n'a pas répondu : vérifiez chez Team Parcel Express, puis saisissez le numéro de colis trouvé (ou retirez le transporteur) avant de renvoyer"

    case 'no_delegation':
      return "ville non reliée à une délégation : reliez-la dans « Villes et délégations »"
    case 'cancelled':
      return 'commande annulée'
    case 'no_phone':
      return 'téléphone inutilisable'
    case 'no_address':
      return 'adresse vide'
    case 'not_confirmed':
      return "commande pas encore confirmée : appelez le client et passez-la « en préparation » avant l'envoi"
    case 'incertain':
      return `envoi interrompu — VÉRIFIEZ chez Team Parcel Express avant de réessayer (${r.message ?? ''})`
    case 'introuvable':
      return 'commande introuvable'
    default:
      return `refusée par le transporteur : ${r.message ?? ''}`
  }
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink/[0.08] text-[11px] font-semibold text-ink/60">
      {n}
    </span>
  )
}

/** Bordereau imprimable, ouvert dans une fenêtre à part.
 *
 * Un bloc par colis, avec exactement ce qu'un transporteur demande au guichet.
 * C'est le repli qui fonctionne quel que soit le transporteur. */
function printBordereau(orders: ShippableOrder[], carrierLabel: string) {
  const esc = (s: string) =>
    s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

  const blocks = orders
    .map((o) => {
      const collect = amountToCollectMillimes(o)
      return `<section>
  <h2>CL-${o.id} <small>${esc(carrierLabel)}</small></h2>
  <table>
    <tr><th>Client</th><td>${esc(o.customerName)}</td></tr>
    <tr><th>Téléphone</th><td>${esc(o.phone)}</td></tr>
    <tr><th>Adresse</th><td>${esc(fullAddress(o))}</td></tr>
    <tr><th>Contenu</th><td>${esc(packageContents(o.items))}</td></tr>
    <tr><th>Poids</th><td>${totalWeightKg(o.items).toFixed(2)} kg${hasCompleteWeight(o.items) ? '' : ' (incomplet)'}</td></tr>
    <tr><th>À encaisser</th><td class="amount">${(collect / 1000).toFixed(3)} DT${collect === 0 ? ' — déjà payé' : ''}</td></tr>
    ${o.note ? `<tr><th>Note</th><td>${esc(o.note)}</td></tr>` : ''}
  </table>
</section>`
    })
    .join('\n')

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>Bordereau — Chez Laziz</title>
<style>
  body { font: 13px/1.5 system-ui, sans-serif; color: #2e2a27; margin: 24px; }
  h1 { font-size: 16px; margin: 0 0 16px; }
  section { border: 1px solid #ccc; border-radius: 6px; padding: 12px 14px; margin-bottom: 12px; page-break-inside: avoid; }
  h2 { font-size: 15px; margin: 0 0 8px; }
  h2 small { font-weight: 400; color: #777; font-size: 12px; margin-left: 8px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; width: 110px; padding: 3px 0; color: #777; font-weight: 500; vertical-align: top; }
  td { padding: 3px 0; }
  .amount { font-weight: 700; }
  @media print { body { margin: 0; } }
</style></head><body>
<h1>Chez Laziz — ${orders.length} colis — ${esc(carrierLabel)} — ${new Date().toLocaleDateString('fr-TN')}</h1>
${blocks}
<script>window.onload = () => window.print()</script>
</body></html>`

  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(html)
  w.document.close()
}

/* ------------------------------- Une ligne ------------------------------- */

function OrderRow({
  order: o,
  selected,
  onSelect,
  open,
  onToggle,
  onStatus,
  onPayment,
  onTracking,
  onClearCarrier,
  onDelete,
  savingPayment,
}: {
  order: Order
  selected: boolean
  onSelect: () => void
  open: boolean
  onToggle: () => void
  onStatus: (s: Status) => void
  onPayment: (p: 'paid' | 'pending') => void
  onTracking: (t: string) => void
  onClearCarrier: () => void
  onDelete: () => void
  savingPayment: boolean
}) {
  /** L'envoi est resté en l'air.
   *
   * La réservation d'envoi pose « envoi_en_cours » SANS écrire de
   * transporteur. Si le processus meurt entre la réservation et sa
   * conclusion, la commande garde cet état pour toujours : tout envoi futur
   * est refusé, et l'écran, qui n'affichait le bloc transporteur que si un
   * transporteur était écrit, ne montrait aucune sortie. La commande était
   * bloquée définitivement, sans que rien ne le dise.
   *
   * La sortie existait pourtant côté serveur — « clear » remet tout à zéro.
   * Elle est désormais atteignable, et accompagnée de l'avertissement qui
   * compte : le colis existe peut-être déjà. */
  const envoiBloque = o.carrierStatus === 'envoi_en_cours' || o.carrierStatus === 'incertain'
  const items = parseOrderItems(o.items)
  const meta = STATUS_META[o.status as Status] ?? STATUS_META.nouvelle
  const [tracking, setTracking] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <li className={`border-t border-sand/50 ${selected ? 'bg-[#b8912e]/[0.05]' : ''}`}>
      <div className="flex items-center gap-3 px-4 py-2.5">
        <input
          type="checkbox"
          checked={selected}
          onChange={onSelect}
          aria-label={`Sélectionner la commande ${o.id}`}
          className="h-4 w-4 shrink-0 accent-[#b8912e]"
        />

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span className="w-11 shrink-0 font-mono text-xs text-ink/45">#{o.id}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-ink">{o.customerName}</span>
            <span className="block truncate text-[11px] text-ink/45">
              {o.city}, {o.governorate}
              {/* Sur téléphone, la ligne du haut n'a pas la place du
                  montant : il descend ici plutôt que de disparaître. Une
                  commande sans son montant ne se traite pas. */}
              <span className="sm:hidden">
                {' · '}
                <span className="font-medium text-ink/70">{formatTND(o.totalMillimes)} DT</span>
              </span>
              <span className="hidden sm:inline"> · {formatDate(o.createdAt)}</span>
            </span>
          </span>
          {/* Le moyen de paiement ne s'affiche plus : il est le même pour
              toutes les commandes. Une colonne qui répète la même valeur sur
              chaque ligne occupe de la place et n'apprend rien. */}
          <span className="hidden shrink-0 text-right text-sm text-ink sm:block">
            {formatTND(o.totalMillimes)} DT
          </span>
        </button>

        {/* L'état est la raison même d'ouvrir ce carnet : il reste visible à
            toutes les tailles. Sur téléphone seule l'icône colorée subsiste,
            le libellé revient dès qu'il y a la place. */}
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-medium sm:px-2.5 ${meta.cls}`}
          title={meta.label}
        >
          {meta.icon}
          <span className="hidden sm:inline">{meta.label}</span>
        </span>

        <span className="hidden w-28 shrink-0 truncate text-right text-[11px] lg:block">
          {o.trackingNumber ? (
            <span className="text-ink/70" title={o.trackingNumber}>
              {o.trackingNumber}
            </span>
          ) : o.carrier ? (
            <span className="text-amber-700">
              {CARRIERS[o.carrier as CarrierKey]?.label ?? o.carrier}
            </span>
          ) : (
            <span className="text-ink/25">—</span>
          )}
        </span>

        <button
          type="button"
          onClick={onToggle}
          aria-label={open ? 'Replier' : 'Déplier'}
          className="shrink-0 rounded p-1 text-ink/35 hover:text-ink"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`transition-transform ${open ? 'rotate-180' : ''}`}
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-sand/40 bg-[#faf6f3] px-4 py-4 sm:px-14">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2.5 text-sm">
              <p className="text-ink/70">{fullAddress(toShippable(o))}</p>
              <a href={`tel:${o.phone}`} className="inline-block text-accent underline underline-offset-2">
                {o.phone}
              </a>
              <ul className="space-y-1 border-t border-sand/60 pt-2.5">
                {items.map((it, i) => (
                  <li key={`${it.name}-${i}`} className="text-[13px]">
                    <div className="flex justify-between gap-3">
                      <span className="text-ink/75">
                        {it.qty} × {it.name}
                        {it.weightKg ? <span className="text-ink/40"> ({it.weightKg} kg)</span> : null}
                      </span>
                    </div>
                    {it.contents && it.contents.length > 0 && (
                      <ul className="mt-0.5 space-y-0.5 pl-4 text-[12px] text-ink/55">
                        {it.contents.map((c, j) => (
                          <li key={`${c.name}-${j}`}>
                            • {c.name}
                            {c.weightKg ? ` — ${c.weightKg} kg` : ''}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
              <div className="border-t border-sand/60 pt-2.5 text-[13px]">
                <div className="flex justify-between text-ink/55">
                  <span>Sous-total</span>
                  <span>{formatTND(o.subtotalMillimes)} DT</span>
                </div>
                <div className="flex justify-between text-ink/55">
                  <span>Livraison</span>
                  <span>{formatTND(o.deliveryFeeMillimes)} DT</span>
                </div>
                <div className="mt-1 flex justify-between font-medium text-ink">
                  <span>Total</span>
                  <span>{formatTND(o.totalMillimes)} DT</span>
                </div>
              </div>
              {o.note && (
                <p className="rounded-lg border border-sand/60 bg-white px-3 py-2 text-[13px] italic text-ink/70">
                  « {o.note} »
                </p>
              )}
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-[11px] uppercase tracking-wide text-ink/45">
                  État de la commande
                </span>
                <select
                  value={o.status}
                  onChange={(e) => onStatus(e.target.value as Status)}
                  className={`min-h-10 w-full rounded-lg border px-3 text-sm font-medium outline-none ${meta.cls}`}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_META[s].label}
                    </option>
                  ))}
                </select>
              </label>

              {/* La raison de l'annulation, quand elle a été saisie depuis
                  Telegram. Captée et jamais montrée, elle ne servirait à
                  personne : c'est ici qu'on regarde pourquoi une vente meurt. */}
              {o.status === 'annulee' && cancelReasonAr(o.cancelReason) && (
                <p className="rounded-lg border border-sand/60 bg-white px-3 py-2.5 text-[13px] text-ink/70">
                  Raison : <span className="font-medium text-ink">{cancelReasonAr(o.cancelReason)}</span>
                </p>
              )}

              {o.status !== 'annulee' && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-sand/60 bg-white px-3 py-2.5">
                  <span className="text-[13px] text-ink/70">
                    {o.paymentStatus === 'paid'
                      ? 'Encaissé'
                      : `À encaisser : ${formatTND(o.totalMillimes)} DT`}
                  </span>
                  <button
                    type="button"
                    onClick={() => onPayment(o.paymentStatus === 'paid' ? 'pending' : 'paid')}
                    disabled={savingPayment}
                    className="min-h-9 shrink-0 rounded-full border border-ink/25 px-3 text-xs font-semibold uppercase tracking-wide text-ink/70 hover:border-[#b8912e] hover:text-accent disabled:opacity-40"
                  >
                    {o.paymentStatus === 'paid' ? 'Annuler' : 'Encaissé'}
                  </button>
                </div>
              )}

              <div className="rounded-lg border border-sand/60 bg-white px-3 py-2.5">
                <p className="mb-1.5 text-[11px] uppercase tracking-wide text-ink/45">Transporteur</p>
                {o.carrier || envoiBloque ? (
                  <div className="space-y-2">
                    <p className="text-[13px] text-ink">
                      {o.carrier ? (CARRIERS[o.carrier as CarrierKey]?.label ?? o.carrier) : 'Envoi interrompu'}
                      {o.trackingNumber && (
                        <span className="ml-2 font-mono text-xs text-ink/60">{o.trackingNumber}</span>
                      )}
                    </p>
                    {envoiBloque && (
                      <p className="text-[12px] leading-relaxed text-amber-800">
                        {o.carrierStatus === 'envoi_en_cours'
                          ? "Un envoi est parti et n'a jamais répondu. Le colis existe peut-être : vérifiez chez le transporteur AVANT de débloquer."
                          : "L'envoi précédent est resté sans réponse. Le colis existe peut-être : vérifiez chez le transporteur avant de renvoyer."}
                      </p>
                    )}
                    {!o.trackingNumber && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={tracking}
                          onChange={(e) => setTracking(e.target.value)}
                          placeholder="Numéro de suivi"
                          className="min-h-9 flex-1 rounded-lg border border-sand px-2.5 text-sm outline-none focus:border-[#b8912e]"
                        />
                        <button
                          type="button"
                          onClick={() => tracking.trim() && onTracking(tracking.trim())}
                          disabled={tracking.trim() === ''}
                          className="min-h-9 shrink-0 rounded-full bg-ink px-3 text-xs font-semibold uppercase tracking-wide text-white disabled:opacity-40"
                        >
                          Noter
                        </button>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={onClearCarrier}
                      className="text-[11px] text-ink/40 underline underline-offset-4 hover:text-ink"
                    >
                      {envoiBloque ? "Débloquer l'envoi" : 'Retirer le transporteur'}
                    </button>
                  </div>
                ) : (
                  <p className="text-[13px] text-ink/45">
                    Pas encore remise. Sélectionnez la commande pour l'affecter.
                  </p>
                )}
              </div>

              {/* La suppression vit ici, au fond du détail replié — plus jamais
                  à côté du total, où un doigt qui glisse la déclenchait. */}
              <div className="border-t border-sand/60 pt-2.5">
                {confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-red-700">Supprimer définitivement ?</span>
                    <button
                      type="button"
                      onClick={onDelete}
                      className="min-h-8 rounded-full bg-red-600 px-3 text-[11px] font-semibold uppercase tracking-wide text-white"
                    >
                      Oui
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="min-h-8 rounded-full border border-ink/20 px-3 text-[11px] font-semibold uppercase tracking-wide text-ink/60"
                    >
                      Non
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="text-[11px] text-ink/35 underline underline-offset-4 hover:text-red-600"
                  >
                    Supprimer cette commande
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </li>
  )
}

