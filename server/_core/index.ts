// Служебные настройки серверного приложения: запуск, контекст запроса и обработка статических файлов.
// Ниже находится реализация этого модуля; названия функций и типов показывают его связи с остальной системой.

import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

async function startServer() {
  const app = express();
  const server = createServer(app);
  // JSON ограничен 1 МБ: этого достаточно для записи тренировки и защищает
  // сервер от случайно слишком больших запросов.
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: false }));
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  // Все процедуры приложения доступны через единый типизированный API tRPC.
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // В разработке Vite обновляет интерфейс без ручной сборки.
  // В Express в рабочем режиме раздаёт заранее собранные статические файлы.
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // VPS может передать другой порт через переменную окружения PORT.
  const port = Number(process.env.PORT || "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
  server.on("error", error => { console.error("Server failed:", error.message); process.exit(1); });
  server.listen(port, "0.0.0.0", () => console.log(`Server listening on port ${port}`));
}

startServer().catch(error => { console.error(error); process.exit(1); });
