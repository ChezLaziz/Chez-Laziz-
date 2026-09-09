import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { assertAdmin } from "./queries/admin";
import { tpeProbe, tpeFetchDelegations, tpeTokenPresent } from "./lib/tpe";
import { countDelegations, listDelegations, saveDelegations } from "./queries/delegations";

/** Reconnaissance de l'API transporteur — LECTURE SEULE.
 *
 * Ce routeur ne crée aucun colis. Il sert à répondre à deux questions qu'on
 * ne peut pas trancher depuis un poste de développement (pas d'accès réseau
 * sortant) : le jeton fonctionne-t-il, et quelle est la forme des données
 * que Team Parcel Express attend ?
 *
 * Tout est réservé à l'admin : ces réponses décrivent l'infrastructure d'un
 * partenaire et n'ont rien à faire côté public. */
export const carriersRouter = createRouter({
  /** État de la configuration, sans jamais exposer le jeton lui-même. */
  status: publicQuery
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      await assertAdmin(input.token);
      return {
        tpeTokenConfigured: tpeTokenPresent(),
        delegationsStored: await countDelegations("tpe"),
      };
    }),

  /** Interroge les chemins de lecture connus et rapporte ce qu'ils répondent.
   *
   * Une mutation plutôt qu'une requête : elle sort vers un service tiers et
   * ne doit partir que sur un clic explicite, jamais sur un rafraîchissement
   * automatique de l'interface. */
  probe: publicQuery
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      await assertAdmin(input.token);
      if (!tpeTokenPresent()) {
        return { configured: false as const, results: [] };
      }
      return { configured: true as const, results: await tpeProbe() };
    }),

  /** Récupère la table des délégations et la stocke.
   *
   * C'est le verrou de l'intégration : nos commandes portent une ville en
   * texte libre, leur API exige un identifiant. */
  syncDelegations: publicQuery
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      await assertAdmin(input.token);
      const { probe, delegations } = await tpeFetchDelegations();
      const saved = delegations.length > 0 ? await saveDelegations("tpe", delegations) : 0;
      return {
        status: probe.status,
        ok: probe.ok,
        shape: probe.shape,
        error: probe.error,
        // Un échantillon suffit à comprendre la forme ; la liste entière est
        // en base.
        sample: probe.sample.slice(0, 1200),
        found: delegations.length,
        saved,
      };
    }),

  /** Les délégations déjà stockées, pour vérifier ce qu'on a récupéré. */
  delegations: publicQuery
    .input(z.object({ token: z.string(), search: z.string().optional() }))
    .query(async ({ input }) => {
      await assertAdmin(input.token);
      return listDelegations("tpe", input.search);
    }),
});
