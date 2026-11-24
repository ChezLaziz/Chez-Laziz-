import { trpc } from '@/providers/trpc'
import { suiviMessage, type SuiviList } from '@contracts/suiviLivraison'
import { Card } from '../ui/Card'
import { EmptyState, ErrorState, Skeleton } from '../ui/State'
import { moneyDT } from '../ui/format'

/** Le suivi après livraison : « votre colis est bien arrivé ? »
 *
 * Toutes les règles vivent dans contracts/suiviLivraison.ts — qui est dans
 * la liste, pendant combien de jours, et surtout ce que le message a le
 * droit de dire (des nouvelles du colis, rien à vendre). Cette page ne fait
 * que montrer la liste et ouvrir WhatsApp.
 *
 * UN GESTE PAR CLIENTE. Le bouton ouvre la conversation, message déjà écrit,
 * ET note la cliente comme contactée : demander de revenir cocher une case
 * après avoir envoyé, c'est garantir qu'une sur trois ne sera jamais cochée,
 * donc recontactée le lendemain. « Annuler » reste là pour l'erreur de
 * doigt. */
export default function SuiviPage({ token }: { token: string }) {
  const utils = trpc.useUtils()
  const { data, isLoading, isError } = trpc.suivi.list.useQuery({ token })
  const mark = trpc.suivi.mark.useMutation({
    // Succès ou échec, on relit : après un échec la cliente doit REVENIR
    // dans la liste, sinon elle disparaîtrait sans avoir été notée.
    onSettled: () => void utils.suivi.list.invalidate(),
  })

  if (isError) return <ErrorState label="Impossible de charger le suivi des livraisons." />
  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-[132px] rounded-2xl" />
        <Skeleton className="h-[300px] rounded-2xl" />
      </div>
    )
  }

  return (
    <SuiviBoard
      data={data}
      busy={mark.isPending}
      failed={mark.isError}
      onContact={(id) => mark.mutate({ token, customerId: id, contacted: true })}
      onUndo={(id) => mark.mutate({ token, customerId: id, contacted: false })}
    />
  )
}

/** L'affichage seul, sans réseau : c'est lui qu'on peut rendre et relire. */
export function SuiviBoard({
  data,
  busy = false,
  failed = false,
  onContact,
  onUndo,
}: {
  data: SuiviList
  busy?: boolean
  failed?: boolean
  onContact: (id: string) => void
  onUndo: (id: string) => void
}) {
  const fait = data.contactedToday.length

  return (
    <div className="space-y-3">
      <Card title="Le message qui s'ouvre dans WhatsApp">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <p
            dir="rtl"
            className="self-start whitespace-pre-line break-words rounded-xl bg-[#e7f7d9] px-3.5 py-2.5 text-right text-[14px] leading-relaxed text-[#17251a]"
          >
            {suiviMessage('Amina')}
          </p>
          <ul className="space-y-1.5 text-[12px] leading-snug text-ink/55">
            <li>
              <span className="font-medium text-ink">On prend des nouvelles du colis, on ne vend rien.</span>{' '}
              Le site promet que le numéro ne sert qu'à la commande : ni offre, ni lien.
            </li>
            <li>Seulement les colis livrés depuis 2 à 10 jours, et une seule fois par cliente.</li>
            <li>Rien ne part tout seul : WhatsApp s'ouvre, vous relisez, vous envoyez.</li>
            <li>À ouvrir sur l'appareil où WhatsApp est celui de la boutique.</li>
          </ul>
        </div>
      </Card>

      {failed && (
        <p className="rounded-xl border border-[#e8c9c1] bg-[#fbf1ee] px-3.5 py-2.5 text-[13px] text-[#8a3a2b]">
          La dernière marque n'a pas été enregistrée. La liste a été relue : vérifiez-la avant de continuer.
        </p>
      )}

      <Card
        title="À contacter aujourd'hui"
        action={
          <span className="shrink-0 text-[11px] text-ink/40">
            {fait > 0 ? `${fait} fait${fait > 1 ? 's' : ''} aujourd'hui · ` : ''}
            {data.waiting > 0 ? `${data.waiting} en attente · ` : ''}
            {data.contactedTotal} au total
          </span>
        }
      >
        {data.today.length === 0 ? (
          <EmptyState
            label={
              fait >= data.dailyBatch
                ? `C'est tout pour aujourd'hui : ${data.dailyBatch} messages. La suite demain.`
                : "Personne à contacter : aucun colis livré depuis 2 à 10 jours qui n'ait déjà eu son message."
            }
          />
        ) : (
          <ul className="divide-y divide-sand/50">
            {data.today.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-ink">
                    {c.customerName}
                    <span className="ml-2 font-normal text-ink/45">{c.governorate}</span>
                  </p>
                  <p className="truncate text-[11px] text-ink/45">
                    n°{c.orderId} · livrée il y a {c.daysSince} jours · {c.items} · {moneyDT(c.subtotalMillimes)} DT
                  </p>
                </div>
                <a
                  href={c.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => onContact(c.id)}
                  className="inline-flex min-h-10 shrink-0 items-center rounded-lg bg-[#1f8f4e] px-3.5 text-[12px] font-semibold text-white transition hover:bg-[#19773f]"
                >
                  WhatsApp
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {fait > 0 && (
        <Card title="Contactées aujourd'hui">
          <ul className="divide-y divide-sand/50">
            {data.contactedToday.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-1.5">
                <p className="min-w-0 flex-1 truncate text-[13px] text-ink/60">
                  {c.customerName}
                  <span className="ml-2 text-ink/40">{c.governorate}</span>
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onUndo(c.id)}
                  className="min-h-9 shrink-0 rounded-lg border border-sand bg-white px-3 text-[12px] text-ink/60 transition hover:text-ink disabled:opacity-50"
                >
                  Annuler
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
