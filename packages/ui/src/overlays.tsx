"use client";

import type { ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cx, focusRing } from "./utils";
import { Button } from "./button";

const overlayClasses =
  "fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[2px] data-[state=open]:animate-[fade-in_150ms_ease-out]";

const panelBase =
  "fixed z-50 border border-[var(--color-border,#e2e8f0)] bg-[var(--color-surface,#fff)] shadow-xl focus:outline-none";

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
                  "left-1/2 top-1/2 w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl",
                  modalSizes[size],
                ),
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border,#e2e8f0)] px-5 py-4">
            <div>
              <DialogPrimitive.Title className="text-base font-semibold">
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="mt-1 text-sm text-[var(--color-muted-foreground,#64748b)]">
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            <DialogPrimitive.Close
              aria-label="Close"
              className={cx(
                "-mr-1 -mt-1 rounded-md p-1.5 text-[var(--color-muted-foreground,#64748b)] hover:bg-[var(--color-muted,#f1f5f9)]",
                focusRing,
              )}
            >
              <CloseGlyph />
            </DialogPrimitive.Close>
          </div>
          <div className="px-5 py-4">{children}</div>
          {footer ? (
            <div className="flex justify-end gap-2 border-t border-[var(--color-border,#e2e8f0)] px-5 py-3">
              {footer}
            </div>
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
            "left-1/2 top-1/2 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl p-5",
          )}
        >
          <AlertDialogPrimitive.Title className="text-base font-semibold">
            {title}
          </AlertDialogPrimitive.Title>
          {description ? (
            <AlertDialogPrimitive.Description className="mt-2 text-sm text-[var(--color-muted-foreground,#64748b)]">
              {description}
            </AlertDialogPrimitive.Description>
          ) : null}
          <div className="mt-5 flex justify-end gap-2">
            <AlertDialogPrimitive.Cancel asChild>
              <Button variant="secondary">{cancelLabel}</Button>
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
  "z-50 min-w-[10rem] overflow-hidden rounded-lg border border-[var(--color-border,#e2e8f0)] bg-[var(--color-surface,#fff)] p-1 shadow-lg";

const menuItemClasses = cx(
  "flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-1.5 text-sm outline-none",
  "data-[highlighted]:bg-[var(--color-muted,#f1f5f9)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
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
        <DropdownMenuPrimitive.Content
          align={align}
          sideOffset={6}
          className={menuContentClasses}
        >
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
      className={cx(menuItemClasses, destructive ? "text-red-600" : null, className)}
      {...props}
    >
      {children}
    </DropdownMenuPrimitive.Item>
  );
}

export function DropdownMenuSeparator() {
  return (
    <DropdownMenuPrimitive.Separator className="my-1 h-px bg-[var(--color-border,#e2e8f0)]" />
  );
}

export function DropdownMenuLabel({ children }: { children: ReactNode }) {
  return (
    <DropdownMenuPrimitive.Label className="px-2.5 py-1.5 text-xs font-medium text-[var(--color-muted-foreground,#64748b)]">
      {children}
    </DropdownMenuPrimitive.Label>
  );
}

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <TabsPrimitive.List
      className={cx(
        "flex gap-1 border-b border-[var(--color-border,#e2e8f0)]",
        className,
      )}
    >
      {children}
    </TabsPrimitive.List>
  );
}

export function TabsTrigger({ value, children }: { value: string; children: ReactNode }) {
  return (
    <TabsPrimitive.Trigger
      value={value}
      className={cx(
        "-mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium text-[var(--color-muted-foreground,#64748b)] transition-colors",
        "hover:text-[var(--color-foreground,#0f172a)]",
        "data-[state=active]:border-[var(--color-primary,#0f766e)] data-[state=active]:text-[var(--color-foreground,#0f172a)]",
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
      <path
        d="m5 5 10 10M15 5 5 15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
