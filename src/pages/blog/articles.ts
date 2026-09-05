/** Métadonnées des articles du Journal — utilisées par l'index et par
 * chaque page d'article (titre, extrait, lien) pour rester synchronisées.
 * `image`/`imageAlt(Ar)` alimentent l'illustration en tête d'article et
 * l'aperçu og:image/Article JSON-LD (voir useSEO). `related` liste 2-3
 * slugs d'articles à suggérer en fin de lecture. */
export const ARTICLES = [
  {
    slug: 'quest-ce-que-le-makroudh-tunisien',
    title: 'Qu\'est-ce que le makroudh tunisien ?',
    titleAr: 'شنية المقروض التونسي؟',
    excerpt:
      'Origines, ingrédients et place du makroudh dans la pâtisserie tunisienne — une présentation complète pour qui découvre cette douceur.',
    excerptAr:
      'الأصول، المكونات، ومكانة المقروض في الحلويات التونسية — تقديم كامل لمن يكتشف هذي الحلوى لأول مرة.',
    image: '/images/hero.webp',
    imageAlt: 'Makroudh Chez Laziz, façonnés à la main',
    imageAltAr: 'مقروض عند لعزيز، مصنوع يدويًا',
    related: ['comment-est-prepare-le-makroudh', 'makroudh-kairouan-histoire-tradition', 'faq-makroudh'],
  },
  {
    slug: 'makroudh-kairouan-histoire-tradition',
    title: 'Makroudh de Kairouan : histoire, tradition et savoir-faire',
    titleAr: 'مقروض القيروان: التاريخ، التقليد والحرفة',
    excerpt:
      'Pourquoi Kairouan est associée au makroudh dans tout le pays, et comment cette réputation continue de se transmettre aujourd\'hui.',
    excerptAr: 'ليش القيروان مرتبطة بالمقروض في كامل البلاد، وكيفاش هذي السمعة مازالت تتناقل لليوم.',
    image: '/images/maison.webp',
    imageAlt: 'La maison Chez Laziz, savoir-faire kairouanais',
    imageAltAr: 'دار عند لعزيز، حرفة قيروانية',
    related: ['pourquoi-kairouan-makroudh', 'quest-ce-que-le-makroudh-tunisien', 'comment-est-prepare-le-makroudh'],
  },
  {
    slug: 'comment-est-prepare-le-makroudh',
    title: 'Comment est préparé le véritable makroudh tunisien ?',
    titleAr: 'كيفاش يُحضّر المقروض التونسي الحقيقي؟',
    excerpt:
      'De la pâte de semoule au bain de miel, les étapes de fabrication du makroudh — et ce qui distingue un makroudh fait main.',
    excerptAr: 'من عجينة السميد لحمام العسل، خطوات صناعة المقروض — وشنية اللي يميّز المقروض المصنوع باليد.',
    image: '/images/hands.webp',
    imageAlt: 'Façonnage à la main du makroudh',
    imageAltAr: 'تشكيل المقروض باليد',
    related: ['quest-ce-que-le-makroudh-tunisien', 'comment-choisir-son-makroudh', 'makroudh-el-louz-vs-traditionnel'],
  },
  {
    slug: 'makroudh-vs-baklava-difference',
    title: 'Makroudh ou baklava : quelle différence ?',
    titleAr: 'المقروض ولا البقلاوة: شنية الفرق؟',
    excerpt:
      "Deux douceurs souvent confondues, mais très différentes dans la pâte, la cuisson et l'origine — le comparatif complet.",
    excerptAr: 'حلويان يتخلطو بزاف بينهم، لكن مختلفين بزاف في العجينة والطهي والأصل — المقارنة الكاملة.',
    image: '/images/makroudh.webp',
    imageAlt: 'Makroudh Chez Laziz, façonnés à la main',
    imageAltAr: 'مقروض عند لعزيز، مصنوع يدويًا',
    related: ['makroudh-el-louz-vs-traditionnel', 'comment-choisir-son-makroudh', 'faq-makroudh'],
  },
  {
    slug: 'comment-choisir-son-makroudh',
    title: 'Comment bien choisir son makroudh : le guide complet',
    titleAr: 'كيفاش تختار مقروض بنّان: الدليل الكامل',
    excerpt:
      'Texture, garniture, sirop, origine — les signes qui distinguent un bon makroudh artisanal d\'un makroudh industriel.',
    excerptAr: 'القوام، الحشوة، الشراب، الأصل — العلامات اللي تفرّق بين مقروض حرفي بنّان ومقروض صناعي.',
    image: '/images/display.webp',
    imageAlt: 'Présentoir de makroudh Chez Laziz',
    imageAltAr: 'عرض المقروض عند لعزيز',
    related: ['prix-makroudh-tunisie', 'comment-est-prepare-le-makroudh', 'duree-conservation-makroudh'],
  },
  {
    slug: 'duree-conservation-makroudh',
    title: 'Combien de temps se conserve le makroudh ? Le guide pratique',
    titleAr: 'قداش يدوم المقروض؟ الدليل العملي',
    excerpt:
      "À température ambiante, au frigo ou au congélateur : comment conserver son makroudh sans perdre sa texture ni son goût.",
    excerptAr: 'في درجة حرارة الغرفة، في الثلاجة ولا في الفريزر: كيفاش تحافظ على مقروضك بلا ما يخسر قوامه ولا طعمه.',
    image: '/images/box.webp',
    imageAlt: 'Boîte cadeau de makroudh Chez Laziz',
    imageAltAr: 'علبة هدية مقروض عند لعزيز',
    related: ['comment-choisir-son-makroudh', 'faq-makroudh', 'makroudh-idee-cadeau'],
  },
  {
    slug: 'makroudh-idee-cadeau',
    title: 'Le makroudh, une idée cadeau tunisienne par excellence',
    titleAr: 'المقروض، فكرة هدية تونسية بامتياز',
    excerpt:
      "Pour l'Aïd, un mariage ou simplement pour faire plaisir : pourquoi le makroudh reste l'un des cadeaux les plus appréciés en Tunisie.",
    excerptAr: 'للعيد، لعرس، ولا بس باش تفرّح حد: ليش المقروض يبقى من أكثر الهدايا المحبوبة في تونس.',
    image: '/images/visit-lifestyle.webp',
    imageAlt: 'Makroudh Chez Laziz offert en cadeau',
    imageAltAr: 'مقروض عند لعزيز يُهدى',
    related: ['nouvelles-saveurs-makroudh-blanc', 'duree-conservation-makroudh', 'makroudh-tunisiens-etranger'],
  },
  {
    slug: 'makroudh-el-louz-vs-traditionnel',
    title: "Makroudh el louz ou makroudh traditionnel : lequel choisir ?",
    titleAr: 'مقروض اللوز ولا المقروض التقليدي: شنو تختار؟',
    excerpt:
      "Semoule frite au miel ou pâte d'amande non frite : deux makroudh très différents, pour deux envies différentes.",
    excerptAr: 'سميد مقلي بالعسل ولا عجينة لوز بلا قلي: مقروضان مختلفان بزاف، لكل وحد رغبته.',
    image: '/images/makroudh.webp',
    imageAlt: 'Makroudh Chez Laziz, façonnés à la main',
    imageAltAr: 'مقروض عند لعزيز، مصنوع يدويًا',
    related: ['makroudh-vs-baklava-difference', 'comment-est-prepare-le-makroudh', 'comment-choisir-son-makroudh'],
  },
  {
    slug: 'prix-makroudh-tunisie',
    title: 'Prix du makroudh en Tunisie : à quoi ça dépend vraiment',
    titleAr: 'ثمن المقروض في تونس: على شنو يتوقف بالضبط',
    excerpt:
      "Qualité des dattes, miel réel ou sirop de sucre, fait main ou industriel : ce qui explique les écarts de prix.",
    excerptAr: 'جودة التمر، عسل حقيقي ولا شراب سكر، صناعة يدوية ولا صناعية: شنية اللي يفسّر فرق الأسعار.',
    image: '/images/display.webp',
    imageAlt: 'Présentoir de makroudh Chez Laziz',
    imageAltAr: 'عرض المقروض عند لعزيز',
    related: ['comment-choisir-son-makroudh', 'faq-makroudh', 'quest-ce-que-le-makroudh-tunisien'],
  },
  {
    slug: 'makroudh-tunisiens-etranger',
    title: "Makroudh pour les Tunisiens de l'étranger : comment en trouver du vrai",
    titleAr: 'المقروض للتوانسة بره تونس: كيفاش تلقى الأصلي',
    excerpt:
      "Nostalgie du pays, cadeaux à la famille en visite : ce qu'il faut savoir pour retrouver le goût du vrai makroudh loin de la Tunisie.",
    excerptAr: 'حنين للبلاد، هدايا للعائلة في الزيارة: شنو لازم تعرفو باش تلقاو طعم المقروض الأصلي بعيد على تونس.',
    image: '/images/tea.webp',
    imageAlt: 'Makroudh servi avec le thé, moment de partage',
    imageAltAr: 'مقروض مقدّم مع الشاي، لحظة تجمّع',
    related: ['makroudh-idee-cadeau', 'duree-conservation-makroudh', 'quest-ce-que-le-makroudh-tunisien'],
  },
  {
    slug: 'faq-makroudh',
    title: 'FAQ makroudh : toutes les réponses aux questions les plus posées',
    titleAr: 'أسئلة شائعة عن المقروض: كل الأجوبة',
    excerpt:
      "Ingrédients, gluten, calories, conservation, origine : les réponses courtes et claires aux questions qu'on nous pose le plus souvent.",
    excerptAr: 'المكونات، الغلوتين، السعرات، الحفظ، الأصل: أجوبة قصيرة وواضحة على الأسئلة اللي نتلقاوها أكثر.',
    image: '/images/hero.webp',
    imageAlt: 'Makroudh Chez Laziz, façonnés à la main',
    imageAltAr: 'مقروض عند لعزيز، مصنوع يدويًا',
    related: ['duree-conservation-makroudh', 'makroudh-vs-baklava-difference', 'quest-ce-que-le-makroudh-tunisien'],
  },
  {
    slug: 'pourquoi-kairouan-makroudh',
    title: 'Pourquoi Kairouan est la capitale historique du makroudh',
    titleAr: 'ليش القيروان عاصمة المقروض التاريخية',
    excerpt:
      "Ce qui a fait de Kairouan, bien avant les autres villes tunisiennes, la référence incontournable du makroudh.",
    excerptAr: 'شنية اللي خلّى القيروان، قبل كل المدن التونسية الأخرى، المرجع الأول للمقروض.',
    image: '/images/maison-detail.webp',
    imageAlt: 'Détail de la maison Chez Laziz à Kairouan',
    imageAltAr: 'تفصيل من دار عند لعزيز بالقيروان',
    related: ['makroudh-kairouan-histoire-tradition', 'quest-ce-que-le-makroudh-tunisien', 'comment-est-prepare-le-makroudh'],
  },
  {
    slug: 'nouvelles-saveurs-makroudh-blanc',
    title: 'Makroudh blanc : nos nouvelles saveurs exclusives',
    titleAr: 'المقروض الأبيض: نكهاتنا الجديدة الحصرية',
    excerpt:
      'Pistache, vanille, figues, ananas, fraise, noisette, café et zgougou : la nouvelle collection Chez Laziz, jamais vue ailleurs.',
    excerptAr: 'فستق، فانيليا، تين، أناناس، فراولة، بندق، قهوة وزقوقو: التشكيلة الجديدة عند لعزيز، ما شفتوهاش في مكان آخر.',
    image: '/api/uploads/products/1788456598490-8563f2da7a54.jpg',
    imageAlt: 'Makroudh blanc Chez Laziz, nouvelle collection',
    imageAltAr: 'المقروض الأبيض عند لعزيز، التشكيلة الجديدة',
    related: ['makroudh-idee-cadeau', 'comment-choisir-son-makroudh', 'makroudh-el-louz-vs-traditionnel'],
  },
] as const
