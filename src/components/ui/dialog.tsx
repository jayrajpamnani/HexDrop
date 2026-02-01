"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

interface DialogProps extends React.ComponentProps<typeof DialogPrimitive.Root> {}

const Dialog = React.forwardRef<HTMLDivElement, DialogProps>((props, _ref) => {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
})
Dialog.displayName = "Dialog"

interface DialogTriggerProps extends React.ComponentProps<typeof DialogPrimitive.Trigger> {}

const DialogTrigger = React.forwardRef<HTMLButtonElement, DialogTriggerProps>((props, _ref) => {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
})
DialogTrigger.displayName = "DialogTrigger"

interface DialogPortalProps extends React.ComponentProps<typeof DialogPrimitive.Portal> {}

const DialogPortal = React.forwardRef<HTMLDivElement, DialogPortalProps>((props, _ref) => {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
})
DialogPortal.displayName = "DialogPortal"

interface DialogCloseProps extends React.ComponentProps<typeof DialogPrimitive.Close> {}

const DialogClose = React.forwardRef<HTMLButtonElement, DialogCloseProps>((props, _ref) => {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
})
DialogClose.displayName = "DialogClose"

interface DialogOverlayProps extends React.ComponentProps<typeof DialogPrimitive.Overlay> {}

const DialogOverlay = React.forwardRef<HTMLDivElement, DialogOverlayProps>(
  ({ className, ...props }, ref) => {
    return (
      <DialogPrimitive.Overlay
        ref={ref}
        data-slot="dialog-overlay"
        className={cn(
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
          className
        )}
        {...props}
      />
    )
  }
)
DialogOverlay.displayName = "DialogOverlay"

interface DialogContentProps extends React.ComponentProps<typeof DialogPrimitive.Content> {
  showCloseButton?: boolean;
}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, showCloseButton = true, ...props }, ref) => {
    return (
      <DialogPortal data-slot="dialog-portal">
        <DialogOverlay />
        <DialogPrimitive.Content
          ref={ref}
          data-slot="dialog-content"
          className={cn(
            "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg",
            className
          )}
          {...props}
        >
          {children}
          {showCloseButton && (
            <DialogPrimitive.Close
              data-slot="dialog-close"
              className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
              aria-label="Close dialog"
            >
              <XIcon aria-hidden="true" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    )
  }
)
DialogContent.displayName = "DialogContent"

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

const DialogHeader = React.forwardRef<HTMLDivElement, DialogHeaderProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="dialog-header"
        className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
        {...props}
      />
    )
  }
)
DialogHeader.displayName = "DialogHeader"

interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const DialogFooter = React.forwardRef<HTMLDivElement, DialogFooterProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="dialog-footer"
        className={cn(
          "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
          className
        )}
        {...props}
      />
    )
  }
)
DialogFooter.displayName = "DialogFooter"

interface DialogTitleProps extends React.ComponentProps<typeof DialogPrimitive.Title> {}

const DialogTitle = React.forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ className, ...props }, ref) => {
    return (
      <DialogPrimitive.Title
        ref={ref}
        data-slot="dialog-title"
        className={cn("text-lg leading-none font-semibold", className)}
        {...props}
      />
    )
  }
)
DialogTitle.displayName = "DialogTitle"

interface DialogDescriptionProps extends React.ComponentProps<typeof DialogPrimitive.Description> {}

const DialogDescription = React.forwardRef<HTMLParagraphElement, DialogDescriptionProps>(
  ({ className, ...props }, ref) => {
    return (
      <DialogPrimitive.Description
        ref={ref}
        data-slot="dialog-description"
        className={cn("text-muted-foreground text-sm", className)}
        {...props}
      />
    )
  }
)
DialogDescription.displayName = "DialogDescription"

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
