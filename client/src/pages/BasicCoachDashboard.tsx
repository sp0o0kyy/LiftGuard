// Страница пользовательского интерфейса LiftGuard и её обработчики событий.
// Ниже находится реализация этого модуля; названия функций и типов показывают его связи с остальной системой.

import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function BasicCoachDashboard() {
  const { data, isLoading } = trpc.coach.getDashboard.useQuery();
  return <AppLayout title="Полученные тренировки" subtitle="Базовая версия показывает факт сохранения отправленных записей">
    {isLoading ? <Skeleton className="h-32 rounded-xl" /> : <div className="space-y-3"><p className="text-sm text-muted-foreground">Всего учеников: {data?.totalTrainees ?? 0}. За неделю: {data?.workoutsThisWeek ?? 0} тренировок.</p>{data?.recentWorkouts?.length ? data.recentWorkouts.map(({ workout, trainee }) => <Card key={workout.id}><CardContent className="p-4"><p className="font-semibold">{workout.title}</p><p className="text-sm text-muted-foreground">Ученик: {trainee.name || trainee.username} · {new Date(workout.workoutDate).toLocaleDateString("ru-RU")}</p></CardContent></Card>) : <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Отправленных тренировок пока нет.</div>}</div>}
    <Link href="/login" className="mt-6 inline-block text-sm text-primary underline">Выйти и войти под другой ролью</Link>
  </AppLayout>;
}
