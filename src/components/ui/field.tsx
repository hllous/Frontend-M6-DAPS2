import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

function FieldGroup({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="field-group" className={cn("flex flex-col gap-5", className)} {...props} />;
}

function Field({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="field" className={cn("flex flex-col gap-1.5", className)} {...props} />;
}

function FieldLabel({ className, ...props }: ComponentProps<"label">) {
  return <label data-slot="field-label" className={cn("text-sm font-semibold", className)} {...props} />;
}

function FieldDescription({ className, ...props }: ComponentProps<"span">) {
  return <span data-slot="field-description" className={cn("text-xs leading-4 text-muted-foreground", className)} {...props} />;
}

function FieldError({ className, ...props }: ComponentProps<"p">) {
  return <p data-slot="field-error" role="alert" className={cn(className)} {...props} />;
}

export { Field, FieldDescription, FieldError, FieldGroup, FieldLabel };
