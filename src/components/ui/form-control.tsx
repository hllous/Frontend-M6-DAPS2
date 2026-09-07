import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const formControlClass =
  "h-10 min-h-10 w-full rounded-xl border border-[var(--color-border-strong)] bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 max-[760px]:h-12 max-[760px]:min-h-12";

type FormControlProps =
  | ({ as?: "input" } & ComponentProps<"input">)
  | ({ as: "select" } & ComponentProps<"select">);

function FormControl(props: FormControlProps) {
  if (props.as === "select") {
    const { className, ...selectProps } = props;
    return <select data-slot="form-control" className={cn(formControlClass, className)} {...selectProps} />;
  }

  const { className, ...inputProps } = props;
  return <input data-slot="form-control" className={cn(formControlClass, className)} {...inputProps} />;
}

export { FormControl, formControlClass };
