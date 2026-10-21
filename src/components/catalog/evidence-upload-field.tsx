"use client";

import type { ChangeEventHandler } from "react";
import { Upload } from "lucide-react";

import { FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EvidenceUploadFieldProps = {
  id: string;
  accept: string;
  describedBy: string;
  disabled?: boolean;
  invalid?: boolean;
  multiple?: boolean;
  onChange: ChangeEventHandler<HTMLInputElement>;
};

export function EvidenceUploadField({
  id,
  accept,
  describedBy,
  disabled = false,
  invalid = false,
  multiple = false,
  onChange,
}: EvidenceUploadFieldProps) {
  return (
    <FieldLabel
      htmlFor={id}
      className="w-fit cursor-pointer max-[760px]:w-full has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-solid has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--color-focus)]"
    >
      <span
        className={cn(
          buttonVariants({ variant: "outline" }),
          "w-fit cursor-pointer max-[760px]:w-full",
        )}
      >
        <Upload data-icon="inline-start" aria-hidden />
        Seleccionar archivo
      </span>
      <Input
        id={id}
        type="file"
        className="sr-only"
        accept={accept}
        multiple={multiple}
        onChange={(event) => {
          onChange(event);
          event.currentTarget.value = "";
        }}
        disabled={disabled}
        aria-invalid={invalid}
        aria-describedby={describedBy}
      />
    </FieldLabel>
  );
}
