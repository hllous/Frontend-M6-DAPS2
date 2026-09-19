"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  containersAdapter,
  ContainerRequestError,
  type Container,
} from "@/lib/containers";

interface ConfirmRelocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  container: Container | null;
  onSuccess: (updated: Container) => void;
}

const formControlClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

export function ConfirmRelocationDialog({
  open,
  onOpenChange,
  container,
  onSuccess,
}: ConfirmRelocationDialogProps) {
  if (!container) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <ConfirmRelocationModalContent
          container={container}
          onOpenChange={onOpenChange}
          onSuccess={onSuccess}
        />
      )}
    </Dialog>
  );
}

interface ConfirmRelocationModalContentProps {
  container: Container;
  onOpenChange: (open: boolean) => void;
  onSuccess: (updated: Container) => void;
}

function ConfirmRelocationModalContent({
  container,
  onOpenChange,
  onSuccess,
}: ConfirmRelocationModalContentProps) {
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    address?: string;
    lat?: string;
    lng?: string;
  }>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const errors: { address?: string; lat?: string; lng?: string } = {};

    if (!address.trim()) {
      errors.address = "La nueva dirección es obligatoria.";
    }

    const latNum = Number(lat);
    if (!lat.trim() || !Number.isFinite(latNum)) {
      errors.lat = "Indique una latitud numérica válida.";
    }

    const lngNum = Number(lng);
    if (!lng.trim() || !Number.isFinite(lngNum)) {
      errors.lng = "Indique una longitud numérica válida.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    let updated: Container;
    try {
      updated = await containersAdapter.confirmRelocation(container.id, {
        address: address.trim(),
        lat: latNum,
        lng: lngNum,
      });
    } catch (err) {
      const msg =
        err instanceof ContainerRequestError || err instanceof Error
          ? err.message
          : "No se pudo confirmar la reubicación del contenedor.";
      setErrorMessage(msg);
      setIsSubmitting(false);
      return;
    }

    onSuccess(updated);
    setIsSubmitting(false);
    onOpenChange(false);
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
          <MapPin className="size-4" aria-hidden />
          <span>Confirmación de nueva ubicación</span>
        </div>
        <DialogTitle>Confirmar nueva ubicación de contenedor {container.code}</DialogTitle>
        <DialogDescription>
          Indique la nueva dirección y coordenadas geográficas donde ha sido instalado el contenedor
          para restituirlo a estado Activo.
        </DialogDescription>
      </DialogHeader>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {errorMessage}
        </div>
      )}

      <form id="confirm-relocation-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs space-y-1">
          <p className="font-medium text-foreground">Ubicación anterior registrada:</p>
          <p className="text-muted-foreground">{container.address}</p>
        </div>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="relocation-address">Nueva dirección</FieldLabel>
            <input
              id="relocation-address"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                if (fieldErrors.address) {
                  setFieldErrors((prev) => ({ ...prev, address: undefined }));
                }
              }}
              placeholder="Ej: Av. Córdoba 2300"
              className={formControlClass}
              required
              aria-invalid={Boolean(fieldErrors.address)}
              aria-describedby={fieldErrors.address ? "relocation-address-error" : undefined}
              disabled={isSubmitting}
            />
            {fieldErrors.address && (
              <FieldError id="relocation-address-error">{fieldErrors.address}</FieldError>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="relocation-lat">Latitud</FieldLabel>
              <input
                id="relocation-lat"
                type="number"
                step="any"
                value={lat}
                onChange={(e) => {
                  setLat(e.target.value);
                  if (fieldErrors.lat) {
                    setFieldErrors((prev) => ({ ...prev, lat: undefined }));
                  }
                }}
                placeholder="-34.6037"
                className={formControlClass}
                required
                aria-invalid={Boolean(fieldErrors.lat)}
                aria-describedby={fieldErrors.lat ? "relocation-lat-error" : undefined}
                disabled={isSubmitting}
              />
              {fieldErrors.lat && (
                <FieldError id="relocation-lat-error">{fieldErrors.lat}</FieldError>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="relocation-lng">Longitud</FieldLabel>
              <input
                id="relocation-lng"
                type="number"
                step="any"
                value={lng}
                onChange={(e) => {
                  setLng(e.target.value);
                  if (fieldErrors.lng) {
                    setFieldErrors((prev) => ({ ...prev, lng: undefined }));
                  }
                }}
                placeholder="-58.3816"
                className={formControlClass}
                required
                aria-invalid={Boolean(fieldErrors.lng)}
                aria-describedby={fieldErrors.lng ? "relocation-lng-error" : undefined}
                disabled={isSubmitting}
              />
              {fieldErrors.lng && (
                <FieldError id="relocation-lng-error">{fieldErrors.lng}</FieldError>
              )}
            </Field>
          </div>
        </FieldGroup>
      </form>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          form="confirm-relocation-form"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Confirmando…" : "Confirmar ubicación"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
