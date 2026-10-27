"use client";

import type { ReactElement } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./dialog";
import { LocationPicker, type LocationPickerProps } from "./location-picker";
import { cn } from "@/lib/utils";
import styles from "./location-picker-dialog.module.css";

export type LocationPickerDialogProps = Omit<LocationPickerProps, "onCancel"> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: ReactElement;
};
/** Render within the parent dialog so Base UI retains nested focus ownership. */
export function LocationPickerDialog({ open, onOpenChange, trigger, onConfirm, ...props }: LocationPickerDialogProps) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    {trigger && <DialogTrigger render={trigger} />}
    <DialogContent className={cn(styles.overlay, "h-dvh w-full max-w-none rounded-none p-4 sm:h-[min(52rem,calc(100dvh-2rem))] sm:w-[calc(100%-2rem)] sm:max-w-4xl sm:rounded-[var(--space-16)] sm:p-6")}>
      <DialogHeader><DialogTitle>Ubicación</DialogTitle><DialogDescription>Marque un punto o busque una dirección. Use las flechas para mover el mapa y + o − para acercar o alejar.</DialogDescription></DialogHeader>
      {open && <LocationPicker {...props} onCancel={() => onOpenChange(false)} onConfirm={(point, label) => { onConfirm(point, label); onOpenChange(false); }} />}
    </DialogContent>
  </Dialog>;
}
