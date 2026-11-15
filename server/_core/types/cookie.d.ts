// Служебные настройки серверного приложения: запуск, контекст запроса и обработка статических файлов.
// Ниже находится реализация этого модуля; названия функций и типов показывают его связи с остальной системой.

declare module "cookie" {
  export function parse(
    str: string,
    options?: Record<string, unknown>
  ): Record<string, string>;
}
