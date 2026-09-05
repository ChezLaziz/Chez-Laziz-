import { Link } from 'react-router'
import { trpc } from '@/providers/trpc'
import { DELIVERY_TIME_LABEL, DELIVERY_FEE_MILLIMES } from '@contracts/shop'
import { formatTND } from '@/lib/shop'
import { useLang } from '@/lib/i18n'

const MAPS_URL =
  'https://www.google.com/maps/place/Chez+laziz+%D8%A7%D9%84%D9%82%D9%8A%D8%B1%D9%88%D8%A7%D9%86/data=!4m2!3m1!1s0x12fdcf004a648cdf:0xacd6eabb156c7203'
const PHONE_DISPLAY = '+216 23 691 039'
const PHONE_TEL = 'tel:+21623691039'
const MESSENGER_URL = 'https://m.me/61573444418563'
const EMAIL = 'contact@chezlaziz.com'

const DEFAULT_TAGLINE =
  'Pâtisserie artisanale — Kairouan, Tunisie. Le makroudh kairouanais authentique, fait main chaque jour.'
const DEFAULT_TAGLINE_AR = 'حرفة صناعة الحلويات — القيروان، تونس. المقروض القيرواني الأصيل، صناعة يدوية كل يوم.'
const DEFAULT_COPYRIGHT = '© 2026 Chez Laziz — عند لعزيز · Kairouan. Tous droits réservés.'
const DEFAULT_VISIT_EYEBROW = 'Nous trouver'
const DEFAULT_VISIT_EYEBROW_AR = 'تواصل معنا'
const DEFAULT_VISIT_TITLE = 'La boutique vous attend à Kairouan'
const DEFAULT_VISIT_TITLE_AR = 'متجرنا بانتظاركم في القيروان'

// Les pages sans version arabe pour l'instant (livraison, FAQ, journal,
// makroudh-*, la-maison, galerie, contact, mentions légales) gardent leur
// libellé traduit mais un lien vers la page française telle quelle —
// cohérent avec le choix fait pour le header (voir Header.tsx).
const SHOP_LINKS = [
  ['/', 'Accueil', 'الرئيسية', true],
  ['/collection', 'La Collection', 'التشكيلة', true],
  ['/commande', 'Commander en ligne', 'اطلب أونلاين', true],
  ['/livraison', 'Livraison', 'التوصيل', false],
  ['/faq', 'Questions fréquentes', 'الأسئلة الشائعة', false],
] as const

const HOUSE_LINKS = [
  ['/la-maison', 'La Maison', 'قصتنا'],
  ['/galerie', 'Galerie', 'معرض الصور'],
  ['/journal', 'Journal', 'المدونة'],
  ['/makroudh-tunisien', 'Makroudh tunisien', 'المقروض التونسي'],
  ['/makroudh-kairouan', 'Makroudh de Kairouan', 'مقروض القيروان'],
  ['/makroudh-aux-dattes', 'Makroudh aux dattes', 'مقروض بالتمر'],
  ['/makroudh-fruits-secs', 'Makroudh aux fruits secs', 'مقروض بالفواكه الجافة'],
  ['/contact', 'Nous trouver', 'تواصل معنا'],
] as const

const LEGAL_LINKS = [
  ['/politique-de-confidentialite', 'Politique de confidentialité', 'سياسة الخصوصية'],
  ['/conditions-generales', 'Conditions générales', 'الشروط العامة'],
] as const

const ICONS: Record<string, React.ReactNode> = {
  Instagram: (
    <>
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.6" cy="6.4" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  Facebook: (
    <path
      d="M14 8.5V7a1.5 1.5 0 0 1 1.5-1.5H17V2.5h-2.5A4 4 0 0 0 10.5 6.5v2H8V12h2.5v9.5H14V12h2.5l.5-3.5H14Z"
      fill="currentColor"
      stroke="none"
    />
  ),
  TikTok: (
    <path
      d="M16.5 3c.4 2.2 1.8 3.6 4 3.9v3c-1.6 0-3-.5-4-1.3v6.9a5.5 5.5 0 1 1-5.5-5.5c.3 0 .7 0 1 .1v3.1a2.5 2.5 0 1 0 1.5 2.3V3h3Z"
      fill="currentColor"
      stroke="none"
    />
  ),
  Messenger: (
    <>
      <path d="M12 2.6c-5.4 0-9.4 4-9.4 9.2 0 3 1.4 5.6 3.6 7.3v3l3.2-1.8c.8.2 1.7.3 2.6.3 5.4 0 9.4-4 9.4-9.2s-4-9.2-9.4-9.2Z" />
      <path
        d="M7.2 13l3.2-3.4 2.2 2.2 3.4-3.5-3.2 5-2.2-2.2-3.4 3.8Z"
        fill="currentColor"
        stroke="none"
      />
    </>
  ),
  Maps: (
    <>
      <path d="M12 21.5s-7-6.4-7-12a7 7 0 0 1 14 0c0 5.6-7 12-7 12Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  Phone: (
    <path d="M5.5 3.5h3l1.6 4-2 1.3a11 11 0 0 0 5.6 5.6l1.3-2 4 1.6v3a2 2 0 0 1-2 2A15.5 15.5 0 0 1 3.5 5.5a2 2 0 0 1 2-2Z" />
  ),
  Mail: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
}

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  )
}

/**
 * Silhouette au trait de la Grande Mosquée de Kairouan (Okba Ibn Nafaa) :
 * minaret à trois étages coiffé d'une coupole, portique à arcs outrepassés,
 * coupole côtelée de la salle de prière, mur d'enceinte crénelé. Affichée
 * tant qu'aucune photo n'a été ajoutée depuis l'admin.
 */
function KairouanSkyline({ className = '' }: { className?: string }) {
  const merlons = (x0: number, x1: number, y: number, step: number, w: number, h: number) => {
    const parts: string[] = []
    for (let x = x0; x + w <= x1; x += step) {
      parts.push(`M${x} ${y} v-${h} a${w / 2} ${w / 2} 0 0 1 ${w} 0 v${h}`)
    }
    return parts.join(' ')
  }
  const horseshoe = (cx: number, top: number, bottom: number, r: number) =>
    `M${cx - r + 1} ${bottom} V${top + r} A${r} ${r} 0 1 1 ${cx + r - 1} ${top + r} V${bottom}`
  const columns = [160, 240, 320, 400, 480, 560, 640, 720]

  return (
    <svg
      viewBox="0 0 1200 600"
      preserveAspectRatio="xMidYMax meet"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <g
        fill="none"
        stroke="#b8912e"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.42"
      >
        {/* sol */}
        <path d="M60 522H1140" />
        <path d="M120 540H1080" opacity="0.5" />

        {/* portique de la cour : colonnes et arcs outrepassés */}
        <path d="M120 342H752" />
        <path d={merlons(124, 752, 342, 20, 10, 9)} />
        <path d="M120 342V522M752 342V522" />
        {columns.map(x => (
          <rect key={x} x={x - 7} y={396} width="14" height="126" />
        ))}
        {columns.slice(0, -1).map((x, i) => (
          <path key={`a${x}`} d={`M${x + 7} 396V386A37 37 0 1 1 ${columns[i + 1] - 7} 386V396`} />
        ))}

        {/* coupole côtelée de la salle de prière */}
        <path d="M242 342A58 58 0 0 1 358 342" />
        <path d="M300 284V268" />
        <circle cx="300" cy="264" r="4" />
        <path d="M300 284Q262 300 254 342M300 284Q281 302 277 342M300 284V342M300 284Q319 302 323 342M300 284Q338 300 346 342" />

        {/* minaret à trois étages */}
        <rect x="790" y="236" width="150" height="286" />
        <path d={merlons(794, 940, 236, 18, 10, 10)} />
        <rect x="813" y="166" width="104" height="70" />
        <path d={merlons(817, 917, 166, 16, 8, 8)} />
        <rect x="833" y="110" width="64" height="56" />
        <path d="M837 110Q865 58 893 110" />
        <path d="M851 110Q865 76 879 110" />
        <path d="M865 70V50" />
        <circle cx="865" cy="46" r="4" />
        {[262, 342].map(y => (
          <path key={y} d={horseshoe(865, y, y + 46, 9)} />
        ))}
        <path d={horseshoe(840, 184, 222, 8)} />
        <path d={horseshoe(890, 184, 222, 8)} />
        <path d={horseshoe(865, 122, 152, 8)} />
        <path d={horseshoe(865, 456, 522, 18)} />

        {/* mur d'enceinte crénelé */}
        <path d="M940 522V400H1140" />
        <path d={merlons(946, 1140, 400, 20, 10, 9)} />
      </g>
    </svg>
  )
}

/** `bilingual`: chemins existant aussi sous /ar (voir BILINGUAL_BASE_PATHS) —
 * le lien pointe alors vers la version arabe quand lang === 'ar'. */
function FooterColumn({
  title,
  links,
  lang,
  className = '',
}: {
  title: string
  links: readonly (readonly [string, string, string] | readonly [string, string, string, boolean])[]
  lang: 'fr' | 'ar'
  className?: string
}) {
  return (
    <div className={className}>
      <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#b8912e]">{title}</p>
      <ul className="space-y-3 text-sm font-light text-[#faf6f3]/75">
        {links.map(([to, labelFr, labelAr, bilingual]) => (
          <li key={to}>
            <Link
              to={lang === 'ar' && bilingual ? (to === '/' ? '/ar' : `/ar${to}`) : to}
              className="transition-colors hover:text-[#b8912e]"
            >
              {lang === 'ar' ? labelAr : labelFr}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** `hideVisit` : la page /contact affiche déjà ce bloc en pleine page. */
export default function Footer({ hideVisit = false }: { hideVisit?: boolean }) {
  const lang = useLang()
  const { data } = trpc.content.footer.useQuery()
  const { data: pages } = trpc.content.pages.useQuery()
  const banner = data?.bannerImage || ''
  const socials = [
    {
      name: 'Instagram',
      icon: 'Instagram',
      href: data?.instagram || 'https://www.instagram.com/chezlaziz',
    },
    {
      name: 'Facebook',
      icon: 'Facebook',
      href: data?.facebook || 'https://www.facebook.com/profile.php?id=61573444418563',
    },
    {
      name: 'TikTok',
      icon: 'TikTok',
      href: data?.tiktok || 'https://www.tiktok.com/search?q=chez%20laziz%20kairouan',
    },
    { name: 'Messenger', icon: 'Messenger', href: MESSENGER_URL },
    { name: 'Google Maps', icon: 'Maps', href: MAPS_URL },
  ]

  return (
    <footer className="bg-ink-deep text-[#faf6f3]">
      {/* ── Bandeau « Nous trouver » : adresse, horaires, contact ── */}
      {!hideVisit && (
        <section
          aria-labelledby="footer-visit-title"
          className="relative overflow-hidden border-t border-[#faf6f3]/10"
        >
          <div className="absolute inset-0" aria-hidden="true">
            {banner ? (
              <>
                <img
                  src={banner}
                  alt=""
                  className="h-full w-full object-cover object-center"
                  loading="lazy"
                  decoding="async"
                />
                {/* Voile : uni sur mobile (texte au-dessus de la photo), dégradé
                  gauche → droite sur grand écran pour garder le texte lisible
                  et laisser la photo respirer à droite. */}
                <div className="absolute inset-0 bg-[#2e2a27]/80 lg:bg-transparent lg:bg-gradient-to-r lg:from-[#2e2a27] lg:via-[#2e2a27]/85 lg:to-[#2e2a27]/25" />
              </>
            ) : (
              <>
                <KairouanSkyline className="absolute bottom-0 right-0 hidden h-full w-[46%] lg:block" />
                <p className="absolute bottom-5 right-6 hidden text-[10px] uppercase tracking-[0.3em] text-[#b8912e]/60 lg:block">
                  {lang === 'ar' ? 'الجامع الكبير بالقيروان' : 'Grande Mosquée de Kairouan'}
                </p>
              </>
            )}
          </div>

          <div className="relative mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-24">
            <div className="lg:max-w-[52%]">
              <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.35em] text-[#b8912e]">
                {lang === 'ar'
                  ? pages?.contactEyebrowAr || DEFAULT_VISIT_EYEBROW_AR
                  : pages?.contactEyebrow || DEFAULT_VISIT_EYEBROW}
              </p>
              <h2 id="footer-visit-title" className="font-display text-4xl leading-[1.08] md:text-5xl">
                {lang === 'ar'
                  ? pages?.contactTitleAr || DEFAULT_VISIT_TITLE_AR
                  : pages?.contactTitle || DEFAULT_VISIT_TITLE}
              </h2>

              <div className="mt-12 grid gap-10 border-t border-[#faf6f3]/15 pt-10 sm:grid-cols-3">
                <div>
                  <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-[#b8912e]">
                    {lang === 'ar' ? 'العنوان' : 'Adresse'}
                  </h3>
                  <p className="text-lg font-light leading-relaxed text-[#faf6f3]/85">
                    M3MG+VJP
                    <br />
                    {lang === 'ar' ? 'القيروان، تونس' : 'Kairouan, Tunisie'}
                  </p>
                  <a href={MAPS_URL} target="_blank" rel="noreferrer" className="arrow-link mt-5">
                    {lang === 'ar' ? 'افتح في خرائط جوجل' : 'Ouvrir dans Google Maps'}
                    <svg width="18" height="10" viewBox="0 0 18 10" fill="none" aria-hidden="true" className={lang === 'ar' ? 'rotate-180' : ''}>
                      <path d="M0 5h16M12 1l4 4-4 4" stroke="currentColor" strokeWidth="1.4" />
                    </svg>
                  </a>
                </div>

                <div>
                  <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-[#b8912e]">
                    {lang === 'ar' ? 'أوقات العمل' : 'Horaires'}
                  </h3>
                  <p className="text-lg font-light leading-relaxed text-[#faf6f3]/85">
                    {lang === 'ar' ? 'كل أيام الأسبوع' : 'Tous les jours'}
                    <br />
                    07h00 – 00h00
                  </p>
                  <p className="mt-4 text-sm font-light text-[#faf6f3]/55">
                    {lang === 'ar'
                      ? 'المقروض يُحضّر ويُطهى كل صباح — تعالوا باكرًا لتجربة أحدث الأصناف.'
                      : 'Makroudh façonné et cuit chaque matin — venez tôt pour les nouveautés du jour.'}
                  </p>
                </div>

                <div>
                  <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-[#b8912e]">
                    {lang === 'ar' ? 'للتواصل' : 'Contact'}
                  </h3>
                  <p className="text-lg font-light leading-relaxed text-[#faf6f3]/85">
                    <a href={PHONE_TEL} className="transition-colors hover:text-[#b8912e]" dir="ltr">
                      {PHONE_DISPLAY}
                    </a>
                  </p>
                  <p className="mt-2 text-sm font-light text-[#faf6f3]/70">
                    <a href={`mailto:${EMAIL}`} className="transition-colors hover:text-[#b8912e]" dir="ltr">
                      {EMAIL}
                    </a>
                  </p>
                  <a href={MESSENGER_URL} target="_blank" rel="noreferrer" className="arrow-link mt-5">
                    {lang === 'ar' ? 'راسلونا عبر ماسنجر' : 'Écrire sur Messenger'}
                    <svg width="18" height="10" viewBox="0 0 18 10" fill="none" aria-hidden="true" className={lang === 'ar' ? 'rotate-180' : ''}>
                      <path d="M0 5h16M12 1l4 4-4 4" stroke="currentColor" strokeWidth="1.4" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            {!banner && (
              <div className="mt-12 h-40 lg:hidden" aria-hidden="true">
                <KairouanSkyline className="h-full w-full" />
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Marque, réseaux sociaux et plan du site ── */}
      <div className="border-t border-[#faf6f3]/10">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-14 md:px-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <Link to={lang === 'ar' ? '/ar' : '/'} className="inline-flex items-center gap-4">
              <img
                src="/images/logo.webp"
                alt=""
                className="h-14 w-14 md:h-16 md:w-16"
                loading="lazy"
                width="64"
                height="64"
              />
              <span>
                <span className="block font-display text-2xl tracking-[0.18em]">CHEZ LAZIZ</span>
                <span className="block font-display text-base text-[#b8912e]" lang="ar" dir="rtl">
                  عند لعزيز
                </span>
              </span>
            </Link>
            <p className="mt-6 max-w-sm text-sm font-light leading-relaxed text-[#faf6f3]/60">
              {lang === 'ar' ? data?.taglineAr || DEFAULT_TAGLINE_AR : data?.tagline || DEFAULT_TAGLINE}
            </p>

            <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#b8912e]">
              {lang === 'ar' ? 'تابعونا' : 'Suivez-nous'}
            </p>
            <ul className="mt-4 flex flex-wrap items-center gap-3">
              {socials.map(s => (
                <li key={s.name}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={s.name}
                    title={s.name}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-[#faf6f3]/25 text-[#faf6f3]/80 transition-all duration-300 hover:border-[#b8912e] hover:text-[#b8912e]"
                  >
                    <Icon name={s.icon} />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <FooterColumn title={lang === 'ar' ? 'المتجر' : 'Boutique'} links={SHOP_LINKS} lang={lang} className="lg:col-span-2" />
          <FooterColumn title={lang === 'ar' ? 'عن الدار' : 'La Maison'} links={HOUSE_LINKS.map(([to, fr, ar]) => [to, fr, ar, false] as const)} lang={lang} className="lg:col-span-3" />

          <div className="lg:col-span-3">
            <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#b8912e]">
              {lang === 'ar' ? 'اطلب معنا' : 'Commander'}
            </p>
            <ul className="space-y-3 text-sm font-light text-[#faf6f3]/75">
              <li>
                <a
                  href={PHONE_TEL}
                  dir="ltr"
                  className="inline-flex items-center gap-2.5 transition-colors hover:text-[#b8912e]"
                >
                  <Icon name="Phone" size={16} />
                  {PHONE_DISPLAY}
                </a>
              </li>
              <li>
                <a
                  href={MESSENGER_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2.5 transition-colors hover:text-[#b8912e]"
                >
                  <Icon name="Messenger" size={16} />
                  Messenger
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${EMAIL}`}
                  dir="ltr"
                  className="inline-flex items-center gap-2.5 transition-colors hover:text-[#b8912e]"
                >
                  <Icon name="Mail" size={16} />
                  {EMAIL}
                </a>
              </li>
            </ul>
            <Link
              to={lang === 'ar' ? '/ar/commande' : '/commande'}
              className="gold-cta mt-6 inline-flex items-center justify-center rounded-full bg-[#b8912e] px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#2e2a27] transition-colors hover:bg-[#d4ab3a]"
            >
              {lang === 'ar' ? 'اطلب أونلاين' : 'Commander en ligne'}
            </Link>
            <p className="mt-4 text-xs font-light leading-relaxed text-[#faf6f3]/50">
              {lang === 'ar'
                ? `التوصيل لكل الجمهوريات التونسية خلال ${DELIVERY_TIME_LABEL} · ${formatTND(DELIVERY_FEE_MILLIMES)} د.ت · الدفع عند الاستلام أو عبر D17.`
                : `Livraison partout en Tunisie sous ${DELIVERY_TIME_LABEL} · ${formatTND(DELIVERY_FEE_MILLIMES)} TND · Paiement à la livraison ou D17.`}
            </p>
          </div>
        </div>
      </div>

      {/* ── Barre légale ── */}
      <div className="border-t border-[#faf6f3]/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 py-6 text-center text-xs font-light text-[#faf6f3]/45 md:flex-row md:px-10 md:text-left">
          <p>{data?.copyright || DEFAULT_COPYRIGHT}</p>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] uppercase tracking-[0.18em]">
            {LEGAL_LINKS.map(([to, labelFr, labelAr]) => (
              <Link key={to} to={to} className="transition-colors hover:text-[#b8912e]">
                {lang === 'ar' ? labelAr : labelFr}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  )
}
