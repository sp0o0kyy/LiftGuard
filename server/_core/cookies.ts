// Служебные настройки серверного приложения: запуск, контекст запроса и обработка статических файлов.
// Ниже находится реализация этого модуля; названия функций и типов показывают его связи с остальной системой.

import type { CookieOptions, Request } from "express";

export function getSessionCookieOptions(_req: Request): CookieOptions {
  // Предпросмотр работает через публичный HTTPS-фрейм, даже если внутренний запрос использует HTTP.
  return { httpOnly: true, path: "/", sameSite: "none", secure: true };
}
