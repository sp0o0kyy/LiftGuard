// Общие типы и вспомогательные определения, используемые клиентом и сервером.
// Ниже находится реализация этого модуля; названия функций и типов показывают его связи с остальной системой.

export const COOKIE_NAME = "fp_session";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';
