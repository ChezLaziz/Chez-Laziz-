import { useState } from 'react'
import { trpc } from '@/providers/trpc'
import {
  OFFRES_ACCORD_TEXTE,
  bornerMessage,
  nettoyerMessage,
  offreMessage,
  placeDuMessage,
  type OffresList,
} from '@contracts/offres'
import { Card } from '../ui/Card'
import { EmptyState, ErrorState, Skeleton } from '../ui/State'

const jour = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

const s = (n: number) => (n > 1 ? 's' : '')

/** Ce que la page répond après un retrait par numéro. */
export type Retrait = 'retire' | 'absent' | 'illisible' | null

/** Les offres sur WhatsApp, pour les clientes qui les ont demandées.
 *
 * Toutes les règles vivent dans contracts/offres.ts : qui est dans la liste
 * (uniquement celles qui ont coché la case du formulaire, une fois leur
 * numéro confirmé par une livraison), à quel rythme, et la ligne STOP ajoutée
 * d'office au message. Cette page rédige le message, montre la liste et
 * ouvre WhatsApp.
 *
 * UN GESTE PAR CLIENTE, comme le suivi des colis : le bouton ouvre la
 * conversation, message déjà écrit, ET note la cliente comme contactée. */
export default function OffresPage({ token }: { token: string }) {
  const utils = trpc.useUtils()
  const { data, isLoading, isError } = trpc.offres.list.useQuery({ token })
  const relire = { onSettled: () => void utils.offres.list.invalidate() }
  const contact = trpc.offres.contact.useMutation(relire)
  const enregistrer = trpc.offres.enregistrerMessage.useMutation(relire)
  // Le numéro collé dans « Une cliente a répondu STOP ? », et ce qu'on en
  // a fait.
  const [numero, setNumero] = useState('')
  const [retrait, setRetrait] = useState<Retrait>(null)
  const retirer = trpc.offres.retirer.useMutation({
    ...relire,
    onSuccess: (r) => {
      setRetrait(r.retire ? 'retire' : 'absent')
      // Absent de la liste : le numéro reste dans le champ, c'est peut-être
      // une faute de frappe à corriger.
      if (r.retire) setNumero('')
    },
    // Un numéro illisible se corrige dans le champ ; tout autre échec est
    // une panne, et c'est le bandeau qui le dit.
    onError: (e) => setRetrait(e.data?.code === 'BAD_REQUEST' ? 'illisible' : null),
  })

  if (isError) return <ErrorState label="Impossible de charger la liste des offres." />
  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-[220px] rounded-xl" />
        <Skeleton className="h-[260px] rounded-xl" />
      </div>
    )
  }

  return (
    <OffresBoard
      data={data}
      busy={contact.isPending || retirer.isPending}
      saving={enregistrer.isPending}
      failed={contact.isError || enregistrer.isError || (retirer.isError && retrait !== 'illisible')}
      numero={numero}
      retrait={retrait}
      onNumero={(v) => {
        setNumero(v)
        setRetrait(null)
      }}
      onSave={(texte) => enregistrer.mutate({ token, texte })}
      onContact={(id) => contact.mutate({ token, customerId: id, contacted: true })}
      onUndo={(id) => contact.mutate({ token, customerId: id, contacted: false })}
      onRemove={(phone) => retirer.mutate({ token, phone })}
    />
  )
}

/** L'affichage seul, sans réseau : c'est lui qu'on peut rendre et relire. */
export function OffresBoard({
  data,
  busy = false,
  saving = false,
  failed = false,
  numero = '',
  retrait = null,
  onNumero,
  onSave,
  onContact,
  onUndo,
  onRemove,
}: {
  data: OffresList
  busy?: boolean
  saving?: boolean
  failed?: boolean
  numero?: string
  retrait?: Retrait
  onNumero: (v: string) => void
  onSave: (texte: string) => void
  onContact: (id: string) => void
  onUndo: (id: string) => void
  /** Par numéro : l'identifiant d'une cliente EST son numéro à huit chiffres. */
  onRemove: (phone: string) => void
}) {
  const [texte, setTexte] = useState(data.message)
  // Le message enregistré ailleurs (une collègue, un autre onglet) remplace
  // le brouillon — sauf si on est en train d'écrire autre chose. Ajusté
  // pendant le rendu, pas dans un effet : l'écran ne montre jamais un
  // brouillon périmé, même le temps d'une image.
  const [base, setBase] = useState(data.message)
  if (data.message !== base) {
    if (nettoyerMessage(texte) === base) setTexte(data.message)
    setBase(data.message)
  }
  // « Retirer » demande une confirmation, sur place : c'est le seul geste de
  // la page qui ne s'annule pas d'un bouton.
  const [aRetirer, setARetirer] = useState<string | null>(null)

  const modifie = nettoyerMessage(texte) !== data.message
  const apercu = offreMessage(texte, 'Amina')
  const fait = data.contacteesAujourdhui.length
  const pret = data.message !== '' && !modifie
  // Une jauge, pas un compteur de caractères : en arabe le lien WhatsApp est
  // plein bien avant le compteur (voir OFFRES_LIEN_MAX).
  const place = Math.round(placeDuMessage(texte) * 100)
  const semaines = data.ecartJours / 7
  // Celles qui sont inscrites mais qu'on ne propose pas aujourd'hui, et
  // pourquoi : sans cette ligne, « 12 inscrites » au-dessus d'une liste de
  // trois ressemble à une panne.
  const pasAujourdhui = [
    data.commandeEnCours > 0 ? `${data.commandeEnCours} avec une commande en cours` : '',
    data.livreesRecemment > 0
      ? `${data.livreesRecemment} livrée${s(data.livreesRecemment)} il y a moins de ${data.apresLivraisonJours} jours`
      : '',
    data.auRepos > 0 ? `${data.auRepos} contactée${s(data.auRepos)} il y a moins de ${semaines} semaines` : '',
    data.sansLivraison > 0 ? `${data.sansLivraison} au numéro pas encore confirmé par une livraison` : '',
  ].filter(Boolean)

  /** La confirmation de « Retirer », à la place des boutons de la ligne. */
  const confirmation = (id: string) => (
    <span className="flex shrink-0 items-center gap-2 text-[12px] text-ink/60">
      A demandé d'arrêter ?
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          onRemove(id)
          setARetirer(null)
        }}
        className="min-h-9 rounded-lg bg-[#b3303f] px-3 font-semibold text-white disabled:opacity-50"
      >
        Oui, retirer
      </button>
      <button type="button" onClick={() => setARetirer(null)} className="min-h-9 rounded-lg px-2 underline underline-offset-4">
        Non
      </button>
    </span>
  )

  const boutonRetirer = (id: string) => (
    <button
      type="button"
      onClick={() => setARetirer(id)}
      className="min-h-10 rounded-lg px-2.5 text-[12px] text-ink/50 underline underline-offset-4 transition hover:text-ink"
    >
      Retirer
    </button>
  )

  return (
    <div className="space-y-3">
      <Card
        title="Le message du moment"
        hint="Une nouveauté, une offre, une date. Le bonjour et la ligne STOP s'ajoutent tout seuls."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <textarea
              value={texte}
              onChange={(e) => setTexte(bornerMessage(e.target.value))}
              dir="auto"
              rows={5}
              placeholder="Exemple : Le makroudh à la pistache est de retour cette semaine, 40 DT le kilo. Livraison partout en Tunisie en 24h."
              aria-label="Texte de l'offre"
              className="w-full resize-none rounded-lg border border-[#e2dcd4] bg-white px-3.5 py-3 text-[14px] leading-relaxed text-ink outline-none transition-colors placeholder:text-ink/35 focus:border-[#2a4750]"
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-[12px] tabular-nums text-ink/45">
                {place >= 100 ? 'Longueur maximale atteinte' : `Longueur : ${place} %`}
              </span>
              <button
                type="button"
                disabled={saving || !modifie}
                onClick={() => onSave(texte)}
                className="min-h-10 rounded-lg bg-[#2a4750] px-4 text-[13px] font-semibold text-white transition hover:bg-[#223a42] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? 'Enregistrement…' : !modifie && data.message ? 'Message enregistré' : 'Enregistrer le message'}
              </button>
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[12px] text-ink/50">Ce qui s'ouvrira dans WhatsApp, au prénom de chacune</p>
            {apercu ? (
              <p
                dir="auto"
                className="whitespace-pre-line break-words rounded-xl bg-[#e7f7d9] px-3.5 py-2.5 text-[14px] leading-relaxed text-[#17251a]"
              >
                {apercu}
              </p>
            ) : (
              <p className="rounded-xl border border-dashed border-[#d9d2c8] px-3.5 py-6 text-center text-[13px] text-ink/45">
                Écrivez le message : les boutons WhatsApp s'activent une fois qu'il est enregistré.
              </p>
            )}
          </div>
        </div>
      </Card>

      {failed && (
        <p className="rounded-xl border border-[#e8c9c1] bg-[#fbf1ee] px-3.5 py-2.5 text-[13px] text-[#8a3a2b]">
          La dernière action n'a pas été enregistrée. La liste a été relue : vérifiez-la avant de continuer.
        </p>
      )}

      <Card
        title="À contacter aujourd'hui"
        action={
          <span className="shrink-0 text-[12px] text-ink/45">
            {fait > 0 ? `${fait} fait${s(fait)} aujourd'hui · ` : ''}
            {data.enAttente > 0 ? `${data.enAttente} de plus à partir de demain · ` : ''}
            {data.total} inscrite{s(data.total)}
          </span>
        }
      >
        {data.aContacter.length === 0 ? (
          <EmptyState
            label={
              data.total === 0
                ? "Personne pour l'instant. Les clientes qui cochent la case du formulaire de commande apparaîtront ici, une fois leur commande livrée."
                : fait >= data.plafondJour
                  ? `C'est tout pour aujourd'hui : ${data.plafondJour} messages. La suite demain.`
                  : "Personne à contacter aujourd'hui."
            }
          />
        ) : (
          <ul className="divide-y divide-[#efebe6]">
            {data.aContacter.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
                <div className="min-w-0 flex-1 basis-[220px]">
                  <p className="truncate text-[13px] font-medium text-ink">
                    {c.customerName}
                    <span className="ml-2 font-normal text-ink/45">{c.governorate}</span>
                  </p>
                  <p className="truncate text-[12px] text-ink/50">
                    {c.commandes} commande{s(c.commandes)} · dernière le {jour(c.derniereCommande)} ·{' '}
                    {c.derniersArticles}
                    {c.dernierContact ? ` · dernière offre le ${jour(c.dernierContact)}` : ''}
                  </p>
                </div>
                {aRetirer === c.id ? (
                  confirmation(c.id)
                ) : (
                  <span className="flex shrink-0 items-center gap-2">
                    {boutonRetirer(c.id)}
                    {pret && c.whatsappUrl ? (
                      <a
                        href={c.whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => onContact(c.id)}
                        className="inline-flex min-h-10 items-center rounded-lg bg-[#1f8f4e] px-3.5 text-[12.5px] font-semibold text-white transition hover:bg-[#19773f]"
                      >
                        WhatsApp
                      </a>
                    ) : (
                      <span
                        title={modifie ? "Enregistrez d'abord le message" : "Écrivez d'abord le message"}
                        className="inline-flex min-h-10 cursor-not-allowed items-center rounded-lg bg-ink/[0.06] px-3.5 text-[12.5px] font-semibold text-ink/35"
                      >
                        WhatsApp
                      </span>
                    )}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        {pasAujourdhui.length > 0 && (
          <p className="mt-3 border-t border-[#efebe6] pt-3 text-[12px] leading-relaxed text-ink/50">
            Pas aujourd'hui : {pasAujourdhui.join(' · ')}.
          </p>
        )}
      </Card>

      {fait > 0 && (
        <Card title="Contactées aujourd'hui">
          <ul className="divide-y divide-[#efebe6]">
            {data.contacteesAujourdhui.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5">
                <p className="min-w-0 flex-1 basis-[160px] truncate text-[13px] text-ink/60">
                  {c.customerName}
                  <span className="ml-2 text-ink/40">{c.governorate}</span>
                </p>
                {/* Elle peut répondre STOP dans la minute : le retrait est
                    là, sur sa ligne, sans attendre trois semaines qu'elle
                    réapparaisse dans la liste. */}
                {aRetirer === c.id ? (
                  confirmation(c.id)
                ) : (
                  <span className="flex shrink-0 items-center gap-2">
                    {boutonRetirer(c.id)}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onUndo(c.id)}
                      className="min-h-9 shrink-0 rounded-lg border border-[#e2dcd4] bg-white px-3 text-[12px] text-ink/60 transition hover:text-ink disabled:opacity-50"
                    >
                      Annuler
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* STOP ARRIVE D'UN NUMÉRO, ET RAREMENT LE JOUR MÊME. Le lendemain, la
          cliente n'est plus dans aucune liste de cette page : sans ce champ,
          il faudrait se souvenir d'elle pendant trois semaines — et on
          l'oublierait. Affiché dès qu'il y a une inscrite, ou une réponse à
          montrer. */}
      {(data.total > 0 || retrait !== null) && (
        <Card
          title="Une cliente a répondu STOP ?"
          hint="Son numéro suffit. Elle sort de la liste tout de suite, même si elle n'y apparaît pas aujourd'hui."
        >
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (numero.trim()) onRemove(numero)
            }}
          >
            <input
              type="tel"
              inputMode="tel"
              dir="ltr"
              value={numero}
              onChange={(e) => onNumero(e.target.value)}
              placeholder="20 123 456"
              aria-label="Numéro à retirer de la liste"
              className="min-h-10 w-full max-w-[220px] rounded-lg border border-[#e2dcd4] bg-white px-3 text-[14px] tabular-nums text-ink outline-none transition-colors placeholder:text-ink/30 focus:border-[#2a4750]"
            />
            <button
              type="submit"
              disabled={busy || !numero.trim()}
              className="min-h-10 rounded-lg border border-[#d9c2c5] bg-white px-3.5 text-[12.5px] font-semibold text-[#8f2634] transition hover:bg-[#fbf1ee] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Retirer ce numéro
            </button>
          </form>
          {retrait && (
            <p role="status" className="mt-2.5 text-[12.5px] text-ink/65">
              {retrait === 'retire'
                ? "C'est fait : ce numéro ne recevra plus d'offre."
                : retrait === 'absent'
                  ? "Ce numéro n'est pas dans la liste : il n'y avait rien à retirer."
                  : "Ce numéro n'est pas lisible. Il faut les huit chiffres, avec ou sans +216."}
            </p>
          )}
        </Card>
      )}

      <Card title="Les règles de cette page">
        <ul className="space-y-1.5 text-[12.5px] leading-relaxed text-ink/60">
          <li>
            <span className="font-medium text-ink">Seulement les clientes qui l'ont demandé.</span> Elles ont coché, en
            commandant, la case : « {OFFRES_ACCORD_TEXTE.fr} » Personne ne peut être ajouté à la main.
          </li>
          <li>
            Une cliente n'apparaît qu'une fois livrée la commande où elle a coché la case, ou une commande passée après :
            c'est la livraison qui prouve que le numéro est bien le sien.
          </li>
          <li>
            Une offre par cliente toutes les {semaines} semaines au plus, jamais dans les {data.apresLivraisonJours} jours
            qui suivent une livraison, et {data.plafondJour} messages par jour.
          </li>
          <li>Rien ne part tout seul : WhatsApp s'ouvre, vous relisez, vous envoyez. Une par une.</li>
          <li>
            Une cliente répond STOP, ou demande d'arrêter au téléphone : retirez-la. Elle ne reviendra que si elle recoche
            la case elle-même.
          </li>
          <li>À ouvrir sur l'appareil où WhatsApp est celui de la boutique.</li>
          {data.retraits > 0 && (
            <li className="pt-1 text-ink/45">
              {data.retraits} retrait{s(data.retraits)} enregistré{s(data.retraits)}.
            </li>
          )}
        </ul>
      </Card>
    </div>
  )
}
