/** Le corps de requête que Team Parcel Express attend pour créer un colis.
 *
 * CE FICHIER N'EST PAS UNE SUPPOSITION. Chaque champ vient d'une création de
 * colis réelle, capturée le 9 septembre 2026 dans l'onglet réseau du
 * navigateur pendant que leur propre interface envoyait la requête :
 *
 *   POST https://api.teamparcelexpress.com/api/orders/create/
 *   Authorization: Token …
 *   → 201 Created
 *   → {"id":"26487543","status":0,"external_id":null,"phone1":"21144513"}
 *
 * C'est la seule raison pour laquelle ce module peut exister : tant que la
 * forme n'était pas observée, un adaptateur deviné aurait envoyé de vrais
 * colis à de fausses adresses.
 *
 * DEUX PIÈGES, tous deux visibles dans la capture :
 *
 *   1. LES MONTANTS SONT EN DINARS. Leur `price_ttc` valait "47" pour une
 *      commande que nous stockons à 47000 millimes. Envoyer 47000 ferait
 *      réclamer quarante-sept mille dinars au client.
 *   2. `governorate` ET `delegation` SONT DES IDENTIFIANTS, pas des noms.
 *      Ils viennent de leur table, jamais d'une chaîne de caractères. */

import {
  amountToCollectMillimes,
  fullAddress,
  hasCompleteWeight,
  totalWeightKg,
  carrierPhone,
  type ShippableOrder,
} from "./carriers";

/** Ce que le transporteur appelle une destination : deux de ses propres
 * identifiants, résolus en amont par contracts/delegations.ts. */
export type TpeDestination = {
  governorateId: string;
  delegationId: string;
};

/** Frais de retour, en dinars.
 *
 * Valeur envoyée par leur propre interface avec ses réglages par défaut sur
 * le compte Chez Laziz. Ce n'est pas une invention, c'est ce qu'ils ont
 * transmis — et c'est le seul chiffre de ce module qui vienne de leur
 * paramétrage plutôt que de notre commande. */
export const TPE_RETURN_FEE_DINARS = 4;

/** Espèce à la livraison. Le seul mode observé, et le seul qui nous
 * concerne : une commande déjà payée part avec un montant nul, pas avec un
 * autre mode de paiement. */
const PAYMENT_METHOD_CASH = 0;

export type TpeProductLine = { product: string; quantity: string };

export type TpePayload = {
  name: string;
  phone1: string;
  phone2: string;
  governorate: number;
  delegation: number;
  address: string;
  price_ttc: string;
  price_delivery: number;
  price_return: number;
  payment_method: number;
  products: TpeProductLine[];
  weight: number | null;
  note: string;
  is_fragile: boolean;
  can_open_package: boolean;
  is_discharge: boolean;
  is_an_exchange: boolean;
  exchange_article: string;
  exchange_quantity: string;
  /** NOTRE référence. Leur réponse porte ce champ (à null quand leur propre
   * interface l'omet), donc ils le stockent. On l'envoie pour que chaque
   * colis chez eux pointe vers sa commande chez nous. S'ils l'ignorent, la
   * requête reste valide — on n'y perd rien. */
  external_id: string;
};

/** Le commentaire porté sur le colis.
 *
 * La note du client d'abord — c'est elle qui compte pour la livraison — puis
 * le poids réel quand on le connaît, parce que leur formulaire ne peut pas
 * le recevoir autrement (voir `weight` plus bas). Un poids incomplet n'est
 * pas écrit du tout plutôt qu'annoncé trop léger. */
export function shipmentNote(order: ShippableOrder): string {
  const parts = [(order.note ?? "").trim()];
  if (hasCompleteWeight(order.items)) {
    parts.push(`Poids ${totalWeightKg(order.items)} kg`);
  }
  return parts.filter((p) => p !== "").join(" — ");
}

/** Millimes → dinars, écrits comme un humain les écrirait.
 *
 * 47000 → « 47 », 47500 → « 47.500 ». Leur interface a envoyé une chaîne ;
 * on garde ce type plutôt que d'espérer qu'un flottant traverse le JSON sans
 * dommage. */
export function dinars(millimes: number): string {
  const fixed = (millimes / 1000).toFixed(3);
  return fixed.replace(/\.0+$/, "");
}

/** Ce que `carrier_status` veut dire pendant et après un envoi.
 *
 *   envoi_en_cours  la requête vers le transporteur est partie, la réponse
 *                   n'est pas encore revenue ;
 *   cree            le colis existe chez eux, `tracking_number` est posé ;
 *   incertain       la requête est partie mais la réponse ne reviendra pas —
 *                   le colis existe PEUT-ÊTRE. Personne ne renvoie sans
 *                   avoir vérifié chez eux.
 *
 * Nul = jamais envoyé, ou envoi refusé net (rien n'a été créé). */
export const SEND_STATUS = {
  inFlight: "envoi_en_cours",
  created: "cree",
  uncertain: "incertain",
} as const;

/** Raisons de REFUSER d'envoyer une commande.
 *
 * Chacune correspond à un colis qui partirait faux ou en double. Le refus se
 * fait ici, dans une fonction pure et testée, pas dans un écran. */
export type SendRefusal =
  /** Ville non reliée à une délégation : destination inconnue. */
  | "no_delegation"
  /** Déjà chez un transporteur : un deuxième envoi crée un doublon. */
  | "already_sent"
  /** Un envoi est parti il y a un instant et n'a pas encore répondu. */
  | "in_flight"
  /** Un envoi précédent n'a jamais répondu : le colis existe peut-être.
   *  Personne ne renvoie avant d'avoir vérifié chez le transporteur. */
  | "uncertain"
  /** Commande annulée. */
  | "cancelled"
  /** Sans téléphone exploitable, le livreur ne peut pas joindre le client. */
  | "no_phone"
  /** Sans adresse, il ne peut pas livrer. */
  | "no_address"
  /** Personne n'a encore appelé le client : on ne crée pas de colis pour
   * une commande dont on ne sait pas si elle est vraie. */
  | "not_confirmed";

export function refusalToSend(
  order: ShippableOrder & {
    status?: string;
    trackingNumber?: string | null;
    carrierStatus?: string | null;
  },
  destination: TpeDestination | null,
): SendRefusal | null {
  if (order.trackingNumber) return "already_sent";
  if (order.carrierStatus === SEND_STATUS.inFlight) return "in_flight";
  if (order.carrierStatus === SEND_STATUS.uncertain) return "uncertain";
  if (order.status === "annulee") return "cancelled";
  if (order.status === "nouvelle") return "not_confirmed";
  if (!destination) return "no_delegation";
  if (carrierPhone(order.phone) === null) return "no_phone";
  if (order.address.trim() === "") return "no_address";
  return null;
}

/** Construit le corps exact de la requête de création.
 *
 * Ne décide rien : la destination lui est fournie, déjà résolue. Elle ne
 * peut donc pas inventer un identifiant, quel que soit l'appelant. */
export function buildTpePayload(
  order: ShippableOrder,
  destination: TpeDestination,
): TpePayload {
  return {
    name: order.customerName.trim(),
    phone1: carrierPhone(order.phone) ?? order.phone.trim(),
    phone2: "",
    governorate: Number(destination.governorateId),
    delegation: Number(destination.delegationId),
    // Leur interface concatène adresse, délégation et gouvernorat sur une
    // seule ligne ; c'est aussi ce que produit `fullAddress`.
    address: fullAddress(order),
    // LA règle qui protège le client : une commande déjà payée part à zéro.
    // Sans elle, un client dont la commande est déjà encaissée paierait
    // une seconde fois à sa porte.
    price_ttc: dinars(amountToCollectMillimes(order)),
    price_delivery: order.deliveryFeeMillimes / 1000,
    price_return: TPE_RETURN_FEE_DINARS,
    payment_method: PAYMENT_METHOD_CASH,
    // Une ligne par article, avec son vrai nom : « MAKROUDH ×5 » cache que
    // le colis contient cinq recettes différentes.
    products: order.items.map((it) => ({
      product: it.name.trim(),
      quantity: String(it.qty),
    })),
    // TOUJOURS null. Leur champ `weight` N'EST PAS un poids en kilos : c'est
    // une clé étrangère vers leur table de tranches de poids. Y envoyer 3
    // pour trois kilos a été refusé net :
    //
    //   {"weight":["Clé primaire « 3 » non valide - l'objet n'existe pas."]}
    //
    // Leur propre interface envoie null, et le colis est accepté. On ne
    // connaît pas leurs identifiants de tranches et on n'en devine pas :
    // un mauvais identifiant ferait facturer la mauvaise tranche.
    weight: null,
    // Le poids réel ne disparaît pas pour autant — il passe dans le
    // commentaire, où le dépôt le lit pour choisir la bonne tranche.
    note: shipmentNote(order),
    // Du makroudh : fragile, et le client a le droit d'ouvrir avant de
    // payer. Décision commerciale de Chez Laziz, constante.
    is_fragile: true,
    can_open_package: true,
    is_discharge: false,
    is_an_exchange: false,
    exchange_article: "",
    exchange_quantity: "",
    external_id: `CL-${order.id}`,
  };
}

/** Ce que leur réponse nous apprend.
 *
 * Observée : {"id":"26487543","status":0,"external_id":null,"phone1":"…"}.
 * Le champ `id` est le numéro du colis — celui qui apparaît dans leur liste
 * et qu'on range dans `tracking_number`. */
export type TpeCreated = { trackingNumber: string; externalId: string | null };

/** Lit la réponse sans rien supposer de plus que ce qui a été observé.
 *
 * Renvoie null si aucun identifiant n'en sort : mieux vaut afficher « je ne
 * sais pas ce qui s'est passé » qu'inscrire un faux numéro de suivi sur une
 * commande — le colis, lui, existerait quand même. */
export function readTpeCreated(body: unknown): TpeCreated | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const id = o.id;
  if (typeof id !== "string" && typeof id !== "number") return null;
  const tracking = String(id).trim();
  if (tracking === "") return null;
  const ext = o.external_id;
  return {
    trackingNumber: tracking,
    externalId: typeof ext === "string" && ext !== "" ? ext : null,
  };
}
