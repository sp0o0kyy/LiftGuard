// Вспомогательная логика клиентской части и управление состоянием интерфейса.
// Ниже находится реализация этого модуля; названия функций и типов показывают его связи с остальной системой.

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";

export type AppUser = {
  id: number;
  openId: string | null;
  username: string | null;
  email: string | null;
  name: string | null;
  role: "coach" | "trainee" | "admin";
  phone: string | null;
  avatarUrl: string | null;
  heightCm: number | null;
  initialWeight: string | null;
  currentWeight: string | null;
  targetWeight: string | null;
  notes: string | null;
  loginMethod: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
};

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  isCoach: boolean;
  isTrainee: boolean;
  isAdmin: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (data: {
    name: string;
    username: string;
    email?: string;
    password: string;
    role: "coach" | "trainee";
    phone?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<unknown>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const utils = trpc.useUtils();
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      utils.auth.me.setData(undefined, data.user as any);
      utils.auth.me.invalidate();
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: (data) => {
      utils.auth.me.setData(undefined, data.user as any);
      utils.auth.me.invalidate();
    },
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const login = useCallback(
    async (identifier: string, password: string) => {
      await loginMutation.mutateAsync({ identifier, password });
    },
    [loginMutation]
  );

  const register = useCallback(
    async (data: {
      name: string;
      username: string;
      email?: string;
      password: string;
      role: "coach" | "trainee";
      phone?: string;
    }) => {
      await registerMutation.mutateAsync(data);
    },
    [registerMutation]
  );

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  const value = useMemo<AuthContextValue>(() => {
    const user = (meQuery.data as any) ?? null;
    const loading =
      meQuery.isLoading ||
      loginMutation.isPending ||
      registerMutation.isPending ||
      logoutMutation.isPending;
    return {
      user,
      loading,
      isAuthenticated: Boolean(user),
      isCoach: user?.role === "coach",
      isTrainee: user?.role === "trainee",
      isAdmin: user?.role === "admin",
      login,
      register,
      logout,
      refresh: () => meQuery.refetch(),
    };
  }, [
    meQuery.data,
    meQuery.isLoading,
    loginMutation.isPending,
    registerMutation.isPending,
    logoutMutation.isPending,
    login,
    register,
    logout,
    meQuery.refetch,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within an AuthProvider");
  return ctx;
}
