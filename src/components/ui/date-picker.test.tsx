import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DatePicker } from "./date-picker";
import { Field, FieldError, FieldLabel } from "./field";

function Harness({ initial = "", onValue, invalid = false, min, required = false }: { initial?: string; onValue?: (v: string) => void; invalid?: boolean; min?: string; required?: boolean }) {
  const [value, setValue] = useState(initial);
  return (
    <Field data-invalid={invalid || undefined}>
      <FieldLabel htmlFor="fecha">Fecha</FieldLabel>
      <DatePicker
        id="fecha"
        value={value}
        min={min}
        invalid={invalid}
        aria-describedby={invalid ? "fecha-error" : undefined}
        aria-required={required || undefined}
        onChange={(v) => {
          setValue(v);
          onValue?.(v);
        }}
      />
      {invalid ? <FieldError id="fecha-error">Elegí una fecha</FieldError> : null}
    </Field>
  );
}

describe("DatePicker", () => {
  it("preserves required semantics on the trigger", () => {
    render(<Harness required />);
    expect(screen.getByRole("button", { name: /fecha/i })).toHaveAttribute("aria-required", "true");
  });

  it("is labelled by its field label and shows the placeholder dd/mm/aaaa when empty", () => {
    render(<Harness />);
    expect(screen.getByRole("button", { name: /fecha/i })).toHaveTextContent("dd/mm/aaaa");
  });

  it("displays an ISO value as dd/mm/aaaa", () => {
    render(<Harness initial="2026-03-07" />);
    expect(screen.getByRole("button", { name: /fecha/i })).toHaveTextContent("07/03/2026");
  });

  it("hands the form the native input value (YYYY-MM-DD) when a day is picked", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness initial="2026-03-07" onValue={onValue} />);
    await user.click(screen.getByRole("button", { name: /fecha/i }));
    const grid = await screen.findByRole("grid");
    await user.click(within(grid).getByRole("button", { name: /, 15 de marzo/i }));
    expect(onValue).toHaveBeenCalledWith("2026-03-15");
    expect(screen.getByRole("button", { name: /fecha/i })).toHaveTextContent("15/03/2026");
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
  });

  it("closes without changing the value when the selected day is clicked again", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness initial="2026-03-07" onValue={onValue} />);
    await user.click(screen.getByRole("button", { name: /fecha/i }));
    const grid = await screen.findByRole("grid");
    await user.click(within(grid).getByRole("button", { name: /, 7 de marzo/i }));
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /fecha/i })).toHaveTextContent("07/03/2026");
  });

  it("starts weeks on Monday in Spanish", async () => {
    const user = userEvent.setup();
    render(<Harness initial="2026-03-07" />);
    await user.click(screen.getByRole("button", { name: /fecha/i }));
    const grid = await screen.findByRole("grid");
    const headers = Array.from(grid.querySelectorAll("thead th")).map((h) => h.getAttribute("aria-label"));
    expect(headers).toEqual(["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]);
    expect(screen.getByRole("button", { name: "Mes anterior" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mes siguiente" })).toBeInTheDocument();
  });

  it("opens with the keyboard, focuses the day and picks it with Enter", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 2, 10, 12) });
    try {
      const user = userEvent.setup();
      const onValue = vi.fn();
      render(<Harness onValue={onValue} />);
      await user.tab();
      expect(screen.getByRole("button", { name: /fecha/i })).toHaveFocus();
      await user.keyboard("{Enter}");
      await screen.findByRole("grid");
      expect(screen.getByRole("button", { name: /, 10 de marzo/i })).toHaveFocus();
      await user.keyboard("{Enter}");
      expect(onValue).toHaveBeenCalledWith("2026-03-10");
    } finally {
      vi.useRealTimers();
    }
  });

  it("moves between days with the arrow keys", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness initial="2026-03-07" onValue={onValue} />);
    await user.tab();
    await user.keyboard("{Enter}");
    await screen.findByRole("grid");
    await user.keyboard("{ArrowRight}{ArrowDown}");
    expect(screen.getByRole("button", { name: /, 15 de marzo/i })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onValue).toHaveBeenCalledWith("2026-03-15");
  });

  it("closes with Escape and returns focus to the field", async () => {
    const user = userEvent.setup();
    render(<Harness initial="2026-03-07" />);
    await user.tab();
    await user.keyboard("{Enter}");
    await screen.findByRole("grid");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /fecha/i })).toHaveFocus();
  });

  it("does not allow days before min", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness initial="2026-03-07" min="2026-03-05" onValue={onValue} />);
    await user.click(screen.getByRole("button", { name: /fecha/i }));
    const grid = await screen.findByRole("grid");
    expect(within(grid).getByRole("button", { name: /, 4 de marzo/i })).toBeDisabled();
    expect(within(grid).getByRole("button", { name: /, 5 de marzo/i })).toBeEnabled();
  });

  it("announces the error through aria-invalid and the described-by error", () => {
    render(<Harness invalid />);
    const trigger = screen.getByRole("button", { name: /fecha/i });
    expect(trigger).toHaveAttribute("aria-invalid", "true");
    expect(trigger).toHaveAccessibleDescription("Elegí una fecha");
    expect(screen.getByRole("alert")).toHaveTextContent("Elegí una fecha");
  });

  it("keeps a 40 px desktop and 48 px mobile target like the other controls", () => {
    render(<Harness />);
    const cls = screen.getByRole("button", { name: /fecha/i }).className;
    expect(cls).toContain("h-10");
    expect(cls).toContain("[@media(max-width:760px)]:h-12");
  });
});
