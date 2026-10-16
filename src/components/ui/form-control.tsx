import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const formControlClass =
  "h-10 w-full rounded-lg border border-[var(--color-border-strong)] bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:outline-[3px] focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [@media(max-width:760px)]:h-12";
const formControlTextareaClass =
  "min-h-24 w-full rounded-lg border border-[var(--color-border-strong)] bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:outline-[3px] focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20";

type FormControlProps =
  | ({ as?: "input" } & ComponentProps<"input">)
  | ({ as: "select" } & ComponentProps<"select">)
  | ({ as: "textarea" } & ComponentProps<"textarea">);

function FormControl(props: FormControlProps) {
  if (props.as === "select") {
    const { className, ...selectProps } = props;
    return <select data-slot="form-control" className={cn(formControlClass, className)} {...selectProps} />;
  }

  if (props.as === "textarea") {
    const { className, ...textareaProps } = props;
    return <textarea data-slot="form-control" className={cn(formControlTextareaClass, className)} {...textareaProps} />;
  }

  const { className, ...inputProps } = props;
  return <input data-slot="form-control" className={cn(formControlClass, className)} {...inputProps} />;
}

export { FormControl, formControlClass };
