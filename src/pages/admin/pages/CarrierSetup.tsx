import { useState } from 'react'
import { trpc } from '@/providers/trpc'
import { Card } from '../ui/Card'

/** Reconnaissance de la connexion Team Parcel Express.
 *
 * Rien ici ne crée de colis. Deux boutons, deux lectures : « la clé
 * fonctionne-t-elle ? » et « quelle est la liste des délégations ? ».
 *
 * Cet écran existe parce que ces questions ne se répondent que depuis le
 * serveur déployé — un poste de développement n'a pas d'accès sortant vers
 * leur API. C'est donc un outil de mise au point, pas une page de travail
 * quotidien : il reste replié tant qu'on ne l'ouvre pas. */
export default function CarrierSetup({ token }: { token: string }) {
  const [open, setOpen] = useState(false)
  const utils = trpc.useUtils()
  const status = trpc.carriers.status.useQuery({ token }, { enabled: open } as never)

  const probe = trpc.carriers.probe.useMutation()
  const sync = trpc.carriers.syncDelegations.useMutation({
    onSuccess: () => void utils.carriers.status.invalidate(),
  })

  return (
    <Card
      title="Connexion Team Parcel Express"
      action={
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-[11px] font-semibold uppercase tracking-wide text-ink/50 underline underline-offset-4 hover:text-ink"
        >
          {open ? 'Replier' : 'Ouvrir'}
        </button>
      }
    >
      {!open ? (
        <p className="text-xs leading-relaxed text-ink/50">
          Outil de mise au point : vérifie la clé et récupère la liste des délégations. Ne crée
          aucun colis.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
            <span className="text-ink/55">
              Clé configurée :{' '}
              <strong className={status.data?.tpeTokenConfigured ? 'text-green-700' : 'text-red-600'}>
                {status.isLoading ? '…' : status.data?.tpeTokenConfigured ? 'oui' : 'non'}
              </strong>
            </span>
            <span className="text-ink/55">
              Délégations enregistrées :{' '}
              <strong className="text-ink">{status.isLoading ? '…' : (status.data?.delegationsStored ?? 0)}</strong>
            </span>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => probe.mutate({ token })}
              disabled={probe.isPending}
              className="min-h-10 rounded-full bg-ink px-4 text-xs font-semibold uppercase tracking-wide text-white transition-opacity hover:opacity-85 disabled:opacity-40"
            >
              {probe.isPending ? 'Test en cours…' : '1. Tester la connexion'}
            </button>
            <button
              type="button"
              onClick={() => sync.mutate({ token })}
              disabled={sync.isPending}
              className="min-h-10 rounded-full border border-ink/25 px-4 text-xs font-semibold uppercase tracking-wide text-ink/70 hover:border-[#b8912e] hover:text-accent disabled:opacity-40"
            >
              {sync.isPending ? 'Récupération…' : '2. Récupérer les délégations'}
            </button>
          </div>

          {probe.error && <Failure message={probe.error.message} />}
          {sync.error && <Failure message={sync.error.message} />}

          {probe.data && (
            <div className="space-y-2">
              {!probe.data.configured && (
                <p className="text-xs text-red-600">
                  Aucune clé n'est configurée sur le serveur (variable TPE_API_TOKEN).
                </p>
              )}
              {probe.data.results.map((r) => (
                <div
                  key={r.path}
                  className="rounded-lg border border-sand/60 bg-[#faf6f3] px-3 py-2 text-[11px]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status={r.status} ok={r.ok} />
                    <code className="font-mono text-ink/70">{r.path}</code>
                  </div>
                  <p className="mt-1 text-ink/60">{r.error ?? r.shape}</p>
                  {r.sample && (
                    <pre className="mt-1.5 max-h-32 overflow-auto whitespace-pre-wrap break-all rounded bg-white px-2 py-1.5 font-mono text-[10px] text-ink/55">
                      {r.sample}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}

          {sync.data && (
            <div className="rounded-lg border border-sand/60 bg-[#faf6f3] px-3 py-2 text-[11px]">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={sync.data.status} ok={sync.data.ok} />
                <span className="text-ink/70">
                  {sync.data.found} délégations lues · {sync.data.saved} enregistrées
                </span>
              </div>
              <p className="mt-1 text-ink/60">{sync.data.error ?? sync.data.shape}</p>
              {sync.data.sample && (
                <pre className="mt-1.5 max-h-32 overflow-auto whitespace-pre-wrap break-all rounded bg-white px-2 py-1.5 font-mono text-[10px] text-ink/55">
                  {sync.data.sample}
                </pre>
              )}
            </div>
          )}

          <p className="text-[11px] leading-relaxed text-ink/45">
            Ces deux boutons ne font que LIRE chez le transporteur. Aucun colis n'est créé, modifié
            ni supprimé — le module serveur n'envoie que des requêtes de lecture, la méthode y est
            écrite en dur.
          </p>
        </div>
      )}
    </Card>
  )
}

function StatusPill({ status, ok }: { status: number | null; ok: boolean }) {
  const cls = ok
    ? 'bg-green-50 text-green-800 border-green-200'
    : 'bg-red-50 text-red-700 border-red-200'
  return (
    <span className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 font-mono ${cls}`}>
      {status ?? 'échec'}
    </span>
  )
}

function Failure({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
      {message}
    </p>
  )
}
