"use client";

import type { ReactNode } from "react";
import { FieldError, FieldLabel, ReasonSelect, ZoneStatusSelect } from "./components";
import type { CompletionForm } from "./useCompletionForm";

export function ZoneResultFields({
  form,
  index,
  evidence,
  onZoneServiced,
}: {
  form: CompletionForm;
  index: number;
  evidence: ReactNode;
  onZoneServiced: (zoneId: string) => void;
}) {
  return (
    <div className="space-y-5">
      <form.Field name={`zoneResults[${index}].status`}>
        {(field) => (
          <label className="block">
            <FieldLabel>Resultado de la zona</FieldLabel>
            <ZoneStatusSelect
              value={field.state.value}
              onChange={(status) => {
                field.handleChange(status);
                if (status === "SERVICED") {
                  const zoneId = form.state.values.zoneResults[index].zoneId;
                  form.setFieldValue(`zoneResults[${index}].reason`, "");
                  form.setFieldValue(`zoneResults[${index}].note`, "");
                  form.setFieldValue(`zoneResults[${index}].evidenceIds`, []);
                  form.setFieldValue(`zoneResults[${index}].photoUnavailable`, false);
                  form.setFieldValue(`zoneResults[${index}].photoUnavailableReason`, "");
                  onZoneServiced(zoneId);
                }
              }}
            />
            <FieldError errors={field.state.meta.errors} />
          </label>
        )}
      </form.Field>

      <form.Subscribe selector={(state) => state.values.zoneResults[index].status}>
        {(status) => status !== "SERVICED" ? (
          <>
            <form.Field name={`zoneResults[${index}].reason`}>
              {(field) => (
                <label className="block">
                  <FieldLabel>Motivo</FieldLabel>
                  <ReasonSelect value={field.state.value} onChange={field.handleChange} />
                  <FieldError errors={field.state.meta.errors} />
                </label>
              )}
            </form.Field>

            <form.Field name={`zoneResults[${index}].note`}>
              {(field) => (
                <label className="block">
                  <FieldLabel>Qué ocurrió</FieldLabel>
                  <textarea
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    rows={4}
                    placeholder="Indicá el tramo afectado y qué impidió completar el servicio."
                    className="w-full resize-y rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm leading-6 text-neutral-900 outline-none placeholder:text-neutral-500 focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2"
                  />
                  <FieldError errors={field.state.meta.errors} />
                </label>
              )}
            </form.Field>

            {evidence}

            <form.Field name={`zoneResults[${index}].photoUnavailable`}>
              {(field) => (
                <label className="flex cursor-pointer items-start gap-3 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    checked={field.state.value}
                    onChange={(event) => field.handleChange(event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-neutral-300 accent-navy"
                  />
                  No fue posible tomar una foto
                </label>
              )}
            </form.Field>

            <form.Subscribe selector={(state) => state.values.zoneResults[index].photoUnavailable}>
              {(unavailable) => unavailable && (
                <form.Field name={`zoneResults[${index}].photoUnavailableReason`}>
                  {(field) => (
                    <label className="block">
                      <FieldLabel>Por qué no fue posible</FieldLabel>
                      <textarea
                        value={field.state.value}
                        onChange={(event) => field.handleChange(event.target.value)}
                        rows={3}
                        className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2"
                      />
                      <FieldError errors={field.state.meta.errors} />
                    </label>
                  )}
                </form.Field>
              )}
            </form.Subscribe>
          </>
        ) : (
          <>
            <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
              Sin excepción. La evidencia fotográfica es opcional para una zona atendida.
            </p>
            <div>
              <FieldLabel optional>Evidencia fotográfica</FieldLabel>
              {evidence}
            </div>
          </>
        )}
      </form.Subscribe>
    </div>
  );
}
