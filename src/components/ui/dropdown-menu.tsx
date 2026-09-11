"use client";

import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

function DropdownMenu({ ...props }: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuTrigger({ ...props }: MenuPrimitive.Trigger.Props) {
  return <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

function DropdownMenuPortal({ ...props }: MenuPrimitive.Portal.Props) {
  return <MenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />;
}

function DropdownMenuPositioner({ className, ...props }: MenuPrimitive.Positioner.Props) {
  return (
    <MenuPrimitive.Positioner
      data-slot="dropdown-menu-positioner"
      className={cn("isolate", className)}
      {...props}
    />
  );
}

function DropdownMenuContent({ className, ...props }: MenuPrimitive.Popup.Props) {
  return (
    <MenuPrimitive.Popup
      data-slot="dropdown-menu-content"
      className={cn(
        "min-w-56 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 text-[var(--color-text)] outline-none transition-opacity data-closed:pointer-events-none data-closed:opacity-0 data-open:opacity-100",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuGroup({ ...props }: MenuPrimitive.Group.Props) {
  return <MenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />;
}

function DropdownMenuLabel({ className, ...props }: MenuPrimitive.GroupLabel.Props) {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="dropdown-menu-label"
      className={cn(
        "px-2.5 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-secondary)]",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuItem({ className, ...props }: MenuPrimitive.Item.Props) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      className={cn(
        "flex min-h-10 cursor-default select-none items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium outline-none transition-colors data-highlighted:bg-[var(--color-surface-subtle)] data-highlighted:text-[var(--color-text)] data-disabled:pointer-events-none data-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuSeparator({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="dropdown-menu-separator"
      role="separator"
      className={cn("my-1 h-px bg-[var(--color-border)]", className)}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuPositioner,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
};
