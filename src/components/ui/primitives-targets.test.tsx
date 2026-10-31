import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "./button";
import { Checkbox } from "./checkbox";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./resizable";
import { Tabs, TabsList, TabsTrigger } from "./tabs";

const focusClasses = [
  "focus-visible:outline-[3px]",
  "focus-visible:outline-solid",
  "focus-visible:outline-offset-2",
  "focus-visible:outline-[var(--color-focus)]",
];

describe("shared UI primitive targets", () => {
  it("gives buttons, fields, and tabs their 40 px desktop and 48 px mobile targets", () => {
    render(
      <>
        <Button>Acción</Button>
        <Input aria-label="Buscar" />
        <Textarea aria-label="Notas" rows={3} />
        <Tabs defaultValue="summary">
          <TabsList aria-label="Secciones">
            <TabsTrigger value="summary">Resumen</TabsTrigger>
          </TabsList>
        </Tabs>
      </>,
    );

    const button = screen.getByRole("button", { name: "Acción" });
    const field = screen.getByRole("textbox", { name: "Buscar" });
    const notes = screen.getByRole("textbox", { name: "Notas" });
    const tabsList = screen.getByRole("tablist", { name: "Secciones" });
    const tab = screen.getByRole("tab", { name: "Resumen" });

    expect(button).toHaveClass("h-10", "min-h-10", "min-w-10");
    expect(button).toHaveClass("[@media(max-width:760px)]:min-h-12", "[@media(max-width:760px)]:min-w-12");
    expect(field).toHaveClass("h-10", "[@media(max-width:760px)]:h-12");
    expect(notes).toHaveAttribute("data-slot", "textarea");
    expect(notes).toHaveClass("min-h-24", ...focusClasses);
    expect(tabsList).toHaveClass("group-data-horizontal/tabs:h-10", "[@media(max-width:760px)]:group-data-horizontal/tabs:min-h-12");
    expect(tab).toHaveClass("min-h-10", "[@media(max-width:760px)]:min-h-12");
  });

  it("uses the focus token for a 3 px outline with a 2 px offset", () => {
    render(
      <>
        <Button>Acción</Button>
        <Tabs defaultValue="summary">
          <TabsList aria-label="Secciones">
            <TabsTrigger value="summary">Resumen</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input aria-label="Buscar" />
        <Textarea aria-label="Notas" rows={3} />
        <Checkbox aria-label="Confirmar" />
        <ResizablePanelGroup>
          <ResizablePanel defaultSize={50}>Panel</ResizablePanel>
          <ResizableHandle aria-label="Redimensionar" />
        </ResizablePanelGroup>
      </>,
    );

    const focusablePrimitives = [
      screen.getByRole("button", { name: "Acción" }),
      screen.getByRole("tab", { name: "Resumen" }),
      screen.getByRole("textbox", { name: "Buscar" }),
      screen.getByRole("textbox", { name: "Notas" }),
      screen.getByRole("checkbox", { name: "Confirmar" }),
      screen.getByRole("separator", { name: "Redimensionar" }),
    ];

    for (const primitive of focusablePrimitives) {
      expect(primitive).toHaveClass(...focusClasses);
    }
  });
});
