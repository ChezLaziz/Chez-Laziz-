/** Empreinte stable d'un contenu de panier — FNV-1a, 8 caractères.
 *
 * Pas de hasard, pas d'horloge : deux paniers identiques donnent la même
 * empreinte, à la milliseconde près comme à la semaine près. C'est ce qui
 * rend la clé d'idempotence utilisable (voir orderIdempotencyKey). */
export function cartFingerprint(serialized: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < serialized.length; i++) {
    h ^= serialized.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** La clé d'idempotence d'une tentative de commande.
 *
 * LE DÉFAUT QU'ELLE CORRIGE. La clé protège du double envoi : même clé,
 * même commande côté serveur. Mais elle n'était renouvelée qu'APRÈS un
 * succès. Si l'envoi échouait, que le client modifiait son panier puis
 * réessayait, le serveur retrouvait la clé et renvoyait la PREMIÈRE
 * commande — pendant que l'écran affichait fièrement le nouveau panier. Le
 * client recevait, et payait, autre chose que ce qu'on venait de lui
 * confirmer. Litige à la porte, colis refusé, transport perdu.
 *
 * La clé lie donc une tentative à un CONTENU : intacte tant que le panier
 * ne bouge pas — le double clic reste couvert — et neuve dès qu'il change.
 * Le `salt` est renouvelé après chaque commande réussie, pour que le même
 * panier commandé deux fois donne bien deux commandes. */
export function orderIdempotencyKey(salt: string, serializedCart: string): string {
  return `${salt}.${cartFingerprint(serializedCart)}`;
}
