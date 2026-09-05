import { useLang } from '@/lib/i18n'

const MAPS_URL =
  'https://www.google.com/maps/place/Chez+laziz+%D8%A7%D9%84%D9%82%D9%8A%D8%B1%D9%88%D8%A7%D9%86/data=!4m2!3m1!1s0x12fdcf004a648cdf:0xacd6eabb156c7203'

function Stars({ isAr }: { isAr: boolean }) {
  return (
    <span className="flex gap-1" aria-label={isAr ? '5 نجوم من 5' : '5 étoiles sur 5'}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="18" height="18" viewBox="0 0 24 24" fill="#b8912e" aria-hidden="true">
          <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" />
        </svg>
      ))}
    </span>
  )
}

export default function Reviews() {
  const isAr = useLang() === 'ar'
  return (
    <section className="bg-cream py-20 md:py-28">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-5 text-center md:px-10">
        <div data-reveal className="flex flex-col items-center gap-3">
          <Stars isAr={isAr} />
          <p className="font-display text-4xl md:text-5xl">5,0</p>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-warm">
            {isAr ? 'المعدل — آراء جوجل' : 'Note moyenne — Avis Google'}
          </p>
        </div>
        <p data-reveal className="max-w-xl text-[15px] font-light leading-relaxed text-ink/70">
          {isAr
            ? 'زبائننا كلهم راضين — نشكركم على ثقتكم. رأيكم يهمنا: شاركونا تجربتكم مع عند لعزيز.'
            : 'Nos clients sont unanimes — merci pour votre confiance. Votre avis compte : partagez votre expérience chez Laziz.'}
        </p>
        <a
          data-reveal
          href={MAPS_URL}
          target="_blank"
          rel="noreferrer"
          className="arrow-link"
        >
          {isAr ? 'اكتبو رأيكم في جوجل' : 'Laisser un avis sur Google'}
          <svg width="18" height="10" viewBox="0 0 18 10" fill="none" aria-hidden="true" className={isAr ? 'rotate-180' : ''}>
            <path d="M0 5h16M12 1l4 4-4 4" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </a>
      </div>
    </section>
  )
}
