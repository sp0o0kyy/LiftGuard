// Корневой модуль клиентской части приложения LiftGuard.
// Ниже находится реализация этого модуля; названия функций и типов показывают его связи с остальной системой.

export { COOKIE_NAME, ONE_YEAR_MS, UNAUTHED_ERR_MSG, NOT_ADMIN_ERR_MSG } from "@shared/const";

export const startLogin = () => {
  if (typeof window !== "undefined") window.location.href = "/login";
};
