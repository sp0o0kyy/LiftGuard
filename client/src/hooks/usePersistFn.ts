// Вспомогательная логика клиентской части и управление состоянием интерфейса.
// Ниже находится реализация этого модуля; названия функций и типов показывают его связи с остальной системой.

import { useRef } from "react";

type noop = (...args: any[]) => any;

/**
 * usePersistFn вместо useCallback уменьшает сложность восприятия кода
 */
export function usePersistFn<T extends noop>(fn: T) {
  const fnRef = useRef<T>(fn);
  fnRef.current = fn;

  const persistFn = useRef<T>(null);
  if (!persistFn.current) {
    persistFn.current = function (this: unknown, ...args) {
      return fnRef.current!.apply(this, args);
    } as T;
  }

  return persistFn.current!;
}
