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
      <FieldLabel id="desde-label" htmlFor="desde">
        Hora desde
      </FieldLabel>
      <TimePicker
        id="desde"
        value={value}
        invalid={invalid}
        aria-labelledby="desde-label"
        aria-describedby={invalid ? "desde-error" : undefined}
        onChange={(v) => {
          setValue(v);
          onValue?.(v);
        }}
      />
      {invalid ? <FieldError id="desde-error">Elegí una hora</FieldError> : null}
    </Field>
  );
}

const hour = () => screen.getByRole("combobox", { name: "Hora" });
const minutes = () => screen.getByRole("combobox", { name: "Minutos" });

describe("TimePicker", () => {
  it("is a group named by the field label with an hour and a minutes select", () => {
    render(<Harness initial="08:30" />);
    expect(screen.getByRole("group", { name: "Hora desde" })).toBeInTheDocument();
    expect(hour()).toHaveTextContent("08");
    expect(minutes()).toHaveTextContent("30");
  });

  it("shows placeholders while empty", () => {
    render(<Harness />);
    expect(hour()).toHaveTextContent("hh");
    expect(minutes()).toHaveTextContent("mm");
  });

  it("offers hours 00-23 and every minute 00-59", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(hour());
    expect(await screen.findAllByRole("option")).toHaveLength(24);
    expect(screen.getByRole("option", { name: "00" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "23" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "24" })).not.toBeInTheDocument();
  });

  it("offers all 60 minutes", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(minutes());
    expect(await screen.findAllByRole("option")).toHaveLength(60);
    expect(screen.getByRole("option", { name: "07" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "59" })).toBeInTheDocument();
  });

  it("hands the form an empty value until both parts are chosen, then HH:mm", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    await user.click(hour());
    await user.click(await screen.findByRole("option", { name: "17" }));
    expect(onValue).not.toHaveBeenCalled();
    await user.click(minutes());
    await user.click(await screen.findByRole("option", { name: "45" }));
    expect(onValue).toHaveBeenLastCalledWith("17:45");
    expect(hour()).toHaveTextContent("17");
    expect(minutes()).toHaveTextContent("45");
  });

  it("hands midnight and 23:59 through unchanged", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness initial="08:30" onValue={onValue} />);
    await user.click(hour());
    await user.click(await screen.findByRole("option", { name: "00" }));
    await user.click(minutes());
    await user.click(await screen.findByRole("option", { name: "00" }));
    expect(onValue).toHaveBeenLastCalledWith("00:00");
    await user.click(hour());
    await user.click(await screen.findByRole("option", { name: "23" }));
    await user.click(minutes());
    await user.click(await screen.findByRole("option", { name: "59" }));
    expect(onValue).toHaveBeenLastCalledWith("23:59");
  });

  it("is operated from the keyboard", async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness initial="08:30" onValue={onValue} />);
    await user.tab();
    expect(hour()).toHaveFocus();
    await user.keyboard("{Enter}");
    await screen.findByRole("listbox");
    await user.keyboard("{ArrowDown}{Enter}");
    expect(onValue).toHaveBeenLastCalledWith("09:30");
    await user.tab();
    expect(minutes()).toHaveFocus();
    await user.keyboard("{Enter}");
    await screen.findByRole("listbox");
    await user.keyboard("{ArrowDown}{Enter}");
    expect(onValue).toHaveBeenLastCalledWith("09:31");
  });

  it("follows the form value: round trip and clearing", () => {
    const { rerender } = render(<TimePicker id="h" aria-label="Hora desde" value="08:30" onChange={() => {}} />);
    rerender(<TimePicker id="h" aria-label="Hora desde" value="10:15" onChange={() => {}} />);
    expect(hour()).toHaveTextContent("10");
    expect(minutes()).toHaveTextContent("15");
    rerender(<TimePicker id="h" aria-label="Hora desde" value="" onChange={() => {}} />);
    expect(hour()).toHaveTextContent("hh");
    expect(minutes()).toHaveTextContent("mm");
  });

  it("announces the error through aria-invalid on both selects and the described-by error", () => {
    render(<Harness invalid />);
    expect(hour()).toHaveAttribute("aria-invalid", "true");
    expect(minutes()).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("group", { name: "Hora desde" })).toHaveAccessibleDescription("Elegí una hora");
    expect(screen.getByRole("alert")).toHaveTextContent("Elegí una hora");
  });

  it("keeps the 40 px desktop and 48 px mobile targets of the shared Select", () => {
    render(<Harness />);
    for (const trigger of [hour(), minutes()]) {
      expect(trigger).toHaveClass("data-[size=default]:h-10", "data-[size=default]:[@media(max-width:760px)]:h-12");
    }
  });

  it("can be disabled", () => {
    render(<TimePicker id="h" aria-label="Hora" value="08:30" disabled onChange={() => {}} />);
    expect(hour()).toBeDisabled();
    expect(minutes()).toBeDisabled();
  });
});
