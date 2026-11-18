// Корневой модуль клиентской части приложения LiftGuard.
// Ниже находится реализация этого модуля; названия функций и типов показывают его связи с остальной системой.

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
