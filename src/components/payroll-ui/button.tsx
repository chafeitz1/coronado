import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Every variant gets a same-color :active mirror of its :hover, plus a
// slight press-scale — same convention as lib/ui.ts's buttonPrimary/
// Secondary/Ghost (touch devices fire :active, not :hover, so without
// this a tap gives zero visual feedback until the action completes).
// No variant carries a shadow — this app's cards/buttons are flat,
// bordered surfaces by design.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full text-sm font-medium transition-[color,background-color,border-color,transform] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/90",
        outline: "border border-border bg-background text-foreground hover:bg-accent active:bg-accent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-accent active:bg-accent",
        ghost: "text-muted-foreground hover:bg-accent active:bg-accent hover:text-foreground active:text-foreground",
        link: "text-primary underline-offset-4 hover:underline active:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-full px-3 text-xs",
        lg: "h-10 rounded-full px-6",
        icon: "size-9 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
