"use client";

import type { ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cx, focusRing, monoLabel } from "./utils";
import { Button } from "./button";

const overlayClasses =
  "fixed inset-0 z-50 bg-ink/75 backdrop-blur-[2px] data-[state=open]:animate-fade-in";

/*
 * The one place a shadow is allowed: a surface that genuinely floats over the page, where depth
 * is what tells you it can be dismissed.
 */
const panelBase =
  "fixed z-50 border border-line-raised bg-ink-raised shadow-panel focus:outline-none";

export type ModalProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  /** "drawer" slides in from the right — used for record detail without losing the list. */
  variant?: "modal" | "drawer";
  size?: "sm" | "md" | "lg";
  children?: ReactNode;
};

const modalSizes = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" } as const;

export function Modal({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  footer,
  variant = "modal",
  size = "md",
  children,
}: ModalProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger> : null}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={overlayClasses} />
        <DialogPrimitive.Content
          className={cx(
            panelBase,
            variant === "drawer"
              ? "inset-y-0 right-0 w-full max-w-md overflow-y-auto border-y-0 border-r-0"
              : cx(
                  "left-1/2 top-1/2 w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2",
                  modalSizes[size],
                ),
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-[17px] font-semibold tracking-[-0.02em] text-paper">
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="mt-1.5 text-[13px] leading-relaxed text-paper-mute">
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            <DialogPrimitive.Close
              aria-label="Close"
              className={cx(
                "-mr-1 -mt-1 shrink-0 p-1.5 text-paper-mute transition-colors duration-instant hover:text-signal",
                focusRing,
              )}
            >
              <CloseGlyph />
            </DialogPrimitive.Close>
          </div>
          <div className="px-5 py-4">{children}</div>
          {footer ? (
            <div className="flex justify-end gap-2 border-t border-line px-5 py-3.5">{footer}</div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export const ModalClose = DialogPrimitive.Close;

export type ConfirmDialogProps = {
  trigger: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive confirmations get the red button and a matching tone. */
  destructive?: boolean;
  onConfirm: () => void;
};

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialogPrimitive.Root>
      <AlertDialogPrimitive.Trigger asChild>{trigger}</AlertDialogPrimitive.Trigger>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className={overlayClasses} />
        <AlertDialogPrimitive.Content
          className={cx(
            panelBase,
            "left-1/2 top-1/2 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 p-5",
          )}
        >
          <AlertDialogPrimitive.Title className="text-[17px] font-semibold tracking-[-0.02em] text-paper">
            {title}
          </AlertDialogPrimitive.Title>
          {description ? (
            <AlertDialogPrimitive.Description className="mt-2.5 text-[13.5px] leading-relaxed text-paper-dim">
              {description}
            </AlertDialogPrimitive.Description>
          ) : null}
          <div className="mt-6 flex justify-end gap-2">
            <AlertDialogPrimitive.Cancel asChild>
              <Button variant="ghost">{cancelLabel}</Button>
            </AlertDialogPrimitive.Cancel>
            <AlertDialogPrimitive.Action asChild>
              <Button variant={destructive ? "danger" : "primary"} onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}

const menuContentClasses =
  "z-50 min-w-[11rem] overflow-hidden border border-line-raised bg-ink-raised p-1 shadow-panel";

const menuItemClasses = cx(
  "flex cursor-pointer select-none items-center gap-2 px-3 py-2 text-[13px] text-paper-dim outline-none transition-colors duration-instant",
  "data-[highlighted]:bg-ink-hover data-[highlighted]:text-paper",
  "data-[disabled]:pointer-events-none data-[disabled]:text-paper-ghost",
);

export function DropdownMenu({
  trigger,
  children,
  align = "end",
}: {
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "center" | "end";
}) {
  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>{trigger}</DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content align={align} sideOffset={6} className={menuContentClasses}>
          {children}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}

export function DropdownMenuItem({
  className,
  destructive,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & { destructive?: boolean }) {
  return (
    <DropdownMenuPrimitive.Item
      className={cx(menuItemClasses, destructive ? "text-danger" : null, className)}
      {...props}
    >
      {children}
    </DropdownMenuPrimitive.Item>
  );
}

export function DropdownMenuSeparator() {
  return <DropdownMenuPrimitive.Separator className="my-1 h-px bg-line" />;
}

export function DropdownMenuLabel({ children }: { children: ReactNode }) {
  return (
    <DropdownMenuPrimitive.Label className="px-3 py-2 text-[12px] text-paper-mute">
      {children}
    </DropdownMenuPrimitive.Label>
  );
}

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <TabsPrimitive.List className={cx("flex gap-6 border-b border-line", className)}>
      {children}
    </TabsPrimitive.List>
  );
}

export function TabsTrigger({ value, children }: { value: string; children: ReactNode }) {
  return (
    <TabsPrimitive.Trigger
      value={value}
      className={cx(
        "-mb-px border-b-2 border-transparent pb-2.5 pt-1 text-[10px] text-paper-mute transition-colors duration-control ease-out",
        monoLabel,
        "hover:text-paper data-[state=active]:border-signal data-[state=active]:text-paper",
        focusRing,
      )}
    >
      {children}
    </TabsPrimitive.Trigger>
  );
}

export function TabsContent({ value, children }: { value: string; children: ReactNode }) {
  return (
    <TabsPrimitive.Content value={value} className="pt-5 focus:outline-none">
      {children}
    </TabsPrimitive.Content>
  );
}

function CloseGlyph() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  );
}
