// Переиспользуемый компонент интерфейса на React.
// Ниже находится реализация этого модуля; названия функций и типов показывают его связи с остальной системой.

import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-accent animate-pulse rounded-md", className)}
      {...props}
    />
  );
}

export { Skeleton };
