"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const cyberButtonVariants = cva(
  "relative inline-flex items-center justify-center overflow-hidden rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-primary/80 to-primary border border-primary/50 text-primary-foreground shadow-[0_0_10px_rgba(0,0,0,0.1),inset_0_0_5px_rgba(255,255,255,0.1)] hover:shadow-[0_0_15px_rgba(var(--primary-rgb)/0.5),inset_0_0_10px_rgba(255,255,255,0.2)] hover:border-primary/80 transition-all duration-300",
        destructive:
          "bg-gradient-to-r from-destructive/80 to-destructive border border-destructive/50 text-destructive-foreground shadow-[0_0_10px_rgba(0,0,0,0.1),inset_0_0_5px_rgba(255,255,255,0.1)] hover:shadow-[0_0_15px_rgba(var(--destructive-rgb)/0.5),inset_0_0_10px_rgba(255,255,255,0.2)] hover:border-destructive/80",
        outline:
          "border border-primary/50 bg-background/50 backdrop-blur-sm hover:bg-primary/10 hover:border-primary/80 text-primary shadow-[0_0_10px_rgba(0,0,0,0.05)] hover:shadow-[0_0_15px_rgba(var(--primary-rgb)/0.2)]",
        secondary:
          "bg-gradient-to-r from-secondary/80 to-secondary border border-secondary/50 text-secondary-foreground shadow-[0_0_10px_rgba(0,0,0,0.1),inset_0_0_5px_rgba(255,255,255,0.1)] hover:shadow-[0_0_15px_rgba(var(--secondary-rgb)/0.5),inset_0_0_10px_rgba(255,255,255,0.2)] hover:border-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
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
  },
)

export interface CyberButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof cyberButtonVariants> {
  asChild?: boolean
}

export const CyberButton = React.forwardRef<HTMLButtonElement, CyberButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    return (
      <Button
        className={cn(cyberButtonVariants({ variant, size, className }))}
        ref={ref}
        asChild={asChild}
        {...props}
      />
    )
  },
)

CyberButton.displayName = "CyberButton"

export default CyberButton
