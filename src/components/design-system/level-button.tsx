"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface LevelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost"
  size?: "sm" | "md" | "lg"
  children: React.ReactNode
}

export function LevelButton({
  variant = "primary",
  size = "md",
  className,
  children,
  disabled,
  ...props
}: LevelButtonProps) {
  const baseStyles = "relative font-semibold rounded-xl transition-all duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-level-purple disabled:opacity-50 disabled:cursor-not-allowed"
  
  const variants = {
    primary: "bg-level-purple text-white btn-3d hover:bg-level-purple-medium",
    secondary: "bg-level-purple-light text-level-purple-dark hover:bg-level-purple-subtle",
    outline: "border-2 border-level-purple text-level-purple hover:bg-level-purple-light",
    ghost: "text-level-purple hover:bg-level-purple-light",
  }
  
  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  }

  return (
    <button
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        variant === "primary" && !disabled && "btn-3d",
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
