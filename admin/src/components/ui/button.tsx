import * as React from "react";
import { cn } from "@/lib/utils";

const variants = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  outline: "border border-border/70 bg-transparent hover:bg-muted/30 hover:text-foreground",
  secondary: "bg-muted/30 text-foreground hover:bg-muted/45",
  ghost: "bg-transparent hover:bg-muted/25 hover:text-foreground",
  link: "text-primary underline-offset-4 hover:underline",
};
const sizes = {
  default: "h-12 px-5",
  sm: "h-10 px-4 text-sm",
  lg: "h-14 px-6 text-base",
  icon: "h-12 w-12",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.99]",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
export { Button };
