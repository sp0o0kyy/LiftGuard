// Служебные настройки серверного приложения: запуск, контекст запроса и обработка статических файлов.
// Ниже находится реализация этого модуля; названия функций и типов показывают его связи с остальной системой.

import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { resolveAuthUser } from "../auth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

// Контекст создаётся отдельно для каждого HTTP-запроса. В него передаются
// Объекты request/response Express и пользователь, найденный по cookie.
export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  try {
    user = await resolveAuthUser(opts.req);
  } catch {
    // Ошибка проверки cookie не должна ронять весь серверный процесс.
    // В таком случае запрос считается выполненным без авторизации.
  }
  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
