# Базовый образ с Node.js LTS для сборки и запуска LiftGuard.
FROM node:22-bookworm-slim

# Все команды сборки выполняются внутри каталога приложения.
WORKDIR /app

# Включаем Corepack, чтобы использовать версию pnpm из package.json.
ENV COREPACK_HOME=/usr/local/share/.cache/node/corepack
RUN corepack enable

# Сначала копируем файлы зависимостей для эффективного использования кэша Docker.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Копируем исходный код и выполняем production-сборку клиента и сервера.
COPY . .
RUN pnpm build

# Рабочие параметры production-сервера.
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Запускаем собранный Express-сервер LiftGuard.
CMD ["pnpm", "start"]
