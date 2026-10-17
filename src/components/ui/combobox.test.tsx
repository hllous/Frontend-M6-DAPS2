import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { Combobox } from "./combobox";
import { Field, FieldError, FieldLabel } from "./field";

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

const zonas = [
  { value: "z-1", label: "Palermo" },
  { value: "z-2", label: "Recoleta" },
  { value: "z-3", label: "Belgrano" },
];

function Harness({ initial = "", onValue, invalid = false }: { initial?: string; onValue?: (v: string) => void; invalid?: boolean }) {
  const [value, setValue] = useState(initial);
  return (
    <Field data-invalid={invalid || undefined}>
      <FieldLabel htmlFor="zona">Zona</FieldLabel>
      <Combobox
        id="zona"
        value={value}
        options={zonas}
        placeholder="Elegí una zona"
        invalid={invalid}
        aria-describedby={invalid ? "zona-error" : undefined}
        onChange={(v) => {
          setValue(v);
          onValue?.(v);
        }}
      />
      {invalid ? <FieldError id="zona-error">Elegí una zona</FieldError> : null}
    </Field>
  );
}

describe("Combobox", () => {
  it("is a combobox labelled by the field label, showing the placeholder or the chosen label", () => {
    const { unmount } = render(<Harness />);
    expect(screen.getByRole("combobox", { name: "Zona" })).toHaveTextContent("Elegí una zona");
    unmount();
    render(<Harness initial="z-2" />);
    expect(screen.getByRole("combobox", { name: "Zona" })).toHaveTextContent("Recoleta");
  });

  it("filters while typing and hands the form the option value", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    await user.click(screen.getByRole("combobox", { name: "Zona" }));
    await user.keyboard("bel");
    expect(screen.queryByRole("option", { name: "Palermo" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("option", { name: "Belgrano" }));
    expect(onValue).toHaveBeenCalledWith("z-3");
    expect(screen.getByRole("combobox", { name: "Zona" })).toHaveTextContent("Belgrano");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("is operated by keyboard: open, arrow, Enter, and Escape closes", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    await user.tab();
    expect(screen.getByRole("combobox", { name: "Zona" })).toHaveFocus();
    await user.keyboard("{Enter}");
    await screen.findByRole("listbox");
    await user.keyboard("{ArrowDown}{Enter}");
    expect(onValue).toHaveBeenCalledWith("z-2");
    await user.keyboard("{Enter}");
    await screen.findByRole("listbox");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Zona" })).toHaveFocus();
  });

  it("says so when nothing matches", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("combobox", { name: "Zona" }));
    await user.keyboard("zzz");
    expect(screen.getByText("Sin resultados")).toBeInTheDocument();
  });

  it("marks the chosen option as selected", async () => {
    const user = userEvent.setup();
    render(<Harness initial="z-1" />);
    await user.click(screen.getByRole("combobox", { name: "Zona" }));
    expect(screen.getByRole("option", { name: "Palermo" })).toHaveAttribute("data-checked", "true");
    expect(screen.getByRole("option", { name: "Belgrano" })).toHaveAttribute("data-checked", "false");
  });

  it("announces the error through aria-invalid and the described-by error", () => {
    render(<Harness invalid />);
    const trigger = screen.getByRole("combobox", { name: "Zona" });
    expect(trigger).toHaveAttribute("aria-invalid", "true");
    expect(trigger).toHaveAccessibleDescription("Elegí una zona");
  });

  it("keeps a 40 px desktop and 48 px mobile target", () => {
    render(<Harness />);
    const cls = screen.getByRole("combobox", { name: "Zona" }).className;
    expect(cls).toContain("h-10");
    expect(cls).toContain("[@media(max-width:760px)]:h-12");
  });
});
