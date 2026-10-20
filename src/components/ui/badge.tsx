import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        info: "bg-[var(--color-info-fill)] text-[var(--color-info)]",
        success: "bg-[var(--color-success-fill)] text-[var(--color-success)]",
        warning: "bg-[var(--color-warning-fill)] text-[var(--color-warning)]",
        danger: "bg-[var(--color-danger-fill)] text-[var(--color-danger)]",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        danger:
          "border-[var(--color-danger-line)] bg-[var(--color-danger-fill)] text-[var(--color-danger)] focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        info: "border-[var(--color-info-line)] bg-[var(--color-info-fill)] text-[var(--color-info)]",
        success: "border-[var(--color-success-line)] bg-[var(--color-success-fill)] text-[var(--color-success)]",
        warning: "border-[var(--color-warning-line)] bg-[var(--color-warning-fill)] text-[var(--color-warning)]",
        neutral: "border-[var(--color-border-strong)] bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)]",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
