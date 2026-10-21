import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Skeleton } from "./skeleton";

describe("Skeleton", () => {
  it("keeps the shadcn slot and disables its pulse for reduced motion", () => {
    const { container } = render(<Skeleton aria-hidden="true" />);

    const skeleton = container.querySelector('[data-slot="skeleton"]');
    expect(skeleton).toHaveClass("animate-pulse", "motion-reduce:animate-none");
  });
});
