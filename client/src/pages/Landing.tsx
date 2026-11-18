// Страница пользовательского интерфейса LiftGuard и её обработчики событий.
// Ниже находится реализация этого модуля; названия функций и типов показывают его связи с остальной системой.

import { Link } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, LayoutDashboard, ClipboardCheck, ArrowRight, ShieldCheck } from "lucide-react";

export default function Landing() {
  const { isCoach, isAuthenticated } = useAuthContext();
  const cabinetHref = isCoach ? "/coach/dashboard" : "/trainee/dashboard";

  return (
    <main className="mx-auto max-w-5xl space-y-10 py-8 sm:py-14">
      <section className="mx-auto max-w-3xl space-y-5 text-center">
        <Badge variant="outline" className="gap-1.5 border-primary/40 bg-primary/5 px-3 py-1 text-xs">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Аналитика тренировок для тренера и ученика
        </Badge>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
          LiftGuard помогает видеть прогресс и восстановление
        </h1>
        <p className="mx-auto max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Ученик отправляет данные после тренировки: упражнения, веса, подходы, сон и самочувствие. LiftGuard сохраняет историю и строит понятные графики по numberвым показателям.
        </p>
        <div className="flex flex-col justify-center gap-3 pt-2 sm:flex-row">
          {isAuthenticated ? (
            <Button size="lg" className="h-11 gap-2 px-6" asChild>
              <Link href={cabinetHref}>Перейти в кабинет <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          ) : (
            <>
              <Button size="lg" className="h-11 gap-2 px-6" asChild>
                <Link href="/login">Войти в аккаунт <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="h-11 px-6" asChild>
                <Link href="/register">Зарегистрироваться</Link>
              </Button>
            </>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3" aria-label="Основные возможности">
        <Card>
          <CardContent className="space-y-3 p-5">
            <ClipboardCheck className="h-6 w-6 text-primary" />
            <h2 className="font-bold">Журнал ученика</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">Весы, подходы, повторения, сон, самочувствие, вес тела и заметки после каждой тренировки.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-5">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h2 className="font-bold">Графики показателей</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">Динамика упражнений, тоннаж, сон и самочувствие отображаются по сохранённым тренировкам.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-5">
            <LayoutDashboard className="h-6 w-6 text-primary" />
            <h2 className="font-bold">Дашборд тренера</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">Графики прогресса, сна и самочувствия, история тренировок и антропометрия по каждому ученику.</p>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-2xl border bg-muted/30 p-5 text-center sm:p-7">
        <h2 className="font-bold">Как подключиться</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Зарегистрируйтесь в нужной роли. Тренер создаёт код приглашения, ученик вводит его в разделе «Тренеры», после чего новые отчёты появляются в кабинете тренера.
        </p>
      </section>
    </main>
  );
}
