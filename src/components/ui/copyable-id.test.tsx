import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CopyableId } from "./copyable-id";

afterEach(() => {
  vi.restoreAllMocks();
});

function setClipboard(value: unknown) {
  Object.defineProperty(navigator, "clipboard", { value, configurable: true });
}

describe("CopyableId", () => {
  it("copies, announces 'Copiado' in a live region and clears it after 2 s", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    setClipboard({ writeText });
    render(<CopyableId value="abc-123" label="identificador técnico" />);

    await user.click(screen.getByRole("button", { name: "Copiar identificador técnico" }));
    expect(writeText).toHaveBeenCalledWith("abc-123");
    expect(screen.getByRole("status")).toHaveTextContent("Copiado");

    await waitFor(() => expect(screen.getByRole("status")).toBeEmptyDOMElement(), { timeout: 3500 });
  });

  it("announces the failure instead of swallowing it when the clipboard rejects or is missing", async () => {
    const user = userEvent.setup();
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error("denied")) });
    const { unmount } = render(<CopyableId value="abc" label="id" />);
    await user.click(screen.getByRole("button", { name: "Copiar id" }));
    expect(screen.getByRole("status")).toHaveTextContent("No se pudo copiar");
    unmount();

    setClipboard(undefined);
    render(<CopyableId value="abc" label="id" />);
    await user.click(screen.getByRole("button", { name: "Copiar id" }));
    expect(screen.getByRole("status")).toHaveTextContent("No se pudo copiar");
  });

  it("resets the result when the value changes", async () => {
    const user = userEvent.setup();
    setClipboard({ writeText: vi.fn().mockResolvedValue(undefined) });
    const { rerender } = render(<CopyableId value="one" label="id" />);
    await user.click(screen.getByRole("button", { name: "Copiar id" }));
    expect(screen.getByRole("status")).toHaveTextContent("Copiado");

    rerender(<CopyableId value="two" label="id" />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
});
