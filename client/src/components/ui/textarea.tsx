// Переиспользуемый компонент интерфейса на React.
// Ниже находится реализация этого модуля; названия функций и типов показывают его связи с остальной системой.

import { useDialogComposition } from "@/components/ui/dialog";
import { useComposition } from "@/hooks/useComposition";
import { cn } from "@/lib/utils";
import * as React from "react";

function Textarea({
  className,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
  ...props
}: React.ComponentProps<"textarea">) {
  // Получить контекст составного ввода диалога, если он доступен
  const dialogComposition = useDialogComposition();

  // Добавить обработчики составного ввода для поддержки редакторов ввода азиатских языков.
  const {
    onCompositionStart: handleCompositionStart,
    onCompositionEnd: handleCompositionEnd,
    onKeyDown: handleKeyDown,
  } = useComposition<HTMLTextAreaElement>({
    onKeyDown: (e) => {
      // Проверить, нужно ли заблокировать клавишу Enter
      const isComposing = (e.nativeEvent as any).isComposing || dialogComposition.justEndedComposing();

      // Если Enter нажат во время составного ввода или сразу после его завершения,
      // не вызывать onKeyDown пользователя (это предотвращает запуск прикладной логики)
      // Примечание: в многострочном поле Shift+Enter должен создавать новую строку
      if (e.key === "Enter" && !e.shiftKey && isComposing) {
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
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      onKeyDown={handleKeyDown}
      {...props}
    />
  );
}

export { Textarea };
