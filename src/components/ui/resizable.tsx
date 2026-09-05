"use client";

import * as React from "react";
import { GripVertical } from "lucide-react";
import {
  Group as ResizableGroup,
  Panel as ResizablePanelPrimitive,
  Separator as ResizableSeparator,
} from "react-resizable-panels";
import { cn } from "@/lib/utils";

const ResizablePanelGroup = ({
  className,
  direction = "horizontal",
  ...props
}: Omit<React.ComponentProps<typeof ResizableGroup>, "orientation"> & {
  direction?: "horizontal" | "vertical";
}) => (
  <ResizableGroup
    orientation={direction}
    className={cn(
      "flex h-full w-full",
      direction === "vertical" ? "flex-col" : "flex-row",
      className,
    )}
    {...props}
  />
);

const ResizablePanel = ResizablePanelPrimitive;

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizableSeparator> & {
  withHandle?: boolean;
}) => (
  <ResizableSeparator
    className={cn(
      "relative flex w-px items-center justify-center bg-[var(--color-border)] after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-focus)]",
      className,
    )}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-5 w-3.5 items-center justify-center rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
        <GripVertical className="h-3 w-3 text-[var(--color-text-secondary)]" aria-hidden />
      </div>
    )}
  </ResizableSeparator>
);

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
