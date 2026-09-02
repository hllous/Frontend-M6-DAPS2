"use client";

// PROTOTYPE component. Timeline structure borrowed from the catalogued
// stepper-1.png reference (filled check-circle / empty circle, connecting
// line, timestamp under each label) — see docs/design/inspiration/README.md.
// Reused as-is across variants; only its container differs (side panel in
// Variant A, inline row-expand in Variant C, skipped entirely in Variant B
// which navigates straight to full detail instead).
import { Check, ExternalLink, MapPin, Route, X } from "lucide-react";
import type { MockService } from "../data";
import { StatusBadge, FlagBadge } from "./StatusBadge";
import { cn } from "@/lib/utils";

export function ServicePreview({
  service,
  onOpenDetail,
  onClose,
  compact = false,
}: {
  service: MockService;
  onOpenDetail: (id: string) => void;
  onClose?: () => void;
  compact?: boolean;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-2 border-b border-neutral-200 p-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-400">
            {service.kind === "ROUTE" ? (
              <Route className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <MapPin className="h-3.5 w-3.5" aria-hidden />
            )}
            {service.id} · {service.zone}
          </div>
          <h3 className="mt-0.5 text-sm font-semibold text-neutral-900">
            {service.title}
          </h3>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar vista previa"
            className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={service.status} />
          {service.flag && <FlagBadge flag={service.flag} />}
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-neutral-400">Cuadrilla</dt>
            <dd className="text-neutral-700">{service.crew}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-400">Programado</dt>
            <dd className="text-neutral-700">{service.scheduledFor}</dd>
          </div>
        </dl>

        <div className={cn("mt-5", compact && "mt-4")}>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Historial de estado
          </h4>
          <ol>
            {service.history.map((step, i) => (
              <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
                {i < service.history.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute left-[9px] top-5 h-full w-px bg-neutral-200"
                  />
                )}
                <span
                  className={cn(
                    "z-10 mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2",
                    step.done
                      ? "border-navy bg-navy text-white"
                      : "border-neutral-300 bg-white",
                  )}
                >
                  {step.done && <Check className="h-3 w-3" aria-hidden />}
                </span>
                <div>
                  <div
                    className={cn(
                      "text-sm font-medium",
                      step.done ? "text-neutral-800" : "text-neutral-400",
                    )}
                  >
                    {step.label}
                  </div>
                  <div className="text-xs text-neutral-400">{step.at}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="border-t border-neutral-200 p-3">
        <button
          type="button"
          onClick={() => onOpenDetail(service.id)}
          className="flex w-full items-center justify-center gap-1.5 rounded-md bg-navy px-3 py-2 text-sm font-semibold text-white hover:bg-navy-light"
        >
          Ver detalle completo
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
