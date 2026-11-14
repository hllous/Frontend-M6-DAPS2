"use client";

import * as React from "react";
import { AlertCircle, Send } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { errorMessage as getErrorMessage } from "@/lib/error-message";
import { cn } from "@/lib/utils";

/**
 * Confirmation before a one-click write (#910): same title/effect/verb/"Cancelar" pattern everywhere.
 * The trigger goes through DialogTrigger, so it announces `aria-haspopup="dialog"` and gets focus back
 * on close. The action runs only on confirm; while it runs the dialog cannot be closed or resubmitted,
 * the confirm button keeps its label and shows a spinner (DESIGN.md), and a failure keeps the dialog
 * open with the error.
 */
interface ConfirmActionDialogProps {
  /** Button that opens the dialog. */
  trigger: React.ReactElement;
  /** The action, e.g. "Cerrar expediente ER-1001". */
  title: string;
  /** What happens on confirm. */
  description: React.ReactNode;
  /** Optional effect outside M6 (e.g. the citizen is notified through M2). */
  notice?: React.ReactNode;
  /** Optional context shown between the description and the footer. */
  children?: React.ReactNode;
  /** Confirm verb, e.g. "Cerrar expediente". */
  confirmLabel: string;
  /** `destructive` for irreversible or destructive actions. */
  tone?: "default" | "destructive";
  /** Resolves to an error message (or throws) when the action failed; null/undefined on success. */
  onConfirm: () => Promise<string | null | void>;
  /** Message when `onConfirm` throws something that is not an Error. */
  errorFallback?: string;
  /** Overrides where focus goes on close (default: the trigger). */
  finalFocus?: React.ComponentProps<typeof DialogContent>["finalFocus"];
}

function ConfirmActionDialog({
  trigger,
  title,
  description,
  notice,
  children,
  confirmLabel,
  tone = "default",
  onConfirm,
  errorFallback = "No se pudo completar la acción. Intente nuevamente.",
  finalFocus,
}: ConfirmActionDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const submitting = React.useRef(false);

  function handleOpenChange(next: boolean) {
    if (submitting.current) return;
    if (next) setError(null);
    setOpen(next);
  }

  async function confirm() {
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    setError(null);
    let failure: string | null = null;
    try {
      failure = (await onConfirm()) ?? null;
    } catch (caught) {
      failure = getErrorMessage(caught, errorFallback);
    }
    submitting.current = false;
    setPending(false);
    if (failure) setError(failure);
    else setOpen(false);
  }

  const hasBody = Boolean(notice || children || error);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-w-lg" finalFocus={finalFocus}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-sm">{description}</DialogDescription>
        </DialogHeader>
        {hasBody ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain py-4">
            {notice ? (
              <Alert variant="info" role="note">
                <Send aria-hidden />
                <AlertDescription>{notice}</AlertDescription>
              </Alert>
            ) : null}
            {children}
            {error ? (
              <Alert variant="danger">
                <AlertCircle aria-hidden />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </div>
        ) : null}
        {/* Without a body the header separator is enough; a second line would double it. */}
        <DialogFooter className={cn("flex-col-reverse items-stretch sm:flex-row sm:items-center [&>button]:whitespace-normal", !hasBody && "border-t-0")}>
          <DialogClose render={<Button type="button" variant="outline" disabled={pending} />}>
            Cancelar
          </DialogClose>
          <Button
            type="button"
            variant={tone === "destructive" ? "destructive-solid" : "default"}
            disabled={pending}
            aria-busy={pending || undefined}
            onClick={() => void confirm()}
          >
            {pending ? <Spinner data-icon="inline-start" aria-hidden /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { ConfirmActionDialog, type ConfirmActionDialogProps };
