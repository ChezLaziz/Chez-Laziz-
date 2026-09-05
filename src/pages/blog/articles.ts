/** Métadonnées des articles du Journal — utilisées par l'index et par
 * chaque page d'article (titre, extrait, lien) pour rester synchronisées. */
export const ARTICLES = [
  {
    slug: 'quest-ce-que-le-makroudh-tunisien',
    title: 'Qu\'est-ce que le makroudh tunisien ?',
    titleAr: 'شنية المقروض التونسي؟',
    excerpt:
      'Origines, ingrédients et place du makroudh dans la pâtisserie tunisienne — une présentation complète pour qui découvre cette douceur.',
    excerptAr:
      'الأصول، المكونات، ومكانة المقروض في الحلويات التونسية — تقديم كامل لمن يكتشف هذي الحلوى لأول مرة.',
  },
  {
    slug: 'makroudh-kairouan-histoire-tradition',
    title: 'Makroudh de Kairouan : histoire, tradition et savoir-faire',
    titleAr: 'مقروض القيروان: التاريخ، التقليد والحرفة',
    excerpt:
      'Pourquoi Kairouan est associée au makroudh dans tout le pays, et comment cette réputation continue de se transmettre aujourd\'hui.',
    excerptAr: 'ليش القيروان مرتبطة بالمقروض في كامل البلاد، وكيفاش هذي السمعة مازالت تتناقل لليوم.',
  },
  {
    slug: 'comment-est-prepare-le-makroudh',
    title: 'Comment est préparé le véritable makroudh tunisien ?',
    titleAr: 'كيفاش يُحضّر المقروض التونسي الحقيقي؟',
    excerpt:
      'De la pâte de semoule au bain de miel, les étapes de fabrication du makroudh — et ce qui distingue un makroudh fait main.',
    excerptAr: 'من عجينة السميد لحمام العسل، خطوات صناعة المقروض — وشنية اللي يميّز المقروض المصنوع باليد.',
  },
] as const
