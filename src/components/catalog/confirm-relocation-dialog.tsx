"use client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { errorMessage as getErrorMessage } from "@/lib/error-message";

import { useState } from "react";

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
import { parseCoordinateField } from "@/lib/input-limits";

interface ConfirmRelocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  container: Container | null;
  onSuccess: (updated: Container) => void;
}

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

    const latResult = parseCoordinateField(lat, "lat");
    if (latResult.error) errors.lat = latResult.error;
    const lngResult = parseCoordinateField(lng, "lng");
    if (lngResult.error) errors.lng = lngResult.error;

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
        lat: latResult.value ?? 0,
        lng: lngResult.value ?? 0,
      });
    } catch (err) {
      const msg = getErrorMessage(
        err,
        "No se pudo confirmar la reubicación del contenedor.",
      );
      setErrorMessage(msg);
      setIsSubmitting(false);
      return;
    }

    onSuccess(updated);
    setIsSubmitting(false);
    onOpenChange(false);
  };

  return (
    <DialogContent className="max-w-lg overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          Confirmar nueva ubicación de contenedor {container.code}
        </DialogTitle>
        <DialogDescription>
          Indique dónde quedó instalado el contenedor.
        </DialogDescription>
      </DialogHeader>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <form
        id="confirm-relocation-form"
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-4"
      >
        <Alert role="note">
          <AlertDescription className="grid gap-2">
            <p className="font-medium text-foreground">
              Ubicación anterior:
            </p>
            <p className="text-muted-foreground">
              {container.address ?? "Sin dirección registrada"}
            </p>
          </AlertDescription>
        </Alert>

        <FieldGroup>
          <Field data-invalid={Boolean(fieldErrors.address)}>
            <FieldLabel htmlFor="relocation-address">
              Nueva dirección
            </FieldLabel>
            <Input
              id="relocation-address"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                if (fieldErrors.address) {
                  setFieldErrors((prev) => ({ ...prev, address: undefined }));
                }
              }}
              placeholder="Ej: Av. Córdoba 2300"
              required
              aria-invalid={Boolean(fieldErrors.address)}
              aria-describedby={
                fieldErrors.address ? "relocation-address-error" : undefined
              }
              disabled={isSubmitting}
            />
            {fieldErrors.address && (
              <FieldError id="relocation-address-error">
                {fieldErrors.address}
              </FieldError>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field data-invalid={Boolean(fieldErrors.lat)}>
              <FieldLabel htmlFor="relocation-lat">Latitud</FieldLabel>
              <Input
                id="relocation-lat"
                type="number"
                min="-90"
                max="90"
                step="any"
                value={lat}
                onChange={(e) => {
                  setLat(e.target.value);
                  if (fieldErrors.lat) {
                    setFieldErrors((prev) => ({ ...prev, lat: undefined }));
                  }
                }}
                placeholder="-34.6037"
                required
                aria-invalid={Boolean(fieldErrors.lat)}
                aria-describedby={
                  fieldErrors.lat ? "relocation-lat-error" : undefined
                }
                disabled={isSubmitting}
              />
              {fieldErrors.lat && (
                <FieldError id="relocation-lat-error">
                  {fieldErrors.lat}
                </FieldError>
              )}
            </Field>

            <Field data-invalid={Boolean(fieldErrors.lng)}>
              <FieldLabel htmlFor="relocation-lng">Longitud</FieldLabel>
              <Input
                id="relocation-lng"
                type="number"
                min="-180"
                max="180"
                step="any"
                value={lng}
                onChange={(e) => {
                  setLng(e.target.value);
                  if (fieldErrors.lng) {
                    setFieldErrors((prev) => ({ ...prev, lng: undefined }));
                  }
                }}
                placeholder="-58.3816"
                required
                aria-invalid={Boolean(fieldErrors.lng)}
                aria-describedby={
                  fieldErrors.lng ? "relocation-lng-error" : undefined
                }
                disabled={isSubmitting}
              />
              {fieldErrors.lng && (
                <FieldError id="relocation-lng-error">
                  {fieldErrors.lng}
                </FieldError>
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
