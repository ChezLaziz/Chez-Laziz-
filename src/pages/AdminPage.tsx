import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { trpc } from '@/providers/trpc'
import { formatTND } from '@/lib/shop'
import { formatWeight, type WeightKg } from '@contracts/shop'
import Ornament from '@/components/Ornament'
import { useSEO } from '@/hooks/useSEO'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { PresetRange } from '@contracts/analytics'
import Sidebar from './admin/shell/Sidebar'
import TopBar from './admin/shell/TopBar'
import DateRange from './admin/shell/DateRange'
import { ANALYTICS_PAGES, NAV_GROUPS, type NavId } from './admin/shell/nav'
import OverviewPage from './admin/pages/OverviewPage'
import SalesPage from './admin/pages/SalesPage'
import CustomersPage from './admin/pages/CustomersPage'
import ProductsPage from './admin/pages/ProductsPage'
import GeographyPage from './admin/pages/GeographyPage'
import ProfitabilityPage from './admin/pages/ProfitabilityPage'
import MarketingPage from './admin/pages/MarketingPage'
import IntelligencePage from './admin/pages/IntelligencePage'
import { useOverview } from './admin/useOverview'

const TOKEN_KEY = 'laziz_admin_token'

// text-base (16px) et non text-sm : en dessous de 16px, iOS Safari zoome
// automatiquement la page à chaque fois qu'un champ reçoit le focus, et
// l'admin se remplit surtout depuis un téléphone.
const inputCls =
  'w-full rounded-lg border border-sand bg-white px-4 py-2.5 text-base text-ink outline-none transition-colors placeholder:text-ink/35 focus:border-[#b8912e] md:text-sm'

/** Champ mot de passe avec bascule afficher/masquer — évite les erreurs de
 * saisie invisibles (espace en trop, faute de frappe) qui bloquent la connexion. */
function PasswordField({
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
  minLength,
  autoFocus,
}: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  autoComplete?: string
  required?: boolean
  minLength?: number
  autoFocus?: boolean
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        required={required}
        minLength={minLength}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`${inputCls} pr-11`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        tabIndex={-1}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/35 transition-colors hover:text-accent"
      >
        {visible ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="2.6" />
            <path d="M4 4l16 16" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="2.6" />
          </svg>
        )}
      </button>
    </div>
  )
}

const STATUS_LABELS: Record<string, string> = {
  nouvelle: 'Nouvelle',
  en_preparation: 'En préparation',
  prete: 'Prête',
  terminee: 'Terminée',
  annulee: 'Annulée',
}
const STATUS_COLORS: Record<string, string> = {
  nouvelle: 'bg-[#b8912e]/15 text-[#8a5527] border-[#b8912e]/40',
  en_preparation: 'bg-blue-50 text-blue-700 border-blue-200',
  prete: 'bg-green-50 text-green-700 border-green-200',
  terminee: 'bg-ink/5 text-ink/50 border-ink/15',
  annulee: 'bg-red-50 text-red-600 border-red-200',
}

const PAYMENT_METHOD_LABELS: Record<string, string> = { cod: 'Espèces à la livraison', d17: 'D17' }
const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'À encaisser',
  pending_verification: 'D17 à vérifier',
  approved: 'D17 approuvé',
  rejected: 'D17 rejeté',
  paid: 'Encaissé',
}
const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  pending_verification: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-600 border-red-200',
  paid: 'bg-green-50 text-green-700 border-green-200',
}

type OrderItem = {
  kind?: 'product' | 'pack' | 'custom'
  productId?: number
  name: string
  weightKg: WeightKg
  qty: number
  unitPriceMillimes: number
  contents?: { name: string; weightKg: WeightKg }[]
}

function parseItems(json: string): OrderItem[] {
  try {
    return JSON.parse(json)
  } catch {
    return []
  }
}

function formatDate(d: Date | string) {
  const date = new Date(d)
  return date.toLocaleDateString('fr-TN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/* ------------------------------ Login ------------------------------ */

/** Demande d'envoi du lien de réinitialisation — réponse toujours identique
 * côté serveur que le compte existe ou non (voir requestPasswordReset côté
 * API), donc rien ici ne doit non plus laisser deviner si l'adresse existe. */
function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('')
  const request = trpc.admin.requestPasswordReset.useMutation()

  if (request.isSuccess) {
    return (
      <>
        <p className="mt-6 text-center text-sm leading-relaxed text-ink/70">
          Si un compte existe avec cette adresse, un e-mail contenant un lien de réinitialisation vient d'être envoyé.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-6 block w-full text-center text-xs text-ink/50 underline underline-offset-4 transition-colors hover:text-accent"
        >
          ← Retour à la connexion
        </button>
      </>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        request.mutate({ email })
      }}
    >
      <p className="mt-6 text-center text-sm text-ink/60">
        Indiquez votre adresse e-mail admin : nous vous enverrons un lien pour choisir un nouveau mot de passe.
      </p>
      <label className="mt-6 block text-[10px] font-medium uppercase tracking-[0.22em] text-ink/45">
        Adresse e-mail
      </label>
      <input
        type="email"
        required
        autoFocus
        autoComplete="username"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="contact@chezlaziz.com"
        className={`${inputCls} mt-2`}
      />
      <button
        type="submit"
        disabled={request.isPending}
        className="gold-cta mt-6 w-full rounded-full px-7 py-3.5 text-sm font-semibold uppercase tracking-[0.12em] text-white transition-transform duration-300 hover:scale-[1.02] disabled:opacity-50"
      >
        {request.isPending ? 'Envoi…' : 'Envoyer le lien'}
      </button>
      <button
        type="button"
        onClick={onBack}
        className="mt-6 block w-full text-center text-xs text-ink/50 underline underline-offset-4 transition-colors hover:text-accent"
      >
        ← Retour à la connexion
      </button>
    </form>
  )
}

/** Formulaire ouvert depuis le lien reçu par e-mail (?reset=<jeton>). */
function ResetPasswordForm({ token, onDone }: { token: string; onDone: () => void }) {
  const [password, setPassword] = useState('')
  const reset = trpc.admin.resetPassword.useMutation()

  if (reset.isSuccess) {
    return (
      <>
        <p className="mt-6 text-center text-sm text-ink/70">
          Mot de passe mis à jour. Vous pouvez maintenant vous connecter.
        </p>
        <button
          type="button"
          onClick={onDone}
          className="gold-cta mt-6 w-full rounded-full px-7 py-3.5 text-sm font-semibold uppercase tracking-[0.12em] text-white transition-transform duration-300 hover:scale-[1.02]"
        >
          Se connecter
        </button>
      </>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        reset.mutate({ token, newPassword: password })
      }}
    >
      <p className="mt-6 text-center text-sm text-ink/60">Choisissez un nouveau mot de passe.</p>
      <label className="mt-6 block text-[10px] font-medium uppercase tracking-[0.22em] text-ink/45">
        Nouveau mot de passe
      </label>
      <div className="mt-2">
        <PasswordField
          required
          minLength={6}
          autoFocus
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>
      {reset.isError && (
        <p className="mt-3 text-center text-sm text-red-600">{reset.error.message}</p>
      )}
      <button
        type="submit"
        disabled={reset.isPending}
        className="gold-cta mt-6 w-full rounded-full px-7 py-3.5 text-sm font-semibold uppercase tracking-[0.12em] text-white transition-transform duration-300 hover:scale-[1.02] disabled:opacity-50"
      >
        {reset.isPending ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </form>
  )
}

function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [forgot, setForgot] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const resetToken = searchParams.get('reset')
  const login = trpc.admin.login.useMutation({
    onSuccess: (token) => onLogin(token),
  })

  const clearResetToken = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('reset')
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-deep px-5 py-16">
      {/* Ambiance dorée + photo en fond très estompée, dans l'esprit éditorial du site */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'url(/images/hero.webp)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.1,
          filter: 'grayscale(0.3)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(640px circle at 50% 8%, rgba(184,145,46,0.22), transparent 60%), radial-gradient(520px circle at 90% 95%, rgba(184,145,46,0.12), transparent 60%)',
        }}
      />

      <div className="relative w-full max-w-sm animate-in fade-in zoom-in-95 rounded-2xl border border-white/10 bg-[#faf6f3] p-8 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.65)] duration-700 md:p-10">
        <img src="/images/logo.webp" alt="Chez Laziz" className="mx-auto h-14 w-14" />
        <p className="mt-4 text-center font-display text-2xl tracking-[0.14em] text-ink">
          CHEZ&nbsp;LAZIZ
        </p>
        <p className="mt-2 text-center text-[11px] font-medium uppercase tracking-[0.35em] text-accent">
          Espace admin
        </p>
        <Ornament className="mt-5 opacity-70" />

        {resetToken ? (
          <ResetPasswordForm token={resetToken} onDone={clearResetToken} />
        ) : forgot ? (
          <ForgotPasswordForm onBack={() => setForgot(false)} />
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              login.mutate({ email, password })
            }}
          >
            <label className="mt-6 block text-[10px] font-medium uppercase tracking-[0.22em] text-ink/45">
              Adresse e-mail
            </label>
            <input
              type="email"
              required
              autoFocus
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@chezlaziz.com"
              className={`${inputCls} mt-2`}
            />

            <label className="mt-4 block text-[10px] font-medium uppercase tracking-[0.22em] text-ink/45">
              Mot de passe
            </label>
            <div className="mt-2">
              <PasswordField
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            {login.isError && (
              <p className="mt-3 text-center text-sm text-red-600">
                {login.error.message || 'Mot de passe incorrect'}
              </p>
            )}
            <button
              type="submit"
              disabled={login.isPending}
              className="gold-cta mt-6 w-full rounded-full px-7 py-3.5 text-sm font-semibold uppercase tracking-[0.12em] text-white transition-transform duration-300 hover:scale-[1.02] disabled:opacity-50"
            >
              {login.isPending ? 'Connexion…' : 'Se connecter'}
            </button>
            <button
              type="button"
              onClick={() => setForgot(true)}
              className="mt-4 block w-full text-center text-xs text-ink/50 underline underline-offset-4 transition-colors hover:text-accent"
            >
              Mot de passe oublié ?
            </button>
            <Link
              to="/"
              className="mt-4 block text-center text-xs text-ink/50 underline underline-offset-4 transition-colors hover:text-accent"
            >
              ← Retour au site
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}

/* ------------------------------ Commandes ------------------------------ */

/** Preuve de paiement D17 : jamais une URL publique — récupérée via fetch
 * authentifié (Bearer token) et affichée depuis un blob local. */
function PaymentProofViewer({ token, proofKey }: { token: string; proofKey: string }) {
  const [open, setOpen] = useState(false)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const view = async () => {
    setOpen(true)
    setError(null)
    if (blobUrl) return
    try {
      const res = await fetch(`/api/admin/proofs/${proofKey}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Introuvable')
      const blob = await res.blob()
      setBlobUrl(URL.createObjectURL(blob))
    } catch {
      setError("Impossible de charger la capture d'écran.")
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={view}
        className="text-xs font-semibold uppercase tracking-wide text-accent underline underline-offset-4 hover:text-[#8a5527]"
      >
        Voir la capture D17
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={() => setOpen(false)}
        >
          <div className="max-h-[85vh] max-w-lg overflow-auto rounded-xl bg-white p-3" onClick={(e) => e.stopPropagation()}>
            {error && <p className="p-6 text-sm text-red-600">{error}</p>}
            {!error && !blobUrl && <p className="p-6 text-sm text-ink/50">Chargement…</p>}
            {blobUrl && <img src={blobUrl} alt="Preuve de paiement D17" className="max-w-full rounded-lg" />}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-2 w-full rounded-lg border border-sand py-2 text-xs font-semibold uppercase tracking-wide text-ink/60 hover:bg-sand/30"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function OrdersTab({
  token,
  statusFilter,
  onClearFilter,
}: {
  token: string
  statusFilter?: string | null
  onClearFilter?: () => void
}) {
  const utils = trpc.useUtils()
  // Les commandes arrivent pendant que le tableau de bord est ouvert :
  // sans rafraîchissement automatique, rien ne le signalait.
  const { data: orders, isLoading, isError } = trpc.orders.list.useQuery(
    { token },
    { refetchInterval: 30000, refetchOnWindowFocus: true },
  )
  // Un échec (réseau mobile faible, jeton expiré) était totalement
  // silencieux : le bouton semblait avoir marché. On affiche l'erreur.
  const [actionError, setActionError] = useState<string | null>(null)
  const onMutationError = (e: { message: string }) => setActionError(e.message)
  const setStatus = trpc.orders.setStatus.useMutation({
    onSuccess: () => { setActionError(null); utils.orders.list.invalidate() },
    onError: onMutationError,
  })
  const setPaymentStatus = trpc.orders.setPaymentStatus.useMutation({
    onSuccess: () => { setActionError(null); utils.orders.list.invalidate() },
    onError: onMutationError,
  })
  const removeOrder = trpc.orders.delete.useMutation({
    onSuccess: () => { setActionError(null); utils.orders.list.invalidate() },
    onError: onMutationError,
  })

  const [search, setSearch] = useState('')
  const [payFilter, setPayFilter] = useState<'all' | 'cod' | 'd17' | 'd17_pending' | 'to_collect'>('all')

  const query = search.trim().toLowerCase()
  const isToCollect = (o: { paymentMethod: string; paymentStatus: string; status: string }) =>
    // Argent pas encore rentré : espèces non encaissées, hors annulées.
    o.paymentMethod === 'cod' && o.paymentStatus !== 'paid' && o.status !== 'annulee'
  const isD17Pending = (o: { paymentMethod: string; paymentStatus: string }) =>
    o.paymentMethod === 'd17' && o.paymentStatus === 'pending_verification'

  // Deux niveaux, et pas un seul : les compteurs des boutons de paiement se
  // lisent sur `scoped` (statut + recherche), sinon activer « À encaisser »
  // recalculerait son propre compteur sur sa propre sélection et afficherait
  // toujours le total complet. La liste, elle, part de `filtered`.
  const scoped = (orders ?? []).filter((o) => {
    if (statusFilter && o.status !== statusFilter) return false
    if (query) {
      const hay = `#${o.id} ${o.customerName} ${o.phone} ${o.city} ${o.governorate} ${o.address}`.toLowerCase()
      if (!hay.includes(query)) return false
    }
    return true
  })
  const filtered = scoped.filter((o) => {
    if (payFilter === 'cod' && o.paymentMethod !== 'cod') return false
    if (payFilter === 'd17' && o.paymentMethod !== 'd17') return false
    if (payFilter === 'd17_pending' && !isD17Pending(o)) return false
    if (payFilter === 'to_collect' && !isToCollect(o)) return false
    return true
  })

  // Quelle ligne enregistre en ce moment. `isPending` seul est global à la
  // mutation : un clic sur « Encaissé » figeait les boutons de toutes les
  // commandes affichées, pas seulement celle-là.
  const savingPayment = setPaymentStatus.isPending
    ? (setPaymentStatus.variables as { id: number } | undefined)?.id
    : undefined

  const d17Pending = scoped.filter(isD17Pending).length
  const toCollect = scoped.filter(isToCollect)
  const toCollectMillimes = toCollect.reduce((s, o) => s + o.totalMillimes, 0)

  if (isLoading) return <p className="text-sm text-ink/50">Chargement…</p>
  // Sans ceci, une requête en échec tombait dans « Aucune commande pour
  // l'instant » plus bas : une panne réseau s'affichait comme un carnet vide.
  if (isError || !orders)
    return (
      <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
        <span>
          Impossible de charger les commandes.
          <br />
          <span className="text-red-600/80">
            Vérifiez votre connexion. Ceci ne signifie pas que vous n'avez aucune commande.
          </span>
        </span>
      </div>
    )

  return (
    <div className="space-y-4">
      {/* Recherche + filtre paiement : retrouver une commande par nom, téléphone
          ou numéro, et isoler les D17 qui attendent une vérification. */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher : nom, téléphone, n°, ville…"
          aria-label="Rechercher une commande"
          className={`${inputCls} sm:max-w-xs`}
        />
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ['all', 'Toutes'],
              ['cod', 'Espèces'],
              ['d17', 'D17'],
              ['d17_pending', `D17 à vérifier${d17Pending ? ` (${d17Pending})` : ''}`],
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
              } ${value === 'd17_pending' && d17Pending ? 'ring-1 ring-amber-300' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {actionError && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          <span className="flex-1">
            L'action n'a pas été enregistrée : {actionError}
            <br />
            <span className="text-red-600/80">Vérifiez votre connexion, puis réessayez. Si le problème persiste, reconnectez-vous.</span>
          </span>
          <button type="button" onClick={() => setActionError(null)} aria-label="Fermer" className="min-h-8 min-w-8 shrink-0 rounded-full text-lg leading-none text-red-500 hover:bg-red-100">
            ×
          </button>
        </div>
      )}

      {toCollect.length > 0 && (
        <button
          type="button"
          onClick={() => setPayFilter(payFilter === 'to_collect' ? 'all' : 'to_collect')}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left"
        >
          <span className="text-sm text-amber-800">
            Argent à encaisser · {toCollect.length} commande{toCollect.length > 1 ? 's' : ''} en espèces
          </span>
          <span className="font-display text-lg text-amber-900">{formatTND(toCollectMillimes)} DT</span>
        </button>
      )}

      {statusFilter && (
        <div className="flex items-center gap-3 rounded-xl border border-[#b8912e]/40 bg-[#b8912e]/10 px-5 py-3 text-sm">
          <span className="font-medium text-accent">
            Filtré : {STATUS_LABELS[statusFilter] ?? statusFilter}
          </span>
          <span className="text-ink/40">({filtered.length})</span>
          <button
            onClick={onClearFilter}
            className="ml-auto text-xs font-semibold uppercase tracking-wide text-ink/50 underline underline-offset-4 hover:text-ink"
          >
            Retirer le filtre
          </button>
        </div>
      )}

      {!filtered.length && (
        <p className="rounded-2xl border border-sand/70 bg-white shadow-sm p-8 text-center text-sm text-ink/50">
          {statusFilter || query || payFilter !== 'all'
            ? 'Aucune commande ne correspond à ce filtre.'
            : "Aucune commande pour l'instant."}
        </p>
      )}

      {filtered.map((o) => {
        const items = parseItems(o.items)
        return (
          <div key={o.id} className="rounded-2xl border border-sand/70 bg-white shadow-sm p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="font-display text-lg">#{o.id}</span>
                  <span className="font-medium">{o.customerName}</span>
                  <a href={`tel:${o.phone}`} className="text-sm text-accent underline underline-offset-2">
                    {o.phone}
                  </a>
                </div>
                <p className="mt-0.5 text-xs text-ink/45">{formatDate(o.createdAt)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${PAYMENT_STATUS_COLORS[o.paymentStatus]}`}
                >
                  {PAYMENT_METHOD_LABELS[o.paymentMethod]}
                  {o.paymentMethod === 'd17' ? ` · ${PAYMENT_STATUS_LABELS[o.paymentStatus]}` : ''}
                </span>
                <select
                  value={o.status}
                  onChange={(e) =>
                    setStatus.mutate({
                      token,
                      id: o.id,
                      status: e.target.value as typeof o.status,
                    })
                  }
                  className={`min-h-11 rounded-full border px-3 text-xs font-semibold uppercase tracking-wide outline-none ${STATUS_COLORS[o.status]}`}
                >
                  {Object.entries(STATUS_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="mt-3 border-t border-sand/60 pt-3 text-sm font-light text-ink/65">
              {o.address}, {o.city}{o.postalCode ? ` ${o.postalCode}` : ''}, {o.governorate}
            </p>

            <ul className="mt-4 space-y-1.5 border-t border-sand/60 pt-4 text-sm font-light">
              {items.map((it, i) => (
                <li key={i}>
                  <div className="flex items-baseline">
                    <span>
                      {it.qty} × {it.name} <span className="text-ink/40">({formatWeight(it.weightKg)})</span>
                    </span>
                    <span className="mx-3 flex-1 border-b border-dotted border-ink/15" />
                    <span className="font-display text-accent">{formatTND(it.qty * it.unitPriceMillimes)}</span>
                  </div>
                  {it.contents && it.contents.length > 0 && (
                    <ul className="mt-1 space-y-0.5 pl-4 text-xs text-ink/55">
                      {it.contents.map((c, j) => (
                        <li key={j}>
                          · {c.name} — {formatWeight(c.weightKg)}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
            {o.note && (
              <p className="mt-3 rounded-lg bg-[#f5ece5] px-4 py-2.5 text-sm font-light text-ink/70">
                « {o.note} »
              </p>
            )}

            {/* Espèces à la livraison : enregistrer l'encaissement. Sans ce
                bouton, une commande payée en liquide restait "à encaisser"
                pour toujours et l'admin n'avait aucune trace de l'argent
                réellement rentré. */}
            {o.paymentMethod === 'cod' && o.status !== 'annulee' && (
              <div
                className={`mt-4 flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 ${
                  o.paymentStatus === 'paid'
                    ? 'border-green-200 bg-green-50'
                    : 'border-amber-200 bg-amber-50'
                }`}
              >
                {o.paymentStatus === 'paid' ? (
                  <>
                    <span className="text-sm font-medium text-green-700">✓ Encaissé</span>
                    <button
                      type="button"
                      onClick={() => setPaymentStatus.mutate({ token, id: o.id, paymentStatus: 'pending' })}
                      disabled={savingPayment === o.id}
                      className="ml-auto min-h-11 rounded-full border border-ink/25 px-4 text-xs font-semibold uppercase tracking-wide text-ink/60 hover:border-ink/40 disabled:opacity-40"
                    >
                      Annuler l'encaissement
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-sm text-amber-800">
                      À encaisser : <strong className="font-display">{formatTND(o.totalMillimes)} DT</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setPaymentStatus.mutate({ token, id: o.id, paymentStatus: 'paid' })}
                      disabled={savingPayment === o.id}
                      className="ml-auto min-h-11 rounded-full bg-green-600 px-5 text-xs font-semibold uppercase tracking-wide text-white hover:bg-green-700 disabled:opacity-40"
                    >
                      {savingPayment === o.id ? 'Enregistrement…' : 'Encaissé ✓'}
                    </button>
                  </>
                )}
              </div>
            )}

            {o.paymentMethod === 'd17' && o.paymentProofKey && (
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <PaymentProofViewer token={token} proofKey={o.paymentProofKey} />
                {o.paymentStatus === 'pending_verification' && (
                  <>
                    <button
                      onClick={() => setPaymentStatus.mutate({ token, id: o.id, paymentStatus: 'approved' })}
                      className="ml-auto min-h-11 rounded-full bg-green-600 px-5 text-xs font-semibold uppercase tracking-wide text-white hover:bg-green-700"
                    >
                      Approuver
                    </button>
                    <button
                      onClick={() => setPaymentStatus.mutate({ token, id: o.id, paymentStatus: 'rejected' })}
                      className="min-h-11 rounded-full bg-red-500 px-5 text-xs font-semibold uppercase tracking-wide text-white hover:bg-red-600"
                    >
                      Rejeter
                    </button>
                  </>
                )}
              </div>
            )}

            <div className="mt-4 space-y-1 border-t border-sand/60 pt-3 text-sm font-light text-ink/50">
              <div className="flex items-baseline">
                <span>Sous-total</span>
                <span className="mx-3 flex-1" />
                <span>{formatTND(o.subtotalMillimes)} DT</span>
              </div>
              <div className="flex items-baseline">
                <span>Livraison</span>
                <span className="mx-3 flex-1" />
                <span>{formatTND(o.deliveryFeeMillimes)} DT</span>
              </div>
            </div>
            <div className="mt-2 flex items-baseline">
              <span className="text-xs uppercase tracking-[0.2em] text-ink/50">Total</span>
              <span className="mx-3 flex-1" />
              <span className="font-display text-xl text-accent">{formatTND(o.totalMillimes)} DT</span>
              <button
                onClick={() => {
                  if (window.confirm(`Supprimer la commande #${o.id} ?`)) {
                    removeOrder.mutate({ token, id: o.id })
                  }
                }}
                className="ml-4 text-xs font-semibold uppercase tracking-wide text-red-500 underline underline-offset-4 hover:text-red-600"
              >
                Supprimer
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------ Produits ------------------------------ */

type ProductForm = {
  name: string
  description: string
  nameAr: string
  descriptionAr: string
  priceTND: string
  /** Coût de revient au kilo, en dinars. Vide = coût inconnu, ce qui n'est
   * pas la même chose que 0 : voir la note sous le champ. */
  costTND: string
  category: string
  badge: string
  imageUrl: string
  available: boolean
  isExclusiveCreation: boolean
}

const EMPTY_FORM: ProductForm = {
  name: '',
  description: '',
  nameAr: '',
  descriptionAr: '',
  priceTND: '',
  costTND: '',
  category: 'Les classiques',
  badge: '',
  imageUrl: '',
  available: true,
  isExclusiveCreation: false,
}

function ProductsTab({ token }: { token: string }) {
  const utils = trpc.useUtils()
  const { data: products, isLoading, isError } = trpc.products.listAll.useQuery({ token })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM)
  const [showForm, setShowForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const uploadImage = async (file: File) => {
    setUploading(true)
    setUploadError(null)
    try {
      const body = new FormData()
      body.append('file', file)
      const res = await fetch('/api/uploads', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Échec de l'envoi")
      setForm((f) => ({ ...f, imageUrl: data.url }))
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Échec de l'envoi")
    } finally {
      setUploading(false)
    }
  }

  const invalidate = () => {
    utils.products.listAll.invalidate()
    utils.products.list.invalidate()
  }
  const [saveError, setSaveError] = useState<string | null>(null)
  const onSaved = () => { setSaveError(null); invalidate() }
  const onSaveError = (e: { message: string }) => setSaveError(e.message)
  const create = trpc.products.create.useMutation({ onSuccess: onSaved, onError: onSaveError })
  const update = trpc.products.update.useMutation({ onSuccess: onSaved, onError: onSaveError })
  const remove = trpc.products.delete.useMutation({ onSuccess: onSaved, onError: onSaveError })

  /** Échange l'ordre d'affichage entre le produit à `index` et son voisin
   * (`direction` -1 = monter, +1 = descendre). Normalise au passage tous les
   * `sortOrder` de la liste affichée (souvent tous à 0 par défaut) pour que
   * le geste ait toujours un effet visible, même la toute première fois. */
  // Réordonner écrit un rang absolu par produit : l'ordre d'arrivée des
  // réponses n'a donc pas d'importance. Ce qui en avait, c'est qu'un envoi
  // échoué au milieu laissait la liste à moitié renumérotée, sans un mot —
  // on attend l'ensemble et on signale l'échec.
  const [reordering, setReordering] = useState(false)
  const moveProduct = async (index: number, direction: -1 | 1) => {
    const list = products ?? []
    const swapIndex = index + direction
    if (swapIndex < 0 || swapIndex >= list.length || reordering) return
    const writes = list
      .map((p, i) => ({
        p,
        desired: i === index ? swapIndex : i === swapIndex ? index : i,
      }))
      .filter(({ p, desired }) => p.sortOrder !== desired)
    if (writes.length === 0) return

    setReordering(true)
    try {
      await Promise.all(
        writes.map(({ p, desired }) =>
          update.mutateAsync({ token, id: p.id, data: { sortOrder: desired } }),
        ),
      )
    } catch {
      // Le message précis est déjà posé par onError de la mutation.
    } finally {
      setReordering(false)
      utils.products.listAll.invalidate()
    }
  }

  const toMillimes = (tnd: string) => Math.round(parseFloat(tnd.replace(',', '.')) * 1000)

  const startEdit = (p: NonNullable<typeof products>[number]) => {
    setEditingId(p.id)
    setForm({
      name: p.name,
      description: p.description ?? '',
      nameAr: p.nameAr ?? '',
      descriptionAr: p.descriptionAr ?? '',
      priceTND: formatTND(p.priceMillimes),
      costTND: p.costPerKgMillimes === null ? '' : formatTND(p.costPerKgMillimes),
      category: p.category,
      badge: p.badge ?? '',
      imageUrl: p.imageUrl ?? '',
      available: p.available,
      isExclusiveCreation: p.isExclusiveCreation,
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const data = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      nameAr: form.nameAr.trim() || null,
      descriptionAr: form.descriptionAr.trim() || null,
      priceMillimes: toMillimes(form.priceTND),
      // Champ vide → null (coût inconnu), jamais 0 : un coût nul afficherait
      // 100 % de marge et hisserait le produit en tête de la rentabilité.
      costPerKgMillimes: form.costTND.trim() === '' ? null : toMillimes(form.costTND),
      category: form.category.trim() || 'Les classiques',
      badge: form.badge.trim() || null,
      imageUrl: form.imageUrl.trim() || null,
      available: form.available,
      isExclusiveCreation: form.isExclusiveCreation,
    }
    if (Number.isNaN(data.priceMillimes)) {
      setSaveError('Le prix de vente doit être un nombre, par exemple 8 ou 8,5.')
      return
    }
    if (data.costPerKgMillimes !== null && Number.isNaN(data.costPerKgMillimes)) {
      setSaveError('Le coût de revient doit être un nombre, par exemple 4 ou 4,5. Laissez le champ vide s\'il est inconnu.')
      return
    }
    if (editingId) {
      update.mutate({ token, id: editingId, data }, { onSuccess: () => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM) } })
    } else {
      create.mutate({ token, data }, { onSuccess: () => { setShowForm(false); setForm(EMPTY_FORM) } })
    }
  }

  const saving = create.isPending || update.isPending
  const savingProduct = update.isPending
    ? (update.variables as { id: number } | undefined)?.id
    : undefined

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-ink/55">
          {products
            ? `${products.length} produit${products.length > 1 ? 's' : ''} — les modifications s'affichent immédiatement sur le site.`
            : isError
              ? 'Catalogue non chargé.'
              : 'Chargement du catalogue…'}
        </p>
        <button
          onClick={() => {
            setEditingId(null)
            setForm(EMPTY_FORM)
            setShowForm(true)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          className="shrink-0 gold-cta rounded-full px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-white transition-transform hover:scale-[1.03]"
        >
          + Ajouter
        </button>
      </div>

      {saveError && !showForm && (
        <p className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700" role="alert">
          Enregistrement impossible : {saveError}
        </p>
      )}

      {showForm && (
        <form onSubmit={submit} className="mb-8 space-y-4 rounded-xl border border-[#b8912e]/50 bg-[#f5ece5] p-6">
          <p className="font-display text-xl">{editingId ? 'Modifier le produit' : 'Nouveau produit'}</p>
          {saveError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700" role="alert">
              Enregistrement impossible : {saveError}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nom du produit" className={inputCls} />
            <input required value={form.priceTND} onChange={(e) => setForm({ ...form, priceTND: e.target.value })} placeholder="Prix de vente au kilo (ex : 8 ou 8,5)" inputMode="decimal" className={inputCls} />
          </div>

          <div>
            <input
              value={form.costTND}
              onChange={(e) => setForm({ ...form, costTND: e.target.value })}
              placeholder="Coût de revient au kilo, en dinars (facultatif)"
              inputMode="decimal"
              className={inputCls}
            />
            <p className="mt-1.5 text-xs leading-relaxed text-ink/50">
              Ce que vous coûte un kilo de ce produit : matières premières et fabrication. Sert à
              calculer la marge dans « Rentabilité ». Laissez vide si vous ne le savez pas — le
              produit sera alors exclu du calcul et signalé, jamais compté comme gratuit.
            </p>
          </div>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description (facultative)" rows={2} className={`${inputCls} resize-none`} />

          <div className="rounded-lg border border-[#b8912e]/30 bg-white/60 p-4">
            <p className="mb-3 text-xs font-semibold text-ink/70">
              Version arabe <span className="font-normal text-ink/50">— laissez vide pour afficher le texte français sur le site arabe</span>
            </p>
            <div className="space-y-3">
              <input
                value={form.nameAr}
                onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                placeholder="اسم المنتج بالعربية"
                dir="rtl"
                lang="ar"
                className={inputCls}
              />
              <textarea
                value={form.descriptionAr}
                onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })}
                placeholder="وصف المنتج بالعربية (اختياري)"
                dir="rtl"
                lang="ar"
                rows={2}
                className={`${inputCls} resize-none`}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-sand bg-white">
              {form.imageUrl ? (
                <img src={form.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-[10px] text-ink/30">Aucune photo</span>
              )}
            </div>
            <div className="flex-1 min-w-[220px] space-y-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-ink/25 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink transition-colors hover:border-[#b8912e] hover:text-accent">
                {uploading ? 'Envoi…' : '📷 Choisir une photo'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) uploadImage(file)
                    e.target.value = ''
                  }}
                  className="hidden"
                />
              </label>
              <input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="ou collez un lien d'image" className={`${inputCls} text-xs`} />
              {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls}>
              <option>Les classiques</option>
              <option>Les signatures</option>
              <option>Les nouveautés</option>
            </select>
            <input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} placeholder="Badge (ex : Nouveau)" className={inputCls} />
            <label className="flex items-center gap-3 text-sm text-ink/70">
              <input type="checkbox" checked={form.available} onChange={(e) => setForm({ ...form, available: e.target.checked })} className="h-4 w-4 accent-[#b8912e]" />
              Visible sur le site
            </label>
          </div>
          {/* Marque un nom/recette inventé par Chez Laziz (pas une variante
              d'un produit déjà existant sur le marché) — affiche un ™ à côté
              du nom sur le site pour documenter publiquement l'antériorité
              d'usage de ce nom. Ce n'est PAS un dépôt officiel de marque :
              ça ne remplace pas un enregistrement réel à l'INNORPI, mais ça
              constitue une preuve de date de première utilisation. */}
          <label className="flex items-start gap-3 rounded-lg border border-[#b8912e]/30 bg-white/60 p-4 text-sm text-ink/70">
            <input
              type="checkbox"
              checked={form.isExclusiveCreation}
              onChange={(e) => setForm({ ...form, isExclusiveCreation: e.target.checked })}
              className="mt-0.5 h-4 w-4 accent-[#b8912e]"
            />
            <span>
              <span className="font-medium text-ink">Création exclusive Chez Laziz (™)</span>
              <br />
              <span className="text-xs text-ink/50">
                À cocher seulement pour un nom/recette entièrement inventé par nous, absent du marché.
                Affiche « ™ » à côté du nom sur le site — sert de preuve de date de première utilisation,
                pas un dépôt officiel de marque (à faire séparément auprès de l'INNORPI si besoin).
              </span>
            </span>
          </label>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="rounded-full bg-ink px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#faf6f3] disabled:opacity-50">
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null) }} className="rounded-full border border-ink/25 px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-ink">
              Annuler
            </button>
          </div>
        </form>
      )}

      {isLoading && <p className="text-sm text-ink/50">Chargement…</p>}
      {isError && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          Impossible de charger le catalogue. Vérifiez votre connexion — ceci ne signifie pas que
          vos produits ont disparu.
        </p>
      )}
      {products && products.length === 0 && (
        <p className="rounded-2xl border border-sand/70 bg-white p-8 text-center text-sm text-ink/50">
          Aucun produit pour l'instant. Utilisez « + Ajouter » pour créer le premier.
        </p>
      )}
      <div className="space-y-3">
        {(products ?? []).map((p, index) => (
          <div key={p.id} className="flex flex-col gap-3 rounded-2xl border border-sand/70 bg-white shadow-sm p-4 sm:flex-row sm:items-center sm:gap-4 md:p-5">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              {/* Ordre d'affichage sur le site (catalogue, sélecteurs de commande) —
                  sinon seule une modification directe en base pouvait le changer. */}
              <div className="flex shrink-0 flex-col gap-1">
                <button
                  type="button"
                  onClick={() => moveProduct(index, -1)}
                  disabled={index === 0 || reordering}
                  aria-label="Monter"
                  className="flex h-6 w-6 items-center justify-center rounded border border-ink/20 text-ink/60 transition-colors hover:border-[#b8912e] hover:text-accent disabled:opacity-25"
                >
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 8l4-4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <button
                  type="button"
                  onClick={() => moveProduct(index, 1)}
                  disabled={index === (products?.length ?? 0) - 1 || reordering}
                  aria-label="Descendre"
                  className="flex h-6 w-6 items-center justify-center rounded border border-ink/20 text-ink/60 transition-colors hover:border-[#b8912e] hover:text-accent disabled:opacity-25"
                >
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-sand bg-[#faf6f3]">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[9px] text-ink/30">Sans photo</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{p.name}</span>
                  {p.isExclusiveCreation && (
                    <span className="rounded-full border border-[#b8912e] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-accent" title="Nom/recette exclusif Chez Laziz — affiché avec ™ sur le site">
                      ™ Exclusif
                    </span>
                  )}
                  {p.badge && (
                    <span className="rounded-full border border-[#b8912e] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-accent">
                      {p.badge}
                    </span>
                  )}
                  {!p.available && (
                    <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-ink/50">
                      Masqué
                    </span>
                  )}
                </div>
                {p.nameAr ? (
                  <p className="mt-0.5 text-xs text-ink/55" dir="rtl" lang="ar">{p.nameAr}</p>
                ) : (
                  <p className="mt-0.5 text-[11px] font-medium text-amber-700">Pas encore traduit en arabe</p>
                )}
                <p className="mt-0.5 text-xs text-ink/45">
                  {p.category} · <span className="font-display text-accent">{formatTND(p.priceMillimes)} DT</span>
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {/* Rupture de stock : un seul geste. Il fallait auparavant
                  ouvrir le formulaire, décocher "Visible", puis enregistrer. */}
              <button
                onClick={() => update.mutate({ token, id: p.id, data: { available: !p.available } })}
                disabled={savingProduct === p.id}
                aria-pressed={!p.available}
                className={`min-h-11 rounded-full border px-4 text-xs font-semibold uppercase tracking-wide transition-colors disabled:opacity-40 ${
                  p.available
                    ? 'border-ink/25 text-ink/70 hover:border-amber-400 hover:text-amber-700'
                    : 'border-amber-300 bg-amber-50 text-amber-800'
                }`}
              >
                {p.available ? 'Rupture' : 'Remettre en ligne'}
              </button>
              {/* Bascule rapide du ™ (nom exclusif Chez Laziz) — même geste
                  en un clic que la rupture de stock, sans ouvrir le formulaire. */}
              <button
                onClick={() => update.mutate({ token, id: p.id, data: { isExclusiveCreation: !p.isExclusiveCreation } })}
                disabled={savingProduct === p.id}
                aria-pressed={p.isExclusiveCreation}
                title="Nom/recette inventé par nous, absent du marché — affiche ™ à côté du nom sur le site"
                className={`min-h-11 rounded-full border px-4 text-xs font-semibold uppercase tracking-wide transition-colors disabled:opacity-40 ${
                  p.isExclusiveCreation
                    ? 'border-[#b8912e] bg-[#f5ece5] text-accent'
                    : 'border-ink/25 text-ink/70 hover:border-[#b8912e] hover:text-accent'
                }`}
              >
                {p.isExclusiveCreation ? '™ Exclusif' : 'Marquer ™ Exclusif'}
              </button>
              <button onClick={() => startEdit(p)} className="min-h-11 rounded-full border border-ink/25 px-4 text-xs font-semibold uppercase tracking-wide text-ink transition-colors hover:border-[#b8912e] hover:text-accent">
                Modifier
              </button>
              <button
                onClick={() => {
                  if (window.confirm(`Supprimer « ${p.name} » ?`)) remove.mutate({ token, id: p.id })
                }}
                className="min-h-11 rounded-full border border-red-200 px-4 text-xs font-semibold uppercase tracking-wide text-red-600 transition-colors hover:bg-red-50"
              >
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------ Messages ------------------------------ */

function MessagesTab({ token }: { token: string }) {
  const utils = trpc.useUtils()
  const { data: messages, isLoading, isError } = trpc.contact.list.useQuery({ token })
  const [markError, setMarkError] = useState<string | null>(null)
  const markRead = trpc.contact.markRead.useMutation({
    onSuccess: () => { setMarkError(null); utils.contact.list.invalidate() },
    onError: (e) => setMarkError(e.message),
  })

  if (isLoading) return <p className="text-sm text-ink/50">Chargement…</p>
  if (isError)
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
        Impossible de charger les messages. Vérifiez votre connexion — ceci ne signifie pas que
        votre boîte est vide.
      </p>
    )
  if (!messages?.length)
    return (
      <p className="rounded-2xl border border-sand/70 bg-white shadow-sm p-8 text-center text-sm text-ink/50">
        Aucun message pour l'instant.
      </p>
    )

  return (
    <div className="space-y-3">
      {markError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700" role="alert">
          Le message n'a pas pu être marqué : {markError}
        </p>
      )}
      {messages.map((m) => (
        <div
          key={m.id}
          className={`rounded-xl border p-5 ${m.isRead ? 'border-sand bg-white opacity-70' : 'border-[#b8912e]/50 bg-[#f5ece5]'}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="font-medium">{m.name}</span>
              {m.phone && (
                <a href={`tel:${m.phone}`} className="ml-3 text-sm text-accent underline underline-offset-2">
                  {m.phone}
                </a>
              )}
              <p className="mt-0.5 text-xs text-ink/45">{formatDate(m.createdAt)}</p>
            </div>
            <button
              onClick={() => markRead.mutate({ token, id: m.id, isRead: !m.isRead })}
              className="rounded-full border border-ink/25 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink transition-colors hover:border-[#b8912e] hover:text-accent"
            >
              {m.isRead ? 'Marquer non lu' : 'Marquer lu'}
            </button>
          </div>
          <p className="mt-3 text-[15px] font-light leading-relaxed text-ink/80">{m.message}</p>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------ Paramètres ------------------------------ */

function ChangeEmailCard({ token }: { token: string }) {
  const utils = trpc.useUtils()
  const { data: me } = trpc.admin.me.useQuery({ token })
  const [currentPassword, setCurrentPassword] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const change = trpc.admin.changeEmail.useMutation()
  const [done, setDone] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    change.mutate(
      { token, currentPassword, newEmail },
      {
        onSuccess: () => {
          setDone(true)
          setCurrentPassword('')
          setNewEmail('')
          utils.admin.me.invalidate()
        },
      },
    )
  }

  return (
    <form onSubmit={submit} className="max-w-md space-y-4 rounded-2xl border border-sand/70 bg-white shadow-sm p-6 md:p-8">
      <p className="font-display text-xl">Changer l'adresse de connexion</p>
      {me && (
        <p className="text-xs text-ink/45">
          Adresse actuelle : <span className="font-medium text-ink/70">{me.email}</span>
        </p>
      )}
      <input type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Nouvelle adresse e-mail" className={inputCls} />
      <PasswordField required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Mot de passe actuel (confirmation)" />
      {change.isError && (
        <p className="text-sm text-red-600">{change.error.message || 'Erreur'}</p>
      )}
      {done && <p className="text-sm text-green-700">Adresse modifiée ✓</p>}
      <button
        type="submit"
        disabled={change.isPending || !newEmail || !currentPassword}
        className="rounded-full bg-ink px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#faf6f3] disabled:opacity-40"
      >
        {change.isPending ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </form>
  )
}

function ChangePasswordCard({ token }: { token: string }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const change = trpc.admin.changePassword.useMutation()
  const [done, setDone] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (next !== confirm) return
    change.mutate(
      { token, currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          setDone(true)
          setCurrent('')
          setNext('')
          setConfirm('')
        },
      },
    )
  }

  return (
    <form onSubmit={submit} className="max-w-md space-y-4 rounded-2xl border border-sand/70 bg-white shadow-sm p-6 md:p-8">
      <p className="font-display text-xl">Changer le mot de passe</p>
      <PasswordField required value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Mot de passe actuel" />
      <PasswordField required minLength={6} value={next} onChange={(e) => setNext(e.target.value)} placeholder="Nouveau mot de passe (min. 6 caractères)" />
      <PasswordField required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirmer le nouveau mot de passe" />
      {next && confirm && next !== confirm && (
        <p className="text-sm text-red-600">Les deux mots de passe ne correspondent pas.</p>
      )}
      {change.isError && (
        <p className="text-sm text-red-600">{change.error.message || 'Erreur'}</p>
      )}
      {done && <p className="text-sm text-green-700">Mot de passe modifié ✓</p>}
      <button
        type="submit"
        disabled={change.isPending || next !== confirm || !next}
        className="rounded-full bg-ink px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#faf6f3] disabled:opacity-40"
      >
        {change.isPending ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </form>
  )
}

function UsersCard({ token }: { token: string }) {
  const utils = trpc.useUtils()
  const { data: me } = trpc.admin.me.useQuery({ token })
  const { data: users, isLoading } = trpc.admin.listUsers.useQuery({ token })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showForm, setShowForm] = useState(false)

  const addUser = trpc.admin.addUser.useMutation({
    onSuccess: () => {
      utils.admin.listUsers.invalidate()
      setEmail('')
      setPassword('')
      setShowForm(false)
    },
  })
  const removeUser = trpc.admin.removeUser.useMutation({
    onSuccess: () => utils.admin.listUsers.invalidate(),
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    addUser.mutate({ token, email, password })
  }

  return (
    <div className="w-full max-w-2xl rounded-2xl border border-sand/70 bg-white shadow-sm p-6 md:p-8">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-display text-xl">Comptes admin</p>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-full border border-ink/25 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink transition-colors hover:border-[#b8912e] hover:text-accent"
        >
          {showForm ? 'Annuler' : '+ Ajouter un accès'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="mb-5 space-y-3 rounded-xl border border-[#b8912e]/40 bg-[#f5ece5] p-4">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Adresse e-mail" className={inputCls} />
          <PasswordField required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe (min. 6 caractères)" />
          {addUser.isError && <p className="text-sm text-red-600">{addUser.error.message || 'Erreur'}</p>}
          <button type="submit" disabled={addUser.isPending} className="gold-cta rounded-full px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-white disabled:opacity-50">
            {addUser.isPending ? 'Ajout…' : 'Créer le compte'}
          </button>
        </form>
      )}

      {isLoading && <p className="text-sm text-ink/50">Chargement…</p>}
      <ul className="divide-y divide-sand/60">
        {(users ?? []).map((u) => (
          <li key={u.id} className="flex items-center justify-between gap-3 py-3">
            <div>
              <p className="text-sm font-medium text-ink">
                {u.email}
                {me?.email === u.email && <span className="ml-2 text-[10px] uppercase tracking-wide text-accent">(vous)</span>}
              </p>
              <p className="text-xs text-ink/40">
                Depuis le {new Date(u.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            {me?.email !== u.email && (users?.length ?? 0) > 1 && (
              <button
                onClick={() => {
                  if (window.confirm(`Retirer l'accès de ${u.email} ?`)) removeUser.mutate({ token, id: u.id })
                }}
                className="text-xs font-semibold uppercase tracking-wide text-red-500 underline underline-offset-4 hover:text-red-600"
              >
                Retirer
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function ExportCard({ token }: { token: string }) {
  const [downloading, setDownloading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const download = async (kind: 'json' | 'csv') => {
    setDownloading(kind)
    setError(null)
    const date = new Date().toISOString().slice(0, 10)
    const path = kind === 'csv' ? '/api/admin/export/orders.csv' : '/api/admin/export'
    const filename =
      kind === 'csv' ? `chez-laziz-commandes-${date}.csv` : `chez-laziz-export-${date}.json`
    try {
      const res = await fetch(path, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error("Échec de l'export")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'export")
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="w-full rounded-2xl border border-sand/70 bg-white p-6 shadow-sm md:p-8">
      <p className="font-display text-xl">Exporter vos données</p>
      <p className="mt-2 text-sm font-light text-ink/60">
        Le fichier Excel liste vos commandes ligne par ligne, prix en dinars — c'est celui
        à donner à votre comptable. La sauvegarde complète, elle, contient tout (produits,
        commandes, messages, galerie, statistiques) et sert à ne rien perdre.
      </p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={() => download('csv')}
          disabled={downloading !== null}
          className="min-h-11 rounded-full bg-ink px-6 text-xs font-semibold uppercase tracking-wide text-[#faf6f3] transition-colors hover:bg-ink-deep disabled:opacity-50"
        >
          {downloading === 'csv' ? 'Préparation…' : 'Commandes (Excel)'}
        </button>
        <button
          onClick={() => download('json')}
          disabled={downloading !== null}
          className="min-h-11 rounded-full border border-ink/25 px-6 text-xs font-semibold uppercase tracking-wide text-ink transition-colors hover:border-[#b8912e] hover:text-accent disabled:opacity-50"
        >
          {downloading === 'json' ? 'Préparation…' : 'Sauvegarde complète'}
        </button>
      </div>
    </div>
  )
}

function SettingsTab({ token }: { token: string }) {
  return (
    <div className="flex flex-wrap gap-6">
      <ChangeEmailCard token={token} />
      <ChangePasswordCard token={token} />
      <UsersCard token={token} />
      <ExportCard token={token} />
    </div>
  )
}


/* ------------------------------ Marketing ------------------------------ */

type NetworkKey = 'instagram' | 'facebook' | 'tiktok' | 'google'

const NETWORKS: {
  key: NetworkKey
  label: string
  color: string
  handle: string
  url: string
  icon: React.ReactNode
}[] = [
  {
    key: 'instagram',
    label: 'Instagram',
    color: '#E1306C',
    handle: '@chezlaziz',
    url: 'https://www.instagram.com/chezlaziz',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    key: 'facebook',
    label: 'Facebook',
    color: '#1877F2',
    handle: 'Chez Laziz',
    url: 'https://www.facebook.com/profile.php?id=61573444418563',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.5 1.6-1.5H16V4.9c-.5-.1-1.4-.1-2.2-.1-2.2 0-3.8 1.4-3.8 3.9V11H7.5v3H10v7h3.5Z" />
      </svg>
    ),
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    color: '#111111',
    handle: 'Recherche TikTok',
    url: 'https://www.tiktok.com/search?q=chez%20laziz%20kairouan',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16.6 3c.4 2.3 1.9 3.8 4.4 4v3.1c-1.6 0-3-.5-4.4-1.4v6.4c0 3.5-2.6 5.9-5.9 5.9A5.7 5.7 0 0 1 5 15.2c0-3.4 2.8-5.9 6.3-5.7v3.2c-1.7-.3-3.1.7-3.1 2.4 0 1.5 1.1 2.6 2.6 2.6 1.7 0 2.7-1.2 2.7-3V3h3.1Z" />
      </svg>
    ),
  },
  {
    key: 'google',
    label: 'Google',
    color: '#4285F4',
    handle: 'Recherche Google Maps',
    url: 'https://www.google.com/maps/search/Chez+laziz+Kairouan',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2l-6.1 3.4 1.4-6.8L2.2 9.1l6.9-.8L12 2Z" />
      </svg>
    ),
  },
]

function NetworkCard({ net, token }: { net: (typeof NETWORKS)[number]; token: string }) {
  const utils = trpc.useUtils()
  const { data: history, isLoading, isError } = trpc.social.history.useQuery({
    token,
    network: net.key,
  })
  const [recordError, setRecordError] = useState<string | null>(null)
  const record = trpc.social.record.useMutation({
    onSuccess: () => {
      setRecordError(null)
      utils.social.latest.invalidate()
      utils.social.history.invalidate()
    },
    onError: (e) => setRecordError(e.message),
  })

  const [followers, setFollowers] = useState('')
  const [messages, setMessages] = useState('')
  const [editing, setEditing] = useState(false)

  const latest = history && history.length ? history[history.length - 1] : null
  const prev = history && history.length > 1 ? history[history.length - 2] : null
  const diff = latest && prev ? latest.followers - prev.followers : null

  const chartData = (history ?? []).map((h) => ({
    at: new Date(h.createdAt).getTime(),
    followers: h.followers,
  }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const f = parseInt(followers, 10)
    const m = parseInt(messages || '0', 10)
    if (Number.isNaN(f)) {
      setRecordError("Le nombre d'abonnés doit être un nombre entier.")
      return
    }
    record.mutate(
      { token, network: net.key, followers: f, messages: Number.isNaN(m) ? 0 : m },
      { onSuccess: () => { setEditing(false); setFollowers(''); setMessages('') } },
    )
  }

  return (
    <div className="rounded-2xl border border-sand/70 bg-white shadow-sm p-5 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="flex h-11 w-11 items-center justify-center rounded-full"
            style={{ color: net.color, backgroundColor: net.color + '14' }}
          >
            {net.icon}
          </span>
          <div>
            <p className="font-medium">{net.label}</p>
            <a href={net.url} target="_blank" rel="noreferrer" className="text-xs text-accent underline underline-offset-2">
              {net.handle}
            </a>
          </div>
        </div>
        <div className="text-right">
          <p className="font-display text-3xl text-ink">
            {isLoading ? (
              <span className="inline-block h-7 w-16 animate-pulse rounded bg-ink/[0.07] align-middle" />
            ) : latest ? (
              latest.followers.toLocaleString('fr-FR')
            ) : (
              '—'
            )}
          </p>
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-ink/45">
            {isError ? 'non chargé' : isLoading ? 'chargement…' : !latest ? 'aucun relevé' : 'abonnés'}
          </p>
          {diff !== null && diff !== 0 && (
            <p className={`mt-1 text-xs font-semibold ${diff > 0 ? 'text-green-600' : 'text-red-500'}`}>
              {diff > 0 ? '+' : ''}{diff} depuis le dernier relevé
            </p>
          )}
        </div>
      </div>

      {recordError && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
          {recordError}
        </p>
      )}

      {latest && (
        <p className="mt-3 text-xs font-light text-ink/50">
          💬 {latest.messages} message{latest.messages > 1 ? 's' : ''} reçu{latest.messages > 1 ? 's' : ''}
          {' · '}relevé du {new Date(latest.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </p>
      )}

      {chartData.length > 1 && (
        <div className="mt-4 h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              {/* Échelle de TEMPS et non catégorielle : deux relevés espacés
                  d'un mois ne doivent pas s'afficher côte à côte comme deux
                  relevés du même jour. */}
              <XAxis
                dataKey="at"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(t: number) => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                tick={{ fontSize: 10, fill: '#3c3835' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis domain={['dataMin - 5', 'dataMax + 5']} tick={{ fontSize: 10, fill: '#3c3835' }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v) => [String(v), 'Abonnés']}
                labelFormatter={(l) => new Date(Number(l)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              />
              <Line type="monotone" dataKey="followers" stroke={net.color} strokeWidth={2} dot={{ r: 3, fill: net.color }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {editing ? (
        <form onSubmit={submit} className="mt-4 flex flex-wrap items-end gap-3 border-t border-sand/60 pt-4">
          <div className="flex-1 min-w-[120px]">
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-[0.18em] text-ink/50">Abonnés</label>
            <input required value={followers} onChange={(e) => setFollowers(e.target.value)} placeholder={latest ? String(latest.followers) : 'ex : 1250'} inputMode="numeric" className={inputCls} />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-[0.18em] text-ink/50">Messages reçus</label>
            <input value={messages} onChange={(e) => setMessages(e.target.value)} placeholder="0" inputMode="numeric" className={inputCls} />
          </div>
          <button type="submit" disabled={record.isPending} className="gold-cta rounded-full px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-white disabled:opacity-50">
            {record.isPending ? '…' : 'Enregistrer'}
          </button>
          <button type="button" onClick={() => setEditing(false)} className="rounded-full border border-ink/25 px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink">
            Annuler
          </button>
        </form>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="mt-4 w-full rounded-full border border-[#b8912e] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-accent transition-colors hover:bg-[#b8912e] hover:text-white"
        >
          Mettre à jour les chiffres
        </button>
      )}
    </div>
  )
}

function MarketingTab({ token }: { token: string }) {
  return (
    <div>
      <p className="mb-6 text-sm font-light text-ink/60">
        Ouvre chaque réseau, note le nombre d'abonnés et de messages, puis clique sur
        « Mettre à jour » — le site garde l'historique et trace l'évolution. 30 secondes par réseau.
      </p>

      <div className="grid gap-5 md:grid-cols-2">
        {NETWORKS.map((net) => (
          <NetworkCard key={net.key} net={net} token={token} />
        ))}
      </div>
    </div>
  )
}

/* ------------------------------ Contenu (galerie + pied de page) ------------------------------ */

function GalleryManager({ token }: { token: string }) {
  const utils = trpc.useUtils()
  const { data: photos, isLoading } = trpc.gallery.list.useQuery()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addPhoto = trpc.gallery.add.useMutation({
    onSuccess: () => utils.gallery.list.invalidate(),
  })
  const removePhoto = trpc.gallery.delete.useMutation({
    onSuccess: () => utils.gallery.list.invalidate(),
  })

  const uploadAndAdd = async (file: File) => {
    setUploading(true)
    setError(null)
    try {
      const body = new FormData()
      body.append('file', file)
      body.append('folder', 'gallery')
      const res = await fetch('/api/uploads', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Échec de l'envoi")
      addPhoto.mutate({ token, imageUrl: data.url, alt: '' })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'envoi")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-sand/70 bg-white shadow-sm p-6 md:p-8">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-display text-xl">Photos de la galerie</p>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-ink/25 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink transition-colors hover:border-[#b8912e] hover:text-accent">
          {uploading ? 'Envoi…' : '+ Ajouter une photo'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) uploadAndAdd(file)
              e.target.value = ''
            }}
            className="hidden"
          />
        </label>
      </div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {isLoading && <p className="text-sm text-ink/50">Chargement…</p>}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {(photos ?? []).map((p) => (
          <div key={p.id} className="group relative aspect-square overflow-hidden rounded-xl border border-sand">
            <img src={p.imageUrl} alt={p.alt} className="h-full w-full object-cover" />
            <button
              onClick={() => {
                if (window.confirm('Retirer cette photo de la galerie ?')) removePhoto.mutate({ token, id: p.id })
              }}
              // Toujours visible sur écran tactile (aucun survol possible) ;
              // révélé au survol seulement à partir du desktop.
              className="absolute inset-x-0 bottom-0 min-h-11 bg-[#2e2a27]/80 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white transition-opacity md:opacity-0 md:group-hover:opacity-100"
            >
              Supprimer
            </button>
          </div>
        ))}
        {!isLoading && !photos?.length && (
          <p className="col-span-full text-sm text-ink/50">Aucune photo pour l'instant.</p>
        )}
      </div>
    </div>
  )
}

/** Champ photo réutilisable pour le dossier d'upload site/ (bandeau du pied
 * de page, photo de la page Contact…) : aperçu, upload, retrait. Le fichier
 * réel est envoyé sur R2 via /api/uploads ; seul son URL est stocké dans le
 * formulaire parent. */
function SiteImageField({
  token,
  label,
  hint,
  value,
  dirty,
  onChange,
}: {
  token: string
  label: string
  hint: string
  value: string
  /** Affiche un rappel « pensez à enregistrer » tant que la photo diffère de la valeur publiée. */
  dirty: boolean
  onChange: (url: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = async (file: File) => {
    setUploading(true)
    setError(null)
    try {
      const body = new FormData()
      body.append('file', file)
      body.append('folder', 'site')
      const res = await fetch('/api/uploads', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Échec de l'envoi")
      onChange(data.url)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'envoi")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <label className="mb-1 block text-[10px] font-medium uppercase tracking-[0.18em] text-ink/50">{label}</label>
      <p className="mb-3 text-xs text-ink/55">{hint}</p>
      <div className="flex flex-wrap items-center gap-4">
        {value ? (
          <img src={value} alt="" className="h-24 w-44 rounded-lg border border-sand object-cover" />
        ) : (
          <div className="flex h-24 w-44 items-center justify-center rounded-lg border border-dashed border-sand text-[10px] uppercase tracking-[0.18em] text-ink/40">
            Aucune photo
          </div>
        )}
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-ink/25 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink transition-colors hover:border-[#b8912e] hover:text-accent">
          {uploading ? 'Envoi…' : value ? 'Remplacer la photo' : '+ Ajouter une photo'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) upload(file)
              e.target.value = ''
            }}
            className="hidden"
          />
        </label>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-xs font-semibold uppercase tracking-wide text-red-600 hover:underline"
          >
            Retirer
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {dirty && <p className="mt-2 text-xs text-[#8a6a1c]">Pensez à cliquer sur « Enregistrer » pour publier la photo.</p>}
    </div>
  )
}

type FooterForm = {
  tagline: string
  taglineAr: string
  instagram: string
  facebook: string
  tiktok: string
  copyright: string
  bannerImage: string
}

function FooterEditor({ token }: { token: string }) {
  const { data } = trpc.content.footer.useQuery()
  if (!data) return <p className="mt-6 text-sm text-ink/50">Chargement…</p>
  // Le formulaire n'est monté qu'une fois les valeurs connues : son état
  // initial vient directement de la base, sans effet de synchronisation.
  return <FooterEditorForm token={token} initial={data} />
}

function FooterEditorForm({ token, initial }: { token: string; initial: FooterForm }) {
  const update = trpc.content.updateFooter.useMutation()
  const utils = trpc.useUtils()
  const [formState, setFormState] = useState<FooterForm>(initial)
  const [done, setDone] = useState(false)
  const form = formState
  // Voir PagesEditorForm : toute frappe invalide le "Enregistré ✓".
  const setForm = (next: FooterForm | ((f: FooterForm) => FooterForm)) => {
    setDone(false)
    setFormState(next)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setDone(false)
    update.mutate(
      { token, ...form },
      {
        onSuccess: () => {
          setDone(true)
          utils.content.footer.invalidate()
        },
      },
    )
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-sand/70 bg-white shadow-sm p-6 md:p-8">
      <p className="font-display text-xl">Pied de page</p>

      <SiteImageField
        token={token}
        label="Photo du bandeau « Nous trouver »"
        hint="Idéal : une photo de Kairouan (Grande Mosquée, médina…) en format paysage, 2 400 px de large ou plus — elle est optimisée automatiquement. Sans photo, le site affiche une illustration dorée de la Grande Mosquée."
        value={form.bannerImage}
        dirty={form.bannerImage !== initial.bannerImage}
        onChange={(url) => {
          setForm((f) => ({ ...f, bannerImage: url }))
          setDone(false)
        }}
      />

      <div>
        <label className="mb-1 block text-[10px] font-medium uppercase tracking-[0.18em] text-ink/50">Texte de présentation (français)</label>
        <textarea value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} rows={2} className={`${inputCls} resize-none`} />
      </div>
      <div>
        <label className="mb-1 block text-[10px] font-medium uppercase tracking-[0.18em] text-ink/50">Texte de présentation (arabe)</label>
        <textarea value={form.taglineAr} onChange={(e) => setForm({ ...form, taglineAr: e.target.value })} dir="rtl" rows={2} className={`${inputCls} resize-none`} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-[0.18em] text-ink/50">Instagram</label>
          <input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-[0.18em] text-ink/50">Facebook</label>
          <input value={form.facebook} onChange={(e) => setForm({ ...form, facebook: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-[0.18em] text-ink/50">TikTok</label>
          <input value={form.tiktok} onChange={(e) => setForm({ ...form, tiktok: e.target.value })} className={inputCls} />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-[10px] font-medium uppercase tracking-[0.18em] text-ink/50">Texte de copyright</label>
        <input value={form.copyright} onChange={(e) => setForm({ ...form, copyright: e.target.value })} className={inputCls} />
      </div>
      {/* Barre collante : ce formulaire fait plusieurs écrans de haut sur un
          téléphone, le bouton d'enregistrement ne doit pas être au fond. */}
      <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center gap-3 border-t border-sand/70 bg-[#faf6f3]/95 px-1 py-3 backdrop-blur">
        <button type="submit" disabled={update.isPending} className="min-h-11 rounded-full bg-ink px-6 text-xs font-semibold uppercase tracking-[0.12em] text-[#faf6f3] disabled:opacity-40">
          {update.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        {done && <p className="text-sm text-green-700">Enregistré ✓</p>}
        {update.isError && (
          <p className="text-sm text-red-600" role="alert">
            Non enregistré : {update.error.message}
          </p>
        )}
      </div>
    </form>
  )
}

type PagesForm = {
  homeEyebrow: string
  homeEyebrowAr: string
  homeTitle: string
  homeSubtitleAr: string
  homeSubtitleFr: string
  maisonEyebrow: string
  maisonEyebrowAr: string
  maisonTitle: string
  maisonTitleAr: string
  maisonP1: string
  maisonP1Ar: string
  maisonP2: string
  maisonP2Ar: string
  collectionEyebrow: string
  collectionEyebrowAr: string
  collectionTitle: string
  collectionTitleAr: string
  collectionSubtitle: string
  collectionSubtitleAr: string
  galerieEyebrow: string
  galerieTitle: string
  contactEyebrow: string
  contactEyebrowAr: string
  contactTitle: string
  contactTitleAr: string
  contactImage: string
}

const EMPTY_PAGES_FORM: PagesForm = {
  homeEyebrow: '',
  homeEyebrowAr: '',
  homeTitle: '',
  homeSubtitleAr: '',
  homeSubtitleFr: '',
  maisonEyebrow: '',
  maisonEyebrowAr: '',
  maisonTitle: '',
  maisonTitleAr: '',
  maisonP1: '',
  maisonP1Ar: '',
  maisonP2: '',
  maisonP2Ar: '',
  collectionEyebrow: '',
  collectionEyebrowAr: '',
  collectionTitle: '',
  collectionTitleAr: '',
  collectionSubtitle: '',
  collectionSubtitleAr: '',
  galerieEyebrow: '',
  galerieTitle: '',
  contactEyebrow: '',
  contactEyebrowAr: '',
  contactTitle: '',
  contactTitleAr: '',
  contactImage: '',
}

function PagesEditor({ token }: { token: string }) {
  const { data } = trpc.content.pages.useQuery()
  if (!data) return <p className="mt-6 text-sm text-ink/50">Chargement…</p>
  return <PagesEditorForm token={token} initial={data} />
}

function PagesEditorForm({ token, initial }: { token: string; initial: PagesForm }) {
  const update = trpc.content.updatePages.useMutation()
  const utils = trpc.useUtils()
  const [form, setForm] = useState<PagesForm>({ ...EMPTY_PAGES_FORM, ...initial })
  const [done, setDone] = useState(false)

  const field = (key: keyof PagesForm) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      // Dès qu'on retape, le "Enregistré ✓" précédent ne décrit plus l'état
      // de l'écran : il laissait croire que les nouvelles modifications
      // étaient déjà sauvegardées.
      setDone(false)
      setForm({ ...form, [key]: e.target.value })
    },
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setDone(false)
    update.mutate(
      { token, ...form },
      {
        onSuccess: () => {
          setDone(true)
          // Sans invalidation, le site continuait d'afficher l'ancien texte
          // jusqu'au prochain rechargement complet.
          utils.content.pages.invalidate()
        },
      },
    )
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-6">
      <p className="text-sm font-light text-ink/60">
        Les titres ci-dessous s'affichent tels quels sur le site public. Laisser vide n'est pas
        recommandé — remplacez plutôt par le texte souhaité.
      </p>

      <div className="rounded-2xl border border-sand/70 bg-white shadow-sm p-6 md:p-8">
        <p className="mb-4 font-display text-xl">Accueil</p>
        <div className="space-y-4">
          <input {...field('homeEyebrow')} placeholder="Sur-titre (français)" className={inputCls} />
          <input {...field('homeEyebrowAr')} placeholder="Sur-titre (arabe)" dir="rtl" className={inputCls} />
          <input {...field('homeTitle')} placeholder="Titre principal" className={inputCls} />
          <input {...field('homeSubtitleAr')} placeholder="Sous-titre (arabe)" dir="rtl" className={inputCls} />
          <textarea {...field('homeSubtitleFr')} placeholder="Sous-titre (français)" rows={2} className={`${inputCls} resize-none`} />
        </div>
      </div>

      <div className="rounded-2xl border border-sand/70 bg-white shadow-sm p-6 md:p-8">
        <p className="mb-4 font-display text-xl">La Maison</p>
        <div className="space-y-4">
          <input {...field('maisonEyebrow')} placeholder="Sur-titre (français)" className={inputCls} />
          <input {...field('maisonEyebrowAr')} placeholder="Sur-titre (arabe)" dir="rtl" className={inputCls} />
          <input {...field('maisonTitle')} placeholder="Titre (français)" className={inputCls} />
          <input {...field('maisonTitleAr')} placeholder="Titre (arabe)" dir="rtl" className={inputCls} />
          <textarea {...field('maisonP1')} placeholder="Premier paragraphe (français)" rows={2} className={`${inputCls} resize-none`} />
          <textarea {...field('maisonP1Ar')} placeholder="Premier paragraphe (arabe)" dir="rtl" rows={2} className={`${inputCls} resize-none`} />
          <textarea {...field('maisonP2')} placeholder="Deuxième paragraphe (français)" rows={2} className={`${inputCls} resize-none`} />
          <textarea {...field('maisonP2Ar')} placeholder="Deuxième paragraphe (arabe)" dir="rtl" rows={2} className={`${inputCls} resize-none`} />
        </div>
      </div>

      <div className="rounded-2xl border border-sand/70 bg-white shadow-sm p-6 md:p-8">
        <p className="mb-4 font-display text-xl">Collection</p>
        <div className="space-y-4">
          <input {...field('collectionEyebrow')} placeholder="Sur-titre (français)" className={inputCls} />
          <input {...field('collectionEyebrowAr')} placeholder="Sur-titre (arabe)" dir="rtl" className={inputCls} />
          <input {...field('collectionTitle')} placeholder="Titre (français)" className={inputCls} />
          <input {...field('collectionTitleAr')} placeholder="Titre (arabe)" dir="rtl" className={inputCls} />
          <textarea {...field('collectionSubtitle')} placeholder="Sous-titre (français)" rows={2} className={`${inputCls} resize-none`} />
          <textarea {...field('collectionSubtitleAr')} placeholder="Sous-titre (arabe)" dir="rtl" rows={2} className={`${inputCls} resize-none`} />
        </div>
      </div>

      <div className="rounded-2xl border border-sand/70 bg-white shadow-sm p-6 md:p-8">
        <p className="mb-4 font-display text-xl">Galerie</p>
        <div className="space-y-4">
          <input {...field('galerieEyebrow')} placeholder="Sur-titre" className={inputCls} />
          <input {...field('galerieTitle')} placeholder="Titre" className={inputCls} />
        </div>
      </div>

      <div className="rounded-2xl border border-sand/70 bg-white shadow-sm p-6 md:p-8">
        <p className="mb-4 font-display text-xl">Contact</p>
        <div className="space-y-4">
          <input {...field('contactEyebrow')} placeholder="Sur-titre (français)" className={inputCls} />
          <input {...field('contactEyebrowAr')} placeholder="Sur-titre (arabe)" dir="rtl" className={inputCls} />
          <input {...field('contactTitle')} placeholder="Titre (français)" className={inputCls} />
          <input {...field('contactTitleAr')} placeholder="Titre (arabe)" dir="rtl" className={inputCls} />
          <SiteImageField
            token={token}
            label="Photo (page Nous trouver)"
            hint="Format paysage 16:9 conseillé (ex. l'équipe à l'atelier, la boutique…), 2 400 px de large ou plus. Sans photo, l'image par défaut du thème est utilisée."
            value={form.contactImage}
            dirty={form.contactImage !== initial.contactImage}
            onChange={(url) => setForm({ ...form, contactImage: url })}
          />
        </div>
      </div>

      <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center gap-3 border-t border-sand/70 bg-[#faf6f3]/95 px-1 py-3 backdrop-blur">
        <button type="submit" disabled={update.isPending} className="min-h-11 rounded-full bg-ink px-6 text-xs font-semibold uppercase tracking-[0.12em] text-[#faf6f3] disabled:opacity-40">
          {update.isPending ? 'Enregistrement…' : 'Enregistrer les titres'}
        </button>
        {done && <p className="text-sm text-green-700">Enregistré ✓</p>}
        {update.isError && (
          <p className="text-sm text-red-600" role="alert">
            Non enregistré : {update.error.message}
          </p>
        )}
      </div>
    </form>
  )
}

function ContenuTab({ token }: { token: string }) {
  return (
    <div>
      <GalleryManager token={token} />
      <FooterEditor token={token} />
      <PagesEditor token={token} />
    </div>
  )
}


/* ------------------------------ Page ------------------------------ */

export default function AdminPage() {
  useSEO({ title: 'Espace admin — Chez Laziz', description: 'Tableau de bord Chez Laziz.', path: '/admin', noindex: true })
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [tab, setTab] = useState<NavId>('apercu')
  const [orderFilter, setOrderFilter] = useState<string | null>(null)
  const [period, setPeriod] = useState<PresetRange>('30d')
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Vérifie le token stocké ; si invalide/expiré → retour au login
  trpc.admin.check.useQuery(
    { token: token ?? '' },
    {
      enabled: !!token,
      retry: false,
      onError: () => {
        localStorage.removeItem(TOKEN_KEY)
        setToken(null)
      },
    } as never,
  )

  if (!token) {
    return (
      <Login
        onLogin={(t) => {
          localStorage.setItem(TOKEN_KEY, t)
          setToken(t)
        }}
      />
    )
  }

  return (
    <AdminShell
      tab={tab}
      onSelectTab={(id) => {
        setOrderFilter(null)
        setTab(id)
      }}
      period={period}
      onPeriodChange={setPeriod}
      drawerOpen={drawerOpen}
      onDrawerChange={setDrawerOpen}
      token={token}
      onLogout={() => {
        localStorage.removeItem(TOKEN_KEY)
        setToken(null)
      }}
    >
      {tab === 'apercu' && (
        <OverviewPage
          token={token}
          period={period}
          onGoToOrders={(status) => {
            setOrderFilter(status)
            setTab('commandes')
          }}
        />
      )}
      {tab === 'ventes' && <SalesPage token={token} period={period} />}
      {tab === 'clients' && <CustomersPage token={token} period={period} />}
      {tab === 'produits' && <ProductsPage token={token} period={period} />}
      {tab === 'geographie' && <GeographyPage token={token} period={period} />}
      {tab === 'rentabilite' && <ProfitabilityPage token={token} period={period} />}
      {tab === 'marketing' && <MarketingPage token={token} period={period} />}
      {tab === 'intelligence' && <IntelligencePage token={token} period={period} />}
      {tab === 'commandes' && (
        <OrdersTab token={token} statusFilter={orderFilter} onClearFilter={() => setOrderFilter(null)} />
      )}
      {tab === 'catalogue' && <ProductsTab token={token} />}
      {tab === 'messages' && <MessagesTab token={token} />}
      {tab === 'reseaux' && <MarketingTab token={token} />}
      {tab === 'contenu' && <ContenuTab token={token} />}
      {tab === 'parametres' && <SettingsTab token={token} />}
    </AdminShell>
  )
}

function AdminShell({
  tab,
  onSelectTab,
  period,
  onPeriodChange,
  drawerOpen,
  onDrawerChange,
  token,
  onLogout,
  children,
}: {
  tab: NavId
  onSelectTab: (id: NavId) => void
  period: PresetRange
  onPeriodChange: (p: PresetRange) => void
  drawerOpen: boolean
  onDrawerChange: (open: boolean) => void
  token: string
  onLogout: () => void
  children: React.ReactNode
}) {
  // Même clé de requête que la Vue d'ensemble : React Query la partage, la
  // barre supérieure n'ouvre donc pas un second appel réseau pour ce badge.
  const unreadCount = useOverview(token, period).data?.unreadCount

  const title = NAV_GROUPS.flatMap((g) => g.items).find((i) => i.id === tab)?.label ?? ''

  return (
    <div className="min-h-screen bg-[#faf6f3] lg:flex">
      {/* Colonne fixe à partir de lg ; en dessous, tiroir superposé. */}
      <aside className="hidden w-60 shrink-0 border-r border-sand/60 lg:sticky lg:top-0 lg:block lg:h-screen">
        <Sidebar active={tab} onSelect={onSelectTab} />
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/40"
            onClick={() => onDrawerChange(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-64 shadow-xl">
            <Sidebar active={tab} onSelect={onSelectTab} onClose={() => onDrawerChange(false)} />
          </div>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <TopBar
          title={title}
          unreadCount={unreadCount ?? 0}
          onOpenMessages={() => onSelectTab('messages')}
          onOpenMenu={() => onDrawerChange(true)}
          onLogout={onLogout}
          right={
            ANALYTICS_PAGES.has(tab) ? (
              <div className="hidden sm:block">
                <DateRange value={period} onChange={onPeriodChange} />
              </div>
            ) : undefined
          }
        />
        {ANALYTICS_PAGES.has(tab) && (
          <div className="border-b border-sand/60 bg-white px-4 py-2 sm:hidden">
            <DateRange value={period} onChange={onPeriodChange} />
          </div>
        )}
        <main className="px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  )
}

