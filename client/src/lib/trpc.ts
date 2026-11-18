// Корневой модуль клиентской части приложения LiftGuard.
// Ниже находится реализация этого модуля; названия функций и типов показывают его связи с остальной системой.

import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../server/routers";

export const trpc = createTRPCReact<AppRouter>();
