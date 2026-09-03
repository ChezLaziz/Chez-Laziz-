import { useState } from 'react'
import { Link } from 'react-router'
import { trpc } from '@/providers/trpc'
import { formatTND } from '@/lib/shop'
import Ornament from '@/components/Ornament'
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

const TOKEN_KEY = 'laziz_admin_token'

const inputCls =
  'w-full rounded-lg border border-sand bg-white px-4 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink/35 focus:border-[#b8912e]'

const STATUS_LABELS: Record<string, string> = {
  nouvelle: 'Nouvelle',
  en_preparation: 'En préparation',
  prete: 'Prête',
  terminee: 'Terminée',
  annulee: 'Annulée',
}
const STATUS_HEX: Record<string, string> = {
  nouvelle: '#b8912e',
  en_preparation: '#3b82f6',
  prete: '#22c55e',
  terminee: '#9c9490',
  annulee: '#ef4444',
}
const STATUS_COLORS: Record<string, string> = {
  nouvelle: 'bg-[#b8912e]/15 text-[#8a5527] border-[#b8912e]/40',
  en_preparation: 'bg-blue-50 text-blue-700 border-blue-200',
  prete: 'bg-green-50 text-green-700 border-green-200',
  terminee: 'bg-ink/5 text-ink/50 border-ink/15',
  annulee: 'bg-red-50 text-red-600 border-red-200',
}

type OrderItem = { productId: number; name: string; qty: number; priceMillimes: number }

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

function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const login = trpc.admin.login.useMutation({
    onSuccess: (token) => onLogin(token),
  })

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-deep px-5 py-16">
      {/* Ambiance dorée + photo en fond très estompée, dans l'esprit éditorial du site */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'url(/images/hero.jpg)',
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

      <form
        onSubmit={(e) => {
          e.preventDefault()
          login.mutate({ email, password })
        }}
        className="relative w-full max-w-sm animate-in fade-in zoom-in-95 rounded-2xl border border-white/10 bg-[#faf6f3] p-8 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.65)] duration-700 md:p-10"
      >
        <img src="/images/logo.png" alt="Chez Laziz" className="mx-auto h-14 w-14" />
        <p className="mt-4 text-center font-display text-2xl tracking-[0.14em] text-ink">
          CHEZ&nbsp;LAZIZ
        </p>
        <p className="mt-2 text-center text-[11px] font-medium uppercase tracking-[0.35em] text-accent">
          Espace admin
        </p>
        <Ornament className="mt-5 opacity-70" />

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
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className={`${inputCls} mt-2`}
        />
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
        <Link
          to="/"
          className="mt-6 block text-center text-xs text-ink/50 underline underline-offset-4 transition-colors hover:text-accent"
        >
          ← Retour au site
        </Link>
      </form>
    </div>
  )
}

/* ------------------------------ Commandes ------------------------------ */

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
  const { data: orders, isLoading } = trpc.orders.list.useQuery({ token })
  const setStatus = trpc.orders.setStatus.useMutation({
    onSuccess: () => utils.orders.list.invalidate(),
  })
  const removeOrder = trpc.orders.delete.useMutation({
    onSuccess: () => utils.orders.list.invalidate(),
  })

  const filtered = statusFilter
    ? (orders ?? []).filter((o) => o.status === statusFilter)
    : orders

  if (isLoading) return <p className="text-sm text-ink/50">Chargement…</p>

  return (
    <div className="space-y-4">
      {statusFilter && (
        <div className="flex items-center gap-3 rounded-xl border border-[#b8912e]/40 bg-[#b8912e]/10 px-5 py-3 text-sm">
          <span className="font-medium text-accent">
            Filtré : {STATUS_LABELS[statusFilter] ?? statusFilter}
          </span>
          <span className="text-ink/40">({filtered?.length ?? 0})</span>
          <button
            onClick={onClearFilter}
            className="ml-auto text-xs font-semibold uppercase tracking-wide text-ink/50 underline underline-offset-4 hover:text-ink"
          >
            Retirer le filtre
          </button>
        </div>
      )}

      {!filtered?.length && (
        <p className="rounded-2xl border border-sand/70 bg-white shadow-sm p-8 text-center text-sm text-ink/50">
          {statusFilter ? 'Aucune commande dans ce statut.' : "Aucune commande pour l'instant."}
        </p>
      )}

      {filtered?.map((o) => {
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
              <select
                value={o.status}
                onChange={(e) =>
                  setStatus.mutate({
                    token,
                    id: o.id,
                    status: e.target.value as typeof o.status,
                  })
                }
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide outline-none ${STATUS_COLORS[o.status]}`}
              >
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <ul className="mt-4 space-y-1.5 border-t border-sand/60 pt-4 text-sm font-light">
              {items.map((it, i) => (
                <li key={i} className="flex items-baseline">
                  <span>
                    {it.qty} × {it.name}
                  </span>
                  <span className="mx-3 flex-1 border-b border-dotted border-ink/15" />
                  <span className="font-display text-accent">{formatTND(it.qty * it.priceMillimes)}</span>
                </li>
              ))}
            </ul>
            {o.note && (
              <p className="mt-3 rounded-lg bg-[#f5ece5] px-4 py-2.5 text-sm font-light text-ink/70">
                « {o.note} »
              </p>
            )}
            <div className="mt-4 flex items-baseline border-t border-sand/60 pt-3">
              <span className="text-xs uppercase tracking-[0.2em] text-ink/50">Total</span>
              <span className="mx-3 flex-1" />
              <span className="font-display text-xl text-accent">{formatTND(o.totalMillimes)} TND</span>
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
  priceTND: string
  category: string
  badge: string
  imageUrl: string
  available: boolean
}

const EMPTY_FORM: ProductForm = {
  name: '',
  description: '',
  priceTND: '',
  category: 'Les classiques',
  badge: '',
  imageUrl: '',
  available: true,
}

function ProductsTab({ token }: { token: string }) {
  const utils = trpc.useUtils()
  const { data: products, isLoading } = trpc.products.listAll.useQuery({ token })
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
  const create = trpc.products.create.useMutation({ onSuccess: invalidate })
  const update = trpc.products.update.useMutation({ onSuccess: invalidate })
  const remove = trpc.products.delete.useMutation({ onSuccess: invalidate })

  const toMillimes = (tnd: string) => Math.round(parseFloat(tnd.replace(',', '.')) * 1000)

  const startEdit = (p: NonNullable<typeof products>[number]) => {
    setEditingId(p.id)
    setForm({
      name: p.name,
      description: p.description ?? '',
      priceTND: formatTND(p.priceMillimes),
      category: p.category,
      badge: p.badge ?? '',
      imageUrl: p.imageUrl ?? '',
      available: p.available,
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const data = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      priceMillimes: toMillimes(form.priceTND),
      category: form.category.trim() || 'Les classiques',
      badge: form.badge.trim() || null,
      imageUrl: form.imageUrl.trim() || null,
      available: form.available,
    }
    if (Number.isNaN(data.priceMillimes)) return
    if (editingId) {
      update.mutate({ token, id: editingId, data }, { onSuccess: () => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM) } })
    } else {
      create.mutate({ token, data }, { onSuccess: () => { setShowForm(false); setForm(EMPTY_FORM) } })
    }
  }

  const saving = create.isPending || update.isPending

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-ink/55">
          {products?.length ?? 0} produit{(products?.length ?? 0) > 1 ? 's' : ''} — les modifications
          s'affichent immédiatement sur le site.
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

      {showForm && (
        <form onSubmit={submit} className="mb-8 space-y-4 rounded-xl border border-[#b8912e]/50 bg-[#f5ece5] p-6">
          <p className="font-display text-xl">{editingId ? 'Modifier le produit' : 'Nouveau produit'}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nom du produit" className={inputCls} />
            <input required value={form.priceTND} onChange={(e) => setForm({ ...form, priceTND: e.target.value })} placeholder="Prix en TND (ex : 8.000)" inputMode="decimal" className={inputCls} />
          </div>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description (facultative)" rows={2} className={`${inputCls} resize-none`} />

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
      <div className="space-y-3">
        {(products ?? []).map((p) => (
          <div key={p.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-sand/70 bg-white shadow-sm p-4 md:p-5">
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
              <p className="mt-0.5 text-xs text-ink/45">
                {p.category} · <span className="font-display text-accent">{formatTND(p.priceMillimes)} TND</span>
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => startEdit(p)} className="rounded-full border border-ink/25 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink transition-colors hover:border-[#b8912e] hover:text-accent">
                Modifier
              </button>
              <button
                onClick={() => {
                  if (window.confirm(`Supprimer « ${p.name} » ?`)) remove.mutate({ token, id: p.id })
                }}
                className="rounded-full border border-red-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-red-600 transition-colors hover:bg-red-50"
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
  const { data: messages, isLoading } = trpc.contact.list.useQuery({ token })
  const markRead = trpc.contact.markRead.useMutation({
    onSuccess: () => utils.contact.list.invalidate(),
  })

  if (isLoading) return <p className="text-sm text-ink/50">Chargement…</p>
  if (!messages?.length)
    return (
      <p className="rounded-2xl border border-sand/70 bg-white shadow-sm p-8 text-center text-sm text-ink/50">
        Aucun message pour l'instant.
      </p>
    )

  return (
    <div className="space-y-3">
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
      <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Mot de passe actuel (confirmation)" className={inputCls} />
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
      <input type="password" required value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Mot de passe actuel" className={inputCls} />
      <input type="password" required minLength={6} value={next} onChange={(e) => setNext(e.target.value)} placeholder="Nouveau mot de passe (min. 6 caractères)" className={inputCls} />
      <input type="password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirmer le nouveau mot de passe" className={inputCls} />
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

function SettingsTab({ token }: { token: string }) {
  return (
    <div className="flex flex-wrap gap-6">
      <ChangeEmailCard token={token} />
      <ChangePasswordCard token={token} />
    </div>
  )
}

/* ------------------------------ Visiteurs ------------------------------ */

function StatsTab({ token }: { token: string }) {
  const { data: stats, isLoading } = trpc.stats.summary.useQuery(
    { token },
    { refetchInterval: 30000 },
  )

  if (isLoading || !stats) return <p className="text-sm text-ink/50">Chargement…</p>

  const dayLabel = (iso: string) =>
    new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
    })

  const cards = [
    { label: 'Visites totales', value: stats.total },
    { label: "Aujourd'hui", value: stats.today },
    { label: '7 derniers jours', value: stats.week },
  ]

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-sand/70 bg-white shadow-sm p-6 text-center">
            <p className="font-display text-4xl text-accent">{c.value}</p>
            <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.25em] text-ink/50">
              {c.label}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-sand/70 bg-white shadow-sm p-6">
        <p className="mb-4 font-display text-xl">Visites par jour</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.byDay} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="visitsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#b8912e" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#b8912e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="day"
                tickFormatter={dayLabel}
                tick={{ fontSize: 11, fill: '#3c3835' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#3c3835' }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v) => [String(v), 'Visites']}
                labelFormatter={(l) => dayLabel(String(l))}
                cursor={{ stroke: '#dec9b8', strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#b8912e"
                strokeWidth={2.5}
                fill="url(#visitsGradient)"
                dot={{ r: 3, fill: '#b8912e', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-3 text-xs font-light text-ink/45">
          Une visite = une page vue par visiteur et par session (les pages admin ne sont pas comptées).
        </p>
      </div>
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
    handle: '@chezlaziz',
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
    handle: 'Avis Google',
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
  const { data: history } = trpc.social.history.useQuery({ token, network: net.key })
  const record = trpc.social.record.useMutation({
    onSuccess: () => {
      utils.social.latest.invalidate()
      utils.social.history.invalidate()
    },
  })

  const [followers, setFollowers] = useState('')
  const [messages, setMessages] = useState('')
  const [editing, setEditing] = useState(false)

  const latest = history && history.length ? history[history.length - 1] : null
  const prev = history && history.length > 1 ? history[history.length - 2] : null
  const diff = latest && prev ? latest.followers - prev.followers : null

  const chartData = (history ?? []).map((h) => ({
    date: new Date(h.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
    followers: h.followers,
  }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const f = parseInt(followers, 10)
    const m = parseInt(messages || '0', 10)
    if (Number.isNaN(f)) return
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
            {latest ? latest.followers.toLocaleString('fr-FR') : '—'}
          </p>
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-ink/45">abonnés</p>
          {diff !== null && diff !== 0 && (
            <p className={`mt-1 text-xs font-semibold ${diff > 0 ? 'text-green-600' : 'text-red-500'}`}>
              {diff > 0 ? '+' : ''}{diff} depuis le dernier relevé
            </p>
          )}
        </div>
      </div>

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
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#3c3835' }} axisLine={false} tickLine={false} />
              <YAxis domain={['dataMin - 5', 'dataMax + 5']} tick={{ fontSize: 10, fill: '#3c3835' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => [String(v), 'Abonnés']} />
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
  const { data: siteMessages } = trpc.contact.list.useQuery({ token })
  const unread = (siteMessages ?? []).filter((m) => !m.isRead).length

  return (
    <div>
      {unread > 0 && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-[#b8912e]/50 bg-[#f5ece5] px-5 py-4">
          <p className="text-sm">
            📩 <strong>{unread}</strong> message{unread > 1 ? 's' : ''} du site non lu{unread > 1 ? 's' : ''}
          </p>
          <span className="text-xs text-ink/50">Voir l'onglet Messages</span>
        </div>
      )}

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

/* ------------------------------ Vue d'ensemble ------------------------------ */

function OverviewTab({
  token,
  onGoToOrders,
  onGoToMessages,
  onGoToMarketing,
}: {
  token: string
  onGoToOrders: (status: string) => void
  onGoToMessages: () => void
  onGoToMarketing: () => void
}) {
  const { data, isLoading } = trpc.dashboard.overview.useQuery(
    { token },
    { refetchInterval: 30000 },
  )

  if (isLoading || !data) return <p className="text-sm text-ink/50">Chargement…</p>

  const { revenue, statusCounts, topProducts, visits, unreadMessages, unreadCount, social } = data

  const revenueCards = [
    { label: "Aujourd'hui", value: revenue.todayMillimes },
    { label: '7 derniers jours', value: revenue.weekMillimes },
    { label: 'Total', value: revenue.totalMillimes },
  ]

  const activeStatuses: (keyof typeof STATUS_LABELS)[] = [
    'nouvelle',
    'en_preparation',
    'prete',
    'terminee',
    'annulee',
  ]

  const dayLabel = (iso: string) =>
    new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })

  return (
    <div className="space-y-8">
      {/* Bannière de bienvenue */}
      <div className="relative overflow-hidden rounded-2xl border border-sand/70 bg-ink-deep p-8 shadow-sm md:p-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'url(/images/makroudh.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.16,
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(560px circle at 12% 15%, rgba(184,145,46,0.28), transparent 60%)',
          }}
        />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-accent">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <p className="mt-3 max-w-2xl font-display text-3xl leading-tight text-[#faf6f3] md:text-4xl">
            Chaque makroudh porte le savoir-faire de Kairouan.
          </p>
          <p className="mt-3 max-w-xl text-sm font-light text-[#faf6f3]/70">
            Bienvenue dans l'espace Chez Laziz — commandes, catalogue et présence en ligne, tout au même endroit.
          </p>
        </div>
      </div>

      {/* Chiffre d'affaires */}
      <div>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.25em] text-ink/50">
          Chiffre d'affaires
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {revenueCards.map((c) => (
            <div key={c.label} className="rounded-2xl border border-sand/70 bg-white shadow-sm p-6 text-center">
              <p className="font-display text-3xl text-accent">{formatTND(c.value)} <span className="text-base">TND</span></p>
              <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.25em] text-ink/50">
                {c.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Commandes par statut — cartes cliquables qui filtrent + répartition */}
      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <div>
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.25em] text-ink/50">
            Commandes — cliquez pour filtrer
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {activeStatuses.map((s) => (
              <button
                key={s}
                onClick={() => onGoToOrders(s)}
                className={`rounded-xl border p-4 text-center transition-transform hover:-translate-y-0.5 ${STATUS_COLORS[s]}`}
              >
                <p className="font-display text-2xl">{statusCounts[s] ?? 0}</p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em]">
                  {STATUS_LABELS[s]}
                </p>
              </button>
            ))}
          </div>
        </div>

        {(() => {
          const total = activeStatuses.reduce((sum, s) => sum + (statusCounts[s] ?? 0), 0)
          const pieData = activeStatuses
            .map((s) => ({ key: s, value: statusCounts[s] ?? 0 }))
            .filter((d) => d.value > 0)
          return (
            <div className="rounded-2xl border border-sand/70 bg-white shadow-sm p-6">
              <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.25em] text-ink/50">
                Répartition
              </p>
              <div className="flex items-center gap-4">
                <div className="relative h-28 w-28 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData.length ? pieData : [{ key: 'vide', value: 1 }]}
                        dataKey="value"
                        nameKey="key"
                        innerRadius={38}
                        outerRadius={54}
                        paddingAngle={pieData.length > 1 ? 2 : 0}
                        stroke="none"
                      >
                        {(pieData.length ? pieData : [{ key: 'vide', value: 1 }]).map((d) => (
                          <Cell key={d.key} fill={STATUS_HEX[d.key] ?? '#e5ddd6'} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-display text-xl text-ink">{total}</span>
                    <span className="text-[9px] uppercase tracking-wide text-ink/45">total</span>
                  </div>
                </div>
                <ul className="space-y-1.5 text-xs">
                  {activeStatuses.map((s) => (
                    <li key={s} className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_HEX[s] }} />
                      <span className="text-ink/60">{STATUS_LABELS[s]}</span>
                      <span className="ml-auto font-semibold text-ink">{statusCounts[s] ?? 0}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )
        })()}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top produits */}
        <div className="rounded-2xl border border-sand/70 bg-white shadow-sm p-6">
          <p className="mb-4 font-display text-xl">Produits les plus vendus</p>
          {topProducts.length === 0 ? (
            <p className="text-sm text-ink/50">Pas encore de ventes.</p>
          ) : (
            <ul className="space-y-3">
              {topProducts.map((p, i) => (
                <li key={p.productId} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#b8912e]/15 text-xs font-semibold text-accent">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm">{p.name}</span>
                  <span className="text-xs text-ink/45">{p.qtySold} vendus</span>
                  <span className="font-display text-accent">{formatTND(p.revenueMillimes)} TND</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Visiteurs */}
        <div className="rounded-2xl border border-sand/70 bg-white shadow-sm p-6">
          <div className="mb-4 flex items-baseline justify-between">
            <p className="font-display text-xl">Visiteurs</p>
            <p className="text-xs text-ink/45">
              {visits.today} aujourd'hui · {visits.week} sur 7 jours
            </p>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={visits.byDay} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="overviewVisitsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#b8912e" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#b8912e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="day"
                  tickFormatter={dayLabel}
                  tick={{ fontSize: 10, fill: '#3c3835' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#3c3835' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [String(v), 'Visites']} labelFormatter={(l) => dayLabel(String(l))} cursor={{ stroke: '#dec9b8', strokeWidth: 1 }} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#b8912e"
                  strokeWidth={2.5}
                  fill="url(#overviewVisitsGradient)"
                  dot={{ r: 2.5, fill: '#b8912e', strokeWidth: 0 }}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Messages non lus */}
        <button
          onClick={onGoToMessages}
          className="rounded-2xl border border-sand/70 bg-white shadow-sm p-6 text-left transition-transform hover:-translate-y-0.5"
        >
          <div className="mb-4 flex items-baseline justify-between">
            <p className="font-display text-xl">Messages</p>
            {unreadCount > 0 && (
              <span className="rounded-full bg-[#b8912e] px-2.5 py-0.5 text-xs font-semibold text-white">
                {unreadCount} non lu{unreadCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {unreadMessages.length === 0 ? (
            <p className="text-sm text-ink/50">Aucun message non lu.</p>
          ) : (
            <ul className="space-y-2">
              {unreadMessages.map((m) => (
                <li key={m.id} className="border-t border-sand/60 pt-2 text-sm first:border-t-0 first:pt-0">
                  <span className="font-medium">{m.name}</span>
                  <span className="ml-2 text-ink/50">— {m.message.slice(0, 60)}{m.message.length > 60 ? '…' : ''}</span>
                </li>
              ))}
            </ul>
          )}
        </button>

        {/* Réseaux sociaux */}
        <button
          onClick={onGoToMarketing}
          className="rounded-2xl border border-sand/70 bg-white shadow-sm p-6 text-left transition-transform hover:-translate-y-0.5"
        >
          <p className="mb-4 font-display text-xl">Réseaux sociaux</p>
          {social.length === 0 ? (
            <p className="text-sm text-ink/50">Aucun chiffre enregistré — allez dans « Marketing ».</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3">
              {social.map((s) => (
                <li key={s.network} className="flex items-center justify-between rounded-lg bg-[#faf6f3] px-3 py-2">
                  <span className="text-xs font-medium capitalize text-ink/70">{s.network}</span>
                  <span className="font-display text-accent">{s.followers.toLocaleString('fr-FR')}</span>
                </li>
              ))}
            </ul>
          )}
        </button>
      </div>
    </div>
  )
}

/* ------------------------------ Page ------------------------------ */

const TABS = [
  { id: 'apercu', label: "Vue d'ensemble" },
  { id: 'commandes', label: 'Commandes' },
  { id: 'produits', label: 'Produits & prix' },
  { id: 'messages', label: 'Messages' },
  { id: 'visiteurs', label: 'Visiteurs' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'parametres', label: 'Paramètres' },
] as const

// Icônes fines (stroke 1.8, même langage graphique que le panier du header
// public) — une par onglet, pour repérer la section en un coup d'œil.
const TAB_ICONS: Record<(typeof TABS)[number]['id'], React.ReactNode> = {
  apercu: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="5" rx="1.5" />
      <rect x="13" y="12" width="8" height="9" rx="1.5" />
      <rect x="3" y="15" width="8" height="6" rx="1.5" />
    </svg>
  ),
  commandes: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" strokeLinejoin="round" />
      <path d="M9 8h6M9 12h6" strokeLinecap="round" />
    </svg>
  ),
  produits: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3 3 8v8l9 5 9-5V8l-9-5Z" strokeLinejoin="round" />
      <path d="M3 8l9 5 9-5M12 13v8" />
    </svg>
  ),
  messages: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 6.5 8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  visiteurs: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  ),
  marketing: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 10v4h3l6 4V6l-6 4H3Z" strokeLinejoin="round" />
      <path d="M16 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11" strokeLinecap="round" />
    </svg>
  ),
  parametres: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V19.5a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.04-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.04H4.5a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-1.04 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H10.5a1.7 1.7 0 0 0 1.04-1.56V4.5a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V10.5a1.7 1.7 0 0 0 1.56 1.04H19.5a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.04Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
}

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('apercu')
  const [orderFilter, setOrderFilter] = useState<string | null>(null)

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
    <div className="min-h-screen bg-[#faf6f3]">
      {/* Filet doré — signature visuelle du reste du site, en écho discret ici */}
      <div className="h-[3px] bg-gradient-to-r from-[#8f6f22] via-[#b8912e] to-[#8f6f22]" />

      <header className="sticky top-0 z-30 border-b border-sand/60 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-[70px] max-w-6xl items-center justify-between px-5 md:px-8">
          <div className="flex items-center gap-3">
            <img src="/images/logo.png" alt="Chez Laziz" className="h-9 w-9" />
            <div className="leading-tight">
              <p className="font-display text-lg tracking-[0.1em] text-ink">CHEZ&nbsp;LAZIZ</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">Espace admin</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="rounded-full border border-ink/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink/70 transition-colors hover:border-[#b8912e] hover:text-accent"
            >
              Voir le site
            </Link>
            <button
              onClick={() => {
                localStorage.removeItem(TOKEN_KEY)
                setToken(null)
              }}
              className="rounded-full border border-ink/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink/70 transition-colors hover:border-red-300 hover:text-red-600"
            >
              Déconnexion
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1.5 overflow-x-auto px-5 pb-3 md:px-8">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setOrderFilter(null)
                setTab(t.id)
              }}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-ink text-[#faf6f3] shadow-sm'
                  : 'text-ink/55 hover:bg-ink/5 hover:text-ink'
              }`}
            >
              <span className={tab === t.id ? 'text-[#b8912e]' : 'text-ink/35'}>{TAB_ICONS[t.id]}</span>
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10 md:px-8">
        <div key={tab} className="animate-in fade-in slide-in-from-bottom-1 duration-500">
          {tab === 'apercu' && (
            <OverviewTab
              token={token}
              onGoToOrders={(status) => {
                setOrderFilter(status)
                setTab('commandes')
              }}
              onGoToMessages={() => setTab('messages')}
              onGoToMarketing={() => setTab('marketing')}
            />
          )}
          {tab === 'commandes' && (
            <OrdersTab
              token={token}
              statusFilter={orderFilter}
              onClearFilter={() => setOrderFilter(null)}
            />
          )}
          {tab === 'produits' && <ProductsTab token={token} />}
          {tab === 'messages' && <MessagesTab token={token} />}
          {tab === 'visiteurs' && <StatsTab token={token} />}
          {tab === 'marketing' && <MarketingTab token={token} />}
          {tab === 'parametres' && <SettingsTab token={token} />}
        </div>
      </main>
    </div>
  )
}
