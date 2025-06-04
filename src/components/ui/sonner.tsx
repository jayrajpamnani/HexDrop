"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"
import React from "react"

interface CustomToasterProps extends Omit<ToasterProps, 'theme'> {
  theme?: 'light' | 'dark' | 'system';
}

const Toaster = React.forwardRef<HTMLDivElement, CustomToasterProps>(
  ({ theme: propTheme, ...props }, ref) => {
    const { theme = "system" } = useTheme()
    const resolvedTheme = propTheme || theme

    return (
      <Sonner
        ref={ref}
        theme={resolvedTheme as ToasterProps["theme"]}
        className="toaster group"
        style={
          {
            "--normal-bg": "var(--popover)",
            "--normal-text": "var(--popover-foreground)",
            "--normal-border": "var(--border)",
          } as React.CSSProperties
        }
        {...props}
      />
    )
  }
)

Toaster.displayName = "Toaster"

export { Toaster }
