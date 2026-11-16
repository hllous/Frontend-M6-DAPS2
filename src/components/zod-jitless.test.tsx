import { render } from "@testing-library/react";
import { z } from "zod";
import { describe, expect, it } from "vitest";

import { ZodJitless } from "./zod-jitless";

describe("ZodJitless", () => {
  it("turns off Zod's new Function probe so a strict CSP stays free of violations", () => {
    const { container } = render(<ZodJitless />);

    expect(container).toBeEmptyDOMElement();
    expect(z.config().jitless).toBe(true);
    expect(z.object({ name: z.string() }).safeParse({ name: "x" }).success).toBe(true);
  });
});
