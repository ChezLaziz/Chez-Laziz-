// Le nom court d'un produit : sa SAVEUR, sans la marque ni la famille.
//
// Le catalogue nomme les produits pour une étiquette — « Makroudh Blanc à la
// Vanille », « Makroudh Laziz aux Dattes ». Sur un bouton de filtre au doigt,
// ces noms se ressemblent tous : les trois premiers mots sont identiques et
// c'est le DERNIER qui distingue. Le client cherche « vanille », pas
// « makroudh blanc à la ».
//
// On coupe donc le bruit — jamais au point de ne plus rien laisser : s'il ne
// reste rien, on rend le nom entier. Un bouton vide serait pire qu'un bouton
// long.

/** Ce qui ne distingue JAMAIS : la famille, la marque, les liaisons.
 * En arabe comme en français, parce que les deux catalogues existent. */
const BRUIT = new Set([
  "makroudh",
  "laziz",
  "aux",
  "au",
  "à",
  "a",
  "la",
  "le",
  "les",
  "de",
  "du",
  "-",
  "مقروض",
  "لعزيز",
]);

/** Ce qui ne distingue que TANT QU'AUTRE CHOSE reste.
 *
 * « Blanc » ne sert à rien dans « Makroudh Blanc à la Vanille » — la vanille
 * suffit. Mais dans « Makroudh Blanc Laziz », c'est le SEUL mot qui décrit le
 * produit : le couper laisserait un bouton nommé « Laziz », c'est-à-dire la
 * marque, la même sur les seize. */
const BRUIT_SI_AUTRE = new Set(["blanc", "blanche", "أبيض", "الأبيض"]);

function normalise(token: string): string {
  return token.toLowerCase().replace(/[–—-]/g, "-");
}

function estBruit(token: string): boolean {
  return BRUIT.has(normalise(token));
}

function estBruitFaible(token: string): boolean {
  return BRUIT.has(normalise(token)) || BRUIT_SI_AUTRE.has(normalise(token));
}

/** L'arabe colle la préposition au nom : « بالتمر » = « aux dattes ». Sur un
 * bouton, « التمر » se lit mieux et s'aligne avec les autres. */
function sansPrepositionAr(token: string): string {
  return /^بال./u.test(token) ? token.slice(1) : token;
}

/** Rogne aux deux bouts, jamais au milieu : « Fruits Secs » et « Café Laziz »
 * perdraient leur sens si on retirait un mot intérieur. */
function rogner(tokens: string[], bruit: (t: string) => boolean): string[] {
  let debut = 0;
  let fin = tokens.length;
  while (fin - debut > 1 && bruit(tokens[debut])) debut++;
  while (fin - debut > 1 && bruit(tokens[fin - 1])) fin--;
  return tokens.slice(debut, fin);
}

/** « Makroudh Blanc à la Vanille » → « Vanille » ; « مقروض لعزيز بالتمر » →
 * « التمر » ; « Makroudh Blanc Laziz » → « Blanc ». */
export function flavourName(fullName: string): string {
  const tokens = fullName.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return fullName;

  // Deux passes : d'abord ce qui ne distingue jamais, ensuite seulement ce
  // qui ne distingue que s'il reste autre chose.
  const premier = rogner(tokens, estBruit);
  const resteDuSens = premier.some((t) => !estBruitFaible(t));
  const final = resteDuSens ? rogner(premier, estBruitFaible) : premier;

  const court = final.map((t, i) => (i === 0 ? sansPrepositionAr(t) : t)).join(" ").trim();
  return court || fullName;
}
