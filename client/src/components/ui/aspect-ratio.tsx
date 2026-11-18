// Переиспользуемый компонент интерфейса на React.
// Ниже находится реализация этого модуля; названия функций и типов показывают его связи с остальной системой.

import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio";

function AspectRatio({
  ...props
}: React.ComponentProps<typeof AspectRatioPrimitive.Root>) {
  return <AspectRatioPrimitive.Root data-slot="aspect-ratio" {...props} />;
}

export { AspectRatio };
