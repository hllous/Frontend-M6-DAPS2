import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, expect, it } from "vitest";
import { handlers } from "@/mocks/handlers";
import { resetRoleAssignmentFixtures } from "@/mocks/role-assignment-fixtures";
import { AccessWorkspace } from "./access-workspace";
const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => { server.resetHandlers(); resetRoleAssignmentFixtures(); });
afterAll(() => server.close());
it("lista, abre por id y guarda una asignación", async () => {
  const user = userEvent.setup(); render(<AccessWorkspace ownUserId="2" />);
  expect(await screen.findByText("2 (vos)")).toBeVisible();
  await user.type(screen.getByLabelText("Identificador de usuario M1"), "999");
  await user.click(screen.getByRole("button", { name: "Abrir persona" }));
  await user.click(await screen.findByRole("checkbox", { name: /Campo, inspección/ }));
  await user.click(screen.getByRole("button", { name: "Guardar roles" }));
  expect(await screen.findByText(/Los roles asignados se guardaron/)).toBeVisible();
});
it("impide mezclar Oficina y Campo", async () => {
  const user = userEvent.setup(); render(<AccessWorkspace ownUserId="2" />);
  await user.type(screen.getByLabelText("Identificador de usuario M1"), "999");
  await user.click(screen.getByRole("button", { name: "Abrir persona" }));
  await user.click(await screen.findByRole("checkbox", { name: /Administración:/ }));
  await user.click(screen.getByRole("checkbox", { name: /Campo, inspección/ }));
  expect(screen.getByText(/No se pueden combinar/)).toBeVisible();
  expect(screen.getByRole("button", { name: "Guardar roles" })).toBeDisabled();
});
it("confirma la baja y explica el conflicto del último administrador", async () => {
  const user = userEvent.setup(); render(<AccessWorkspace ownUserId="2" />);
  const row = await screen.findByRole("row", { name: /2 \(vos\)/ });
  await user.click(within(row).getByRole("button", { name: "Administrar" }));
  await user.click(await screen.findByRole("button", { name: "Quitar todos los roles" }));
  const dialog = await screen.findByRole("dialog");
  await user.click(within(dialog).getByRole("button", { name: "Quitar roles" }));
  expect(await screen.findByText(/último administrador/)).toBeInTheDocument();
});
