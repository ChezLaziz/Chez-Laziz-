// Les pages qui ne sont PAS le site public : le tableau de bord, et l'écran
// posé dans l'atelier.
//
// Elles ne comptent pas comme des visites — une tablette laissée allumée
// toute la journée dans l'atelier gonflerait les chiffres de fréquentation
// avec du personnel, et la mesure d'une publicité deviendrait fausse. Elles
// n'affichent pas non plus la bannière cookies : elle s'adresse à un client,
// pas à quelqu'un qui travaille ici.
//
// Une seule liste, partagée, pour que ces deux règles ne puissent pas
// diverger le jour où une page interne s'ajoute.

const CHEMINS_INTERNES = ["/admin", "/atelier"];

export function estCheminInterne(pathname: string): boolean {
  return CHEMINS_INTERNES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
