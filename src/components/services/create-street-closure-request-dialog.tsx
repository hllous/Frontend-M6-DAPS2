"use client";
import { errorMessage } from "@/lib/error-message";

import { Info, Plus, Trash2, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TimePicker } from "@/components/ui/time-picker";
import { notifyError, notifySuccess } from "@/components/ui/feedback";
import {
  getFieldDraft,
  submitFieldAction,
} from "@/lib/field-drafts";
import { NetworkFailureError } from "@/lib/authenticated-fetch";
import type { Service } from "@/lib/services";
import type { TreeIntervention } from "@/lib/tree-interventions";
import {
  createStreetClosureRequestInputSchema,
  streetClosureDirectionLabel,
  streetClosureRequestsAdapter,
  type CreateAffectedSection,
  type CreateStreetClosureRequestInput,
  type StreetClosureRequest,
  type StreetClosureDirection,
  type StreetClosureType,
} from "@/lib/street-closure-requests";

type StreetClosureSectionDraft = Omit<CreateAffectedSection, "direction"> & {
  direction: StreetClosureDirection | "";
};
type StreetClosureRequestDraft = Omit<CreateStreetClosureRequestInput, "affectedSections"> & {
  affectedSections: StreetClosureSectionDraft[];
};

const EMPTY_SECTION: StreetClosureSectionDraft = {
  streetName: "",
  fromCross: "",
  toCross: "",
  direction: "",
};

type FormErrors = Record<string, string>;

function serviceWindowValue(service: Service, time: string | null | undefined): string {
  return service.scheduledDate && time ? `${service.scheduledDate}T${time}` : "";
}

function splitDateTime(value: string) {
  const [date = "", time = ""] = value.split("T");
  return { date, time };
}

function joinDateTime({ date, time }: { date: string; time: string }) {
  return date && time ? `${date}T${time}` : "";
}

type StreetClosureSource =
  | { kind: "SERVICE"; record: Service }
  | { kind: "TREE_INTERVENTION"; record: TreeIntervention };

function initialForm(source: StreetClosureSource): StreetClosureRequestDraft {
  if (source.kind === "TREE_INTERVENTION") {
    return {
      reason: "",
      sourceType: "TREE_INTERVENTION",
      sourceId: source.record.id,
      sourceModule: "M6",
      closureType: "PARTIAL",
      requestedFrom: "",
      requestedTo: "",
      affectedSections: [{ ...EMPTY_SECTION }],
    };
  }

  const service = source.record;
  const stored = getFieldDraft<StreetClosureRequestDraft>(service.id, "streetClosureRequest");
  if (stored?.payload) {
    return {
      ...stored.payload,
      affectedSections: stored.payload.affectedSections.map((section) => ({
        ...section,
        direction: section.direction ?? "",
      })),
    };
  }
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

function sourceFromProps(
  service: Service | null | undefined,
  treeIntervention: TreeIntervention | null | undefined,
): StreetClosureSource | null {
  if (service) return { kind: "SERVICE", record: service };
  if (treeIntervention?.status === "AUTHORIZED") return { kind: "TREE_INTERVENTION", record: treeIntervention };
  return null;
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
  service = null,
  treeIntervention = null,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service | null;
  treeIntervention?: TreeIntervention | null;
  onCreated?: (request: StreetClosureRequest) => void;
}) {
  const source = sourceFromProps(service, treeIntervention);
  const [form, setForm] = useState<StreetClosureRequestDraft | null>(
    source ? initialForm(source) : null,
  );
  const [requestedWindow, setRequestedWindow] = useState(() => ({
    requestedFrom: splitDateTime(form?.requestedFrom ?? ""),
    requestedTo: splitDateTime(form?.requestedTo ?? ""),
  }));
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<"pending" | "unsent" | null>(null);
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
    }
    onOpenChange(nextOpen);
  }

  function updateForm<K extends keyof StreetClosureRequestDraft>(
    key: K,
    value: StreetClosureRequestDraft[K],
  ) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
    setErrors((current) => {
      const next = { ...current };
      delete next[String(key)];
      delete next.form;
      return next;
    });
  }

  function updateWindowPart(key: "requestedFrom" | "requestedTo", part: "date" | "time", value: string) {
    setRequestedWindow((current) => ({
      ...current,
      [key]: { ...current[key], [part]: value },
    }));
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      delete next.form;
      return next;
    });
  }

  function updateSection<K extends keyof StreetClosureSectionDraft>(
    index: number,
    key: K,
    value: StreetClosureSectionDraft[K],
  ) {
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
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!source || !form) return;
    const parsed = createStreetClosureRequestInputSchema.safeParse({
      ...form,
      requestedFrom: joinDateTime(requestedWindow.requestedFrom),
      requestedTo: joinDateTime(requestedWindow.requestedTo),
    });
    if (!parsed.success) {
      setErrors(errorMap(parsed.error.issues));
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    if (source.kind === "TREE_INTERVENTION") {
      try {
        const created = await streetClosureRequestsAdapter.create(parsed.data);
        setOutcome("pending");
        onCreated?.(created);
        notifySuccess("Solicitud de corte enviada a Tránsito.");
      } catch (cause) {
        if (cause instanceof NetworkFailureError) {
          setOutcome("unsent");
        } else {
          const message = errorMessage(cause, "No se pudo enviar la solicitud. Intente nuevamente.");
          setErrors({ form: message });
          notifyError(message);
        }
      }
      setIsSubmitting(false);
      return;
    }
    const result = await submitFieldAction({
      service: source.record,
      actionType: "streetClosureRequest",
      payload: parsed.data,
      submit: streetClosureRequestsAdapter.create,
    });

    if (result.kind === "success") {
      setOutcome("pending");
      onCreated?.(result.result);
      notifySuccess("Solicitud de corte enviada a Tránsito.");
    } else if (result.kind === "draft-saved") {
      setOutcome("unsent");
    } else {
      setErrors({ form: result.message });
      notifyError(result.message);
    }
    setIsSubmitting(false);
  }

  if (!source || !form) return null;

  const isComplete = outcome === "pending";
  const sourceTitle = source.kind === "SERVICE" ? source.record.title : source.record.address;
  const sourceTypeLabel = source.kind === "SERVICE" ? "Servicio" : "Intervención de arbolado";
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Solicitar corte de calle a Tránsito</DialogTitle>
        </DialogHeader>

        {outcome === "pending" && source.kind === "SERVICE" && (
          <Alert variant="info" role="status">
            <Info aria-hidden />
            <AlertTitle>Solicitud enviada</AlertTitle>
            <AlertDescription>
              Tránsito debe responder.
            </AlertDescription>
          </Alert>
        )}

        {outcome === "pending" && source.kind === "TREE_INTERVENTION" && (
          <Alert variant="info" role="status">
            <Info aria-hidden />
            <AlertTitle>Solicitud enviada</AlertTitle>
            <AlertDescription>
              Tránsito debe responder.
            </AlertDescription>
          </Alert>
        )}

        {outcome === "unsent" && (
          <Alert variant="warning" role="status">
            <TriangleAlert aria-hidden />
            <AlertTitle>Sin enviar</AlertTitle>
            <AlertDescription>
              Sin conexión. Se guardó en este dispositivo; reenvíe cuando vuelva la conexión.
            </AlertDescription>
          </Alert>
        )}

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">{sourceTypeLabel}</p>
          <p className="mt-1 text-sm font-bold text-[var(--color-text)]">{sourceTitle}</p>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            {source.kind === "SERVICE"
              ? `${source.record.id} · ${source.record.mode === "ROUTE" ? "Recorrido" : "Puntual"} · ${source.record.scheduledDate}`
              : `${source.record.treeIds.length} ${source.record.treeIds.length === 1 ? "árbol" : "árboles"} · Autorizada`}
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
              <Alert variant="danger">
                <TriangleAlert aria-hidden />
                <AlertDescription>{errors.form}</AlertDescription>
              </Alert>
            )}

            <FieldGroup>
              <Field data-invalid={Boolean(errors.reason) || undefined}>
                <FieldLabel htmlFor="street-closure-reason">Motivo *</FieldLabel>
                <Textarea
                  id="street-closure-reason"
                  required
                  value={form.reason}
                  onChange={(event) => updateForm("reason", event.target.value)}
                  aria-invalid={Boolean(errors.reason) || undefined}
                  aria-describedby={errors.reason ? "street-closure-reason-error" : undefined}
                  className="min-h-24"
                  placeholder="Motivo del corte"
                />
                {errors.reason && <FieldError id="street-closure-reason-error">{errors.reason}</FieldError>}
              </Field>

              <Field>
                <FieldLabel htmlFor="street-closure-type">Tipo de corte *</FieldLabel>
                <Select value={form.closureType} onValueChange={(value) => updateForm("closureType", value as StreetClosureType)}>
                  <SelectTrigger id="street-closure-type">
                    <SelectValue>{form.closureType === "PARTIAL" ? "Parcial" : "Total"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="PARTIAL">Parcial</SelectItem>
                      <SelectItem value="TOTAL">Total</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <FieldGroup className="grid gap-4 min-[761px]:grid-cols-2">
                <Field data-invalid={Boolean(errors.requestedFrom) || undefined}>
                  <FieldLabel id="street-closure-requested-from-label" htmlFor="street-closure-requested-from-date">Inicio solicitado *</FieldLabel>
                  <div className="grid grid-cols-2 gap-2">
                    <DatePicker
                      id="street-closure-requested-from-date"
                      value={requestedWindow.requestedFrom.date}
                      onChange={(value) => updateWindowPart("requestedFrom", "date", value)}
                      invalid={Boolean(errors.requestedFrom)}
                      aria-required
                      aria-labelledby="street-closure-requested-from-label"
                      aria-describedby={errors.requestedFrom ? "street-closure-requested-from-error" : undefined}
                    />
                    <TimePicker
                      id="street-closure-requested-from-time"
                      value={requestedWindow.requestedFrom.time}
                      onChange={(value) => updateWindowPart("requestedFrom", "time", value)}
                      required
                      invalid={Boolean(errors.requestedFrom)}
                      aria-labelledby="street-closure-requested-from-label"
                      aria-describedby={errors.requestedFrom ? "street-closure-requested-from-error" : undefined}
                    />
                  </div>
                  {errors.requestedFrom && <FieldError id="street-closure-requested-from-error">{errors.requestedFrom}</FieldError>}
                </Field>
                <Field data-invalid={Boolean(errors.requestedTo) || undefined}>
                  <FieldLabel id="street-closure-requested-to-label" htmlFor="street-closure-requested-to-date">Fin solicitado *</FieldLabel>
                  <div className="grid grid-cols-2 gap-2">
                    <DatePicker
                      id="street-closure-requested-to-date"
                      value={requestedWindow.requestedTo.date}
                      onChange={(value) => updateWindowPart("requestedTo", "date", value)}
                      invalid={Boolean(errors.requestedTo)}
                      aria-required
                      aria-labelledby="street-closure-requested-to-label"
                      aria-describedby={errors.requestedTo ? "street-closure-requested-to-error" : undefined}
                    />
                    <TimePicker
                      id="street-closure-requested-to-time"
                      value={requestedWindow.requestedTo.time}
                      onChange={(value) => updateWindowPart("requestedTo", "time", value)}
                      required
                      invalid={Boolean(errors.requestedTo)}
                      aria-labelledby="street-closure-requested-to-label"
                      aria-describedby={errors.requestedTo ? "street-closure-requested-to-error" : undefined}
                    />
                  </div>
                  {errors.requestedTo && <FieldError id="street-closure-requested-to-error">{errors.requestedTo}</FieldError>}
                </Field>
              </FieldGroup>
            </FieldGroup>

            <FieldGroup>
              <h2 className="text-sm font-bold text-[var(--color-text)]">Tramos afectados</h2>
              {form.affectedSections.map((section, index) => (
                <fieldset key={index} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-4">
                  <legend className="px-1 text-xs font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">Tramo afectado {index + 1}</legend>
                  <FieldGroup className="mt-2 gap-4">
                    <Field data-invalid={Boolean(errors[`affectedSections.${index}.streetName`]) || undefined}>
                      <FieldLabel htmlFor={`affected-section-${index}-street`}>Calle *</FieldLabel>
                      <Input
                        id={`affected-section-${index}-street`}
                        ref={(element) => {
                          sectionInputRefs.current[index] = element;
                        }}
                        value={section.streetName}
                        onChange={(event) => updateSection(index, "streetName", event.target.value)}
                        aria-invalid={Boolean(errors[`affectedSections.${index}.streetName`]) || undefined}
                        aria-describedby={errors[`affectedSections.${index}.streetName`] ? `affected-section-${index}-street-error` : undefined}
                      />
                      {errors[`affectedSections.${index}.streetName`] && <FieldError id={`affected-section-${index}-street-error`}>{errors[`affectedSections.${index}.streetName`]}</FieldError>}
                    </Field>
                    <FieldGroup className="grid gap-4 min-[761px]:grid-cols-2">
                      <Field data-invalid={Boolean(errors[`affectedSections.${index}.fromCross`]) || undefined}>
                        <FieldLabel htmlFor={`affected-section-${index}-from`}>Desde calle *</FieldLabel>
                        <Input
                          id={`affected-section-${index}-from`}
                          value={section.fromCross}
                          onChange={(event) => updateSection(index, "fromCross", event.target.value)}
                          aria-invalid={Boolean(errors[`affectedSections.${index}.fromCross`]) || undefined}
                          aria-describedby={errors[`affectedSections.${index}.fromCross`] ? `affected-section-${index}-from-error` : undefined}
                        />
                        {errors[`affectedSections.${index}.fromCross`] && <FieldError id={`affected-section-${index}-from-error`}>{errors[`affectedSections.${index}.fromCross`]}</FieldError>}
                      </Field>
                      <Field data-invalid={Boolean(errors[`affectedSections.${index}.toCross`]) || undefined}>
                        <FieldLabel htmlFor={`affected-section-${index}-to`}>Hasta calle *</FieldLabel>
                        <Input
                          id={`affected-section-${index}-to`}
                          value={section.toCross}
                          onChange={(event) => updateSection(index, "toCross", event.target.value)}
                          aria-invalid={Boolean(errors[`affectedSections.${index}.toCross`]) || undefined}
                          aria-describedby={errors[`affectedSections.${index}.toCross`] ? `affected-section-${index}-to-error` : undefined}
                        />
                        {errors[`affectedSections.${index}.toCross`] && <FieldError id={`affected-section-${index}-to-error`}>{errors[`affectedSections.${index}.toCross`]}</FieldError>}
                      </Field>
                    </FieldGroup>
                    <Field data-invalid={Boolean(errors[`affectedSections.${index}.direction`]) || undefined}>
                      <FieldLabel htmlFor={`affected-section-${index}-direction`}>Sentido *</FieldLabel>
                      <Select
                        value={section.direction || null}
                        onValueChange={(value) => updateSection(index, "direction", value as StreetClosureDirection)}
                      >
                        <SelectTrigger
                          id={`affected-section-${index}-direction`}
                          aria-required="true"
                          aria-invalid={Boolean(errors[`affectedSections.${index}.direction`]) || undefined}
                          aria-describedby={errors[`affectedSections.${index}.direction`] ? `affected-section-${index}-direction-error` : undefined}
                        >
                          <SelectValue placeholder="Seleccione un sentido">
                            {section.direction ? streetClosureDirectionLabel(section.direction) : undefined}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="FORWARD">Ascendente</SelectItem>
                            <SelectItem value="REVERSE">Descendente</SelectItem>
                            <SelectItem value="BOTH">Ambos sentidos</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      {errors[`affectedSections.${index}.direction`] && (
                        <FieldError id={`affected-section-${index}-direction-error`}>
                          {errors[`affectedSections.${index}.direction`]}
                        </FieldError>
                      )}
                    </Field>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeSection(index)}
                      disabled={form.affectedSections.length === 1}
                      aria-label={`Quitar tramo ${index + 1}`}
                      className="w-fit gap-1.5 text-[var(--color-danger)]"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      Quitar
                    </Button>
                  </FieldGroup>
                </fieldset>
              ))}
              <Button type="button" variant="outline" onClick={addSection} className="w-fit gap-1.5">
                <Plus className="h-4 w-4" aria-hidden />
                Agregar tramo
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
              {isSubmitting ? "Enviando solicitud…" : "Enviar solicitud"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
