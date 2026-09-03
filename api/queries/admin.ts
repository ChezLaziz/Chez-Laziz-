import { randomBytes, scryptSync, createHmac, timingSafeEqual } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { getDb } from "./connection";
import { settings } from "@db/schema";
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
  const [storedEmail, storedHash, secret] = await Promise.all([
    getSetting("admin_email"),
    getSetting("admin_password_hash"),
    getSetting("admin_token_secret"),
  ]);
  const emailOk = safeEqual(email.trim().toLowerCase(), storedEmail.trim().toLowerCase());
  const passwordOk = verifyPassword(password.trim(), storedHash);
  if (!emailOk || !passwordOk) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Adresse ou mot de passe incorrect",
    });
  }
  const exp = String(Date.now() + TOKEN_TTL_MS);
  return `${exp}.${sign(exp, secret)}`;
}

/** Lève une erreur si le token est absent, invalide ou expiré. */
export async function assertAdmin(token: string): Promise<void> {
  if (!token) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Non connecté" });
  }
  const dot = token.lastIndexOf(".");
  const exp = dot > 0 ? token.slice(0, dot) : "";
  const sig = dot > 0 ? token.slice(dot + 1) : "";
  const secret = await getSetting("admin_token_secret");
  if (!exp || !safeEqual(sig, sign(exp, secret))) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Session invalide" });
  }
  if (Number(exp) < Date.now()) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Session expirée" });
  }
}

export async function changeAdminPassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const storedHash = await getSetting("admin_password_hash");
  if (!verifyPassword(currentPassword.trim(), storedHash)) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Mot de passe actuel incorrect",
    });
  }
  await setSetting("admin_password_hash", hashPassword(newPassword.trim()));
  // Rotation du secret de signature : invalide immédiatement toutes les
  // sessions actives (anciens tokens), y compris celles volées.
  await setSetting("admin_token_secret", randomBytes(32).toString("hex"));
}

export async function getAdminEmail(): Promise<string> {
  return getSetting("admin_email");
}

export async function changeAdminEmail(
  currentPassword: string,
  newEmail: string,
): Promise<void> {
  const storedHash = await getSetting("admin_password_hash");
  if (!verifyPassword(currentPassword.trim(), storedHash)) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Mot de passe actuel incorrect",
    });
  }
  await setSetting("admin_email", newEmail.trim().toLowerCase());
}
