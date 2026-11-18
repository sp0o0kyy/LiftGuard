// Работа с MariaDB вынесена в отдельный модуль: здесь находятся запросы
// и единые расчёты итогов тренировки перед сохранением.

import { eq, desc, and, gte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  users,
  coachInviteCodes,
  coachTrainees,
  bodyMeasurements,
  workoutLogs,
  workoutComments,
  type User,
  type InsertUser,
  type CoachInviteCode,
  type CoachTrainee,
  type BodyMeasurement,
  type WorkoutLog,
  type WorkoutComment,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  const url = process.env.DATABASE_URL;
  if (!_db && url) {
    try {
      _db = drizzle(url);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  if (!_db && !url) console.warn("[Database] DATABASE_URL is not configured");
  return _db;
}

// ================= ЗАПРОСЫ ПОЛЬЗОВАТЕЛЕЙ =================

export async function getUserById(id: number): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0];
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(users).where(eq(users.username, username.toLowerCase())).limit(1);
  return rows[0];
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  return rows[0];
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return rows[0];
}

export async function createUser(data: {
  username?: string;
  email?: string;
  passwordHash?: string;
  name: string;
  role: "coach" | "trainee" | "admin";
  phone?: string;
  heightCm?: number;
  currentWeight?: number | string;
  initialWeight?: number | string;
  targetWeight?: number | string;
}): Promise<User> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(users).values({
    username: data.username ? data.username.toLowerCase() : undefined,
    email: data.email ? data.email.toLowerCase() : undefined,
    passwordHash: data.passwordHash,
    name: data.name,
    role: data.role,
    phone: data.phone,
    heightCm: data.heightCm,
    currentWeight: data.currentWeight !== undefined ? String(data.currentWeight) : undefined,
    initialWeight: data.initialWeight !== undefined ? String(data.initialWeight) : undefined,
    targetWeight: data.targetWeight !== undefined ? String(data.targetWeight) : undefined,
    loginMethod: "credentials",
  });
  const insertId = (result as any)[0]?.insertId ?? Number((result as any).insertId);
  const created = await getUserById(insertId);
  if (!created) throw new Error("Failed to load created user");
  return created;
}

export async function updateUser(
  id: number,
  data: Partial<{
    name: string;
    email: string;
    phone: string;
    avatarUrl: string;
    heightCm: number;
    initialWeight: number | string;
    currentWeight: number | string;
    targetWeight: number | string;
    notes: string;
    role: "coach" | "trainee" | "admin";
    lastSignedIn: Date;
  }>
): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.email !== undefined) updateData.email = data.email ? data.email.toLowerCase() : null;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
  if (data.heightCm !== undefined) updateData.heightCm = data.heightCm;
  if (data.initialWeight !== undefined) updateData.initialWeight = String(data.initialWeight);
  if (data.currentWeight !== undefined) updateData.currentWeight = String(data.currentWeight);
  if (data.targetWeight !== undefined) updateData.targetWeight = String(data.targetWeight);
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.lastSignedIn !== undefined) updateData.lastSignedIn = data.lastSignedIn;
  if (Object.keys(updateData).length === 0) return getUserById(id);
  await db.update(users).set(updateData).where(eq(users.id, id));
  return getUserById(id);
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      const v = user[field] ?? null;
      (values as any)[field] = v;
      updateSet[field] = v;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

// ================= КОДЫ ПРИГЛАШЕНИЯ ТРЕНЕРА =================

export async function createCoachInviteCode(coachId: number, options?: { maxUses?: number; expiresInDays?: number }): Promise<CoachInviteCode> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let suffix = "";
  for (let i = 0; i < 4; i++) suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  const num = Math.floor(100 + Math.random() * 900);
  const code = `FP-${num}-${suffix}`;
  const expiresAt = options?.expiresInDays ? new Date(Date.now() + options.expiresInDays * 86400000) : null;
  const result = await db.insert(coachInviteCodes).values({
    coachId,
    code,
    maxUses: options?.maxUses ?? null,
    expiresAt,
  });
  const id = (result as any)[0]?.insertId ?? Number((result as any).insertId);
  const rows = await db.select().from(coachInviteCodes).where(eq(coachInviteCodes.id, id)).limit(1);
  return rows[0];
}

export async function findActiveInviteCode(code: string): Promise<CoachInviteCode | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(coachInviteCodes).where(eq(coachInviteCodes.code, code.trim().toUpperCase())).limit(1);
  const row = rows[0];
  if (!row) return undefined;
  if (!row.isActive) return undefined;
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return undefined;
  if (row.maxUses && row.usesCount >= row.maxUses) return undefined;
  return row;
}

export async function listCoachInviteCodes(coachId: number): Promise<CoachInviteCode[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(coachInviteCodes).where(eq(coachInviteCodes.coachId, coachId)).orderBy(desc(coachInviteCodes.createdAt));
}

export async function deactivateInviteCode(coachId: number, codeId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(coachInviteCodes).set({ isActive: 0 }).where(and(eq(coachInviteCodes.id, codeId), eq(coachInviteCodes.coachId, coachId)));
}

// ================= СВЯЗИ ТРЕНЕР — УЧЕНИК =================

export async function linkCoachTrainee(params: { coachId: number; traineeId: number; inviteCode?: string }): Promise<CoachTrainee> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (params.coachId === params.traineeId) throw new Error("Coach and trainee cannot be the same user");
  const existing = await db
    .select()
    .from(coachTrainees)
    .where(and(eq(coachTrainees.coachId, params.coachId), eq(coachTrainees.traineeId, params.traineeId)))
    .limit(1);
  if (existing.length > 0) {
    if (existing[0].status !== "active") {
      await db.update(coachTrainees).set({ status: "active", linkedAt: new Date() }).where(eq(coachTrainees.id, existing[0].id));
      return { ...existing[0], status: "active" as const };
    }
    return existing[0];
  }
  const result = await db.insert(coachTrainees).values({
    coachId: params.coachId,
    traineeId: params.traineeId,
    status: "active",
    inviteCodeUsed: params.inviteCode ?? null,
  });
  if (params.inviteCode) {
    await db
      .update(coachInviteCodes)
      .set({ usesCount: sql`${coachInviteCodes.usesCount} + 1` })
      .where(eq(coachInviteCodes.code, params.inviteCode.trim().toUpperCase()));
  }
  const id = (result as any)[0]?.insertId ?? Number((result as any).insertId);
  const rows = await db.select().from(coachTrainees).where(eq(coachTrainees.id, id)).limit(1);
  return rows[0];
}

export async function getCoachTrainees(coachId: number) {
  const db = await getDb();
  if (!db) return [];
  const links = await db.select().from(coachTrainees).where(eq(coachTrainees.coachId, coachId)).orderBy(desc(coachTrainees.linkedAt));
  const results = [];
  for (const link of links) {
    const trainee = await getUserById(link.traineeId);
    if (!trainee) continue;
    const lastWorkout = await getLatestWorkout(link.traineeId);
    const measurements = await listMeasurements(link.traineeId, 1);
    const initialWeight = trainee.initialWeight ? Number(trainee.initialWeight) : null;
    const currentWeight = trainee.currentWeight ? Number(trainee.currentWeight) : measurements[0] ? Number(measurements[0].weight) : null;
    const weightDelta = initialWeight !== null && currentWeight !== null ? Number((currentWeight - initialWeight).toFixed(1)) : null;
    results.push({
      link,
      trainee,
      lastWorkout,
      latestMeasurement: measurements[0] ?? null,
      currentWeight,
      initialWeight,
      weightDelta,
    });
  }
  return results;
}

export async function getTraineeCoaches(traineeId: number) {
  const db = await getDb();
  if (!db) return [];
  const links = await db.select().from(coachTrainees).where(eq(coachTrainees.traineeId, traineeId)).orderBy(desc(coachTrainees.linkedAt));
  const results = [];
  for (const link of links) {
    const coach = await getUserById(link.coachId);
    if (coach) results.push({ link, coach });
  }
  return results;
}

export async function isCoachOfTrainee(coachId: number, traineeId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select()
    .from(coachTrainees)
    .where(and(eq(coachTrainees.coachId, coachId), eq(coachTrainees.traineeId, traineeId)))
    .limit(1);
  return rows.length > 0;
}

export async function updateCoachNotes(coachId: number, traineeId: number, notes: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(coachTrainees).set({ coachNotes: notes }).where(and(eq(coachTrainees.coachId, coachId), eq(coachTrainees.traineeId, traineeId)));
}

export async function setTraineeStatus(coachId: number, traineeId: number, status: "active" | "paused" | "archived"): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(coachTrainees).set({ status }).where(and(eq(coachTrainees.coachId, coachId), eq(coachTrainees.traineeId, traineeId)));
}

// ================= ЗАМЕРЫ ТЕЛА =================

export async function addMeasurement(data: {
  userId: number;
  measuredAt?: Date;
  weight: number;
  heightCm?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  biceps?: number;
  thigh?: number;
  notes?: string;
}): Promise<BodyMeasurement> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(bodyMeasurements).values({
    userId: data.userId,
    measuredAt: data.measuredAt ?? new Date(),
    weight: String(data.weight),
    heightCm: data.heightCm,
    chest: data.chest !== undefined ? String(data.chest) : undefined,
    waist: data.waist !== undefined ? String(data.waist) : undefined,
    hips: data.hips !== undefined ? String(data.hips) : undefined,
    biceps: data.biceps !== undefined ? String(data.biceps) : undefined,
    thigh: data.thigh !== undefined ? String(data.thigh) : undefined,
    notes: data.notes,
  });
  // автоматически обновить текущий вес пользователя
  await db.update(users).set({ currentWeight: String(data.weight) }).where(eq(users.id, data.userId));
  const id = (result as any)[0]?.insertId ?? Number((result as any).insertId);
  const rows = await db.select().from(bodyMeasurements).where(eq(bodyMeasurements.id, id)).limit(1);
  return rows[0];
}

export async function listMeasurements(userId: number, limit = 50): Promise<BodyMeasurement[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bodyMeasurements).where(eq(bodyMeasurements.userId, userId)).orderBy(desc(bodyMeasurements.measuredAt)).limit(limit);
}

export async function deleteMeasurement(userId: number, id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(bodyMeasurements).where(and(eq(bodyMeasurements.id, id), eq(bodyMeasurements.userId, userId)));
}

// ================= ЗАПИСИ ТРЕНИРОВОК =================

export type ExerciseSet = {
  set: number;
  weight: number;
  reps: number;
  isWarmup?: boolean;
};

export type Exercise = {
  name: string;
  category?: string;
  notes?: string;
  sets: ExerciseSet[];
};

export function calculateWorkoutTotals(exercises: Exercise[]) {
  let totalVolume = 0;
  let totalSets = 0;
  let totalReps = 0;
  for (const ex of exercises) {
    for (const s of ex.sets || []) {
      totalSets += 1;
      totalReps += Number(s.reps) || 0;
      if (!s.isWarmup) {
        totalVolume += (Number(s.weight) || 0) * (Number(s.reps) || 0);
      }
    }
  }
  return {
    totalVolume: Number(totalVolume.toFixed(2)),
    totalSets,
    totalReps,
  };
}

export async function createWorkoutLog(data: {
  userId: number;
  workoutDate?: Date;
  title: string;
  wellness: number;
  sleepHours: number;
  bodyWeight?: number;
  notes?: string;
  energyLevel?: number;
  stressLevel?: number;
  durationMinutes?: number;
  exercises: Exercise[];
}): Promise<WorkoutLog> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const totals = calculateWorkoutTotals(data.exercises);
  const result = await db.insert(workoutLogs).values({
    userId: data.userId,
    workoutDate: data.workoutDate ?? new Date(),
    title: data.title,
    wellness: Math.max(1, Math.min(10, Math.round(data.wellness))),
    sleepHours: String(Math.max(0, Math.min(24, data.sleepHours))),
    bodyWeight: data.bodyWeight !== undefined ? String(data.bodyWeight) : undefined,
    notes: data.notes,
    energyLevel: data.energyLevel,
    stressLevel: data.stressLevel,
    durationMinutes: data.durationMinutes,
    exercises: JSON.stringify(data.exercises),
    totalVolume: String(totals.totalVolume),
    totalSets: totals.totalSets,
    totalReps: totals.totalReps,
  });
  const id = (result as any)[0]?.insertId ?? Number((result as any).insertId);
  const created = await getWorkoutLog(id);
  if (!created) throw new Error("Failed to load created workout log");
  return created;
}

export async function getWorkoutLog(id: number): Promise<WorkoutLog | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(workoutLogs).where(eq(workoutLogs.id, id)).limit(1);
  return rows[0];
}

export async function listWorkoutLogs(userId: number, limit = 60, options?: { fromDate?: Date }): Promise<WorkoutLog[]> {
  const db = await getDb();
  if (!db) return [];
  const conds = [eq(workoutLogs.userId, userId)];
  if (options?.fromDate) conds.push(gte(workoutLogs.workoutDate, options.fromDate));
  return db
    .select()
    .from(workoutLogs)
    .where(conds.length > 1 ? and(...conds) : conds[0])
    .orderBy(desc(workoutLogs.workoutDate))
    .limit(limit);
}

export async function getLatestWorkout(userId: number): Promise<WorkoutLog | undefined> {
  const logs = await listWorkoutLogs(userId, 1);
  return logs[0];
}

export async function deleteWorkoutLog(userId: number, id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(workoutLogs).where(and(eq(workoutLogs.id, id), eq(workoutLogs.userId, userId)));
}

// ================= КОММЕНТАРИИ И СРАВНЕНИЯ ТРЕНИРОВОК =================

export async function listWorkoutComments(workoutLogId: number): Promise<Array<WorkoutComment & { authorName?: string | null }>> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(workoutComments).where(eq(workoutComments.workoutLogId, workoutLogId)).orderBy(workoutComments.createdAt);
  const result: Array<WorkoutComment & { authorName?: string | null }> = [];
  for (const row of rows) {
    const author = await getUserById(row.authorId);
    result.push({ ...row, authorName: author?.name ?? author?.username ?? null });
  }
  return result;
}

export async function addWorkoutComment(data: { workoutLogId: number; authorId: number; authorRole: "coach" | "trainee"; body: string }): Promise<WorkoutComment> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(workoutComments).values({ ...data, body: data.body.trim() });
  const id = (result as any)[0]?.insertId ?? Number((result as any).insertId);
  const rows = await db.select().from(workoutComments).where(eq(workoutComments.id, id)).limit(1);
  if (!rows[0]) throw new Error("Failed to create comment");
  return rows[0];
}

export async function markWorkoutCommentsRead(workoutLogId: number, readerId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(workoutComments).set({ readAt: new Date() }).where(and(eq(workoutComments.workoutLogId, workoutLogId), sql`${workoutComments.authorId} <> ${readerId}`, sql`${workoutComments.readAt} IS NULL`));
}

export async function listCommentsForUser(userId: number, role: "coach" | "trainee") {
  const db = await getDb();
  if (!db) return [];
  const logs = role === "trainee" ? await listWorkoutLogs(userId, 100) : await (async () => {
    const links = await db.select().from(coachTrainees).where(eq(coachTrainees.coachId, userId));
    const all: WorkoutLog[] = [];
    for (const link of links) all.push(...await listWorkoutLogs(link.traineeId, 100));
    return all.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  })();
  const result: Array<WorkoutComment & { workoutTitle: string; workoutDate: Date; authorName?: string | null; traineeName?: string | null }> = [];
  for (const log of logs) {
    const comments = await listWorkoutComments(log.id);
    const trainee = await getUserById(log.userId);
    result.push(...comments.map((comment) => ({ ...comment, workoutTitle: log.title, workoutDate: log.workoutDate, traineeName: trainee?.name ?? trainee?.username ?? null })));
  }
  return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function countUnreadComments(userId: number, role: "coach" | "trainee"): Promise<number> {
  const comments = await listCommentsForUser(userId, role);
  return comments.filter((comment) => comment.authorId !== userId && !comment.readAt).length;
}

export async function calculateWorkoutComparison(workout: WorkoutLog) {
  const history = await listWorkoutLogs(workout.userId, 100);
  const previous = history.find((item) => item.id !== workout.id && new Date(item.workoutDate).getTime() < new Date(workout.workoutDate).getTime());
  const parse = (value: string): Exercise[] => { try { return JSON.parse(value); } catch { return []; } };
  const currentExercises = parse(workout.exercises);
  const previousExercises = previous ? parse(previous.exercises) : [];
  const previousByName = new Map(previousExercises.map((exercise) => [exercise.name.trim().toLowerCase(), exercise]));
  const records: Record<string, { currentWeight: number; usualWeight: number | null; diff: number | null; recordWeight: number }> = {};
  for (const exercise of currentExercises) {
    const key = exercise.name.trim();
    const currentWeight = Math.max(0, ...exercise.sets.filter((set) => !set.isWarmup).map((set) => Number(set.weight) || 0));
    const prior = previousByName.get(key.toLowerCase());
    const usualWeight = prior ? Math.max(0, ...prior.sets.filter((set) => !set.isWarmup).map((set) => Number(set.weight) || 0)) : null;
    const allWeights = history.flatMap((item) => parse(item.exercises).filter((itemExercise) => itemExercise.name.trim().toLowerCase() === key.toLowerCase()).flatMap((itemExercise) => itemExercise.sets.filter((set) => !set.isWarmup).map((set) => Number(set.weight) || 0)));
    records[key] = { currentWeight, usualWeight, diff: usualWeight === null ? null : Number((currentWeight - usualWeight).toFixed(1)), recordWeight: Math.max(currentWeight, ...allWeights) };
  }
  return { previousWorkout: previous ? { id: previous.id, title: previous.title, workoutDate: previous.workoutDate } : null, previousWellness: previous?.wellness ?? null, wellnessDiff: previous ? workout.wellness - previous.wellness : null, previousVolume: previous ? Number(previous.totalVolume) : null, volumeDiff: previous ? Number((Number(workout.totalVolume) - Number(previous.totalVolume)).toFixed(1)) : null, exercises: records };
}
