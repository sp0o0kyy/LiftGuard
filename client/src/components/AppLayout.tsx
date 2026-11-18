// Переиспользуемый компонент интерфейса LiftGuard.
// Ниже находится реализация этого модуля; названия функций и типов показывают его связи с остальной системой.

import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function AppLayout({ children, title, subtitle }: { children: ReactNode; title?: string; subtitle?: string }) {
  const [, navigate] = useLocation();
  const { user, logout } = useAuthContext();
  return <div className="min-h-screen bg-background text-foreground"><header className="border-b bg-background"><div className="container flex h-14 items-center justify-between gap-3"><Link href={user?.role === "coach" ? "/coach/dashboard" : "/trainee/workout/new"} className="flex items-center gap-2"><img src="/liftguard-logo.png" alt="LiftGuard" className="h-8 w-8 p-1 rounded-lg bg-transparent object-contain" /><span className="font-extrabold tracking-tight">LiftGuard</span></Link>{user && <Button variant="ghost" size="sm" onClick={() => logout().then(() => navigate("/login"))}><LogOut className="mr-1 h-4 w-4" /> Выйти</Button>}</div></header><main className="container py-6">{(title || subtitle) && <div className="mb-5"><h1 className="text-2xl font-bold">{title}</h1>{subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}</div>}{children}</main></div>;
}
