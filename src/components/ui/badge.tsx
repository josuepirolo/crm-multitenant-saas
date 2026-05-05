import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "destructive" | "outline";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset transition-colors",
        {
          "bg-primary text-primary-foreground ring-primary/20": variant === "default",
          "bg-muted text-muted-foreground ring-border": variant === "secondary",
          "bg-destructive/10 text-destructive ring-destructive/20": variant === "destructive",
          "bg-transparent text-foreground ring-border": variant === "outline",
        },
        className
      )}
      {...props}
    />
  );
}
