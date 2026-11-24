import { formatDinars } from '@contracts/shop'

/** Le prix, en étiquette rouge (voir .prix-etiquette dans index.css).
 *
 * Le nombre et l'unité sont séparés : le nombre est ce qu'on lit en premier,
 * il est deux fois plus grand que « DT ». `per` dit ce que ce prix achète —
 * « le kilo », « le pack » — parce qu'un prix sans son unité se lit comme
 * le prix de la boîte entière. */
export default function PriceSticker({
  millimes,
  lang,
  per,
  size = 'md',
  className = '',
}: {
  millimes: number
  lang: 'fr' | 'ar'
  per?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const num = size === 'lg' ? 'text-[28px]' : size === 'sm' ? 'text-[17px]' : 'text-[21px]'
  const unit = size === 'lg' ? 'text-[13px]' : 'text-[11px]'
  return (
    <span className={`prix-etiquette ${className}`}>
      <span className="flex items-baseline gap-1">
        <span className={`${num} font-bold`}>{formatDinars(millimes)}</span>
        <span className={`${unit} font-bold`}>{lang === 'ar' ? 'د.ت' : 'DT'}</span>
      </span>
      {per && <span className="mt-[3px] text-[10px] font-medium opacity-90">{per}</span>}
    </span>
  )
}
