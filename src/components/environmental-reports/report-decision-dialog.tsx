"use client";

import { useId, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { MAX_REASON_LENGTH } from "@/lib/input-limits";

export type ReportDecision = "forward" | "dismiss";

const COPY: Record<ReportDecision, { title: string; description: string; submit: string; submitting: string }> = {
  forward: {
    title: "Derivar expediente",
    description: "Indique por qué corresponde derivar este expediente. El motivo queda registrado en el historial.",
    submit: "Derivar expediente",
    submitting: "Derivando…",
  },
  dismiss: {
    title: "Desestimar expediente",
    description: "Indique por qué se desestima este expediente. El motivo queda registrado en el historial.",
    submit: "Desestimar expediente",
    submitting: "Desestimando…",
  },
};

interface ReportDecisionDialogProps {
  decision: ReportDecision | null;
  reportId: string;
  onOpenChange: (open: boolean) => void;
  /** Resolves to an error message when the action failed, or null on success. */
  onConfirm: (decision: ReportDecision, reason: string) => Promise<string | null>;
}

export function ReportDecisionDialog({ decision, reportId, onOpenChange, onConfirm }: ReportDecisionDialogProps) {
  return (
    <Dialog open={decision !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {decision ? <ReportDecisionForm key={`${reportId}-${decision}`} decision={decision} reportId={reportId} onOpenChange={onOpenChange} onConfirm={onConfirm} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function ReportDecisionForm({ decision, reportId, onOpenChange, onConfirm }: { decision: ReportDecision; reportId: string; onOpenChange: (open: boolean) => void; onConfirm: ReportDecisionDialogProps["onConfirm"] }) {
  const formId = useId();
  const copy = COPY[decision];
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!reason.trim()) {
      setErrorMessage("Debe indicar el motivo.");
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    const failure = await onConfirm(decision, reason.trim());
    setSubmitting(false);
    if (failure) setErrorMessage(failure);
    else onOpenChange(false);
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{copy.title}</DialogTitle>
        <DialogDescription>{copy.description} Expediente {reportId}.</DialogDescription>
      </DialogHeader>
      <form id={formId} noValidate onSubmit={handleSubmit} className="space-y-4 py-2">
        {errorMessage && (
          <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-[var(--color-danger-line)] bg-[var(--color-danger-fill)] p-3 text-sm text-[var(--color-danger)]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{errorMessage}</span>
          </div>
        )}
        <Field>
          <FieldLabel htmlFor={`${formId}-reason`}>Motivo <span aria-hidden="true">*</span></FieldLabel>
          <textarea
            id={`${formId}-reason`}
            rows={3}
            maxLength={MAX_REASON_LENGTH}
            value={reason}
            disabled={submitting}
            onChange={(event) => { setReason(event.target.value); setErrorMessage(null); }}
            className="w-full resize-y rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-3 text-base text-[var(--color-text)] outline-none focus-visible:ring-3 focus-visible:ring-[var(--color-focus)]"
          />
          <FieldDescription>Obligatorio. Hasta {MAX_REASON_LENGTH} caracteres.</FieldDescription>
        </Field>
      </form>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Volver al expediente</Button>
        <Button type="submit" form={formId} disabled={submitting} className="min-h-10 gap-2">
          {submitting && <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden />}
          {submitting ? copy.submitting : copy.submit}
        </Button>
      </DialogFooter>
    </>
  );
}
