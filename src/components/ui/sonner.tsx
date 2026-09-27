import { Toaster as Sonner, type ToasterProps } from "sonner";

import { useTheme } from "@/hooks/use-theme";

function Toaster(props: ToasterProps) {
  const { resolved } = useTheme();
  return (
    <Sonner
      theme={resolved}
      position="top-center"
      offset={{ top: "calc(env(safe-area-inset-top) + 12px)" }}
      toastOptions={{
        classNames: {
          toast: "!rounded-2xl !border !bg-popover !text-popover-foreground !shadow-xl",
          description: "!text-muted-foreground",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
