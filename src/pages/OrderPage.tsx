import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { trpc } from '@/providers/trpc'
import { useCart } from '@/providers/cart'
import { formatTND, PHONE_DISPLAY, PHONE_TEL } from '@/lib/shop'

function TopBar({ title }: { title: string }) {
  return (
    <header className="border-b border-sand/60 bg-[#faf6f3]">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:h-20 md:px-10">
        <Link to="/" className="font-display text-xl tracking-[0.14em] text-ink md:text-2xl">
          CHEZ&nbsp;LAZIZ
        </Link>
        <span className="text-[11px] font-medium uppercase tracking-[0.35em] text-accent">
          {title}
        </span>
      </div>
    </header>
  )
}

const inputCls =
  'w-full rounded-lg border border-sand bg-white px-4 py-3 text-[15px] text-ink outline-none transition-colors placeholder:text-ink/35 focus:border-[#bc773f]'

export default function OrderPage() {
  const { data: products, isLoading } = trpc.products.list.useQuery()
  const createOrder = trpc.orders.create.useMutation()
  const sendMessage = trpc.contact.send.useMutation()

  const { cart, setQty, clear } = useCart()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')
  const [placed, setPlaced] = useState<{ id: number; waUrl: string } | null>(null)

  const [msgName, setMsgName] = useState('')
  const [msgPhone, setMsgPhone] = useState('')
  const [msgText, setMsgText] = useState('')
  const [msgSent, setMsgSent] = useState(false)

  const items = useMemo(
    () =>
      (products ?? [])
        .filter((p) => (cart[p.id] ?? 0) > 0)
        .map((p) => ({ ...p, qty: cart[p.id] })),
    [products, cart],
  )
  const total = items.reduce((s, p) => s + p.qty * p.priceMillimes, 0)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    createOrder.mutate(
      {
        customerName: name.trim(),
        phone: phone.trim(),
        note: note.trim() || undefined,
        items: items.map((p) => ({ productId: p.id, qty: p.qty })),
      },
      {
        onSuccess: (order) => {
          const lines = items
            .map((p) => `• ${p.qty} × ${p.name}`)
            .join('\n')
          const text = `Bonjour Chez Laziz ! Commande n°${order?.id ?? ''} — ${name.trim()} :\n${lines}\nTotal : ${formatTND(total)} TND`
          setPlaced({
            id: order?.id ?? 0,
            waUrl: 'https://wa.me/21623691039?text=' + encodeURIComponent(text),
          })
          clear()
          window.scrollTo({ top: 0 })
        },
      },
    )
  }

  const submitMessage = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage.mutate(
      { name: msgName.trim(), phone: msgPhone.trim() || undefined, message: msgText.trim() },
      { onSuccess: () => { setMsgSent(true); setMsgName(''); setMsgPhone(''); setMsgText('') } },
    )
  }

  if (placed) {
    return (
      <div className="min-h-screen bg-[#faf6f3]">
        <TopBar title="Commande" />
        <main className="mx-auto flex max-w-2xl flex-col items-center px-5 py-24 text-center md:py-32">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#bc773f]/15 text-accent">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12.5l5 5L20 6.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <h1 className="mt-8 font-display text-4xl md:text-5xl">
            Merci, commande n°{placed.id} reçue&nbsp;!
          </h1>
          <p className="mt-5 max-w-md text-[15px] font-light leading-relaxed text-ink/70">
            Nous préparons votre commande. Pour une confirmation immédiate,
            envoyez-la nous aussi sur WhatsApp ou appelez-nous au {PHONE_DISPLAY}.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <a
              href={placed.waUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-3 rounded-full bg-[#25D366] px-8 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-[#12351f] transition-transform duration-300 hover:scale-[1.03]"
            >
              Confirmer sur WhatsApp
            </a>
            <Link
              to="/"
              className="flex items-center justify-center rounded-full border border-ink/25 px-8 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-ink transition-colors hover:bg-ink hover:text-[#faf6f3]"
            >
              Retour au site
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#faf6f3]">
      <TopBar title="Commande en ligne" />

      <main className="mx-auto max-w-6xl px-5 py-14 md:px-10 md:py-20">
        <div className="max-w-2xl">
          <h1 className="font-display text-4xl leading-tight md:text-6xl">
            Votre commande
          </h1>
          <p className="mt-4 text-[15px] font-light leading-relaxed text-ink/70">
            Choisissez vos makroudh, laissez vos coordonnées — nous vous
            rappelons pour confirmer. Paiement à la boutique, au retrait.
          </p>
        </div>

        <form onSubmit={submit} className="mt-12 grid gap-10 lg:grid-cols-12">
          {/* Products */}
          <div className="space-y-4 lg:col-span-7">
            {isLoading && (
              <p className="text-sm text-ink/50">Chargement du catalogue…</p>
            )}
            {(products ?? []).map((p) => {
              const qty = cart[p.id] ?? 0
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-4 rounded-xl border p-5 transition-colors ${
                    qty > 0 ? 'border-[#bc773f] bg-[#f5ece5]' : 'border-sand bg-white'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-medium">{p.name}</span>
                      {p.badge && (
                        <span className="rounded-full border border-[#bc773f] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-accent">
                          {p.badge}
                        </span>
                      )}
                    </div>
                    {p.description && (
                      <p className="mt-1 line-clamp-2 text-sm font-light text-ink/55">
                        {p.description}
                      </p>
                    )}
                    <span className="mt-1 block font-display text-accent">
                      {formatTND(p.priceMillimes)} <span className="text-xs">TND</span>
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <button
                      type="button"
                      aria-label="Moins"
                      onClick={() => setQty(p.id, qty - 1)}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-sand text-lg transition-colors hover:border-[#bc773f] hover:text-accent disabled:opacity-30"
                      disabled={qty === 0}
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-display text-lg">{qty}</span>
                    <button
                      type="button"
                      aria-label="Plus"
                      onClick={() => setQty(p.id, qty + 1)}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-sand text-lg transition-colors hover:border-[#bc773f] hover:text-accent"
                    >
                      +
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Summary + form */}
          <div className="lg:col-span-5">
            <div className="bg-ink-deep p-7 text-[#faf6f3] lg:sticky lg:top-8 md:p-9">
              <h2 className="font-display text-2xl">Récapitulatif</h2>

              <ul className="mt-6 space-y-3 border-t border-[#faf6f3]/15 pt-6">
                {items.length === 0 && (
                  <li className="text-sm font-light text-[#faf6f3]/50">
                    Aucun produit sélectionné pour l'instant.
                  </li>
                )}
                {items.map((p) => (
                  <li key={p.id} className="flex items-baseline text-[15px] font-light">
                    <span>
                      {p.qty} × {p.name}
                    </span>
                    <span className="mx-3 flex-1 border-b border-dotted border-[#faf6f3]/25" aria-hidden="true" />
                    <span className="font-display text-[#bc773f]">
                      {formatTND(p.qty * p.priceMillimes)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex items-baseline border-t border-[#faf6f3]/15 pt-5">
                <span className="text-sm uppercase tracking-[0.2em]">Total</span>
                <span className="mx-3 flex-1 border-b border-dotted border-[#faf6f3]/25" aria-hidden="true" />
                <span className="font-display text-2xl text-[#bc773f]">
                  {formatTND(total)} <span className="text-xs">TND</span>
                </span>
              </div>

              <div className="mt-8 space-y-4">
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Votre nom"
                  className={inputCls}
                />
                <input
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Téléphone (ex : 23 691 039)"
                  type="tel"
                  className={inputCls}
                />
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Précision ? (date de retrait, occasion…)"
                  rows={3}
                  className={`${inputCls} resize-none`}
                />
              </div>

              <button
                type="submit"
                disabled={items.length === 0 || createOrder.isPending}
                className="mt-6 w-full rounded-full bg-[#bc773f] px-7 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-white transition-all duration-300 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {createOrder.isPending ? 'Envoi…' : 'Envoyer la commande'}
              </button>
              {createOrder.isError && (
                <p className="mt-3 text-center text-sm text-red-300">
                  Une erreur est survenue — réessayez ou appelez le {PHONE_DISPLAY}.
                </p>
              )}
              <p className="mt-5 text-center text-xs font-light tracking-wide text-[#faf6f3]/50">
                Ou appelez directement : <a href={PHONE_TEL} className="underline">{PHONE_DISPLAY}</a>
              </p>
            </div>
          </div>
        </form>

        {/* Contact message */}
        <div className="mt-24 grid gap-10 border-t border-sand/60 pt-16 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.35em] text-accent">
              Contact
            </p>
            <h2 className="font-display text-3xl leading-tight md:text-4xl">
              Une question ?
              <br />
              Écrivez-nous
            </h2>
            <p className="mt-4 max-w-sm text-[15px] font-light leading-relaxed text-ink/70">
              Commande spéciale, mariage, Aïd, grande quantité — laissez un
              message, on vous répond vite. Vous pouvez aussi passer à la
              boutique, ouverte 7j/7 de 07h00 à minuit.
            </p>
          </div>
          <div className="lg:col-span-7">
            {msgSent ? (
              <div className="rounded-xl border border-[#bc773f] bg-[#f5ece5] p-8 text-center">
                <p className="font-display text-2xl">Message envoyé, merci !</p>
                <p className="mt-2 text-sm font-light text-ink/60">
                  Nous vous répondrons très vite.
                </p>
              </div>
            ) : (
              <form onSubmit={submitMessage} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    required
                    value={msgName}
                    onChange={(e) => setMsgName(e.target.value)}
                    placeholder="Votre nom"
                    className={inputCls}
                  />
                  <input
                    value={msgPhone}
                    onChange={(e) => setMsgPhone(e.target.value)}
                    placeholder="Téléphone (facultatif)"
                    type="tel"
                    className={inputCls}
                  />
                </div>
                <textarea
                  required
                  value={msgText}
                  onChange={(e) => setMsgText(e.target.value)}
                  placeholder="Votre message…"
                  rows={5}
                  className={`${inputCls} resize-none`}
                />
                <button
                  type="submit"
                  disabled={sendMessage.isPending}
                  className="rounded-full bg-ink px-8 py-3.5 text-sm font-semibold uppercase tracking-[0.12em] text-[#faf6f3] transition-transform duration-300 hover:scale-[1.03] disabled:opacity-40"
                >
                  {sendMessage.isPending ? 'Envoi…' : 'Envoyer le message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
