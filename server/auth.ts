// Серверный модуль LiftGuard: API, проверки доступа, хранение данных или расчёты.
// Ниже находится реализация этого модуля; названия функций и типов показывают его связи с остальной системой.

import * as crypto from "node:crypto";
import { parse as parseCookieHeader } from "cookie";
import type { Request, Response } from "express";
import { getDb } from "./db";
import { sessionTokens, users, type User } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const AUTH_COOKIE = "fp_session";
const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 дней

// Пароль никогда не сохраняется в исходном виде. Для каждой записи создаётся
// отдельная соль, а scrypt превращает пароль в необратимый хеш.
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, expected] = stored.split(":");
    if (!salt || !expected) return false;
    const computed = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

// После успешного входа создаём случайный токен сессии. В базе хранится токен,
// его владелец и срок действия, поэтому сервер может проверить вход на каждом запросе.
export async function createSession(userId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessionTokens).values({ userId, token, expiresAt });
  return token;
}

export async function destroySession(token: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(sessionTokens).where(eq(sessionTokens.token, token));
}

export async function getUserFromSessionToken(token: string): Promise<User | null> {
  const db = await getDb();
  if (!db || !token) return null;
  const rows = await db
    .select()
    .from(sessionTokens)
    .where(eq(sessionTokens.token, token))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) {
    await db.delete(sessionTokens).where(eq(sessionTokens.id, row.id));
    return null;
  }
  const userRows = await db.select().from(users).where(eq(users.id, row.userId)).limit(1);
  return userRows[0] ?? null;
}

// Cookie недоступна JavaScript-коду браузера (httpOnly), поэтому украсть её
// обычным скриптом страницы сложнее. Для HTTPS включаются secure и межсайтовые настройки.
export function setAuthCookie(req: Request, res: Response, token: string): void {
  const isHttps = req.secure || req.protocol === "https" || req.headers["x-forwarded-proto"] === "https";
  const hostname = req.hostname || req.headers.host || "localhost";
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: isHttps || !hostname.includes("localhost"),
    sameSite: isHttps || !hostname.includes("localhost") ? "none" : "lax",
    path: "/",
    maxAge: SESSION_TTL_MS,
  });
}

export function clearAuthCookie(req: Request, res: Response): void {
  const isHttps = req.secure || req.protocol === "https" || req.headers["x-forwarded-proto"] === "https";
  const hostname = req.hostname || req.headers.host || "localhost";
  res.clearCookie(AUTH_COOKIE, {
    httpOnly: true,
    secure: isHttps || !hostname.includes("localhost"),
    sameSite: isHttps || !hostname.includes("localhost") ? "none" : "lax",
    path: "/",
    maxAge: -1,
  });
}

export function extractAuthToken(req: Request): string | null {
  // Сначала читаем cookie обычного браузерного входа, затем поддерживаем
  // заголовок Bearer для технических клиентов API.
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  if (cookies[AUTH_COOKIE]) return cookies[AUTH_COOKIE];
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }
  return null;
}

// ---------- Определение пользователя по сессии приложения ----------
export async function resolveAuthUser(req: Request): Promise<User | null> {
  // Это единая точка проверки пользователя для tRPC-контекста.
  const token = extractAuthToken(req);
  if (token) {
    const user = await getUserFromSessionToken(token);
    if (user) return user;
  }
  return null;
}
