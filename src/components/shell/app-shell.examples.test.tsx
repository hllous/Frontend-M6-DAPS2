import { render, screen } from "@testing-library/react";
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

  it("shows the approved shared error copy", () => {
    render(shellStateExamples.error);

    expect(screen.getByText("No se pudo cargar la pantalla")).toBeVisible();
    expect(screen.getByText("Revise la conexión e intente nuevamente.")).toBeVisible();
  });
});
