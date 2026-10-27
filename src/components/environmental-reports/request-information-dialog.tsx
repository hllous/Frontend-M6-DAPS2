"use client";

import { useId, useState } from "react";
import { format } from "date-fns";
import { AlertCircle } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { MAX_REASON_LENGTH } from "@/lib/input-limits";
import type { RequestInformationInput } from "@/lib/environmental-reports";

interface RequestInformationDialogProps {
  open: boolean;
  reportId: string;
  onOpenChange: (open: boolean) => void;
  finalFocus?: React.ComponentProps<typeof DialogContent>["finalFocus"];
  /** Resolves to an error message when the request failed, or null on success. */
  onConfirm: (input: RequestInformationInput) => Promise<string | null>;
}

export function RequestInformationDialog({ open, reportId, onOpenChange, onConfirm, finalFocus }: RequestInformationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" finalFocus={finalFocus}>
        {open ? <RequestInformationForm key={reportId} reportId={reportId} onOpenChange={onOpenChange} onConfirm={onConfirm} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function RequestInformationForm({ reportId, onOpenChange, onConfirm }: Pick<RequestInformationDialogProps, "reportId" | "onOpenChange" | "onConfirm">) {
  const formId = useId();
  const [message, setMessage] = useState("");
  const [requiredBy, setRequiredBy] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [messageInvalid, setMessageInvalid] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!message.trim()) {
      setMessageInvalid(true);
      setErrorMessage("Indique qué información pide.");
      return;
    }
    setSubmitting(true);
    setMessageInvalid(false);
    setErrorMessage(null);
    const failure = await onConfirm({
      message: message.trim(),
      requiredBy: requiredBy || undefined,
      internalNote: internalNote.trim() || undefined,
    });
    setSubmitting(false);
    if (failure) setErrorMessage(failure);
    else onOpenChange(false);
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Pedir información al vecino</DialogTitle>
        <DialogDescription>El expediente sigue en revisión hasta que responda. Expediente {reportId}.</DialogDescription>
      </DialogHeader>
      <form id={formId} noValidate onSubmit={handleSubmit} className="space-y-4 py-2">
        {errorMessage && (
          <Alert variant="danger" className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span id={messageInvalid ? `${formId}-message-error` : undefined}>{errorMessage}</span>
          </Alert>
        )}
        <Field>
          <FieldLabel htmlFor={`${formId}-message`}>Qué información necesita <span aria-hidden="true">*</span></FieldLabel>
          <Textarea
            id={`${formId}-message`}
            rows={3}
            maxLength={MAX_REASON_LENGTH}
            value={message}
            disabled={submitting}
            onChange={(event) => { setMessage(event.target.value); setMessageInvalid(false); setErrorMessage(null); }}
            aria-invalid={messageInvalid}
            aria-describedby={messageInvalid ? `${formId}-message-error` : `${formId}-message-help`}
            className="resize-y"
          />
          <FieldDescription id={`${formId}-message-help`}>Obligatorio. Lo ve el vecino: no incluya datos internos. Hasta {MAX_REASON_LENGTH} caracteres.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${formId}-required-by`}>Fecha sugerida para responder</FieldLabel>
          <DatePicker id={`${formId}-required-by`} value={requiredBy} onChange={setRequiredBy} min={format(new Date(), "yyyy-MM-dd")} disabled={submitting} aria-describedby={`${formId}-required-by-help`} />
          <FieldDescription id={`${formId}-required-by-help`}>Opcional. Si vence sin respuesta, el expediente se desestima.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${formId}-note`}>Nota interna (el vecino no la ve)</FieldLabel>
          <Textarea
            id={`${formId}-note`}
            rows={2}
            maxLength={MAX_REASON_LENGTH}
            value={internalNote}
            disabled={submitting}
            onChange={(event) => setInternalNote(event.target.value)}
            className="resize-y"
          />
        </Field>
      </form>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
        <Button type="submit" form={formId} disabled={submitting} className="gap-2">
          {submitting && <Spinner data-icon="inline-start" aria-hidden />}
          {submitting ? "Enviando…" : "Pedir información"}
        </Button>
      </DialogFooter>
    </>
  );
}
