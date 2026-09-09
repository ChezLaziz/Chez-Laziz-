import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { assertAdmin } from "./queries/admin";
import { getAdPerformance, removeAdSpend, setAdSpend } from "./queries/adSpend";
import { SPEND_SOURCES, isValidMonth } from "./queries/analytics/adspend";

const sourceEnum = z.enum(SPEND_SOURCES);
const monthInput = z.string().refine(isValidMonth, "Mois attendu au format AAAA-MM");

export const marketingRouter = createRouter({
  /** Dépenses publicitaires et ce qu'elles ont rapporté, mois par mois. */
  adPerformance: publicQuery
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      await assertAdmin(input.token);
      return getAdPerformance();
    }),

  /** Saisit (ou corrige) le montant dépensé sur une plateforme pour un mois. */
  setSpend: publicQuery
    .input(
      z.object({
        token: z.string(),
        source: sourceEnum,
        month: monthInput,
        // Borné à 1 000 000 DT : une saisie à 10 chiffres est une faute de
        // frappe, et elle écraserait tous les ROAS de la page.
        amountMillimes: z.number().int().min(0).max(1_000_000_000),
      }),
    )
    .mutation(async ({ input }) => {
      await assertAdmin(input.token);
      await setAdSpend(input.source, input.month, input.amountMillimes);
      return { ok: true };
    }),

  removeSpend: publicQuery
    .input(z.object({ token: z.string(), source: sourceEnum, month: monthInput }))
    .mutation(async ({ input }) => {
      await assertAdmin(input.token);
      await removeAdSpend(input.source, input.month);
      return { ok: true };
    }),
});
