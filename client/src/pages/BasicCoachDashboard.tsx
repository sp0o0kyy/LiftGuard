// Страница дашборда тренера LiftGuard с базовыми графиками и списком тренировок.
// Данные для графиков получает серверный аналитический запрос выбранного подопечного.

import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ExerciseProgressionChart } from "@/components/charts/ExerciseProgressionChart";
import { SleepWellnessChart } from "@/components/charts/SleepWellnessChart";
import { VolumeChart } from "@/components/charts/VolumeChart";
import { WeightTrendChart } from "@/components/charts/WeightTrendChart";

export default function BasicCoachDashboard() {
  // Получить сводку последних тренировок для общей части дашборда.
  const { data, isLoading } = trpc.coach.getDashboard.useQuery();
  // Получить список подопечных, чтобы тренер мог выбрать нужного человека.
  const { data: trainees, isLoading: isTraineesLoading } = trpc.coach.listTrainees.useQuery();
  const [selectedTraineeId, setSelectedTraineeId] = useState<number | undefined>();

  const firstTraineeId = trainees?.[0]?.trainee.id;
  const activeTraineeId = selectedTraineeId ?? firstTraineeId;
  const selectedTrainee = trainees?.find(
    (item) => item.trainee.id === activeTraineeId
  )?.trainee;

  // Запросить рассчитанные серии только после выбора подопечного.
  const { data: analytics, isLoading: isAnalyticsLoading } =
    trpc.coach.getTraineeAnalytics.useQuery(
      {
        traineeId: activeTraineeId as number,
        days: 30,
      },
      { enabled: Boolean(activeTraineeId) }
    );

  // Преобразовать общую серию сна и самочувствия в формат графика объёма.
  const sleepWellnessData = analytics?.wellnessSleepSeries ?? [];
  const volumeData = sleepWellnessData.map((item) => ({
    date: item.date,
    volume: item.totalVolume,
    wellness: item.wellness,
    title: item.title,
  }));

  // Оставить для графика веса только тренировки с указанным весом тела.
  const weightData = sleepWellnessData
    .filter((item) => item.bodyWeight !== null && item.bodyWeight !== undefined)
    .map((item) => ({
      date: item.date,
      weight: item.bodyWeight as number,
    }));

  return (
    <AppLayout
      title="Полученные тренировки"
      subtitle="Базовая аналитика по выбранному подопечному"
    >
      {isLoading ? (
        <Skeleton className="h-32 rounded-xl" />
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Всего учеников: {data?.totalTrainees ?? 0}. За неделю: {data?.workoutsThisWeek ?? 0} тренировок.
          </p>

          <Card>
            <CardContent className="p-4">
              <label htmlFor="trainee-select" className="mb-2 block text-sm font-medium">
                Подопечный для аналитики
              </label>
              {isTraineesLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <select
                  id="trainee-select"
                  value={activeTraineeId ?? ""}
                  onChange={(event) => setSelectedTraineeId(Number(event.target.value))}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  {trainees?.map((item) => (
                    <option key={item.trainee.id} value={item.trainee.id}>
                      {item.trainee.name || item.trainee.username}
                    </option>
                  ))}
                </select>
              )}
            </CardContent>
          </Card>

          {isAnalyticsLoading ? (
            <Skeleton className="h-96 rounded-xl" />
          ) : analytics ? (
            <div className="grid gap-4 xl:grid-cols-2">
              <ExerciseProgressionChart
                series={analytics.progressSeries}
                prs={analytics.exercisePRs}
              />
              <SleepWellnessChart data={sleepWellnessData} />
              <VolumeChart data={volumeData} />
              <WeightTrendChart
                data={weightData}
                targetWeight={
                  selectedTrainee?.targetWeight
                    ? Number(selectedTrainee.targetWeight)
                    : null
                }
                initialWeight={
                  selectedTrainee?.initialWeight
                    ? Number(selectedTrainee.initialWeight)
                    : null
                }
              />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Для выбранного подопечного пока нет данных для графиков.
            </div>
          )}

          {data?.recentWorkouts?.length ? (
            <div className="space-y-3">
              <h2 className="text-base font-semibold">Последние тренировки</h2>
              {data.recentWorkouts.map(({ workout, trainee }) => (
                <Card key={workout.id}>
                  <CardContent className="p-4">
                    <p className="font-semibold">{workout.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Ученик: {trainee.name || trainee.username} · {new Date(workout.workoutDate).toLocaleDateString("ru-RU")}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Отправленных тренировок пока нет.
            </div>
          )}
        </div>
      )}
      <Link href="/login" className="mt-6 inline-block text-sm text-primary underline">
        Выйти и войти под другой ролью
      </Link>
    </AppLayout>
  );
}
