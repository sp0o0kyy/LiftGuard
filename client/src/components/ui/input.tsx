// Переиспользуемый компонент интерфейса на React.
// Ниже находится реализация этого модуля; названия функций и типов показывают его связи с остальной системой.

import { useDialogComposition } from "@/components/ui/dialog";
import { useComposition } from "@/hooks/useComposition";
import { cn } from "@/lib/utils";
import * as React from "react";

function Input({
  className,
  type,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
  ...props
}: React.ComponentProps<"input">) {
  // Получить контекст составного ввода диалога, если он доступен
  const dialogComposition = useDialogComposition();

  // Добавить обработчики составного ввода для поддержки редакторов ввода азиатских языков.
  const {
    onCompositionStart: handleCompositionStart,
    onCompositionEnd: handleCompositionEnd,
    onKeyDown: handleKeyDown,
  } = useComposition<HTMLInputElement>({
    onKeyDown: (e) => {
      // Проверить, нужно ли заблокировать клавишу Enter
      const isComposing = (e.nativeEvent as any).isComposing || dialogComposition.justEndedComposing();

      // Если Enter нажат во время составного ввода или сразу после его завершения,
      // не вызывать onKeyDown пользователя (это предотвращает запуск прикладной логики)
      if (e.key === "Enter" && isComposing) {
        return;
      }

      // В остальных случаях вызвать onKeyDown пользователя
      onKeyDown?.(e);
    },
    onCompositionStart: e => {
      dialogComposition.setComposing(true);
      onCompositionStart?.(e);
    },
    onCompositionEnd: e => {
      // Отметить завершение составного ввода — это помогает обработать подтверждающий Enter
      dialogComposition.markCompositionEnd();
      // Отложить сброс состояния составного ввода, чтобы учесть порядок событий Safari
      // В Safari compositionEnd происходит раньше события нажатия ESC
      setTimeout(() => {
        dialogComposition.setComposing(false);
      }, 100);
      onCompositionEnd?.(e);
    },
  });

  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      onKeyDown={handleKeyDown}
      {...props}
    />
  );
}

export { Input };
