import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { trpc } from '@/providers/trpc'
import { formatTND } from '@/lib/shop'
import Ornament from '@/components/Ornament'
import { useSEO } from '@/hooks/useSEO'
import type { PresetRange } from '@contracts/analytics'
import Sidebar from './admin/shell/Sidebar'
import TopBar from './admin/shell/TopBar'
import DateRange from './admin/shell/DateRange'
import { ANALYTICS_PAGES, NAV_GROUPS, type NavId } from './admin/shell/nav'
import OverviewPage from './admin/pages/OverviewPage'
import OrdersPage from './admin/pages/OrdersPage'
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

/** La liste des délégations du transporteur — celle que le client voit
 * dans le formulaire de commande.
 *
 * Un seul bouton, rarement utile : Team Parcel Express ajoute ou renomme
 * une délégation quelques fois par an. Sans lui, la liste ne pourrait être
 * rafraîchie que par un développeur. */
function DelegationsCard({ token }: { token: string }) {
  const utils = trpc.useUtils()
  const catalogue = trpc.carriers.catalogue.useQuery({ token })
  const sync = trpc.carriers.syncDelegations.useMutation({
    onSuccess: () => utils.carriers.catalogue.invalidate(),
  })
  const count = catalogue.data?.length ?? 0

  return (
    <div className="w-full rounded-2xl border border-sand/70 bg-white p-6 shadow-sm md:p-8">
      <p className="font-display text-xl">Délégations Team Parcel Express</p>
      <p className="mt-2 text-sm font-light text-ink/60">
        La liste dans laquelle vos clients choisissent leur délégation à la commande.{' '}
        {catalogue.isLoading ? '…' : <strong className="font-medium text-ink">{count} enregistrées.</strong>}{' '}
        À mettre à jour seulement si le transporteur vous signale un ajout ou un changement.
      </p>
      {sync.error && <p className="mt-3 text-sm text-red-600">{sync.error.message}</p>}
      {sync.data && (
        <p className={`mt-3 text-sm ${sync.data.ok ? 'text-green-700' : 'text-red-600'}`}>
          {sync.data.ok
            ? `${sync.data.found} délégations lues, ${sync.data.saved} enregistrées.`
            : `Le transporteur n'a pas répondu (${sync.data.error ?? sync.data.status ?? 'erreur'}). Rien n'a été modifié.`}
        </p>
      )}
      <div className="mt-4">
        <button
          onClick={() => sync.mutate({ token })}
          disabled={sync.isPending}
          className="min-h-11 rounded-full border border-ink/25 px-6 text-xs font-semibold uppercase tracking-wide text-ink transition-colors hover:border-[#b8912e] hover:text-accent disabled:opacity-50"
        >
          {sync.isPending ? 'Mise à jour…' : 'Mettre à jour la liste'}
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
      <DelegationsCard token={token} />
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
      {tab === 'commandes' && (
        <OrdersPage token={token} statusFilter={orderFilter} onClearFilter={() => setOrderFilter(null)} />
      )}
      {tab === 'catalogue' && <ProductsTab token={token} />}
      {tab === 'messages' && <MessagesTab token={token} />}
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

