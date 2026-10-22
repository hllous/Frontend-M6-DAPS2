"use client";

import type { ReactNode } from "react";
import { Spinner } from "@/components/ui/spinner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type CatalogDeactivationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  consequence: string;
  confirmAction: string;
  safeAlternative: string;
  onConfirm: () => void;
  confirmDisabled?: boolean;
  isSubmitting?: boolean;
  children?: ReactNode;
  contentClassName?: string;
  confirmDataTestId?: string;
  footerClassName?: string;
};

export function CatalogDeactivationDialog({
  open,
  onOpenChange,
  title,
  consequence,
  confirmAction,
  safeAlternative,
  onConfirm,
  confirmDisabled = false,
  isSubmitting = false,
  children,
  contentClassName,
  confirmDataTestId,
  footerClassName,
}: CatalogDeactivationDialogProps) {
  function handleOpenChange(nextOpen: boolean) {
    if (isSubmitting && !nextOpen) return;
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={contentClassName}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{consequence}</DialogDescription>
        </DialogHeader>
        {children}
        <DialogFooter className={footerClassName}>
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => handleOpenChange(false)}
          >
            {safeAlternative}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={confirmDisabled || isSubmitting}
            aria-busy={isSubmitting || undefined}
            data-testid={confirmDataTestId}
          >
            {isSubmitting ? <Spinner data-icon="inline-start" aria-hidden /> : null}
            {confirmAction}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
