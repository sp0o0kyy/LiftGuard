// Основные API-процедуры приложения: вход, профиль и сохранение тренировок.
// Проверки роли и владельца выполняются на сервере до чтения или изменения данных.

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  router,
  publicProcedure,
  protectedProcedure,
  coachProcedure,
  traineeProcedure,
} from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  extractAuthToken,
  setAuthCookie,
  clearAuthCookie,
} from "./auth";
import {
  createUser,
  getUserById,
  getUserByUsername,
  getUserByEmail,
  updateUser,
  getCoachTrainees,
  getTraineeCoaches,
  isCoachOfTrainee,
  linkCoachTrainee,
  createCoachInviteCode,
  findActiveInviteCode,
  listCoachInviteCodes,
  deactivateInviteCode,
  updateCoachNotes,
  setTraineeStatus,
  createWorkoutLog,
  getWorkoutLog,
  listWorkoutLogs,
  deleteWorkoutLog,
  getLatestWorkout,
  addMeasurement,
  listMeasurements,
  deleteMeasurement,
  listWorkoutComments,
  addWorkoutComment,
  markWorkoutCommentsRead,
  listCommentsForUser,
  countUnreadComments,
  calculateWorkoutComparison,
  type Exercise,
} from "./db";
import { getDb } from "./db";

// ================= РОУТЕР АВТОРИЗАЦИИ =================

const authRouter = router({
  me: publicProcedure.query((opts) => opts.ctx.user),

  register: publicProcedure
    .input(
      z.object({
        name: z.string().min(2),
        username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_.-]+$/),
        email: z.string().email().optional(),
        password: z.string().min(8).max(128),
        role: z.enum(["coach", "trainee"]),
        phone: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const existingUser = await getUserByUsername(input.username);
      if (existingUser) {
        throw new TRPCError({ code: "CONFLICT", message: "Имя пользователя уже занято" });
      }
      if (input.email) {
        const existingEmail = await getUserByEmail(input.email);
        if (existingEmail) {
          throw new TRPCError({ code: "CONFLICT", message: "Email уже используется" });
        }
      }
      const user = await createUser({
        name: input.name,
        username: input.username,
        email: input.email,
        passwordHash: hashPassword(input.password),
        role: input.role,
        phone: input.phone,
      });
      const token = await createSession(user.id);
      setAuthCookie(ctx.req, ctx.res, token);
      return { success: true, user, token };
    }),

  login: publicProcedure
    .input(
      z.object({
        identifier: z.string().min(1),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const isEmail = input.identifier.includes("@");
      const user = isEmail
        ? await getUserByEmail(input.identifier)
        : await getUserByUsername(input.identifier);
      if (!user || !user.passwordHash) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Неверный логин или пароль" });
      }
      const ok = verifyPassword(input.password, user.passwordHash);
      if (!ok) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Неверный логин или пароль" });
      }
      await updateUser(user.id, { lastSignedIn: new Date() });
      const token = await createSession(user.id);
      setAuthCookie(ctx.req, ctx.res, token);
      const fresh = await getUserById(user.id);
      return { success: true, user: fresh || user, token };
    }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    const token = extractAuthToken(ctx.req);
    if (token) await destroySession(token);
    clearAuthCookie(ctx.req, ctx.res);
    return { success: true };
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        avatarUrl: z.string().optional(),
        heightCm: z.number().nullable().optional(),
        initialWeight: z.number().nullable().optional(),
        currentWeight: z.number().nullable().optional(),
        targetWeight: z.number().nullable().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updated = await updateUser(ctx.user.id, input as any);
      return updated;
    }),
});

// ================= РОУТЕР ТРЕНЕРА =================

const coachRouter = router({
  getDashboard: coachProcedure.query(async ({ ctx }) => {
    const trainees = await getCoachTrainees(ctx.user.id);
    const traineeIds = trainees.map((t) => t.trainee.id);
    const recentWorkouts: Array<{ workout: any; trainee: any }> = [];
    for (const t of trainees) {
      const ws = await listWorkoutLogs(t.trainee.id, 5);
      for (const w of ws) {
        recentWorkouts.push({ workout: w, trainee: t.trainee });
      }
    }
    recentWorkouts.sort(
      (a, b) =>
        new Date(b.workout.workoutDate).getTime() - new Date(a.workout.workoutDate).getTime()
    );
    const oneWeekAgo = Date.now() - 7 * 86400000;
    const workoutsThisWeek = recentWorkouts.filter(
      (r) => new Date(r.workout.workoutDate).getTime() >= oneWeekAgo
    ).length;

    return {
      totalTrainees: trainees.length,
      workoutsThisWeek,
      recentWorkouts: recentWorkouts.slice(0, 10),
    };
  }),

  listTrainees: coachProcedure.query(async ({ ctx }) => {
    return getCoachTrainees(ctx.user.id);
  }),

  getTrainee: coachProcedure
    .input(z.object({ traineeId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!(await isCoachOfTrainee(ctx.user.id, input.traineeId))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Нет доступа к этому ученику" });
      }
      const trainee = await getUserById(input.traineeId);
      if (!trainee) throw new TRPCError({ code: "NOT_FOUND", message: "Ученик не найден" });
      const measurements = await listMeasurements(input.traineeId, 50);
      const workouts = await listWorkoutLogs(input.traineeId, 60);
      return { trainee, measurements, workouts };
    }),

  getTraineeAnalytics: coachProcedure
    .input(
      z.object({
        traineeId: z.number(),
        days: z.number().default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!(await isCoachOfTrainee(ctx.user.id, input.traineeId))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Нет доступа к аналитике этого ученика" });
      }
      const since = new Date(Date.now() - input.days * 86400000);
      const workouts = await listWorkoutLogs(input.traineeId, 100, { fromDate: since });
      workouts.sort((a, b) => new Date(a.workoutDate).getTime() - new Date(b.workoutDate).getTime());

      // Серия прогресса по каждому упражнению
      const progressSeries: Record<
        string,
        Array<{ date: string; weight: number; volume: number; reps: number }>
      > = {};
      const prMap: Record<string, number> = {};

      for (const w of workouts) {
        let exercises: Exercise[] = [];
        try {
          exercises = JSON.parse(w.exercises);
        } catch {
          exercises = [];
        }
        const dateStr = new Date(w.workoutDate).toLocaleDateString("ru-RU", {
          day: "2-digit",
          month: "2-digit",
        });
        for (const ex of exercises) {
          const key = ex.name.trim();
          if (!key) continue;
          let maxW = 0;
          let vol = 0;
          let reps = 0;
          for (const s of ex.sets || []) {
            if (!s.isWarmup && s.weight && s.weight > maxW) maxW = s.weight;
            reps += s.reps || 0;
            vol += (s.weight || 0) * (s.reps || 0);
          }
          if (!progressSeries[key]) progressSeries[key] = [];
          progressSeries[key].push({ date: dateStr, weight: maxW, volume: vol, reps });
          if (!prMap[key] || maxW > prMap[key]) prMap[key] = maxW;
        }
      }

      // Серия самочувствия и сна
      const wellnessSleepSeries = [];
      for (const w of workouts) {
        wellnessSleepSeries.push({
          date: new Date(w.workoutDate).toLocaleDateString("ru-RU", {
            day: "2-digit",
            month: "2-digit",
          }),
          workoutId: w.id,
          wellness: w.wellness,
          sleepHours: Number(w.sleepHours),
          totalVolume: Number(w.totalVolume),
          bodyWeight: w.bodyWeight ? Number(w.bodyWeight) : null,
          title: w.title,
        });
      }

      const avgSleep =
        wellnessSleepSeries.length > 0
          ? Number(
              (
                wellnessSleepSeries.reduce((a, b) => a + b.sleepHours, 0) /
                wellnessSleepSeries.length
              ).toFixed(1)
            )
          : null;
      const avgWellness =
        wellnessSleepSeries.length > 0
          ? Number(
              (
                wellnessSleepSeries.reduce((a, b) => a + b.wellness, 0) /
                wellnessSleepSeries.length
              ).toFixed(1)
            )
          : null;
      const totalVolume = Math.round(wellnessSleepSeries.reduce((a, b) => a + b.totalVolume, 0));

      return {
        progressSeries,
        wellnessSleepSeries,
        exercisePRs: prMap,
        aggregates: { avgSleep, avgWellness, totalWorkouts: wellnessSleepSeries.length, totalVolume },
      };
    }),

  createInviteCode: coachProcedure
    .input(
      z.object({
        maxUses: z.number().positive().optional(),
        expiresInDays: z.number().positive().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return createCoachInviteCode(ctx.user.id, input);
    }),

  listInviteCodes: coachProcedure.query(async ({ ctx }) => {
    return listCoachInviteCodes(ctx.user.id);
  }),

  deactivateInviteCode: coachProcedure
    .input(z.object({ codeId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deactivateInviteCode(ctx.user.id, input.codeId);
      return { success: true };
    }),

  updateNotes: coachProcedure
    .input(z.object({ traineeId: z.number(), notes: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await updateCoachNotes(ctx.user.id, input.traineeId, input.notes);
      return { success: true };
    }),

  setStatus: coachProcedure
    .input(
      z.object({
        traineeId: z.number(),
        status: z.enum(["active", "paused", "archived"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await setTraineeStatus(ctx.user.id, input.traineeId, input.status);
      return { success: true };
    }),

  comments: coachProcedure.query(async ({ ctx }) => listCommentsForUser(ctx.user.id, "coach")),

  unreadComments: coachProcedure.query(async ({ ctx }) => ({ count: await countUnreadComments(ctx.user.id, "coach") })),

  addComment: coachProcedure
    .input(z.object({ workoutId: z.number(), body: z.string().min(1).max(2000) }))
    .mutation(async ({ ctx, input }) => {
      const workout = await getWorkoutLog(input.workoutId);
      if (!workout || !(await isCoachOfTrainee(ctx.user.id, workout.userId))) throw new TRPCError({ code: "FORBIDDEN", message: "Нет доступа" });
      return addWorkoutComment({ workoutLogId: workout.id, authorId: ctx.user.id, authorRole: "coach", body: input.body });
    }),
});

// ================= РОУТЕР УЧЕНИКА =================

const traineeRouter = router({
  submitWorkout: traineeProcedure
    .input(
      z.object({
        workoutDate: z.date().optional(),
        title: z.string().trim().min(1).max(120),
        wellness: z.number().min(1).max(10),
        sleepHours: z.number().min(0).max(24),
        bodyWeight: z.number().min(20).max(500).nullable().optional(),
        notes: z.string().max(5000).optional(),
        energyLevel: z.number().min(1).max(10).optional(),
        stressLevel: z.number().min(1).max(10).optional(),
        durationMinutes: z.number().int().min(1).max(1440).nullable().optional(),
        exercises: z.array(
          z.object({
            name: z.string().trim().min(1).max(120),
            category: z.string().max(80).optional(),
            notes: z.string().max(1000).optional(),
            sets: z.array(
              z.object({
                set: z.number().int().min(1).max(100),
                weight: z.number().min(0).max(2000),
                reps: z.number().int().min(0).max(1000),
                isWarmup: z.boolean().optional(),
              })
            ).min(1).max(100),
          })
        ).min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const log = await createWorkoutLog({
        userId: ctx.user.id,
        workoutDate: input.workoutDate,
        title: input.title,
        wellness: input.wellness,
        sleepHours: input.sleepHours,
        bodyWeight: input.bodyWeight ?? undefined,
        notes: input.notes,
        energyLevel: input.energyLevel,
        stressLevel: input.stressLevel,
        durationMinutes: input.durationMinutes ?? undefined,
        exercises: input.exercises,
      });

      // Автоматически обновить вес пользователя, если он указан
      if (input.bodyWeight) {
        await updateUser(ctx.user.id, { currentWeight: input.bodyWeight });
      }

      return { workout: log };
    }),

  listWorkouts: traineeProcedure
    .input(z.object({ limit: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const ws = await listWorkoutLogs(ctx.user.id, input?.limit || 60);
      return ws.map((workout) => ({ workout }));
    }),

  getWorkout: protectedProcedure
    .input(z.object({ workoutId: z.number() }))
    .query(async ({ ctx, input }) => {
      const workout = await getWorkoutLog(input.workoutId);
      if (!workout) throw new TRPCError({ code: "NOT_FOUND", message: "Тренировка не найдена" });
      const allowed =
        workout.userId === ctx.user.id ||
        (ctx.user.role === "coach" && (await isCoachOfTrainee(ctx.user.id, workout.userId))) ||
        ctx.user.role === "admin";
      if (!allowed) throw new TRPCError({ code: "FORBIDDEN", message: "Нет доступа" });
      if (workout.userId === ctx.user.id || (ctx.user.role === "coach" && await isCoachOfTrainee(ctx.user.id, workout.userId))) await markWorkoutCommentsRead(workout.id, ctx.user.id);
      const comments = await listWorkoutComments(workout.id);
      const comparison = await calculateWorkoutComparison(workout);
      const trainee = await getUserById(workout.userId);
      return { workout, trainee: trainee || null, comments, comparison };
    }),

  deleteWorkout: traineeProcedure
    .input(z.object({ workoutId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteWorkoutLog(ctx.user.id, input.workoutId);
      return { success: true };
    }),

  linkCoach: traineeProcedure
    .input(z.object({ code: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const invite = await findActiveInviteCode(input.code);
      if (!invite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Код приглашения не найден, недействителен или истёк",
        });
      }
      const coach = await getUserById(invite.coachId);
      if (!coach) throw new TRPCError({ code: "NOT_FOUND", message: "Тренер не найден" });
      const link = await linkCoachTrainee({
        coachId: invite.coachId,
        traineeId: ctx.user.id,
        inviteCode: invite.code,
      });
      return { success: true, coach, link };
    }),

  myCoaches: traineeProcedure.query(async ({ ctx }) => {
    return getTraineeCoaches(ctx.user.id);
  }),

  listMeasurements: traineeProcedure.query(async ({ ctx }) => {
    return listMeasurements(ctx.user.id);
  }),

  addMeasurement: traineeProcedure
    .input(
      z.object({
        measuredAt: z.date().optional(),
        weight: z.number(),
        heightCm: z.number().optional(),
        chest: z.number().optional(),
        waist: z.number().optional(),
        hips: z.number().optional(),
        biceps: z.number().optional(),
        thigh: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return addMeasurement({ ...input, userId: ctx.user.id });
    }),

  deleteMeasurement: traineeProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteMeasurement(ctx.user.id, input.id);
      return { success: true };
    }),

  comments: traineeProcedure.query(async ({ ctx }) => listCommentsForUser(ctx.user.id, "trainee")),

  unreadComments: traineeProcedure.query(async ({ ctx }) => ({ count: await countUnreadComments(ctx.user.id, "trainee") })),

  addComment: traineeProcedure
    .input(z.object({ workoutId: z.number(), body: z.string().min(1).max(2000) }))
    .mutation(async ({ ctx, input }) => {
      const workout = await getWorkoutLog(input.workoutId);
      if (!workout || workout.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Нет доступа" });
      return addWorkoutComment({ workoutLogId: workout.id, authorId: ctx.user.id, authorRole: "trainee", body: input.body });
    }),

  getMyStats: traineeProcedure.query(async ({ ctx }) => {
    const ws = await listWorkoutLogs(ctx.user.id, 60);
    const ms = await listMeasurements(ctx.user.id, 60);
    const totalWorkouts = ws.length;
    const totalVolume = Math.round(ws.reduce((a, b) => a + Number(b.totalVolume), 0));
    const avgSleep =
      ws.length > 0
        ? Number((ws.reduce((a, b) => a + Number(b.sleepHours), 0) / ws.length).toFixed(1))
        : null;
    const avgWellness =
      ws.length > 0 ? Number((ws.reduce((a, b) => a + b.wellness, 0) / ws.length).toFixed(1)) : null;

    // Изменение веса
    const user = ctx.user;
    const initial = user.initialWeight ? Number(user.initialWeight) : null;
    const current = user.currentWeight ? Number(user.currentWeight) : ms[0] ? Number(ms[0].weight) : null;
    const weightDelta = initial !== null && current !== null ? Number((current - initial).toFixed(1)) : null;

    return {
      totalWorkouts,
      totalVolume,
      avgSleep,
      avgWellness,
      initialWeight: initial,
      currentWeight: current,
      targetWeight: user.targetWeight ? Number(user.targetWeight) : null,
      weightDelta,
      heightCm: user.heightCm,
    };
  }),
});

// ================= ПУБЛИЧНЫЙ РОУТЕР ПРОВЕРКИ СОСТОЯНИЯ =================

const healthRouter = router({
  check: publicProcedure.query(async () => {
    let dbOk = false;
    try {
      const db = await getDb();
      if (db) {
        await db.execute?.(
          // Простая проверка доступности
          undefined as any
        );
      }
      dbOk = true;
    } catch {
      dbOk = false;
    }
    return { ok: true, timestamp: new Date().toISOString(), db: dbOk };
  }),
});

// ================= КОРНЕВОЙ РОУТЕР ПРИЛОЖЕНИЯ =================

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  coach: coachRouter,
  trainee: traineeRouter,
  health: healthRouter,
});

export type AppRouter = typeof appRouter;
