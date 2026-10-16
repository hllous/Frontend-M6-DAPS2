import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from "./field";
import { NativeSelect, NativeSelectOption } from "./native-select";
import { RadioGroup, RadioGroupItem } from "./radio-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Switch } from "./switch";

const focusClasses = [
  "focus-visible:outline-[3px]",
  "focus-visible:outline-solid",
  "focus-visible:outline-offset-2",
  "focus-visible:outline-[var(--color-focus)]",
];

function renderSelect({ invalid = false }: { invalid?: boolean } = {}) {
  return render(
    <Field data-invalid={invalid || undefined}>
      <FieldLabel htmlFor="zona">Zona</FieldLabel>
      <Select defaultValue="norte" items={{ norte: "Norte", sur: "Sur" }}>
        <SelectTrigger id="zona" aria-invalid={invalid || undefined} aria-describedby={invalid ? "zona-help zona-error" : "zona-help"}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="norte">Norte</SelectItem>
            <SelectItem value="sur">Sur</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
      <FieldDescription id="zona-help">Zona de trabajo</FieldDescription>
      {invalid ? <FieldError id="zona-error">Elegí una zona</FieldError> : null}
    </Field>,
  );
}

describe("shadcn Select", () => {
  it("applies 40 px desktop and 48 px mobile targets, 16 px mobile text and the focus tokens", () => {
    const { container } = renderSelect();
    const trigger = container.querySelector('[data-slot="select-trigger"]');

    expect(trigger).toHaveClass("data-[size=default]:h-10", "data-[size=default]:[@media(max-width:760px)]:h-12", "w-full");
    expect(trigger).toHaveClass("text-sm", "[@media(max-width:760px)]:text-base", "border-[var(--color-border-strong)]", ...focusClasses);
  });

  it("is labelled by the Field label and described by the help text", () => {
    renderSelect();

    expect(screen.getByRole("combobox", { name: "Zona" })).toHaveAccessibleDescription("Zona de trabajo");
  });

  it("announces the error on the control", () => {
    renderSelect({ invalid: true });

    const trigger = screen.getByRole("combobox", { name: "Zona" });
    expect(trigger).toBeInvalid();
    expect(trigger).toHaveAccessibleDescription("Zona de trabajo Elegí una zona");
    expect(screen.getByRole("alert")).toHaveTextContent("Elegí una zona");
  });

  it("opens with the keyboard, selects with arrows + Enter and closes", async () => {
    const user = userEvent.setup();
    renderSelect();

    const trigger = screen.getByRole("combobox", { name: "Zona" });
    trigger.focus();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("listbox")).toBeInTheDocument();
    await user.keyboard("{ArrowDown}{Enter}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(trigger).toHaveTextContent("Sur");
  });

  it("sizes options for touch", async () => {
    const user = userEvent.setup();
    renderSelect();
    await user.click(screen.getByRole("combobox", { name: "Zona" }));

    expect(await screen.findByRole("option", { name: "Sur" })).toHaveClass("min-h-10", "[@media(max-width:760px)]:min-h-12", "[@media(max-width:760px)]:text-base");
  });

  it("keeps the shadcn slots", async () => {
    const user = userEvent.setup();
    const { container } = renderSelect();
    await user.click(screen.getByRole("combobox"));
    await screen.findByRole("listbox");

    for (const slot of ["select-trigger", "select-value"]) expect(container.querySelector(`[data-slot="${slot}"]`), slot).not.toBeNull();
    for (const slot of ["select-content", "select-group", "select-item"]) expect(document.querySelector(`[data-slot="${slot}"]`), slot).not.toBeNull();
  });
});

describe("shadcn Native Select", () => {
  function renderNative({ invalid = false }: { invalid?: boolean } = {}) {
    return render(
      <Field data-invalid={invalid || undefined}>
        <FieldLabel htmlFor="tipo">Tipo</FieldLabel>
        <NativeSelect id="tipo" aria-invalid={invalid || undefined} aria-describedby={invalid ? "tipo-error" : undefined}>
          <NativeSelectOption value="a">Poda</NativeSelectOption>
          <NativeSelectOption value="b">Extracción</NativeSelectOption>
        </NativeSelect>
        {invalid ? <FieldError id="tipo-error">Elegí un tipo</FieldError> : null}
      </Field>,
    );
  }

  it("applies 40 px desktop and 48 px mobile targets, 16 px mobile text and the focus tokens", () => {
    renderNative();

    const select = screen.getByRole("combobox", { name: "Tipo" });
    expect(select).toHaveClass("data-[size=default]:h-10", "data-[size=default]:[@media(max-width:760px)]:h-12", "text-sm", "[@media(max-width:760px)]:text-base", "border-[var(--color-border-strong)]", ...focusClasses);
    expect(select.closest('[data-slot="native-select-wrapper"]')).toHaveClass("w-full");
  });

  it("selects by keyboard and announces the error", async () => {
    const user = userEvent.setup();
    renderNative({ invalid: true });

    const select = screen.getByRole("combobox", { name: "Tipo" });
    expect(select).toBeInvalid();
    expect(select).toHaveAccessibleDescription("Elegí un tipo");
    await user.selectOptions(select, "Extracción");
    expect(select).toHaveValue("b");
  });
});

describe("shadcn Radio Group", () => {
  function renderRadios({ invalid = false }: { invalid?: boolean } = {}) {
    return render(
      <FieldSet>
        <FieldLegend variant="label">Turno</FieldLegend>
        <RadioGroup defaultValue="m">
          {[
            ["m", "Mañana"],
            ["t", "Tarde"],
            ["n", "Noche"],
          ].map(([value, label]) => (
            <Field key={value} orientation="horizontal" data-invalid={invalid || undefined}>
              <RadioGroupItem value={value} id={`turno-${value}`} aria-invalid={invalid || undefined} />
              <FieldLabel htmlFor={`turno-${value}`}>{label}</FieldLabel>
            </Field>
          ))}
        </RadioGroup>
        {invalid ? <FieldError>Elegí un turno</FieldError> : null}
      </FieldSet>,
    );
  }

  it("labels each radio by its Field label", () => {
    renderRadios();

    expect(screen.getByRole("radio", { name: "Mañana" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Tarde" })).not.toBeChecked();
  });

  it("moves selection with the arrow keys and by clicking the label", async () => {
    const user = userEvent.setup();
    renderRadios();

    screen.getByRole("radio", { name: "Mañana" }).focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("radio", { name: "Tarde" })).toBeChecked();
    await user.click(screen.getByText("Noche"));
    expect(screen.getByRole("radio", { name: "Noche" })).toBeChecked();
  });

  it("applies the border and focus tokens and marks invalid radios", () => {
    renderRadios({ invalid: true });

    const radio = screen.getByRole("radio", { name: "Mañana" });
    expect(radio).toHaveClass("border-[var(--color-border-strong)]", ...focusClasses);
    expect(radio).toBeInvalid();
    expect(screen.getByRole("alert")).toHaveTextContent("Elegí un turno");
  });
});

describe("shadcn Switch", () => {
  function renderSwitch({ invalid = false }: { invalid?: boolean } = {}) {
    return render(
      <Field orientation="horizontal" data-invalid={invalid || undefined}>
        <Switch id="aviso" aria-invalid={invalid || undefined} aria-describedby="aviso-help" />
        <FieldLabel htmlFor="aviso">Avisar al vecino</FieldLabel>
        <FieldDescription id="aviso-help">Envía un SMS</FieldDescription>
      </Field>,
    );
  }

  it("toggles with Space and by clicking the label", async () => {
    const user = userEvent.setup();
    renderSwitch();

    const toggle = screen.getByRole("switch", { name: "Avisar al vecino" });
    expect(toggle).not.toBeChecked();
    toggle.focus();
    await user.keyboard(" ");
    expect(toggle).toBeChecked();
    await user.click(screen.getByText("Avisar al vecino"));
    expect(toggle).not.toBeChecked();
    expect(toggle).toHaveAccessibleDescription("Envía un SMS");
  });

  it("applies the focus tokens, a taller mobile target and the invalid state", () => {
    renderSwitch({ invalid: true });

    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveClass("focus-visible:outline-[3px]", "focus-visible:outline-[var(--color-focus)]", "[@media(max-width:760px)]:after:-inset-y-4");
    expect(toggle).toBeInvalid();
  });
});
