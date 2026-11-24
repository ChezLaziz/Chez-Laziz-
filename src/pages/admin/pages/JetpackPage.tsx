import { useMemo, useState } from 'react'
import { trpc } from '@/providers/trpc'
import { formatTND } from '@/lib/shop'
import { ErrorState, Skeleton } from '../ui/State'
import {
  amountToCollectMillimes,
  buildJetpackCsv,
  parseOrderItems,
  type ShippableOrder,
} from '@contracts/carriers'

/** Jetpack — préparer l'envoi en un fichier.
 *
 * Jetpack ne donne aucun accès automatique côté marchand : leur plateforme
 * tourne sur ShippingLog, où l'API est une option que LE TRANSPORTEUR active,
 * pas nous (voir contracts/carriers.ts). La seule voie honnête est donc celle
 * que leur plateforme ouvre vraiment : « Importer CSV ».
 *
 * Mais l'export générique ne s'y importait pas — ses colonnes sont les
 * nôtres, pas celles de leur gabarit. Cette page fait l'unique chose qui
 * manquait : on coche les commandes, on télécharge un fichier AUX COLONNES DE
 * JETPACK, et il tombe dans leur import sans qu'on remappe rien. Le vrai envoi
 * reste manuel chez eux — promettre l'inverse serait mentir. */

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
  createdAt: Date | string
}

function toShippable(o: Order): ShippableOrder {
  return { ...o, items: parseOrderItems(o.items) }
}

/** Les états qu'on peut encore expédier. « Annulée » n'y est pas : on ne
 * remet pas au transporteur une commande morte. */
type ShipStatus = 'nouvelle' | 'en_preparation' | 'prete' | 'terminee'

const STATUS_META: Record<ShipStatus, { label: string; cls: string }> = {
  nouvelle: { label: 'Nouvelle', cls: 'bg-[#b8912e]/12 text-[#8a5527] border-[#b8912e]/40' },
  en_preparation: { label: 'En préparation', cls: 'bg-blue-50 text-blue-800 border-blue-200' },
  prete: { label: 'Prête', cls: 'bg-violet-50 text-violet-800 border-violet-200' },
  terminee: { label: 'Terminée', cls: 'bg-green-50 text-green-800 border-green-200' },
}

const FILTERS: { id: 'all' | ShipStatus; label: string }[] = [
  { id: 'all', label: 'Toutes' },
  { id: 'nouvelle', label: 'Nouvelles' },
  { id: 'en_preparation', label: 'En préparation' },
  { id: 'prete', label: 'Prêtes' },
  { id: 'terminee', label: 'Terminées' },
]

export default function JetpackPage({ token }: { token: string }) {
  const { data, isLoading, isError } = trpc.orders.list.useQuery({ token })
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [filter, setFilter] = useState<'all' | ShipStatus>('all')
  const [query, setQuery] = useState('')

  // Une commande annulée ne s'expédie pas : elle ne figure jamais ici.
  const shippable = useMemo(
    () => (data ?? []).filter((o) => o.status !== 'annulee'),
    [data],
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return shippable.filter((o) => {
      if (filter !== 'all' && o.status !== filter) return false
      if (q === '') return true
      const hay = `#${o.id} ${o.customerName} ${o.phone} ${o.city} ${o.governorate} ${o.address}`
      return hay.toLowerCase().includes(q)
    })
  }, [shippable, filter, query])

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const allVisibleSelected = visible.length > 0 && visible.every((o) => selected.has(o.id))
  const toggleAllVisible = () =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) visible.forEach((o) => next.delete(o.id))
      else visible.forEach((o) => next.add(o.id))
      return next
    })

  const chosen = useMemo(
    () => shippable.filter((o) => selected.has(o.id)),
    [shippable, selected],
  )
  const totalCollect = chosen.reduce(
    (sum, o) => sum + amountToCollectMillimes(toShippable(o)),
    0,
  )

  const download = () => {
    if (chosen.length === 0) return
    const csv = buildJetpackCsv(chosen.map(toShippable))
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `jetpack-chez-laziz-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl text-ink">Jetpack — export des commandes</h2>
          <p className="mt-1 text-sm text-ink/55">
            Cochez les commandes, téléchargez le fichier, puis déposez-le dans Jetpack ›
            Importer CSV.
          </p>
        </div>
      </div>

      {/* Barre de filtre : recherche + état. Pensée comme le carnet de
          commandes, pour qu'on retrouve ici les mêmes repères. */}
      <div className="mb-3 mt-4 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nom, téléphone, ville, n°…"
          className="min-h-10 flex-1 rounded-lg border border-sand bg-white px-3.5 text-sm text-ink outline-none transition-colors placeholder:text-ink/35 focus:border-[#b8912e]"
        />
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f.id
                  ? 'border-ink bg-ink text-white'
                  : 'border-sand bg-white text-ink/60 hover:border-ink/30'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isError && <ErrorState label="Impossible de charger les commandes." />}

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}

      {!isLoading && !isError && (
        <>
          {/* Barre d'action EN HAUT : le bouton de téléchargement en premier,
              sans avoir à faire défiler la liste. */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#b8912e]/40 bg-[#b8912e]/[0.06] px-4 py-3">
            <p className="text-sm text-ink/70">
              <span className="font-semibold text-ink">{chosen.length}</span> commande
              {chosen.length > 1 ? 's' : ''}
              {chosen.length > 0 && (
                <>
                  {' '}· <span className="font-semibold text-ink">{formatTND(totalCollect)} DT</span> à
                  encaisser
                </>
              )}
            </p>
            <div className="flex items-center gap-3">
              {chosen.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  className="text-xs text-ink/45 underline underline-offset-4 hover:text-ink"
                >
                  Tout désélectionner
                </button>
              )}
              <button
                type="button"
                onClick={download}
                disabled={chosen.length === 0}
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#b8912e] px-5 text-xs font-semibold uppercase tracking-wide text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Télécharger .csv Jetpack
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-sand bg-white">
          {/* En-tête du tableau — la case de gauche coche tout ce qui est visible. */}
          <div className="grid grid-cols-[2.25rem_3rem_1fr_1fr_6rem_6rem] items-center gap-3 border-b border-sand bg-[#faf6f3] px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.04em] text-ink/45 max-sm:grid-cols-[2.25rem_1fr_5rem]">
            <input
              type="checkbox"
              aria-label="Tout sélectionner"
              checked={allVisibleSelected}
              onChange={toggleAllVisible}
              className="h-[18px] w-[18px] accent-[#b8912e]"
            />
            <span className="max-sm:hidden">N°</span>
            <span>Destinataire</span>
            <span className="max-sm:hidden">Ville · Gouvernorat</span>
            <span className="max-sm:hidden">Téléphone</span>
            <span className="text-right">À encaisser</span>
          </div>

          {visible.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-ink/45">
              Aucune commande à expédier pour ce filtre.
            </p>
          ) : (
            visible.map((o) => {
              const isSel = selected.has(o.id)
              const meta = STATUS_META[o.status as ShipStatus]
              const collect = amountToCollectMillimes(toShippable(o))
              return (
                <div
                  key={o.id}
                  onClick={() => toggle(o.id)}
                  className={`grid cursor-pointer grid-cols-[2.25rem_3rem_1fr_1fr_6rem_6rem] items-center gap-3 border-b border-sand/60 px-4 py-3 text-sm transition-colors last:border-b-0 hover:bg-[#faf6f3] max-sm:grid-cols-[2.25rem_1fr_5rem] ${
                    isSel ? 'bg-[#b8912e]/[0.06]' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    tabIndex={-1}
                    readOnly
                    checked={isSel}
                    aria-label={`Sélectionner la commande de ${o.customerName}`}
                    className="pointer-events-none h-[18px] w-[18px] accent-[#b8912e]"
                  />
                  <span className="text-ink/40 max-sm:hidden">#{o.id}</span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink">{o.customerName}</span>
                    {meta && (
                      <span
                        className={`mt-0.5 inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-medium ${meta.cls} sm:hidden`}
                      >
                        {meta.label}
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 text-ink/70 max-sm:hidden">
                    <span className="font-medium text-ink">{o.city}</span>
                    <span className="text-ink/45"> · {o.governorate}</span>
                  </span>
                  <span className="text-ink/60 max-sm:hidden">{o.phone}</span>
                  <span className="text-right font-medium text-ink">
                    {collect === 0 ? (
                      <span className="text-ink/40">payé</span>
                    ) : (
                      <>{formatTND(collect)}</>
                    )}
                  </span>
                </div>
              )
            })
          )}

        </div>
        </>
      )}

      <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-ink/45">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="mt-px shrink-0">
          <path d="M5 3h9l5 5v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
          <path d="M14 3v5h5M8.5 13l2 2 3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>
          Fichier au format de l'importeur Jetpack (destinataire_nom, adresse, ville,
          gouvernerat, telephone, telephone2, nombre_de_colis, prix, designation). Déposez-le sur
          jetpack.tn/expediteur › Importer CSV. Le prix est le montant à encaisser : une commande
          déjà payée part à 0.
        </span>
      </p>
    </div>
  )
}
