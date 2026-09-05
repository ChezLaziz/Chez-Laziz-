import { useEffect } from 'react'
import { Link } from 'react-router'
import { useReveal } from '../hooks/useReveal'
import { useSEO } from '../hooks/useSEO'
import { useLang } from '@/lib/i18n'
import { track } from '../lib/analytics'
import { trackMeta } from '../lib/metaPixel'
import Header from '../sections/Header'
import Footer from '../sections/Footer'
import Ornament from '../components/Ornament'

const CONTENT_ID = 'makroudh-laziz-fruits-secs'

export default function MakroudhFruitsSecsPage() {
  useReveal()
  const isAr = useLang() === 'ar'
  useSEO(
    isAr
      ? {
          title: 'مقروض لعزيز بالفواكه الجافة — لوز، جوز وبندق | عند لعزيز',
          description:
            'مقروض لعزيز بالفواكه الجافة: حشوة سخية من اللوز والجوز والبندق في عجينة سميد ذهبية بالعسل. صناعة يدوية كل يوم في القيروان، لمناسباتكم الكبيرة.',
          path: '/ar/makroudh-fruits-secs',
          breadcrumb: 'مقروض بالفواكه الجافة',
        }
      : {
          title: 'Makroudh Laziz aux Fruits Secs — Amandes, Noix & Noisettes | Chez Laziz',
          description:
            "Le Makroudh Laziz aux Fruits Secs : une garniture généreuse d'amandes, de noix et de noisettes dans une pâte de semoule dorée au miel. Fait main chaque jour à Kairouan, pour vos grandes occasions.",
          path: '/makroudh-fruits-secs',
          breadcrumb: 'Makroudh aux Fruits Secs',
        },
  )

  // Suivi de l'arrivée sur cette page — utile pour mesurer une campagne
  // publicitaire (Meta Ads / Google) qui pointe spécifiquement ici, sans
  // dépendre d'un identifiant produit précis de la base (page marketing
  // statique, non liée à une fiche du catalogue en base). Identique quelle
  // que soit la langue affichée, pour garder des données de campagne
  // comparables.
  useEffect(() => {
    track('view_item_list', {
      item_list_id: 'landing_fruits_secs',
      item_list_name: 'Landing — Makroudh Fruits Secs',
      items: [{ item_id: CONTENT_ID, item_name: 'Makroudh Laziz – Fruits Secs' }],
    })
    trackMeta('ViewContent', { value: 0, contents: [{ id: CONTENT_ID }] })
  }, [])

  const orderHref = isAr ? '/ar/commande?produit=fruits-secs' : '/commande?produit=fruits-secs'
  const collectionHref = isAr ? '/ar/collection' : '/collection'

  if (isAr) {
    return (
      <div className="min-h-screen bg-[#faf6f3]">
        <Header />
        <main className="pt-16 md:pt-20">
          <section className="mx-auto max-w-5xl px-5 pt-14 md:px-10 md:pt-20">
            <div className="grid gap-10 md:grid-cols-2 md:items-center md:gap-14">
              <div data-reveal className="order-2 md:order-1">
                <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.35em] text-accent">
                  الإبداعات — عند لعزيز
                </p>
                <h1 className="font-display text-4xl leading-tight md:text-5xl">
                  مقروض لعزيز بالفواكه الجافة
                </h1>
                <p className="mt-6 text-[15px] font-light leading-relaxed text-ink/75">
                  حشوة سخية من اللوز والجوز والبندق المجروش، ملفوفة في عجينة سميد رقيقة معجونة بزيت الزيتون، وبعد
                  القلي مذهّبة بالعسل. هي القطعة اللي نحضّروها للمناسبات الكبيرة — اللي تُهدى.
                </p>

                <ul className="mt-8 space-y-3 text-sm font-light text-ink/70">
                  <li className="flex items-start gap-2.5">
                    <span className="mt-1 text-accent">✓</span>
                    لوز وجوز وبندق حقيقيين — بلا نكهات صناعية
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="mt-1 text-accent">✓</span>
                    مشكّل ومطهو باليد، كل يوم في القيروان
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="mt-1 text-accent">✓</span>
                    توصيل لكل تونس، الدفع عند التسليم أو D17
                  </li>
                </ul>

                <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link
                    to={orderHref}
                    onClick={() =>
                      trackMeta('InitiateCheckout', { value: 0, contents: [{ id: CONTENT_ID }] })
                    }
                    className="gold-cta inline-flex items-center justify-center rounded-full px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-white"
                  >
                    اطلب توّا
                  </Link>
                  <Link
                    to={collectionHref}
                    className="inline-flex items-center justify-center rounded-full border border-ink/15 px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-ink/70 transition-colors hover:border-[#b8912e] hover:text-accent"
                  >
                    شوفو كامل التشكيلة
                  </Link>
                </div>
                <p className="mt-4 text-xs uppercase tracking-[0.18em] text-muted-warm">
                  الثمن بالكيلو · الوزن على اختياركم من 500 غ إلى 2,5 كغ عند الطلب
                </p>
              </div>

              <div data-reveal className="order-1 md:order-2">
                <div className="overflow-hidden rounded-2xl border border-sand/70 shadow-sm">
                  <img
                    src="/api/uploads/products/1788568180259-c582ad55d766.jpg"
                    alt="مقروض لعزيز بالفواكه الجافة، محشو باللوز والجوز والبندق"
                    className="aspect-[4/3] w-full object-cover"
                    loading="eager"
                    fetchPriority="high"
                  />
                </div>
              </div>
            </div>

            <div data-reveal className="mt-16">
              <Ornament />
            </div>

            <div data-reveal className="mt-16 grid gap-10 md:grid-cols-2">
              <div>
                <h2 className="font-display text-2xl leading-tight md:text-3xl">ليش هذي القطعة تتميز</h2>
                <div className="mt-5 space-y-4 text-[15px] font-light leading-relaxed text-ink/75">
                  <p>
                    خلاف المقروض الكلاسيكي بالتمر، مقروض لعزيز بالفواكه الجافة يراهن على القرمشة وغنى الفواكه
                    الجافة: لوز، جوز وبندق، مخلوطين بكمية سخية في قلب الحلوى. النتيجة أكثف وأعطر — قطعة استثنائية
                    موش حلوى يومية.
                  </p>
                  <p>
                    هو المقروض اللي نختاروه كهدية، لزيارة مجاملة، أو مناسبة عائلية: العيد، عرس، مولود. علبة مقروض
                    لعزيز بالفواكه الجافة تلقط العين، وتُشارك.
                  </p>
                </div>
              </div>
              <div>
                <h2 className="font-display text-2xl leading-tight md:text-3xl">صناعة في القيروان، نفس النهار</h2>
                <div className="mt-5 space-y-4 text-[15px] font-light leading-relaxed text-ink/75">
                  <p>
                    كل قطعة تُشكّل باليد في مصنعنا بالقيروان، في قالب خشبي منقوش، وبعدها تُقلى وتُغطى بالعسل وهي
                    مازالت سخونة. بلا تحضير مسبق، بلا مواد حافظة — اللي تطلبوه يُحضّر نهار طلبيتكم بالذات.
                  </p>
                  <p>
                    كوّنو{' '}
                    <Link to={isAr ? '/ar/commande' : '/commande'} className="text-accent underline underline-offset-2">
                      طلبيتكم أونلاين
                    </Link>{' '}
                    بالمقاس، أو اكتشفو{' '}
                    <Link to={collectionHref} className="text-accent underline underline-offset-2">
                      حزمنا الجاهزة للإهداء
                    </Link>
                    ، اللي تتضمن مقروض لعزيز بالفواكه الجافة.
                  </p>
                </div>
              </div>
            </div>

            <div data-reveal className="mt-14 rounded-2xl bg-ink-deep p-8 text-center text-[#faf6f3] md:p-12">
              <p className="font-display text-2xl md:text-3xl">أهدو مقروض لعزيز الحقيقي بالفواكه الجافة</p>
              <p className="mx-auto mt-3 max-w-md text-sm font-light text-[#faf6f3]/70">
                توصيل لكل تونس · الدفع عند التسليم أو D17
              </p>
              <Link
                to={orderHref}
                onClick={() => trackMeta('InitiateCheckout', { value: 0, contents: [{ id: CONTENT_ID }] })}
                className="gold-cta mt-6 inline-flex rounded-full px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-white"
              >
                اطلب توّا
              </Link>
            </div>

            <p data-reveal className="mt-10 pb-24 text-xs uppercase tracking-[0.2em] text-ink/40 md:pb-32">
              اقرأو أيضًا:{' '}
              <Link to="/ar/makroudh-aux-dattes" className="text-accent hover:underline">مقروض بالتمر</Link>
              {' · '}
              <Link to="/ar/makroudh-kairouan" className="text-accent hover:underline">مقروض القيروان</Link>
              {' · '}
              <Link to="/ar/makroudh-tunisien" className="text-accent hover:underline">المقروض التونسي</Link>
            </p>
          </section>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#faf6f3]">
      <Header />
      <main className="pt-16 md:pt-20">
        <section className="mx-auto max-w-5xl px-5 pt-14 md:px-10 md:pt-20">
          <div className="grid gap-10 md:grid-cols-2 md:items-center md:gap-14">
            <div data-reveal className="order-2 md:order-1">
              <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.35em] text-accent">
                Les signatures — Chez Laziz
              </p>
              <h1 className="font-display text-4xl leading-tight md:text-5xl">
                Makroudh Laziz aux Fruits Secs
              </h1>
              <p className="mt-6 text-[15px] font-light leading-relaxed text-ink/75">
                Une garniture généreuse d'amandes, de noix et de noisettes concassées, enveloppée dans une pâte
                de semoule fine pétrie à l'huile d'olive, puis dorée au miel après friture. C'est la pièce que
                nous préparons pour les grandes occasions — celle qu'on offre.
              </p>

              <ul className="mt-8 space-y-3 text-sm font-light text-ink/70">
                <li className="flex items-start gap-2.5">
                  <span className="mt-1 text-accent">✓</span>
                  Amandes, noix et noisettes véritables — pas d'arômes
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-1 text-accent">✓</span>
                  Façonné et cuit à la main, chaque jour à Kairouan
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-1 text-accent">✓</span>
                  Livraison partout en Tunisie, paiement à la livraison ou D17
                </li>
              </ul>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  to={orderHref}
                  onClick={() =>
                    trackMeta('InitiateCheckout', { value: 0, contents: [{ id: CONTENT_ID }] })
                  }
                  className="gold-cta inline-flex items-center justify-center rounded-full px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-white"
                >
                  Commander maintenant
                </Link>
                <Link
                  to={collectionHref}
                  className="inline-flex items-center justify-center rounded-full border border-ink/15 px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-ink/70 transition-colors hover:border-[#b8912e] hover:text-accent"
                >
                  Voir toute la collection
                </Link>
              </div>
              <p className="mt-4 text-xs uppercase tracking-[0.18em] text-muted-warm">
                Prix au kilo · poids au choix de 500 g à 2,5 kg à la commande
              </p>
            </div>

            <div data-reveal className="order-1 md:order-2">
              <div className="overflow-hidden rounded-2xl border border-sand/70 shadow-sm">
                <img
                  src="/api/uploads/products/1788568180259-c582ad55d766.jpg"
                  alt="Makroudh Laziz aux fruits secs, garni d'amandes, de noix et de noisettes"
                  className="aspect-[4/3] w-full object-cover"
                  loading="eager"
                  fetchPriority="high"
                />
              </div>
            </div>
          </div>

          <div data-reveal className="mt-16">
            <Ornament />
          </div>

          <div data-reveal className="mt-16 grid gap-10 md:grid-cols-2">
            <div>
              <h2 className="font-display text-2xl leading-tight md:text-3xl">Pourquoi cette pièce se distingue</h2>
              <div className="mt-5 space-y-4 text-[15px] font-light leading-relaxed text-ink/75">
                <p>
                  Contrairement au makroudh classique aux dattes, le Makroudh Laziz aux Fruits Secs mise sur le
                  croquant et la richesse des fruits secs : amandes, noix et noisettes, mélangés en quantité
                  généreuse dans le cœur de la pâtisserie. Le résultat est plus dense, plus parfumé — une pièce
                  d'exception plutôt qu'une pâtisserie du quotidien.
                </p>
                <p>
                  C'est le makroudh que l'on choisit pour un cadeau, une visite de courtoisie ou une occasion
                  familiale : Aïd, mariage, naissance. Une boîte de Makroudh Laziz aux Fruits Secs se remarque, et
                  se partage.
                </p>
              </div>
            </div>
            <div>
              <h2 className="font-display text-2xl leading-tight md:text-3xl">Fait à Kairouan, le jour même</h2>
              <div className="mt-5 space-y-4 text-[15px] font-light leading-relaxed text-ink/75">
                <p>
                  Chaque pièce est façonnée à la main dans notre atelier de Kairouan, dans un moule en bois
                  sculpté, puis frite et enrobée de miel encore chaude. Aucune préparation à l'avance, aucun
                  conservateur — ce que vous commandez est fait le jour de votre commande.
                </p>
                <p>
                  Composez votre{' '}
                  <Link to="/commande" className="text-accent underline underline-offset-2">
                    commande en ligne
                  </Link>{' '}
                  à la carte, ou découvrez nos{' '}
                  <Link to="/collection" className="text-accent underline underline-offset-2">
                    coffrets prêts à offrir
                  </Link>
                  , qui incluent le Makroudh Laziz aux Fruits Secs.
                </p>
              </div>
            </div>
          </div>

          <div
            data-reveal
            dir="rtl"
            lang="ar"
            className="mt-14 rounded-2xl border border-sand/70 bg-white p-6 text-right text-[15px] font-light leading-relaxed text-ink/75 md:p-8"
          >
            <p>
              مقروض لعزيز بالفواكه الجافة — حشوة سخية من اللوز والجوز والبندق داخل عجينة سميد ذهبية، مقلية
              ومغموسة في العسل. نحضّره يدويًا كل يوم في القيروان، وهو الخيار المثالي للمناسبات والهدايا.
            </p>
          </div>

          <div data-reveal className="mt-14 rounded-2xl bg-ink-deep p-8 text-center text-[#faf6f3] md:p-12">
            <p className="font-display text-2xl md:text-3xl">Offrez le vrai Makroudh Laziz aux Fruits Secs</p>
            <p className="mx-auto mt-3 max-w-md text-sm font-light text-[#faf6f3]/70">
              Livraison partout en Tunisie · Paiement à la livraison ou D17
            </p>
            <Link
              to={orderHref}
              onClick={() => trackMeta('InitiateCheckout', { value: 0, contents: [{ id: CONTENT_ID }] })}
              className="gold-cta mt-6 inline-flex rounded-full px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-white"
            >
              Commander maintenant
            </Link>
          </div>

          <p data-reveal className="mt-10 pb-24 text-xs uppercase tracking-[0.2em] text-ink/40 md:pb-32">
            À lire aussi :{' '}
            <Link to="/makroudh-aux-dattes" className="text-accent hover:underline">Makroudh aux dattes</Link>
            {' · '}
            <Link to="/makroudh-kairouan" className="text-accent hover:underline">Makroudh de Kairouan</Link>
            {' · '}
            <Link to="/makroudh-tunisien" className="text-accent hover:underline">Makroudh tunisien</Link>
          </p>
        </section>
      </main>
      <Footer />
    </div>
  )
}
