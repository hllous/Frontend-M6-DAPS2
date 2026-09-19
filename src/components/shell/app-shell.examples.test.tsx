import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { appShellExamples, shellStateExamples } from "./app-shell.examples";

describe("app-shell examples", () => {
  it.each(Object.entries(appShellExamples))("renders the %s scenario variant", (_key, element) => {
    const { container } = render(element);
    expect(container.firstChild).not.toBeNull();
  });

  it.each(Object.entries(shellStateExamples))("renders the %s shared state", (_key, element) => {
    const { container } = render(element);
    expect(container.firstChild).not.toBeNull();
  });
});
