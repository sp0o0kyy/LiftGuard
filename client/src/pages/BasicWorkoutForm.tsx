// Страница пользовательского интерфейса LiftGuard и её обработчики событий.
// Ниже находится реализация этого модуля; названия функций и типов показывают его связи с остальной системой.

import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function BasicWorkoutForm() {
  const [, navigate] = useLocation();
  const [title, setTitle] = useState("Тренировка");
  const [wellness, setWellness] = useState("7");
  const [sleepHours, setSleepHours] = useState("7");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [notes, setNotes] = useState("");
  const [exercise, setExercise] = useState("Жим лёжа");
  const [weight, setWeight] = useState("60");
  const [reps, setReps] = useState("8");
  const submit = trpc.trainee.submitWorkout.useMutation({
    onSuccess: () => { toast.success("Тренировка отправлена"); setTitle("Тренировка"); setNotes(""); navigate("/trainee/workout/new"); },
    onError: (error) => toast.error(error.message),
  });
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    submit.mutate({
      title: title.trim(), wellness: Number(wellness), sleepHours: Number(sleepHours), durationMinutes: Number(durationMinutes), notes: notes.trim() || undefined,
      exercises: [{ name: exercise.trim(), sets: [{ set: 1, weight: Number(weight), reps: Number(reps) }] }],
    });
  };
  return <AppLayout title="Отправить тренировку" subtitle="Минимальная версия: авторизация и сохранение выполненной программы">
    <form onSubmit={handleSubmit} className="mx-auto max-w-xl space-y-5 rounded-2xl border p-5">
      <div className="space-y-2"><Label htmlFor="title">Название</Label><Input id="title" value={title} onChange={e => setTitle(e.target.value)} maxLength={120} required /></div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2"><Label htmlFor="wellness">Самочувствие (1–10)</Label><Input id="wellness" type="number" min="1" max="10" value={wellness} onChange={e => setWellness(e.target.value)} required /></div>
        <div className="space-y-2"><Label htmlFor="sleep">Сон, часов</Label><Input id="sleep" type="number" min="0" max="24" step="0.1" value={sleepHours} onChange={e => setSleepHours(e.target.value)} required /></div>
        <div className="space-y-2"><Label htmlFor="duration">Длительность, мин</Label><Input id="duration" type="number" min="1" max="1440" value={durationMinutes} onChange={e => setDurationMinutes(e.target.value)} required /></div>
      </div>
      <div className="rounded-xl bg-muted/50 p-4 space-y-4"><h2 className="font-semibold">Выполненная программа</h2><div className="space-y-2"><Label htmlFor="exercise">Упражнение</Label><Input id="exercise" value={exercise} onChange={e => setExercise(e.target.value)} maxLength={120} required /></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="weight">Вес, кг</Label><Input id="weight" type="number" min="0" max="2000" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} required /></div><div className="space-y-2"><Label htmlFor="reps">Повторения</Label><Input id="reps" type="number" min="0" max="1000" value={reps} onChange={e => setReps(e.target.value)} required /></div></div></div>
      <div className="space-y-2"><Label htmlFor="notes">Комментарий</Label><Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} maxLength={5000} placeholder="Необязательное описание тренировки" /></div>
      <Button type="submit" className="w-full" disabled={submit.isPending}>{submit.isPending ? "Отправка…" : "Отправить тренировку"}</Button>
    </form>
  </AppLayout>;
}
