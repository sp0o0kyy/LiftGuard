// Корневой модуль клиентской части приложения LiftGuard.
// Ниже находится реализация этого модуля; названия функций и типов показывают его связи с остальной системой.

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuthContext } from "./contexts/AuthContext";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import BasicWorkoutForm from "./pages/BasicWorkoutForm";
import BasicCoachDashboard from "./pages/BasicCoachDashboard";
function HomeRedirect() { const { user, isCoach } = useAuthContext(); if (!user) return <Landing />; return <Redirect to={isCoach ? "/coach/dashboard" : "/trainee/workout/new"} />; }
function Router() { return <Switch><Route path="/" component={HomeRedirect} /><Route path="/login" component={Login} /><Route path="/register" component={Register} /><Route path="/coach" component={() => <Redirect to="/coach/dashboard" />} /><Route path="/coach/dashboard" component={BasicCoachDashboard} /><Route path="/trainee" component={() => <Redirect to="/trainee/workout/new" />} /><Route path="/trainee/workout/new" component={BasicWorkoutForm} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch>; }
export default function App() { return <ErrorBoundary><ThemeProvider defaultTheme="light" switchable><AuthProvider><TooltipProvider><Toaster position="top-right" richColors /><Router /></TooltipProvider></AuthProvider></ThemeProvider></ErrorBoundary>; }
