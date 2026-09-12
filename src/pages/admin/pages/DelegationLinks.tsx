import { useMemo, useState } from 'react'
import { trpc } from '@/providers/trpc'
import { Card } from '../ui/Card'

/** Relier les villes de nos commandes aux délégations du transporteur.
 *
 * POURQUOI CET ÉCRAN EXISTE. Le client écrit sa ville comme il veut —
 * « mourouj 1 », « Le Bardo », « بني خلاد ». Team Parcel Express, lui,
 * n'accepte qu'un numéro de délégation. La plupart des villes se rapprochent
 * toutes seules ; celles qui restent demandent une décision, parce qu'aucune
 * règle ne peut la prendre sans risquer d'envoyer le colis ailleurs :
 *
 *   « Gafsa »    → chez eux, Gafsa Nord ET Gafsa Sud existent ;
 *   « بني خلاد » → écrit en arabe, illisible pour une comparaison de texte ;
 *   « Tunis » dans le gouvernorat Ariana → l'un des deux est faux.
 *
 * Chaque décision est prise UNE FOIS. Elle vaut ensuite pour toutes les
 * commandes qui portent la même ville, aujourd'hui et plus tard. */
export default function DelegationLinks({ token }: { token: string }) {
  const [showLinked, setShowLinked] = useState(false)
  const utils = trpc.useUtils()
  const cities = trpc.carriers.cities.useQuery({ token })
  const catalogue = trpc.carriers.catalogue.useQuery({ token })

  const link = trpc.carriers.linkCity.useMutation({
    onSuccess: () => void utils.carriers.cities.invalidate(),
  })
  const unlink = trpc.carriers.unlinkCity.useMutation({
    onSuccess: () => void utils.carriers.cities.invalidate(),
  })

  const lines = cities.data?.lines ?? []
  const pending = lines.filter((l) => l.match.delegation === null)
  const linked = lines.filter((l) => l.match.delegation !== null)

  /** Le catalogue rangé par gouvernorat, pour un choix exhaustif. */
  const groups = useMemo(() => {
    const by = new Map<string, { externalId: string; name: string }[]>()
    for (const d of catalogue.data ?? []) {
      const g = d.governorate || 'Sans gouvernorat'
      if (!by.has(g)) by.set(g, [])
      by.get(g)!.push({ externalId: d.externalId, name: d.name })
    }
    return [...by.entries()]
  }, [catalogue.data])

  if (cities.isLoading) {
    return (
      <Card title="Villes et délégations">
        <p className="text-xs text-ink/45">Vérification…</p>
      </Card>
    )
  }

  // Sans table des délégations, cet écran n'a rien à proposer : la question
  // n'est pas « quelle délégation ? » mais « où est la liste ? ».
  if ((catalogue.data?.length ?? 0) === 0) {
    return (
      <Card title="Villes et délégations">
        <p className="text-xs leading-relaxed text-ink/55">
          La liste des délégations de Team Parcel Express n'a pas encore été récupérée. Ouvrez
          Paramètres → « Délégations Team Parcel Express » et appuyez sur « Mettre à jour la liste ».
        </p>
      </Card>
    )
  }

  return (
    <Card
      title="Villes et délégations"
      action={
        linked.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowLinked((v) => !v)}
            className="text-[11px] font-semibold uppercase tracking-wide text-ink/50 underline underline-offset-4 hover:text-ink"
          >
            {showLinked ? 'Masquer' : `${linked.length} déjà reliée${linked.length > 1 ? 's' : ''}`}
          </button>
        ) : undefined
      }
    >
      {pending.length === 0 ? (
        <p className="text-xs leading-relaxed text-green-800">
          Toutes les villes de vos commandes correspondent à une délégation. Rien à faire ici.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs leading-relaxed text-ink/55">
            {pending.length} ville{pending.length > 1 ? 's' : ''} ne correspond
            {pending.length > 1 ? 'ent' : ''} à aucune délégation avec certitude. Choisissez la
            bonne : le choix est enregistré et ne sera plus redemandé.
          </p>

          {pending.map((line) => (
            <PendingCity
              key={`${line.governorate}|${line.city}`}
              line={line}
              groups={groups}
              busy={link.isPending}
              onPick={(delegationExternalId) =>
                link.mutate({
                  token,
                  governorate: line.governorate,
                  city: line.city,
                  delegationExternalId,
                })
              }
            />
          ))}
        </div>
      )}

      {link.error && <Failure message={link.error.message} />}
      {unlink.error && <Failure message={unlink.error.message} />}

      {showLinked && linked.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-sand/60 pt-3">
          {linked.map((line) => (
            <li
              key={`${line.governorate}|${line.city}`}
              className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]"
            >
              <span className="text-ink/70">
                {line.city} <span className="text-ink/35">({line.governorate})</span>
              </span>
              <span className="text-ink/30">→</span>
              <span className="font-medium text-ink">{line.match.delegation?.name}</span>
              <span className="font-mono text-ink/35">#{line.match.delegation?.externalId}</span>
              {/* Seul un choix humain se défait : une correspondance
                  automatique se recalcule toute seule. */}
              {line.match.status === 'alias' && (
                <button
                  type="button"
                  onClick={() =>
                    unlink.mutate({ token, governorate: line.governorate, city: line.city })
                  }
                  className="text-ink/40 underline underline-offset-2 hover:text-red-600"
                >
                  changer
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

type Line = {
  governorate: string
  city: string
  orders: number
  match: {
    status: string
    delegation: { externalId: string; name: string; governorate: string } | null
    candidates: { externalId: string; name: string; governorate: string }[]
  }
}

/** Pourquoi cette ville n'a pas pu être reliée toute seule.
 *
 * Dit en clair ce qui bloque. Sans cette phrase, la personne qui choisit ne
 * sait pas si elle tranche une ambiguïté ou si elle corrige une faute de
 * saisie — et le motif décide de la bonne réponse.
 *
 * Le motif vient du serveur, qui l'a établi en comparant les noms ; l'écran
 * ne le redevine pas. */
function reason(line: Line): string {
  switch (line.match.status) {
    case 'elsewhere':
      return `Cette ville existe chez eux, mais dans le gouvernorat ${
        line.match.candidates[0]?.governorate ?? 'voisin'
      } — pas dans ${line.governorate}. L'un des deux est faux.`
    case 'unreadable':
      return "Ville écrite en arabe : aucune comparaison de texte ne peut la lire. À relier une fois."
    case 'ambiguous':
      return line.match.candidates.length > 1
        ? 'Plusieurs délégations lui ressemblent : choisir au hasard enverrait le colis à côté.'
        : "Une seule délégation lui ressemble, sans certitude : à confirmer."
    default:
      return `Aucune délégation ${of(line.governorate)} ne porte ce nom chez le transporteur.`
  }
}

/** « de Sfax », mais « d'Ariana » : sans élision la phrase se lit mal. */
function of(name: string): string {
  return /^[aeiouâàéèêîôû]/i.test(name.trim()) ? `d'${name}` : `de ${name}`
}

function PendingCity({
  line,
  groups,
  busy,
  onPick,
}: {
  line: Line
  groups: [string, { externalId: string; name: string }[]][]
  busy: boolean
  onPick: (externalId: string) => void
}) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2.5">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <strong className="text-sm text-ink">{line.city}</strong>
        <span className="text-[11px] text-ink/45">{line.governorate}</span>
        <span className="text-[11px] text-ink/45">
          · {line.orders} commande{line.orders > 1 ? 's' : ''}
        </span>
      </div>
      <p className="mt-0.5 text-[11px] leading-relaxed text-amber-900/80">{reason(line)}</p>

      {line.match.candidates.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {line.match.candidates.slice(0, 4).map((c) => (
            <button
              key={c.externalId}
              type="button"
              disabled={busy}
              onClick={() => onPick(c.externalId)}
              className="min-h-8 rounded-full border border-ink/20 bg-white px-3 text-[11px] font-medium text-ink/75 hover:border-[#b8912e] hover:text-accent disabled:opacity-40"
            >
              {/* Deux délégations d'un même gouvernorat peuvent porter EXACTEMENT
                  le même nom réduit (c'est justement le cas « ambiguous ») : sans
                  l'identifiant, les deux boutons affichaient le même texte et la
                  personne qui choisit ne pouvait plus les distinguer à l'écran —
                  un mauvais clic envoie le colis dans la mauvaise zone. */}
              {c.name}
              <span className="ml-1 font-mono text-[9px] text-ink/35">#{c.externalId}</span>
            </button>
          ))}
        </div>
      )}

      {/* La liste entière reste accessible : quand le gouvernorat de la
          commande est faux, la bonne réponse n'est dans aucune proposition. */}
      <select
        value=""
        disabled={busy}
        onChange={(e) => e.target.value && onPick(e.target.value)}
        aria-label={`Délégation pour ${line.city}`}
        className="mt-2 min-h-9 w-full rounded-lg border border-ink/15 bg-white px-2 text-xs text-ink/75"
      >
        <option value="">Ou choisir dans la liste complète…</option>
        {groups.map(([gov, items]) => (
          <optgroup key={gov} label={gov}>
            {items.map((d) => (
              <option key={d.externalId} value={d.externalId}>
                {d.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  )
}

function Failure({ message }: { message: string }) {
  return (
    <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
      {message}
    </p>
  )
}
