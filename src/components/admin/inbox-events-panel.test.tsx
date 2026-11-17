import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { InboxEventsPanel } from "./inbox-events-panel";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const emptyPage = { data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } };

function captureQueries() {
  const queries: URLSearchParams[] = [];
  server.use(http.get("*/api/events/inbox", ({ request }) => {
    queries.push(new URL(request.url).searchParams);
    return HttpResponse.json(emptyPage);
  }));
  return queries;
}

describe("InboxEventsPanel", () => {
  it("no consulta mientras la pestaña no está activa", async () => {
    const queries = captureQueries();
    render(<InboxEventsPanel active={false} />);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(queries).toHaveLength(0);
  });

  it("aplica el filtro por tipo de evento, lo limpia y vuelve a consultar al actualizar", async () => {
    const queries = captureQueries();
    const user = userEvent.setup();
    render(<InboxEventsPanel active />);
    await waitFor(() => expect(queries).toHaveLength(1));
    expect(queries[0]!.get("page")).toBe("1");
    expect(queries[0]!.has("eventType")).toBe(false);

    await user.type(screen.getByLabelText("Tipo de evento"), "  workOrderCompleted ");
    await user.click(screen.getByRole("button", { name: "Aplicar filtros de recibidos" }));
    await waitFor(() => expect(queries.at(-1)!.get("eventType")).toBe("workOrderCompleted"));

    await user.click(screen.getByRole("button", { name: "Actualizar recibidos" }));
    await waitFor(() => expect(queries.length).toBeGreaterThanOrEqual(3));
    expect(queries.at(-1)!.get("eventType")).toBe("workOrderCompleted");

    await user.click(screen.getAllByRole("button", { name: "Limpiar filtros" })[0]!);
    await waitFor(() => expect(queries.at(-1)!.has("eventType")).toBe(false));
    expect(screen.getByLabelText("Tipo de evento")).toHaveValue("");
  });

  it("muestra el mensaje cuando no se pueden cargar los eventos", async () => {
    server.use(http.get("*/api/events/inbox", () => HttpResponse.json({ message: "caído" }, { status: 500 })));
    render(<InboxEventsPanel active />);
    expect(await screen.findByRole("alert")).toBeVisible();
  });
});
