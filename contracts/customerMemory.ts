/** Les coordonnées du dernier client, telles qu'on les range et qu'on les
 * relit. Rien de plus : ni panier, ni moyen de paiement, ni preuve D17 —
 * un fichier joint et un choix de paiement se décident à chaque commande. */
export type RememberedCustomer = {
  name: string
  phone: string
  governorate: string
  city: string
  delegationId: string
  address: string
}

export const CUSTOMER_MEMORY_KEY = 'cl.customer.v1'

const EMPTY: RememberedCustomer = {
  name: '',
  phone: '',
  governorate: '',
  city: '',
  delegationId: '',
  address: '',
}

/** Un champ mémorisé est borné : une valeur absurde venue d'un stockage
 * corrompu ne doit pas partir telle quelle dans une commande. */
const MAX = 200

function str(v: unknown): string {
  return typeof v === 'string' ? v.slice(0, MAX) : ''
}

/** Relit ce qui a été rangé. Tolérant par construction : un JSON cassé, une
 * ancienne version du format ou un champ manquant rendent un formulaire
 * vide — jamais une exception, jamais une commande à moitié pré-remplie
 * avec des données d'un autre schéma. */
export function parseRememberedCustomer(raw: string | null): RememberedCustomer | null {
  if (!raw) return null
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const o = data as Record<string, unknown>
  const out: RememberedCustomer = {
    name: str(o.name),
    phone: str(o.phone),
    governorate: str(o.governorate),
    city: str(o.city),
    delegationId: str(o.delegationId),
    address: str(o.address),
  }
  // Un enregistrement sans nom ni téléphone n'a rien à pré-remplir.
  if (!out.name && !out.phone) return null
  return out
}

/** Ce qu'on range après une commande réussie. */
export function serializeRememberedCustomer(c: Partial<RememberedCustomer>): string {
  return JSON.stringify({ ...EMPTY, ...c })
}
