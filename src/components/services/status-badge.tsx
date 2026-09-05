import type { ComponentType } from "react";
import {
  AlertTriangle,
  CalendarClock,
  Check,
  Clock,
  Pause,
  Play,
  XCircle,
} from "lucide-react";

import type { ServiceStatus } from "@/lib/services";
import { STATUS_LABEL } from "@/lib/services";
import { cn } from "@/lib/utils";

const STATUS_ICONS: Record<ServiceStatus, ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  SCHEDULED: Clock,
  IN_PROGRESS: Play,
  SUSPENDED: Pause,
  RESCHEDULED: CalendarClock,
  COMPLETED: Check,
  PARTIALLY_COMPLETED: AlertTriangle,
  CANCELLED: XCircle,
};

const STATUS_CLASSES: Record<ServiceStatus, string> = {
  SCHEDULED: "bg-[var(--color-info-fill)] text-[var(--color-info)] border-[var(--color-info-line)]",
  IN_PROGRESS: "bg-[var(--color-info-fill)] text-[var(--color-info)] border-[var(--color-info-line)] font-medium",
  SUSPENDED: "bg-[var(--color-warning-fill)] text-[var(--color-warning)] border-[var(--color-warning-line)]",
  RESCHEDULED: "bg-[var(--color-warning-fill)] text-[var(--color-warning)] border-[var(--color-warning-line)]",
  COMPLETED: "bg-[var(--color-success-fill)] text-[var(--color-success)] border-[var(--color-success-line)]",
  PARTIALLY_COMPLETED: "bg-[var(--color-warning-fill)] text-[var(--color-warning)] border-[var(--color-warning-line)]",
  CANCELLED: "bg-[var(--color-danger-fill)] text-[var(--color-danger)] border-[var(--color-danger-line)]",
};

export function StatusBadge({
  status,
  className,
}: {
  status: ServiceStatus;
  className?: string;
}) {
  const Icon = STATUS_ICONS[status];
  const label = STATUS_LABEL[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs tracking-tight",
        STATUS_CLASSES[status],
        className,
      )}
      role="status"
      aria-label={`Estado: ${label}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{label}</span>
    </span>
  );
}
