"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

interface ProgressProps extends React.ComponentProps<typeof ProgressPrimitive.Root> {
  value?: number;
  max?: number;
  min?: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, max = 100, min = 0, ...props }, ref) => {
    const normalizedValue = React.useMemo(() => {
      if (value === undefined) return 0;
      return Math.max(min, Math.min(max, value));
    }, [value, max, min]);

    const percentage = React.useMemo(() => {
      return ((normalizedValue - min) / (max - min)) * 100;
    }, [normalizedValue, max, min]);

    return (
      <ProgressPrimitive.Root
        ref={ref}
        data-slot="progress"
        className={cn(
          "bg-primary/20 relative h-2 w-full overflow-hidden rounded-full",
          className
        )}
        value={normalizedValue}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={normalizedValue}
        aria-valuetext={`${Math.round(percentage)}%`}
        {...props}
      >
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className="bg-primary h-full w-full flex-1 transition-all"
          style={{ transform: `translateX(-${100 - percentage}%)` }}
        />
      </ProgressPrimitive.Root>
    )
  }
)

Progress.displayName = "Progress"

export { Progress }
