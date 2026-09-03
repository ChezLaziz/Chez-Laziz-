/** Métadonnées des articles du Journal — utilisées par l'index et par
 * chaque page d'article (titre, extrait, lien) pour rester synchronisées. */
export const ARTICLES = [
  {
    slug: 'quest-ce-que-le-makroudh-tunisien',
    title: 'Qu\'est-ce que le makroudh tunisien ?',
    excerpt:
      'Origines, ingrédients et place du makroudh dans la pâtisserie tunisienne — une présentation complète pour qui découvre cette douceur.',
  },
  {
    slug: 'makroudh-kairouan-histoire-tradition',
    title: 'Makroudh de Kairouan : histoire, tradition et savoir-faire',
    excerpt:
      'Pourquoi Kairouan est associée au makroudh dans tout le pays, et comment cette réputation continue de se transmettre aujourd\'hui.',
  },
  {
    slug: 'comment-est-prepare-le-makroudh',
    title: 'Comment est préparé le véritable makroudh tunisien ?',
    excerpt:
      'De la pâte de semoule au bain de miel, les étapes de fabrication du makroudh — et ce qui distingue un makroudh fait main.',
  },
] as const
