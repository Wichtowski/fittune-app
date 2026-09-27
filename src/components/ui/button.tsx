import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-semibold transition-[color,background-color,transform,box-shadow] outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[0_0_0_1px_oklch(0_0_0/4%)] hover:brightness-105",
        endurance: "bg-endurance text-endurance-foreground hover:brightness-105",
        secondary: "bg-secondary text-secondary-foreground hover:bg-accent",
        outline: "border border-input bg-transparent hover:bg-accent",
        ghost: "hover:bg-accent",
        destructive: "bg-destructive text-destructive-foreground hover:brightness-110",
        link: "text-primary-strong underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 rounded-lg px-3 text-sm",
        default: "h-11 rounded-xl px-4 text-[0.9375rem]",
        lg: "h-14 rounded-2xl px-6 text-base",
        icon: "size-11 rounded-xl",
        "icon-sm": "size-9 rounded-lg",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
