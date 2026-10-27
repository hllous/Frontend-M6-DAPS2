import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "./field";
import { Input } from "./input";
import { Label } from "./label";
import { Textarea } from "./textarea";

const focusClasses = [
  "focus-visible:outline-[3px]",
  "focus-visible:outline-solid",
  "focus-visible:outline-offset-2",
  "focus-visible:outline-[var(--color-focus)]",
];

function renderForm({ invalid = false }: { invalid?: boolean } = {}) {
  return render(
    <FieldGroup>
      <Field data-invalid={invalid || undefined}>
        <FieldLabel htmlFor="name">Nombre</FieldLabel>
        <Input id="name" aria-invalid={invalid || undefined} aria-describedby={invalid ? "name-help name-error" : "name-help"} />
        <FieldDescription id="name-help">Como figura en el padrón</FieldDescription>
        {invalid ? <FieldError id="name-error">El nombre es obligatorio</FieldError> : null}
      </Field>
      <Field>
        <FieldLabel htmlFor="notes">Notas</FieldLabel>
        <Textarea id="notes" />
      </Field>
      <Label htmlFor="solo">Suelto</Label>
      <Input id="solo" />
    </FieldGroup>,
  );
}

describe("shadcn Field, Label, Input and Textarea", () => {
  it("keeps the shadcn data-slot attributes", () => {
    const { container } = renderForm({ invalid: true });

    for (const slot of ["field-group", "field", "field-label", "field-description", "field-error", "input", "textarea", "label"]) {
      expect(container.querySelector(`[data-slot="${slot}"]`), slot).not.toBeNull();
    }
  });

  it("gives Input 40 px desktop and 48 px mobile targets and Textarea a 96 px minimum", () => {
    renderForm();

    expect(screen.getByRole("textbox", { name: "Nombre" })).toHaveClass("h-10", "[@media(max-width:760px)]:h-12");
    expect(screen.getByRole("textbox", { name: "Notas" })).toHaveClass("min-h-24");
  });

  it("keeps reading text at 16 px on the Field posture", () => {
    renderForm();

    for (const name of ["Nombre", "Notas"]) {
      expect(screen.getByRole("textbox", { name })).toHaveClass("text-sm", "[@media(max-width:760px)]:text-base");
    }
  });

  it("applies the border, surface and focus tokens", () => {
    renderForm();

    for (const name of ["Nombre", "Notas"]) {
      const control = screen.getByRole("textbox", { name });
      expect(control).toHaveClass("border-[var(--color-border-strong)]", "bg-background", ...focusClasses);
      expect(control).toHaveClass("aria-invalid:border-destructive");
    }
  });

  it("associates labels and descriptions with their controls", async () => {
    renderForm();
    const input = screen.getByRole("textbox", { name: "Nombre" });

    expect(input).toHaveAccessibleDescription("Como figura en el padrón");
    expect(screen.getByRole("textbox", { name: "Suelto" })).toBeInTheDocument();
    await userEvent.click(screen.getByText("Nombre"));
    expect(input).toHaveFocus();
  });

  it("is operable from the keyboard", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.tab();
    expect(screen.getByRole("textbox", { name: "Nombre" })).toHaveFocus();
    await user.keyboard("Ana");
    expect(screen.getByRole("textbox", { name: "Nombre" })).toHaveValue("Ana");
    await user.tab();
    expect(screen.getByRole("textbox", { name: "Notas" })).toHaveFocus();
    await user.keyboard("a{Enter}b");
    expect(screen.getByRole("textbox", { name: "Notas" })).toHaveValue("a\nb");
  });

  it("announces the error and marks the field invalid", () => {
    const { container } = renderForm({ invalid: true });

    expect(screen.getByRole("alert")).toHaveTextContent("El nombre es obligatorio");
    expect(screen.getByRole("textbox", { name: "Nombre" })).toBeInvalid();
    expect(container.querySelector('[data-slot="field"]')).toHaveAttribute("data-invalid", "true");
  });

  it("renders no alert without an error", () => {
    renderForm();

    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("describes the control with its error when wired through aria-describedby", () => {
    renderForm({ invalid: true });

    expect(screen.getByRole("textbox", { name: "Nombre" })).toHaveAccessibleDescription(
      "Como figura en el padrón El nombre es obligatorio",
    );
  });

  it("styles the invalid Field and its label with the destructive token", () => {
    const { container } = renderForm({ invalid: true });

    expect(container.querySelector('[data-slot="field"]')).toHaveClass("data-[invalid=true]:text-destructive", "flex", "gap-2");
    expect(container.querySelector('[data-slot="label"]')).toHaveClass("text-sm", "font-medium");
    expect(container.querySelector('[data-slot="field-error"]')).toHaveClass("text-destructive");
  });

  it("labels a control by wrapping it", () => {
    render(
      <Label>
        Teléfono
        <Input />
      </Label>,
    );

    expect(screen.getByRole("textbox", { name: "Teléfono" })).toBeInTheDocument();
  });

  it("renders FieldError from an errors list: one message, deduplicated lists, nothing when empty", () => {
    const { rerender } = render(<FieldError errors={[{ message: "Obligatorio" }]} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Obligatorio");

    rerender(<FieldError errors={[{ message: "Obligatorio" }, { message: "Obligatorio" }, { message: "Muy corto" }]} />);
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual(["Obligatorio", "Muy corto"]);

    rerender(<FieldError errors={[]} />);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
