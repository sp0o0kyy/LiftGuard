// Страница пользовательского интерфейса LiftGuard и её обработчики событий.
// Ниже находится реализация этого модуля; названия функций и типов показывают его связи с остальной системой.

import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const testAccounts = [
  { label: "Тренер", username: "coach", password: "coach123" },
  { label: "Ученик", username: "ivan", password: "ivan123" },
  { label: "Мария", username: "maria", password: "maria123" },
];

export default function Login() {
  const [, navigate] = useLocation();
  const { login } = useAuthContext();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(identifier, password);
      toast.success("Вход выполнен");
      // Роль берём из ответа сервера, а не из localStorage: это исключает
      // переход на устаревший маршрут и появление страницы 404.
      navigate(user.role === "coach" ? "/coach/dashboard" : "/trainee/workout/new");
    } catch (err: any) {
      setError(err?.message || "Неверный логин или пароль");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-8 sm:py-12 space-y-6">
      <div className="text-center space-y-2">
        <Link href="/" className="inline-flex items-center gap-2 group">
          <img src="/liftguard-logo.png" alt="Логотип LiftGuard" className="h-12 w-12 rounded-xl object-contain" />
          <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent">
            LiftGuard
          </span>
        </Link>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Войдите в личный кабинет тренера или ученика
        </p>
      </div>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">Вход</CardTitle>
          <CardDescription className="text-xs">
            Логин или email и пароль
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 rounded-lg border bg-muted/30 p-3">
            <p className="mb-2 text-xs font-semibold">Тестовые учётные записи</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {testAccounts.map((account) => (
                <Button
                  key={account.username}
                  type="button"
                  variant="outline"
                  className="h-auto min-h-12 px-2 py-2 text-[11px] leading-tight"
                  onClick={() => {
                    setIdentifier(account.username);
                    setPassword(account.password);
                    setError(null);
                  }}
                >
                  <span className="flex flex-col items-center gap-0.5">
                    <span className="font-semibold">{account.label}</span>
                    <span className="text-muted-foreground">{account.username} / {account.password}</span>
                  </span>
                </Button>
              ))}
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-xs text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="id" className="text-xs">
                Логин или email
              </Label>
              <Input
                id="id"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="coach или ivan@liftguard.ru"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pwd" className="text-xs">
                Пароль
              </Label>
              <Input
                id="pwd"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Войти"}
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Ещё нет аккаунта?{" "}
            <Link href="/register" className="font-semibold text-primary underline underline-offset-2">
              Зарегистрироваться
            </Link>
          </p>
        </CardContent>
      </Card>

    </div>
  );
}
