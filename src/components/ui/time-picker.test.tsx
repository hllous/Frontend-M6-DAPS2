import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Field, FieldError, FieldLabel } from "./field";
import { TimePicker } from "./time-picker";

function Harness({ initial = "", onValue, invalid = false }: { initial?: string; onValue?: (v: string) => void; invalid?: boolean }) {
  const [value, setValue] = useState(initial);
  return (
    <Field data-invalid={invalid || undefined}>
      <FieldLabel htmlFor="hora">Hora desde</FieldLabel>
      <TimePicker
        id="hora"
        value={value}
        invalid={invalid}
        aria-describedby={invalid ? "hora-error" : undefined}
        onChange={(v) => {
          setValue(v);
          onValue?.(v);
        }}
      />
      {invalid ? <FieldError id="hora-error">Elegí una hora</FieldError> : null}
    </Field>
  );
}

describe("TimePicker", () => {
  it("is a labelled 24-hour field showing the HH:mm value", () => {
    render(<Harness initial="08:30" />);
    expect(screen.getByRole("textbox", { name: "Hora desde" })).toHaveValue("08:30");
  });

  it("hands the form HH:mm, the native time input value, once the typed time is complete", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    await user.type(screen.getByRole("textbox", { name: "Hora desde" }), "1745");
    expect(onValue).toHaveBeenLastCalledWith("17:45");
    expect(screen.getByRole("textbox", { name: "Hora desde" })).toHaveValue("17:45");
  });

  it("hands the form an empty value while the time is incomplete or out of range", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness initial="08:30" onValue={onValue} />);
    const input = screen.getByRole("textbox", { name: "Hora desde" });
    await user.clear(input);
    await user.type(input, "2575");
    expect(onValue).toHaveBeenLastCalledWith("");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("pads a short entry on blur: 9:5 becomes 09:05", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    const input = screen.getByRole("textbox", { name: "Hora desde" });
    await user.type(input, "9:5");
    await user.tab();
    expect(onValue).toHaveBeenLastCalledWith("09:05");
    expect(input).toHaveValue("09:05");
  });

  it("accepts midnight and 23:59 but not 24:00", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    const input = screen.getByRole("textbox", { name: "Hora desde" });
    await user.type(input, "0000");
    expect(onValue).toHaveBeenLastCalledWith("00:00");
    await user.clear(input);
    await user.type(input, "2359");
    expect(onValue).toHaveBeenLastCalledWith("23:59");
    await user.clear(input);
    await user.type(input, "2400");
    expect(onValue).toHaveBeenLastCalledWith("");
  });

  it("shows the external value when the form changes it", () => {
    const { rerender } = render(<TimePicker id="h" aria-label="Hora" value="08:30" onChange={() => {}} />);
    rerender(<TimePicker id="h" aria-label="Hora" value="10:15" onChange={() => {}} />);
    expect(screen.getByRole("textbox", { name: "Hora" })).toHaveValue("10:15");
  });

  it("is reachable by keyboard, announces numeric input and hints the format", () => {
    render(<Harness />);
    const input = screen.getByRole("textbox", { name: "Hora desde" });
    expect(input).toHaveAttribute("inputmode", "numeric");
    expect(input).toHaveAttribute("placeholder", "hh:mm");
    expect(input).toHaveAttribute("autocomplete", "off");
  });

  it("announces the error through aria-invalid and the described-by error", () => {
    render(<Harness invalid />);
    const input = screen.getByRole("textbox", { name: "Hora desde" });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Elegí una hora");
    expect(screen.getByRole("alert")).toHaveTextContent("Elegí una hora");
  });

  it("keeps the 40 px desktop and 48 px mobile target of the shared Input", () => {
    render(<Harness />);
    const cls = screen.getByRole("textbox", { name: "Hora desde" }).className;
    expect(cls).toContain("h-10");
    expect(cls).toContain("h-12");
  });
});
