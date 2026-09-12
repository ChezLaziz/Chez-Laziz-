import { Link, useLocation } from 'react-router'
import { useLang, useIsBilingualPage, altLangPath } from '@/lib/i18n'
import FlagIcon from './FlagIcon'

/** Sélecteur de langue à deux segments (FR | عربي), avec drapeau, toujours
 * visible dans la barre d'en-tête — y compris sur mobile, où il était
 * auparavant caché au fond du menu hamburger, donc introuvable.
 *
 * Un drapeau et un mot, pas la lettre « ع » seule : c'est le premier geste
 * d'un visiteur venu d'une publicité, et une lettre isolée dans une pastille
 * grise ne se lit pas comme « choisissez votre langue ».
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
  // Drapeau + libellé, et une cible d'au moins 40 px : c'est le premier
  // geste d'un visiteur venu d'une publicité, il doit être visible et
  // atteignable au pouce, pas deviné.
  const seg = `flex items-center justify-center gap-1.5 rounded-full font-semibold leading-none transition-colors ${
    big ? 'min-h-11 px-4 text-sm' : 'min-h-10 px-3 text-[13px]'
  }`
  const flagCls = big ? 'h-4 w-6' : 'h-3.5 w-5'
  // Sur la photo (tone « dark »), une pastille crème cerclée d'or : elle
  // se détache de n'importe quel fond, et c'est la seule couleur de marque
  // de la barre. Sur fond clair, la version sobre.
  const activeCls = tone === 'light' ? 'bg-ink text-[#faf6f3]' : 'bg-white text-ink shadow-sm'
  const idleCls = tone === 'light' ? 'text-ink/60' : 'text-ink/65'
  const frameCls =
    tone === 'light' ? 'border-ink/25 bg-white/60' : 'border-[#b8912e]/70 bg-[#faf6f3]/95'

  return (
    <div
      className={`flex shrink-0 items-center gap-0.5 rounded-full border p-0.5 ${frameCls}`}
      role="group"
      aria-label={lang === 'ar' ? 'اللغة' : 'Langue'}
    >
      {(['fr', 'ar'] as const).map((code) => {
        const isCurrent = code === lang
        // « عربي » plutôt que « ع » : une seule lettre ne se lit pas comme
        // un nom de langue. Le drapeau tunisien, et non un drapeau
        // panarabe : les clients sont tunisiens.
        const label = code === 'ar' ? 'العربية' : 'Français'
        const short = code === 'ar' ? 'عربي' : 'FR'
        return isCurrent ? (
          <span key={code} aria-current="true" className={`${seg} ${activeCls}`} title={label}>
            <FlagIcon lang={code} className={flagCls} />
            <span>{short}</span>
          </span>
        ) : (
          <Link
            key={code}
            to={href}
            lang={code}
            hrefLang={code}
            aria-label={label}
            title={label}
            className={`${seg} ${idleCls}`}
          >
            <FlagIcon lang={code} className={flagCls} />
            <span>{short}</span>
          </Link>
        )
      })}
    </div>
  )
}
