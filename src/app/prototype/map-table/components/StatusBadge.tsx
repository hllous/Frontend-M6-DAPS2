// PROTOTYPE component — structure borrowed from the catalogued badge-1.png
// reference (docs/design/inspiration/README.md): icon + label pill, pastel
// bg + saturated text per status. Coral is reserved for SUSPENDED, the one
// status that represents an unresolved exception (ADR-0001).
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Clock,
  PauseCircle,
  XCircle,
} from "lucide-react";
import type { ServiceStatus } from "../data";
import { STATUS_LABEL } from "../data";
import { cn } from "@/lib/utils";

const STYLES: Record<ServiceStatus, string> = {
  SCHEDULED: "bg-slate-100 text-slate-700",
  ASSIGNED: "bg-blue-50 text-blue-700",
  IN_PROGRESS: "bg-amber-50 text-amber-700",
  SERVICED: "bg-teal-50 text-teal-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  SUSPENDED: "bg-coral/10 text-coral",
  CANCELLED: "bg-slate-100 text-slate-500 line-through decoration-slate-400",
};

const ICONS: Record<ServiceStatus, typeof Clock> = {
  SCHEDULED: Clock,
  ASSIGNED: CircleDashed,
  IN_PROGRESS: CircleDashed,
  SERVICED: CheckCircle2,
  COMPLETED: CheckCircle2,
  SUSPENDED: PauseCircle,
  CANCELLED: XCircle,
};

export function StatusBadge({
  status,
  className,
}: {
  status: ServiceStatus;
  className?: string;
}) {
  const Icon = ICONS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        STYLES[status],
        className,
      )}
    >
      <Icon
        className={cn("h-3.5 w-3.5", status === "IN_PROGRESS" && "animate-spin [animation-duration:2.2s]")}
        aria-hidden
      />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function FlagBadge({ flag }: { flag: "delayed" | "conflict" }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-coral/30 bg-coral/5 px-2.5 py-1 text-xs font-semibold text-coral">
      <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
      {flag === "delayed" ? "Demorado" : "Conflicto"}
    </span>
  );
}
