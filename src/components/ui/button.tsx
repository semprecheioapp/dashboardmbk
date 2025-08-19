import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-white hover:bg-primary/90 hover:shadow-corporate-glow hover:scale-105 shadow-md font-bold",
        dark: "bg-card border-2 border-primary/40 text-white hover:border-primary/60 hover:shadow-corporate-glow hover:bg-primary/10 transition-all duration-300",
        destructive:
          "bg-danger text-danger-foreground hover:bg-danger/90 hover:shadow-danger-glow hover:scale-105 shadow-md font-bold",
        outline:
          "border-2 border-primary/40 bg-transparent text-primary hover:bg-primary/10 hover:border-primary/60 hover:text-primary-foreground backdrop-blur-sm",
        secondary:
          "bg-card text-foreground hover:bg-card/80 hover:shadow-lg border border-border/50",
        ghost: "hover:bg-accent hover:text-accent-foreground hover:shadow-sm",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/80",
        success: "bg-success text-success-foreground hover:bg-success/90 hover:shadow-success-glow hover:scale-105 shadow-md font-bold",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90 hover:shadow-warning-glow hover:scale-105 shadow-md font-bold",
        corporate: "bg-primary-gradient text-white hover:shadow-corporate-glow hover:scale-105 shadow-lg font-bold",
        hero: "bg-background/20 text-white border border-primary/30 hover:bg-primary/20 hover:border-primary/50 backdrop-blur-sm",
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
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
