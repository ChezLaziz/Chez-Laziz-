import { randomBytes, scryptSync, createHmac, timingSafeEqual } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { getDb } from "./connection";
import { settings, adminUsers } from "@db/schema";
import { eq } from "drizzle-orm";

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 jours
const SCRYPT_KEYLEN = 64;

async function getSetting(key: string): Promise<string> {
  const row = await getDb().query.settings.findFirst({
    where: eq(settings.key, key),
  });
  if (!row) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  return row.value;
}

async function setSetting(key: string, value: string): Promise<void> {
  await getDb()
    .update(settings)
    .set({ value })
    .where(eq(settings.key, key));
}

/** Hash sécurisé (scrypt, résistant au brute-force matériel). Retourne "salt:hash". */
export function hashPassword(password: string, salt?: string): string {
  const useSalt = salt ?? randomBytes(16).toString("hex");
  const derived = scryptSync(password, useSalt, SCRYPT_KEYLEN).toString("hex");
  return `${useSalt}:${derived}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN);
  const expected = Buffer.from(hash, "hex");
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function findUserByEmail(email: string) {
  return getDb().query.adminUsers.findFirst({
    where: eq(adminUsers.email, normalizeEmail(email)),
  });
}

// ---- Anti brute-force : limite simple en mémoire (par process) ----
const LOGIN_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const LOGIN_MAX_ATTEMPTS = 8;
const loginAttempts = new Map<string, { count: number; windowStart: number }>();

function checkLoginRateLimit(ip: string) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now - entry.windowStart > LOGIN_WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, windowStart: now });
    return;
  }
  entry.count += 1;
  if (entry.count > LOGIN_MAX_ATTEMPTS) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Trop de tentatives. Réessayez dans quelques minutes.",
    });
  }
}

/** Vérifie l'adresse + le mot de passe, retourne un token de session admin. */
export async function loginAdmin(
  email: string,
  password: string,
  ip = "unknown",
): Promise<string> {
  checkLoginRateLimit(ip);
  const [user, secret] = await Promise.all([
    findUserByEmail(email),
    getSetting("admin_token_secret"),
  ]);
  if (!user || !verifyPassword(password.trim(), user.passwordHash)) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Adresse ou mot de passe incorrect",
    });
  }
  const exp = String(Date.now() + TOKEN_TTL_MS);
  const emailPart = Buffer.from(user.email).toString("base64url");
  const sig = sign(`${exp}:${user.email}`, secret);
  return `${exp}.${emailPart}.${sig}`;
}

/** Lève une erreur si le token est absent, invalide ou expiré. Retourne l'email du compte. */
export async function assertAdmin(token: string): Promise<string> {
  if (!token) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Non connecté" });
  }
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Session invalide" });
  }
  const [exp, emailPart, sig] = parts;
  let email: string;
  try {
    email = Buffer.from(emailPart, "base64url").toString("utf8");
  } catch {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Session invalide" });
  }
  const secret = await getSetting("admin_token_secret");
  if (!exp || !safeEqual(sig, sign(`${exp}:${email}`, secret))) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Session invalide" });
  }
  if (Number(exp) < Date.now()) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Session expirée" });
  }
  return email;
}

export async function changeMyPassword(
  email: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await findUserByEmail(email);
  if (!user || !verifyPassword(currentPassword.trim(), user.passwordHash)) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Mot de passe actuel incorrect",
    });
  }
  await getDb()
    .update(adminUsers)
    .set({ passwordHash: hashPassword(newPassword.trim()) })
    .where(eq(adminUsers.id, user.id));
  // Rotation du secret de signature : invalide immédiatement toutes les
  // sessions actives (anciens tokens), y compris celles volées.
  await setSetting("admin_token_secret", randomBytes(32).toString("hex"));
}

export async function changeMyEmail(
  currentEmail: string,
  currentPassword: string,
  newEmail: string,
): Promise<void> {
  const user = await findUserByEmail(currentEmail);
  if (!user || !verifyPassword(currentPassword.trim(), user.passwordHash)) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Mot de passe actuel incorrect",
    });
  }
  const normalized = normalizeEmail(newEmail);
  const existing = await findUserByEmail(normalized);
  if (existing && existing.id !== user.id) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Cette adresse est déjà utilisée" });
  }
  await getDb().update(adminUsers).set({ email: normalized }).where(eq(adminUsers.id, user.id));
}

export async function listAdminUsers() {
  const users = await getDb().query.adminUsers.findMany({
    orderBy: (u, { asc }) => [asc(u.createdAt)],
  });
  return users.map((u) => ({ id: u.id, email: u.email, createdAt: u.createdAt }));
}

export async function addAdminUser(email: string, password: string): Promise<void> {
  const normalized = normalizeEmail(email);
  const existing = await findUserByEmail(normalized);
  if (existing) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Cette adresse est déjà utilisée" });
  }
  await getDb().insert(adminUsers).values({
    email: normalized,
    passwordHash: hashPassword(password.trim()),
  });
}

export async function removeAdminUser(requestingEmail: string, id: number): Promise<void> {
  const [users, target] = await Promise.all([
    getDb().query.adminUsers.findMany(),
    getDb().query.adminUsers.findFirst({ where: eq(adminUsers.id, id) }),
  ]);
  if (!target) return;
  if (users.length <= 1) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Impossible de supprimer le dernier compte admin",
    });
  }
  if (normalizeEmail(requestingEmail) === target.email) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Vous ne pouvez pas supprimer votre propre compte",
    });
  }
  await getDb().delete(adminUsers).where(eq(adminUsers.id, id));
}
