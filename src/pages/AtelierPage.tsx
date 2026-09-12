import { useCallback, useEffect, useRef, useState } from 'react'
import { trpc } from '@/providers/trpc'
import { formatTND } from '@/lib/shop'
import { useSEO } from '@/hooks/useSEO'
import { activerSon, jouerChaChing, sonActif } from '@/lib/chaChing'
import { formatAgeAr } from '@contracts/stalledOrders'
import { formatKgAr } from '@contracts/kitchenBoard'

/** L'ÉCRAN DE L'ATELIER — la caisse qui sonne dans la pièce.
 *
 * Telegram prévient chaque personne sur SON téléphone, avec SON réglage de
 * son : rien, dans l'API de Telegram, ne permet d'imposer une sonnerie aux
 * autres. Or ce qu'on veut ici est l'inverse — UN son, que toute la pièce
 * entend, sans que personne n'ait rien à régler. C'est exactement ce que fait
 * une caisse enregistreuse, et c'est ce que fait cet écran : une tablette ou
 * un vieux téléphone posé dans l'atelier, branché, allumé sur cette page.
 *
 * Les deux ne se remplacent pas. Telegram suit les gens qui sortent ; cet
 * écran tient la pièce où l'on travaille.
 *
 * Lisible de loin : gros chiffres, peu de lignes, aucune action. On ne
 * confirme pas une commande depuis un écran partagé qu'on ne regarde qu'en
 * passant — ça se fait dans Telegram ou dans le tableau de bord, là où on
 * sait QUI a décidé.
 */

const TOKEN_KEY = 'laziz_admin_token'
const RYTHME_MS = 15_000

export default function AtelierPage() {
  useSEO({ title: 'Atelier — Chez Laziz', description: "Écran de l'atelier.", path: '/atelier', noindex: true })
  const [token] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  })

  if (!token) return <Fermee />
  return <Ecran token={token} />
}

function Fermee() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#1c1614] px-6 text-center">
      <div className="max-w-md">
        <p className="text-[11px] uppercase tracking-[0.35em] text-[#c88a3d]">Chez Laziz</p>
        <h1 className="mt-4 text-3xl text-[#f6efe4]">شاشة الأتولييه</h1>
        <p className="mt-5 text-[15px] leading-relaxed text-[#f6efe4]/60">
          لازم تدخل مرّة وحدة من صفحة الإدارة على نفس هالجهاز، وبعدها ارجع لهنا.
        </p>
        <a
          href="/admin"
          className="mt-7 inline-block rounded-full bg-[#c88a3d] px-7 py-3 text-[13px] uppercase tracking-[0.12em] text-white"
        >
          افتح الإدارة
        </a>
      </div>
    </main>
  )
}

function Ecran({ token }: { token: string }) {
  const { data, isError } = trpc.orders.pulse.useQuery(
    { token },
    { refetchInterval: RYTHME_MS, refetchOnWindowFocus: true, retry: 2 } as never,
  )

  const [audioPret, setAudioPret] = useState(() => sonActif())
  const [flash, setFlash] = useState(false)
  // Le numéro de la dernière commande CONNUE. `null` tant que rien n'a été
  // reçu : sans cette distinction, le tout premier chargement sonnerait pour
  // des commandes déjà anciennes, chaque matin.
  const dernierVu = useRef<number | null>(null)

  const allumer = useCallback(async () => {
    setAudioPret(await activerSon())
  }, [])

  useEffect(() => {
    if (!data) return
    const precedent = dernierVu.current
    dernierVu.current = data.lastOrderId
    if (precedent === null || data.lastOrderId <= precedent) return
    jouerChaChing()
    setFlash(true)
    const t = setTimeout(() => setFlash(false), 6000)
    return () => clearTimeout(t)
  }, [data])

  // L'écran d'un atelier s'éteint tout seul au bout d'une minute, et une
  // page endormie ne sonne plus. On demande à le garder allumé — refusé sur
  // certains navigateurs, jamais bloquant.
  useEffect(() => {
    if (!audioPret) return
    let lock: { release: () => Promise<void> } | null = null
    const nav = navigator as Navigator & {
      wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> }
    }
    const demander = () => {
      nav.wakeLock
        ?.request('screen')
        .then((l) => {
          lock = l
        })
        .catch(() => {})
    }
    demander()
    // Le verrou saute dès que l'écran passe en arrière-plan : on le reprend.
    const onVisible = () => {
      if (document.visibilityState === 'visible') demander()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release().catch(() => {})
    }
  }, [audioPret])

  const attente = data?.attente ?? []
  const cuisine = data?.cuisine ?? []
  const montant = attente.reduce((s, o) => s + o.totalMillimes, 0)

  return (
    <main
      dir="rtl"
      className={`min-h-screen bg-[#1c1614] px-5 py-6 text-[#f6efe4] transition-colors duration-700 sm:px-8 ${
        flash ? 'bg-[#2c1f12]' : ''
      }`}
    >
      <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-[#c88a3d]">Chez Laziz</p>
          <h1 className="mt-1 text-2xl font-medium sm:text-3xl">شاشة الأتولييه</h1>
        </div>
        {audioPret ? (
          <span className="rounded-full border border-[#c88a3d]/40 px-4 py-2 text-[13px] text-[#c88a3d]">
            🔊 الصوت مشغّل
          </span>
        ) : (
          <button
            onClick={() => void allumer()}
            className="animate-pulse rounded-full bg-[#c88a3d] px-6 py-3 text-[14px] font-medium text-white"
          >
            🔊 شغّل الصوت
          </button>
        )}
      </header>

      {!audioPret && (
        <p className="mb-6 rounded-xl border border-[#c88a3d]/30 bg-[#c88a3d]/10 px-4 py-3 text-[14px] leading-relaxed text-[#f6efe4]/80">
          المتصفّح ما يخلّيش الصفحة تعيّط قبل ما تلمسها. اضغط على الزرّ مرّة وحدة
          في الصباح، وتخدم النهار كامل.
        </p>
      )}

      {isError && (
        <p className="mb-6 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-[14px] text-red-200">
          ما نجّمناش نجيبو المعطيات. الصفحة تعاود تحاول وحدها.
        </p>
      )}

      {flash && (
        <p className="mb-6 rounded-xl bg-[#c88a3d] px-5 py-4 text-center text-xl font-medium text-white">
          💰 طلبية جديدة وصلت !
        </p>
      )}

      <section className="mb-9">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className="text-lg text-[#f6efe4]/70">يستنّاو تليفون</h2>
          <span className="text-3xl font-semibold text-[#c88a3d] sm:text-4xl">
            {formatTND(montant)} د.ت
          </span>
        </div>
        {attente.length === 0 ? (
          <p className="rounded-xl border border-[#f6efe4]/10 px-5 py-6 text-center text-[15px] text-[#f6efe4]/45">
            ✅ ما فماش طلبية تستنّى
          </p>
        ) : (
          <ul className="space-y-2">
            {attente.map((o) => (
              <li
                key={o.id}
                className="flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-xl border border-[#f6efe4]/10 bg-[#f6efe4]/[0.04] px-4 py-3"
              >
                <span className="text-lg font-semibold text-[#c88a3d]">#{o.id}</span>
                <span className="text-lg">{o.customerName}</span>
                {/* Numéro cliquable : sur la tablette de l'atelier comme sur un
                    téléphone, appeler doit être à un doigt. */}
                <a href={`tel:${o.phone}`} className="text-lg tabular-nums underline-offset-4 hover:underline">
                  {o.phone}
                </a>
                <span className="ms-auto text-lg font-medium tabular-nums">
                  {formatTND(o.totalMillimes)} د.ت
                </span>
                <span className="text-[13px] text-[#f6efe4]/45">{formatAgeAr(o.ageHours)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg text-[#f6efe4]/70">🍳 المطبخ — المطلوب توّا</h2>
        {cuisine.length === 0 ? (
          <p className="rounded-xl border border-[#f6efe4]/10 px-5 py-6 text-center text-[15px] text-[#f6efe4]/45">
            ✅ كل شي مكمّل
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {cuisine.map((l) => (
              <li
                key={l.key}
                className="flex items-baseline justify-between gap-4 rounded-xl border border-[#f6efe4]/10 bg-[#f6efe4]/[0.04] px-4 py-3"
              >
                <span className="text-lg">{l.label}</span>
                <span className="text-xl font-semibold tabular-nums text-[#c88a3d]">
                  {formatKgAr(l.kg)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-10 text-center text-[12px] text-[#f6efe4]/30">
        التأكيد والإلغاء يتعملو من تلغرام ولا من الإدارة — هالشاشة تعرض برك.
      </p>
    </main>
  )
}
