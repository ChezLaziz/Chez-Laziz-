import { Link } from 'react-router'
import { formatTND, DELIVERY_FEE_MILLIMES, D17_NUMBER_DISPLAY } from '@/lib/shop'

const STEPS = [
  {
    n: '01',
    title: 'Choisissez',
    text: 'Vos makroudh et leur poids — 500 g, 1 kg, 1,5 kg, 2 kg ou 2,5 kg. Le prix s’ajuste au poids choisi.',
  },
  {
    n: '02',
    title: 'Indiquez votre adresse',
    text: `Livraison à domicile partout en Tunisie, sous 24h, pour ${formatTND(DELIVERY_FEE_MILLIMES)} TND — quel que soit le nombre de produits.`,
  },
  {
    n: '03',
    title: 'Payez comme vous préférez',
    text: `En espèces à la livraison, ou par D17 au ${D17_NUMBER_DISPLAY} avec une capture d’écran. Nous vous appelons pour confirmer.`,
  },
]

export default function HowToOrder() {
  return (
    <section className="border-y border-sand/70 bg-white py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-5 md:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <p data-reveal className="mb-4 text-[11px] font-medium uppercase tracking-[0.35em] text-accent">
            Comment commander
          </p>
          <h2 data-reveal className="font-display text-3xl leading-tight md:text-5xl">
            Livré chez vous, partout en Tunisie
          </h2>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-3 md:gap-10">
          {STEPS.map((s) => (
            <div key={s.n} data-reveal className="relative border-t border-sand pt-6">
              <span className="font-display text-3xl text-[#b8912e]/50">{s.n}</span>
              <h3 className="mt-2 font-display text-xl">{s.title}</h3>
              <p className="mt-2 text-[15px] font-light leading-relaxed text-ink/65">{s.text}</p>
            </div>
          ))}
        </div>

        <div data-reveal className="mt-14 flex flex-col items-center gap-5 text-center">
          <Link
            to="/commande"
            className="gold-cta rounded-full px-9 py-4 text-sm font-semibold uppercase tracking-[0.14em] text-white transition-transform duration-300 hover:scale-[1.02]"
          >
            Commander en ligne
          </Link>
          <p className="text-sm font-light text-ink/55">
            Ou passez à la boutique de Kairouan, ouverte 7j/7 de 07h00 à minuit.
            {' '}
            <Link to="/livraison" className="text-accent underline underline-offset-2">Détails livraison</Link>
            {' · '}
            <Link to="/faq" className="text-accent underline underline-offset-2">Questions fréquentes</Link>
          </p>
        </div>
      </div>
    </section>
  )
}
