import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import {
  createContactMessage,
  listContactMessages,
  markMessageRead,
} from "./queries/orders";
import {
  assertAdmin,
  changeMyEmail,
  changeMyPassword,
  loginAdmin,
  listAdminUsers,
  addAdminUser,
  removeAdminUser,
  requestPasswordReset,
  resetPasswordWithToken,
} from "./queries/admin";
import { sendPasswordResetEmail } from "./lib/email";

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
      const email = await assertAdmin(input.token);
      return { email };
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
      const email = await assertAdmin(input.token);
      await changeMyPassword(email, input.currentPassword, input.newPassword);
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
      const email = await assertAdmin(input.token);
      await changeMyEmail(email, input.currentPassword, input.newEmail);
      return { ok: true };
    }),

  /** Liste des comptes admin (gestion des accès depuis Paramètres) */
  listUsers: publicQuery
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      await assertAdmin(input.token);
      return listAdminUsers();
    }),

  addUser: publicQuery
    .input(
      z.object({
        token: z.string(),
        email: z.string().email().max(255),
        password: z.string().min(6).max(100),
      }),
    )
    .mutation(async ({ input }) => {
      await assertAdmin(input.token);
      await addAdminUser(input.email, input.password);
      return { ok: true };
    }),

  removeUser: publicQuery
    .input(z.object({ token: z.string(), id: z.number().int() }))
    .mutation(async ({ input }) => {
      const email = await assertAdmin(input.token);
      await removeAdminUser(email, input.id);
      return { ok: true };
    }),

  /** Demande de réinitialisation de mot de passe (page de connexion, avant
   * authentification). Réponse toujours identique que le compte existe ou
   * non — ne jamais révéler quelles adresses sont enregistrées. */
  requestPasswordReset: publicQuery
    .input(z.object({ email: z.string().min(1).max(255) }))
    .mutation(async ({ input, ctx }) => {
      const ip =
        ctx.req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        ctx.req.headers.get("x-real-ip") ||
        "unknown";
      const token = await requestPasswordReset(input.email, ip);
      if (token) {
        const resetUrl = `https://chezlaziz.com/admin?reset=${token}`;
        void sendPasswordResetEmail(input.email.trim().toLowerCase(), resetUrl);
      }
      return { ok: true };
    }),

  /** Choix du nouveau mot de passe depuis le lien reçu par e-mail. */
  resetPassword: publicQuery
    .input(z.object({ token: z.string().min(1), newPassword: z.string().min(6).max(100) }))
    .mutation(async ({ input }) => {
      await resetPasswordWithToken(input.token, input.newPassword);
      return { ok: true };
    }),
});
