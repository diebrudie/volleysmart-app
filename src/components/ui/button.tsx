import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        primary:
          "bg-[#243F8D] text-white hover:bg-[#1e3a8a] dark:bg-blue-600 dark:hover:bg-blue-700 focus-visible:ring-blue-500",
        secondary:
          "bg-[#FBBE24] text-[#243F8D] hover:bg-[#f59e0b] dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-blue-900 focus-visible:ring-amber-500",
        tertiary:
          "border border-[#243F8D] text-[#243F8D] bg-transparent hover:bg-[#243F8D] hover:text-white dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-600 dark:hover:text-white focus-visible:ring-blue-500",
        action:
          "border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 dark:border-gray-600 dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 dark:hover:border-gray-500 focus-visible:ring-gray-500",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  icon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, icon, children, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {icon && <span className="mr-1">{icon}</span>}
        {children}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
