// Служебные настройки серверного приложения: запуск, контекст запроса и обработка статических файлов.
// Ниже находится реализация этого модуля; названия функций и типов показывают его связи с остальной системой.

import { z } from "zod";
import { publicProcedure, router } from "./trpc";

export const systemRouter = router({
  health: publicProcedure
    .input(z.object({ timestamp: z.number().min(0) }).optional())
    .query(() => ({ ok: true })),
});
