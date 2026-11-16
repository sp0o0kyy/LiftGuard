// Описание таблиц базы данных и типов, используемых сервером и клиентом.
// Ниже находится реализация этого модуля; названия функций и типов показывают его связи с остальной системой.

import {
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  tinyint,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Таблица пользователей: тренеры и ученики.
 * Хранит собственные логины, пароли и данные профиля приложения.
 */
export const users = mysqlTable("users", {
  // Общие данные аккаунта; поле role определяет доступ к кабинету тренера или ученика.
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }),
  username: varchar("username", { length: 100 }),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  name: text("name"),
  role: mysqlEnum("role", ["coach", "trainee", "admin"]).default("trainee").notNull(),
  phone: varchar("phone", { length: 50 }),
  avatarUrl: text("avatarUrl"),
  heightCm: int("heightCm"),
  initialWeight: decimal("initialWeight", { precision: 5, scale: 2 }),
  currentWeight: decimal("currentWeight", { precision: 5, scale: 2 }),
  targetWeight: decimal("targetWeight", { precision: 5, scale: 2 }),
  notes: text("notes"),
  loginMethod: varchar("loginMethod", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/**
 * Коды приглашения, которые тренер создаёт для подключения ученика.
 */
export const coachInviteCodes = mysqlTable("coach_invite_codes", {
  // Код приглашения принадлежит тренеру и используется учеником один или несколько раз.
  id: int("id").autoincrement().primaryKey(),
  coachId: int("coachId").notNull(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  maxUses: int("maxUses"),
  usesCount: int("usesCount").default(0).notNull(),
  isActive: tinyint("isActive").default(1).notNull(),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Связи между тренером и учеником.
 */
export const coachTrainees = mysqlTable("coach_trainees", {
  // Связующая таблица: один тренер может иметь несколько учеников.
  id: int("id").autoincrement().primaryKey(),
  coachId: int("coachId").notNull(),
  traineeId: int("traineeId").notNull(),
  status: mysqlEnum("status", ["active", "paused", "archived"]).default("active").notNull(),
  linkedAt: timestamp("linkedAt").defaultNow().notNull(),
  inviteCodeUsed: varchar("inviteCodeUsed", { length: 32 }),
  coachNotes: text("coachNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * История замеров тела: вес, рост и окружности для отслеживания антропометрии.
 */
export const bodyMeasurements = mysqlTable("body_measurements", {
  // История замеров хранится отдельными строками, чтобы строить динамику по датам.
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  measuredAt: timestamp("measuredAt").defaultNow().notNull(),
  weight: decimal("weight", { precision: 5, scale: 2 }).notNull(),
  heightCm: int("heightCm"),
  chest: decimal("chest", { precision: 5, scale: 2 }),
  waist: decimal("waist", { precision: 5, scale: 2 }),
  hips: decimal("hips", { precision: 5, scale: 2 }),
  biceps: decimal("biceps", { precision: 5, scale: 2 }),
  thigh: decimal("thigh", { precision: 5, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Записи тренировок, которые ученики отправляют после занятия.
 * Структура JSON для упражнений:
 *   Array<{ name: string; category?: string; notes?: string; sets: Array<{ set: number; weight: number; reps: number; isWarmup?: boolean }> }>
 */
export const workoutLogs = mysqlTable("workout_logs", {
  // Одна строка — одна отправленная учеником тренировка.
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  workoutDate: timestamp("workoutDate").defaultNow().notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  wellness: int("wellness").notNull(), // 1–10 — субъективная оценка самочувствия
  sleepHours: decimal("sleepHours", { precision: 3, scale: 1 }).notNull(),
  bodyWeight: decimal("bodyWeight", { precision: 5, scale: 2 }),
  notes: text("notes"),
  energyLevel: int("energyLevel"),
  stressLevel: int("stressLevel"),
  durationMinutes: int("durationMinutes"),
  exercises: text("exercises").notNull(), // JSON
  // Тоннаж = сумма веса, умноженного на повторения, без разминочных подходов.
  totalVolume: decimal("totalVolume", { precision: 9, scale: 2 }).default("0").notNull(),
  totalSets: int("totalSets").default(0).notNull(),
  totalReps: int("totalReps").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Комментарии тренера и ученика к конкретной тренировке. */
export const workoutComments = mysqlTable("workout_comments", {
  // Комментарии привязаны к конкретной тренировке и имеют отметку прочтения.
  id: int("id").autoincrement().primaryKey(),
  workoutLogId: int("workoutLogId").notNull(),
  authorId: int("authorId").notNull(),
  authorRole: mysqlEnum("authorRole", ["coach", "trainee"]).notNull(),
  body: text("body").notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Таблица токенов сессий для самостоятельной авторизации.
 */
export const sessionTokens = mysqlTable("session_tokens", {
  // Серверные сессии позволяют не хранить пароль в браузере.
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type CoachInviteCode = typeof coachInviteCodes.$inferSelect;
export type CoachTrainee = typeof coachTrainees.$inferSelect;
export type BodyMeasurement = typeof bodyMeasurements.$inferSelect;
export type WorkoutLog = typeof workoutLogs.$inferSelect;
export type WorkoutComment = typeof workoutComments.$inferSelect;
export type SessionToken = typeof sessionTokens.$inferSelect;
