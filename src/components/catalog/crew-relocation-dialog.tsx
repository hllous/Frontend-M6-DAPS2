"use client";

import { useState, type FormEvent } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { todayInArgentina } from "@/lib/argentina-date";
import { crewZoneAssignmentsAdapter, createCrewZoneAssignmentInputSchema, type CrewZoneAssignment } from "@/lib/crew-zone-assignments";
import type { Crew } from "@/lib/crews";
import { errorMessage } from "@/lib/error-message";
import type { Zone } from "@/lib/zones";

type FieldErrors = Partial<Record<"zoneId" | "validFrom" | "validTo" | "reason", string>>;

export function CrewRelocationDialog({ crew, zones, onOpenChange, onSuccess }: {
  crew: Crew | null;
  zones: Zone[];
  onOpenChange: (open: boolean) => void;
  onSuccess: (move: CrewZoneAssignment) => void;
}) {
  return (
    <Dialog open={Boolean(crew)} onOpenChange={onOpenChange}>
      {crew ? <CrewRelocationContent crew={crew} zones={zones} onOpenChange={onOpenChange} onSuccess={onSuccess} /> : null}
    </Dialog>
  );
}

function CrewRelocationContent({ crew, zones, onOpenChange, onSuccess }: {
  crew: Crew;
  zones: Zone[];
  onOpenChange: (open: boolean) => void;
  onSuccess: (move: CrewZoneAssignment) => void;
}) {
  const [zoneId, setZoneId] = useState("");
  const [validFrom, setValidFrom] = useState(todayInArgentina);
  const [validTo, setValidTo] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const clear = (key: keyof FieldErrors) => setErrors((current) => ({ ...current, [key]: undefined }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFailure(null);
    const parsed = createCrewZoneAssignmentInputSchema.safeParse({ zoneId, validFrom, validTo: validTo || null, reason });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) { const key = issue.path[0] as keyof FieldErrors; next[key] ??= issue.message; }
      setErrors(next);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      onSuccess(await crewZoneAssignmentsAdapter.create(crew.id, parsed.data));
    } catch (caught) {
      setFailure(errorMessage(caught, "No se pudo reubicar la cuadrilla."));
    } finally {
      setSubmitting(false);
    }
  }

  const zoneItems = Object.fromEntries(zones.map((zone) => [zone.id, zone.name]));
  return (
    <DialogContent className="max-w-lg overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Reubicar cuadrilla</DialogTitle>
        <DialogDescription>{crew.name} trabajará en otra zona durante el período indicado.</DialogDescription>
      </DialogHeader>
      <form id="crew-relocation-form" className="pb-2" noValidate onSubmit={(event) => void submit(event)}>
        <FieldGroup>
          {failure ? <Alert variant="destructive"><AlertDescription>{failure}</AlertDescription></Alert> : null}
          <Field data-invalid={Boolean(errors.zoneId)}>
            <FieldLabel htmlFor="crew-relocation-zone">Zona de destino</FieldLabel>
            <Select items={zoneItems} value={zoneId || null} onValueChange={(value) => { if (value !== null) { setZoneId(value); clear("zoneId"); } }}>
              <SelectTrigger id="crew-relocation-zone" surface="card" aria-invalid={Boolean(errors.zoneId)} aria-describedby={errors.zoneId ? "crew-relocation-zone-error" : undefined}>
                <SelectValue placeholder="Elija una zona" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {zones.map((zone) => <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>)}
                </SelectGroup>
              </SelectContent>
            </Select>
            {errors.zoneId ? <FieldError id="crew-relocation-zone-error">{errors.zoneId}</FieldError> : null}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={Boolean(errors.validFrom)}>
              <FieldLabel htmlFor="crew-relocation-from">Desde</FieldLabel>
              <DatePicker id="crew-relocation-from" value={validFrom} onChange={(value) => { setValidFrom(value); clear("validFrom"); clear("validTo"); }} invalid={Boolean(errors.validFrom)} aria-required={true} aria-describedby={errors.validFrom ? "crew-relocation-from-error" : undefined} />
              {errors.validFrom ? <FieldError id="crew-relocation-from-error">{errors.validFrom}</FieldError> : null}
            </Field>
            <Field data-invalid={Boolean(errors.validTo)}>
              <FieldLabel htmlFor="crew-relocation-to">Hasta <span className="font-normal text-muted-foreground">(opcional)</span></FieldLabel>
              <DatePicker id="crew-relocation-to" value={validTo} min={validFrom || undefined} onChange={(value) => { setValidTo(value); clear("validTo"); }} invalid={Boolean(errors.validTo)} aria-describedby={errors.validTo ? "crew-relocation-to-error" : "crew-relocation-to-hint"} />
              {errors.validTo ? <FieldError id="crew-relocation-to-error">{errors.validTo}</FieldError> : <FieldDescription id="crew-relocation-to-hint">Incluye ese día. Sin fecha, queda hasta nuevo aviso.</FieldDescription>}
              {validTo ? <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => setValidTo("")}>Quitar fecha de fin</Button> : null}
            </Field>
          </div>
          <Field data-invalid={Boolean(errors.reason)}>
            <FieldLabel htmlFor="crew-relocation-reason">Motivo</FieldLabel>
            <Textarea id="crew-relocation-reason" value={reason} maxLength={500} required aria-invalid={Boolean(errors.reason)} aria-describedby={errors.reason ? "crew-relocation-reason-error" : undefined} onChange={(event) => { setReason(event.target.value); clear("reason"); }} placeholder="Ej: Refuerzo por evento masivo" />
            {errors.reason ? <FieldError id="crew-relocation-reason-error">{errors.reason}</FieldError> : null}
          </Field>
        </FieldGroup>
      </form>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
        <Button type="submit" form="crew-relocation-form" disabled={submitting}>Reubicar</Button>
      </DialogFooter>
    </DialogContent>
  );
}
