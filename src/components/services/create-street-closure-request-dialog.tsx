"use client";

import { Plus, Trash2, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  getFieldDraft,
  submitFieldAction,
} from "@/lib/field-drafts";
import type { Service } from "@/lib/services";
import {
  createStreetClosureRequestInputSchema,
  streetClosureRequestsAdapter,
  type AffectedSection,
  type CreateStreetClosureRequestInput,
  type StreetClosureRequest,
  type StreetClosureType,
} from "@/lib/street-closure-requests";

const EMPTY_SECTION: AffectedSection = { streetName: "", fromCross: "", toCross: "" };

type FormErrors = Record<string, string>;

function serviceWindowValue(service: Service, time: string | null | undefined): string {
  return service.scheduledDate && time ? `${service.scheduledDate}T${time}` : "";
}

function initialForm(service: Service): CreateStreetClosureRequestInput {
  const stored = getFieldDraft<CreateStreetClosureRequestInput>(service.id, "streetClosureRequest");
  if (stored?.payload) return stored.payload;
  return {
    reason: "",
    sourceType: "SERVICE",
    sourceId: service.id,
    sourceModule: "M6",
    closureType: "PARTIAL",
    requestedFrom: serviceWindowValue(service, service.windowFrom),
    requestedTo: serviceWindowValue(service, service.windowTo),
    affectedSections: [{ ...EMPTY_SECTION }],
  };
}

function errorMap(issues: { path: PropertyKey[]; message: string }[]): FormErrors {
  return issues.reduce<FormErrors>((result, issue) => {
    const key = issue.path.length ? issue.path.join(".") : "form";
    if (!result[key]) result[key] = issue.message;
    return result;
  }, {});
}

export function CreateStreetClosureRequestDialog({
  open,
  onOpenChange,
  service,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: Service | null;
  onCreated?: (request: StreetClosureRequest) => void;
}) {
  const [form, setForm] = useState<CreateStreetClosureRequestInput | null>(
    service ? initialForm(service) : null,
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<"pending" | "unsent" | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const focusSectionIndex = useRef<number | null>(null);
  const sectionInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  useEffect(() => {
    const index = focusSectionIndex.current;
    if (index === null) return;
    sectionInputRefs.current[index]?.focus();
    focusSectionIndex.current = null;
  }, [form?.affectedSections.length]);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setErrors({});
      setOutcome(null);
      setAnnouncement("");
    }
    onOpenChange(nextOpen);
  }

  function updateForm<K extends keyof CreateStreetClosureRequestInput>(
    key: K,
    value: CreateStreetClosureRequestInput[K],
  ) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
    setErrors((current) => {
      const next = { ...current };
      delete next[String(key)];
      delete next.form;
      return next;
    });
  }

  function updateSection(index: number, key: keyof AffectedSection, value: string) {
    setForm((current) => {
      if (!current) return current;
      const affectedSections = current.affectedSections.map((section, sectionIndex) =>
        sectionIndex === index ? { ...section, [key]: value } : section,
      );
      return { ...current, affectedSections };
    });
    setErrors((current) => {
      const next = { ...current };
      delete next[`affectedSections.${index}.${key}`];
      delete next.form;
      return next;
    });
  }

  function addSection() {
    setForm((current) => {
      if (!current) return current;
      focusSectionIndex.current = current.affectedSections.length;
      return { ...current, affectedSections: [...current.affectedSections, { ...EMPTY_SECTION }] };
    });
    setAnnouncement("Se agregó un tramo afectado.");
  }

  function removeSection(index: number) {
    setForm((current) => {
      if (!current || current.affectedSections.length <= 1) return current;
      focusSectionIndex.current = Math.max(0, index - 1);
      return {
        ...current,
        affectedSections: current.affectedSections.filter((_, sectionIndex) => sectionIndex !== index),
      };
    });
    setAnnouncement(`Se quitó el tramo afectado ${index + 1}.`);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!service || !form) return;
    const parsed = createStreetClosureRequestInputSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(errorMap(parsed.error.issues));
      setAnnouncement("Revise los campos indicados antes de crear la solicitud.");
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    setAnnouncement("");
    const result = await submitFieldAction({
      service,
      actionType: "streetClosureRequest",
      payload: parsed.data,
      submit: streetClosureRequestsAdapter.create,
    });

    if (result.kind === "success") {
      setOutcome("pending");
      setAnnouncement("Solicitud creada y pendiente de respuesta de M7.");
      onCreated?.(result.result);
    } else if (result.kind === "draft-saved") {
      setOutcome("unsent");
      setAnnouncement("La solicitud quedó sin enviar y se conservó en este dispositivo.");
    } else {
      setErrors({ form: result.message });
      setAnnouncement("No se pudo crear la solicitud.");
    }
    setIsSubmitting(false);
  }

  if (!service || !form) return null;

  const isComplete = outcome !== null;
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Solicitar corte de calle</DialogTitle>
          <DialogDescription>
            Registre el pedido a M7 desde el contexto canónico del Servicio. La respuesta externa no se inventa en M6.
          </DialogDescription>
        </DialogHeader>

        <div aria-live="polite" className="sr-only">{announcement}</div>

        {outcome === "pending" && (
          <div role="status" className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 shadow-sm">
            <p className="text-sm font-bold text-blue-800 dark:text-blue-200">Solicitud pendiente</p>
            <p className="mt-1 text-sm text-blue-800/80 dark:text-blue-100/80">
              M6 creó el registro. Queda pendiente la respuesta de M7 y el Servicio conserva este contexto.
            </p>
          </div>
        )}

        {outcome === "unsent" && (
          <div role="status" className="rounded-xl border border-[var(--color-warning-line)] bg-[var(--color-warning-fill)]/50 p-4 shadow-sm">
            <p className="text-sm font-bold text-[var(--color-warning)]">Solicitud sin enviar</p>
            <p className="mt-1 text-sm text-[var(--color-warning)]">
              No se creó un registro en M6. Los valores quedaron conservados; reenvíe la solicitud manualmente cuando revise la conexión.
            </p>
          </div>
        )}

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">Contexto del Servicio</p>
          <p className="mt-1 text-sm font-bold text-[var(--color-text)]">{service.title}</p>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            {service.id} · {service.mode === "ROUTE" ? "Recorrido" : "Punto"} · {service.scheduledDate}
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            Este Servicio es la referencia de origen; no se duplica como una nueva fuente.
          </p>
        </div>

        {!isComplete && (
          <form
            id="street-closure-request-form"
            onSubmit={handleSubmit}
            className="flex flex-col gap-5 py-1"
            noValidate
          >
            {errors.form && (
              <div role="alert" className="flex items-start gap-2 rounded-xl border border-[var(--color-danger-line)] bg-[var(--color-danger-fill)]/50 p-3 text-sm text-[var(--color-danger)]">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>{errors.form}</span>
              </div>
            )}

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="street-closure-reason">Motivo *</FieldLabel>
                <textarea
                  id="street-closure-reason"
                  required
                  value={form.reason}
                  onChange={(event) => updateForm("reason", event.target.value)}
                  aria-invalid={Boolean(errors.reason)}
                  aria-describedby={errors.reason ? "street-closure-reason-error" : undefined}
                  className="min-h-24 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-3 text-sm text-[var(--color-text)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]"
                  placeholder="Explique por qué el Servicio necesita el corte"
                />
                {errors.reason && <FieldError id="street-closure-reason-error">{errors.reason}</FieldError>}
              </Field>

              <Field>
                <FieldLabel htmlFor="street-closure-type">Tipo de corte *</FieldLabel>
                <select
                  id="street-closure-type"
                  value={form.closureType}
                  onChange={(event) => updateForm("closureType", event.target.value as StreetClosureType)}
                  className="h-12 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] md:h-10"
                >
                  <option value="PARTIAL">Parcial</option>
                  <option value="TOTAL">Total</option>
                </select>
                <FieldDescription>El tipo describe la solicitud enviada a M7, no una decisión de M7.</FieldDescription>
              </Field>

              <FieldGroup className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="street-closure-requested-from">Inicio solicitado *</FieldLabel>
                  <input
                    id="street-closure-requested-from"
                    type="datetime-local"
                    required
                    value={form.requestedFrom}
                    onChange={(event) => updateForm("requestedFrom", event.target.value)}
                    aria-invalid={Boolean(errors.requestedFrom)}
                    aria-describedby={errors.requestedFrom ? "street-closure-requested-from-error" : undefined}
                    className="h-12 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] md:h-10"
                  />
                  {errors.requestedFrom && <FieldError id="street-closure-requested-from-error">{errors.requestedFrom}</FieldError>}
                </Field>
                <Field>
                  <FieldLabel htmlFor="street-closure-requested-to">Fin solicitado *</FieldLabel>
                  <input
                    id="street-closure-requested-to"
                    type="datetime-local"
                    required
                    value={form.requestedTo}
                    onChange={(event) => updateForm("requestedTo", event.target.value)}
                    aria-invalid={Boolean(errors.requestedTo)}
                    aria-describedby={errors.requestedTo ? "street-closure-requested-to-error" : undefined}
                    className="h-12 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] md:h-10"
                  />
                  {errors.requestedTo && <FieldError id="street-closure-requested-to-error">{errors.requestedTo}</FieldError>}
                </Field>
              </FieldGroup>
              <FieldDescription>
                La ventana se prefija desde el Servicio cuando existe, pero debe revisarse y puede editarse antes del envío.
              </FieldDescription>
            </FieldGroup>

            <FieldGroup>
              <div>
                <h2 className="text-sm font-bold text-[var(--color-text)]">Tramos afectados</h2>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">Agregue al menos un tramo con calle y sus dos calles transversales.</p>
              </div>
              {form.affectedSections.map((section, index) => (
                <fieldset key={index} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-4 shadow-sm">
                  <legend className="px-1 text-xs font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">Tramo afectado {index + 1}</legend>
                  <FieldGroup className="mt-2 gap-4">
                    <Field>
                      <FieldLabel htmlFor={`affected-section-${index}-street`}>Calle *</FieldLabel>
                      <input
                        id={`affected-section-${index}-street`}
                        ref={(element) => {
                          sectionInputRefs.current[index] = element;
                        }}
                        value={section.streetName}
                        onChange={(event) => updateSection(index, "streetName", event.target.value)}
                        aria-invalid={Boolean(errors[`affectedSections.${index}.streetName`])}
                        aria-describedby={errors[`affectedSections.${index}.streetName`] ? `affected-section-${index}-street-error` : undefined}
                        className="h-12 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] md:h-10"
                      />
                      {errors[`affectedSections.${index}.streetName`] && <FieldError id={`affected-section-${index}-street-error`}>{errors[`affectedSections.${index}.streetName`]}</FieldError>}
                    </Field>
                    <FieldGroup className="grid gap-4 md:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor={`affected-section-${index}-from`}>Desde calle transversal *</FieldLabel>
                        <input
                          id={`affected-section-${index}-from`}
                          value={section.fromCross}
                          onChange={(event) => updateSection(index, "fromCross", event.target.value)}
                          aria-invalid={Boolean(errors[`affectedSections.${index}.fromCross`])}
                          aria-describedby={errors[`affectedSections.${index}.fromCross`] ? `affected-section-${index}-from-error` : undefined}
                          className="h-12 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] md:h-10"
                        />
                        {errors[`affectedSections.${index}.fromCross`] && <FieldError id={`affected-section-${index}-from-error`}>{errors[`affectedSections.${index}.fromCross`]}</FieldError>}
                      </Field>
                      <Field>
                        <FieldLabel htmlFor={`affected-section-${index}-to`}>Hasta calle transversal *</FieldLabel>
                        <input
                          id={`affected-section-${index}-to`}
                          value={section.toCross}
                          onChange={(event) => updateSection(index, "toCross", event.target.value)}
                          aria-invalid={Boolean(errors[`affectedSections.${index}.toCross`])}
                          aria-describedby={errors[`affectedSections.${index}.toCross`] ? `affected-section-${index}-to-error` : undefined}
                          className="h-12 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] md:h-10"
                        />
                        {errors[`affectedSections.${index}.toCross`] && <FieldError id={`affected-section-${index}-to-error`}>{errors[`affectedSections.${index}.toCross`]}</FieldError>}
                      </Field>
                    </FieldGroup>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeSection(index)}
                      disabled={form.affectedSections.length === 1}
                      aria-label={`Quitar tramo afectado ${index + 1}`}
                      className="w-fit gap-1.5 text-[var(--color-danger)]"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      Quitar tramo
                    </Button>
                  </FieldGroup>
                </fieldset>
              ))}
              <Button type="button" variant="outline" onClick={addSection} className="w-fit gap-1.5">
                <Plus className="h-4 w-4" aria-hidden />
                Agregar tramo afectado
              </Button>
            </FieldGroup>
          </form>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            {isComplete ? "Cerrar" : "Cancelar"}
          </Button>
          {!isComplete && (
            <Button type="submit" form="street-closure-request-form" disabled={isSubmitting}>
              {isSubmitting ? "Creando solicitud…" : "Crear solicitud de corte"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
