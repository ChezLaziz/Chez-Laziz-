import { useLang } from '@/lib/i18n'

const STEPS = [
  {
    n: '01',
    title: 'La semoule',
    titleAr: 'السميد',
    text: 'Une pâte de semoule fine, pétrie avec de l\'huile d\'olive — le mariage des céréales du nord et de l\'huile du Sahel qui a toujours fait la richesse de la cuisine tunisienne.',
    textAr:
      'عجينة سميد رقيقة، معجونة بزيت الزيتون — تزاوج حبوب الشمال وزيت الساحل اللي ديمة عطى ثراء المطبخ التونسي.',
    img: '/images/hands.webp',
  },
  {
    n: '02',
    title: 'Le façonnage',
    titleAr: 'التشكيل',
    text: 'La pâte est roulée, garnie de pâte de dattes, puis façonnée à la main dans un moule en bois sculpté — un geste transmis de génération en génération, jamais mécanisé.',
    textAr:
      'العجينة تُرقّق، تُحشى بعجينة التمر، وبعدها تُشكّل باليد في قالب خشبي منقوش — حركة تنتقل من جيل لجيل، ما تمكننتش أبدًا.',
    img: '/images/makroudh.webp',
  },
  {
    n: '03',
    title: 'Le miel',
    titleAr: 'العسل',
    text: 'Après la friture, chaque pièce est plongée dans un sirop de miel encore tiède, qui lui donne son brillant doré et sa texture fondante caractéristique.',
    textAr: 'بعد القلي، كل قطعة تُغمس في شراب عسل مازال دافئ، يعطيها بريقها الذهبي وطراوتها المميزة.',
    img: '/images/display.webp',
  },
]

export default function MakroudhHistory() {
  const isAr = useLang() === 'ar'
  return (
    <section className="bg-cream py-24 md:py-36">
      <div className="mx-auto max-w-5xl px-5 text-center md:px-10">
        <p data-reveal className="mb-5 text-[11px] font-medium uppercase tracking-[0.35em] text-accent">
          {isAr ? 'شوية من التاريخ' : "Un peu d'histoire"}
        </p>
        <h2 data-reveal className="font-display text-4xl leading-tight md:text-5xl">
          {isAr ? 'المقروض، فخر القيروان' : 'Le makroudh, fierté de Kairouan'}
        </h2>
        {isAr ? (
          <div className="mx-auto mt-8 max-w-2xl space-y-5 text-[15px] font-light leading-relaxed text-ink/75">
            <p>
              المقروض (مقروض، أي «على شكل معين») هو من أشهر الحلويات في المغرب العربي. أساسه — عجينة سميد محشوة
              بعجينة التمر، تُقلى وبعدها تُغمس في شراب معطّر — موجود في كامل المنطقة، لكن القيروان هي المدينة
              اللي يرتبط بيها أكثر.
            </p>
            <p>
              حسب الرواية الشفوية المحلية، هذي الحرفة ترجع للعصر الأغلبي (القرن التاسع)، وقتاش كانت القيروان
              عاصمة مزدهرة للعالم الإسلامي. الزنقة التاريخية المؤدية للجامع الكبير عقبة ابن نافع كانت تأوي في
              وقتها الحرفيين اللي كانو يشكّلو المقروض جنب الحدادين والنسّاجين — حرفة يومية، تنتقل يد بيد أكثر
              مما تُكتب.
            </p>
            <p>اليوم، كل معين عسل يحكي هذي القصة: قصة مدينة حوّلت عجينة سميد وتمر بسيطة لرمز من هويتها.</p>
          </div>
        ) : (
          <div className="mx-auto mt-8 max-w-2xl space-y-5 text-[15px] font-light leading-relaxed text-ink/75">
            <p>
              Le makroudh (مقروض, littéralement « en forme de losange ») est l'une des
              pâtisseries les plus emblématiques du Maghreb. Sa base — une pâte de
              semoule garnie de pâte de dattes, frite puis trempée dans un sirop
              parfumé — se retrouve dans toute la région, mais c'est à Kairouan qu'il
              est le plus étroitement associé.
            </p>
            <p>
              Selon la tradition orale locale, le savoir-faire remonterait à l'époque
              aghlabide (IXe siècle), lorsque Kairouan était une capitale florissante
              du monde islamique. La rue historique menant à la Grande Mosquée Okba
              Ibn Nafaa abritait autrefois les artisans qui façonnaient déjà le
              makroudh aux côtés des ferronniers et des tisserands — un artisanat du
              quotidien, transmis de main en main plutôt que par écrit.
            </p>
            <p>
              Aujourd'hui encore, chaque losange de miel raconte cette histoire :
              celle d'une ville qui a fait d'une simple pâte de semoule et de dattes
              un symbole de son identité.
            </p>
          </div>
        )}
      </div>

      <div className="mx-auto mt-20 max-w-6xl px-5 md:px-10">
        <div className="grid gap-10 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} data-reveal className="flex flex-col">
              <div className="mask-reveal aspect-[4/5]">
                <img src={s.img} alt={isAr ? s.titleAr : s.title} className="h-full w-full object-cover" loading="lazy" />
              </div>
              <p className="mt-5 font-display text-3xl text-[#b8912e]/50">{s.n}</p>
              <h3 className="mt-1 font-display text-xl">{isAr ? s.titleAr : s.title}</h3>
              <p className="mt-2 text-sm font-light leading-relaxed text-ink/65">{isAr ? s.textAr : s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
