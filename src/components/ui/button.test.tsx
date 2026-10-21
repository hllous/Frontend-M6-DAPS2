import { describe, expect, it } from "vitest";

import { buttonVariants } from "./button";

const semanticVariants = [
  { variant: "success", colorClass: "bg-[var(--color-success)]" },
  { variant: "warning", colorClass: "bg-[var(--color-warning)]" },
  { variant: "destructive-solid", colorClass: "bg-[var(--color-danger)]" },
] as const;

describe("buttonVariants semantic confirmation variants", () => {
  it.each(semanticVariants)(
    "styles $variant with its semantic color and shared interaction states",
    ({ variant, colorClass }) => {
      const classes = buttonVariants({ variant });

      expect(classes).toContain(colorClass);
      expect(classes).toContain("text-white");
      expect(classes).toContain("hover:brightness-90");
      expect(classes).toContain("focus-visible:outline-[3px]");
      expect(classes).toContain("disabled:opacity-50");
    },
  );

  it("keeps the existing destructive variant unchanged", () => {
    const classes = buttonVariants({ variant: "destructive" });

    expect(classes).toContain("bg-destructive/10");
    expect(classes).toContain("text-destructive");
    expect(classes).not.toContain("bg-[var(--color-danger)]");
  });
});
