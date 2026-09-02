import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import {
  createContactMessage,
  listContactMessages,
  markMessageRead,
} from "./queries/orders";
import {
  assertAdmin,
  changeAdminEmail,
  changeAdminPassword,
  getAdminEmail,
  loginAdmin,
} from "./queries/admin";

export const contactRouter = createRouter({
  /** Envoyer un message (public) */
  send: publicQuery
    .input(
      z.object({
        name: z.string().min(2).max(255),
        phone: z.string().max(50).optional(),
        message: z.string().min(5).max(2000),
      }),
    )
    .mutation(async ({ input }) => {
      await createContactMessage(input);
      return { ok: true };
    }),

  list: publicQuery
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      await assertAdmin(input.token);
      return listContactMessages();
    }),

  markRead: publicQuery
    .input(
      z.object({ token: z.string(), id: z.number().int(), isRead: z.boolean() }),
    )
    .mutation(async ({ input }) => {
      await assertAdmin(input.token);
      await markMessageRead(input.id, input.isRead);
      return { ok: true };
    }),
});

export const adminRouter = createRouter({
  /** Connexion admin — retourne un token de session */
  login: publicQuery
    .input(z.object({ email: z.string().min(1).max(255), password: z.string().min(1) }))
    .mutation(({ input, ctx }) => {
      const ip =
        ctx.req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        ctx.req.headers.get("x-real-ip") ||
        "unknown";
      return loginAdmin(input.email, input.password, ip);
    }),

  /** Vérifie qu'un token est encore valide */
  check: publicQuery
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      await assertAdmin(input.token);
      return { ok: true };
    }),

  /** Infos du compte admin connecté (affichage dans Paramètres) */
  me: publicQuery
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      await assertAdmin(input.token);
      return { email: await getAdminEmail() };
    }),

  changePassword: publicQuery
    .input(
      z.object({
        token: z.string(),
        currentPassword: z.string().min(1),
        newPassword: z.string().min(6).max(100),
      }),
    )
    .mutation(async ({ input }) => {
      await assertAdmin(input.token);
      await changeAdminPassword(input.currentPassword, input.newPassword);
      return { ok: true };
    }),

  changeEmail: publicQuery
    .input(
      z.object({
        token: z.string(),
        currentPassword: z.string().min(1),
        newEmail: z.string().email().max(255),
      }),
    )
    .mutation(async ({ input }) => {
      await assertAdmin(input.token);
      await changeAdminEmail(input.currentPassword, input.newEmail);
      return { ok: true };
    }),
});
