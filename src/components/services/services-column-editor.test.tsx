import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  ServicesColumnEditor,
  useServicesColumnPreferences,
} from "./services-column-editor";

function ServicesColumnEditorHarness({ userId }: { userId: string }) {
  const controller = useServicesColumnPreferences({
    userId,
    variant: "1",
    data: [],
  });
  const visibleColumns = controller.table
    .getVisibleLeafColumns()
    .filter((column) => column.id !== "ordinal")
    .map((column) => column.columnDef.header)
    .filter((header): header is string => typeof header === "string");

  return (
    <>
      <ul aria-label="Columnas visibles">
        {visibleColumns.map((column) => <li key={column}>{column}</li>)}
      </ul>
      <ServicesColumnEditor controller={controller} />
    </>
  );
}

describe("ServicesColumnEditor", () => {
  it.each(["Estado", "Zona", "Equipo", "Fecha"])(
    "hides %s from the visible column list",
    async (category) => {
      const user = userEvent.setup();
      render(<ServicesColumnEditorHarness userId={`services-column-editor-${category}`} />);

      const visibleColumns = screen.getByRole("list", { name: "Columnas visibles" });
      const trigger = screen.getByRole("button", { name: "Categorías" });
      await waitFor(() => expect(trigger).toBeEnabled());

      await user.click(trigger);
      await user.click(await screen.findByRole("menuitemcheckbox", { name: category }));
      await waitFor(() => {
        expect(within(visibleColumns).queryByText(category)).not.toBeInTheDocument();
      });

      expect(within(visibleColumns).getByText("Servicio")).toBeInTheDocument();
      expect(visibleColumns.querySelectorAll("li")).toHaveLength(4);
    },
  );
});
