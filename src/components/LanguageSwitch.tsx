import { Link, useLocation } from 'react-router'
import { useLang, useIsBilingualPage, altLangPath } from '@/lib/i18n'

/** Sélecteur de langue à deux segments (FR | ع), toujours visible dans la
 * barre d'en-tête — y compris sur mobile, où il était auparavant caché au
 * fond du menu hamburger, donc introuvable.
 *
 * Les deux options sont affichées en permanence, avec la langue courante
 * mise en évidence : un bouton qui n'affiche que la langue cible ("عربي")
 * ne se lit pas comme un interrupteur, il se lit comme un lien de menu.
 *
 * Sur une page qui n'a pas encore de version arabe (voir
 * BILINGUAL_BASE_PATHS), le segment arabe renvoie vers l'accueil arabe
 * plutôt que de disparaître : mieux vaut arriver sur /ar que ne trouver
 * aucun moyen de passer en arabe. */
export default function LanguageSwitch({ tone, size = 'sm' }: { tone: 'light' | 'dark'; size?: 'sm' | 'lg' }) {
  const { pathname, search } = useLocation()
  const lang = useLang()
  const bilingual = useIsBilingualPage()
  const target = lang === 'ar' ? 'fr' : 'ar'
  // Page traduite → on reste sur la même page ; sinon on bascule sur
  // l'accueil de l'autre langue.
  const href = bilingual ? altLangPath(pathname, search, target) : target === 'ar' ? '/ar' : '/'

  const big = size === 'lg'
  const seg = `flex items-center justify-center rounded-full font-semibold leading-none transition-colors ${
    big ? 'min-h-11 min-w-[52px] px-4 text-sm' : 'min-h-8 min-w-[38px] px-2.5 text-xs'
  }`
  const activeCls = tone === 'light' ? 'bg-ink text-[#faf6f3]' : 'bg-[#faf6f3] text-ink'
  const idleCls = tone === 'light' ? 'text-ink/60' : 'text-[#faf6f3]/80'
  const frameCls =
    tone === 'light' ? 'border-ink/25 bg-white/60' : 'border-[#faf6f3]/50 bg-[#2e2a27]/25 backdrop-blur-sm'

  return (
    <div
      className={`flex shrink-0 items-center gap-0.5 rounded-full border p-0.5 ${frameCls}`}
      role="group"
      aria-label={lang === 'ar' ? 'اللغة' : 'Langue'}
    >
      {(['fr', 'ar'] as const).map((code) => {
        const isCurrent = code === lang
        const label = code === 'ar' ? 'ع' : 'FR'
        const full = code === 'ar' ? 'العربية' : 'Français'
        return isCurrent ? (
          <span key={code} aria-current="true" className={`${seg} ${activeCls}`} title={full}>
            {label}
          </span>
        ) : (
          <Link key={code} to={href} lang={code} hrefLang={code} aria-label={full} title={full} className={`${seg} ${idleCls}`}>
            {label}
          </Link>
        )
      })}
    </div>
  )
}
