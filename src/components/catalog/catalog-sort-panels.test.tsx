import type { ReactElement } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import { ContainerCatalogPanel } from "./container-catalog-panel";
import { CrewCatalogPanel } from "./crew-catalog-panel";
import { GreenPointCatalogPanel } from "./green-point-catalog-panel";
import { GreenSpacesPanel } from "./green-spaces-panel";
import { RouteCatalogPanel } from "./route-catalog-panel";
import { TreeCatalogPanel } from "./tree-catalog-panel";
import { VehicleCatalogPanel } from "./vehicle-catalog-panel";

/**
 * Orden por columna delegado al Backend (#703): cada tabla manda `sort` y `order` al ordenar, solo las columnas
 * con campo en el Backend ofrecen ordenar, y el tercer clic vuelve al orden por defecto (sin `sort` ni `order`).
 */
const office = scenarios.officeDutyQueue;

type Case = {
  name: string;
  path: string;
  element: ReactElement;
  heading: string;
  /** Parámetros de la primera carga, sin orden. */
  base: Record<string, string>;
  /** Columna -> campo de `sort` de las que ofrecen ordenar. */
  sortable: Record<string, string>;
  /** Columnas visibles que NO ofrecen ordenar (el Backend no tiene campo para ellas). */
  notSortable: string[];
};

const cases: Case[] = [
  {
    name: "vehículos",
    path: "/api/vehicles",
    element: <VehicleCatalogPanel scenario={office} />,
    heading: "Vehículos",
    base: { page: "1", pageSize: "20" },
    sortable: { Patente: "plate", Tipo: "vehicleType", "Capacidad (t)": "capacity", Estado: "active" },
    notSortable: [],
  },
  {
    name: "contenedores",
    path: "/api/containers",
    element: <ContainerCatalogPanel scenario={office} />,
    heading: "Contenedores",
    base: { page: "1", pageSize: "20" },
    sortable: { Código: "code", Tipo: "containerType", Capacidad: "capacityLiters", Estado: "status" },
    notSortable: ["Zona", "Dirección"],
  },
  {
    name: "árboles",
    path: "/api/trees",
    element: <TreeCatalogPanel scenario={office} />,
    heading: "Árboles",
    base: { page: "1", pageSize: "20" },
    sortable: { "Código de relevamiento": "surveyCode", Especie: "species", Estado: "active" },
    notSortable: ["Zona", "Ubicación", "Medidas"],
  },
  {
    name: "cuadrillas",
    path: "/api/crews",
    element: <CrewCatalogPanel scenario={office} />,
    heading: "Cuadrillas",
    base: { page: "1", pageSize: "20" },
    sortable: { Nombre: "name", Tipo: "crewType", Turno: "defaultShift", Estado: "active" },
    notSortable: ["Especialidad", "Zona", "Responsable", "Organización"],
  },
  {
    name: "recorridos",
    path: "/api/routes",
    element: <RouteCatalogPanel scenario={office} />,
    heading: "Recorridos",
    base: {},
    sortable: { Código: "code", Nombre: "name", Estado: "active" },
    notSortable: ["Paradas"],
  },
  {
    name: "puntos verdes",
    path: "/api/green-points",
    element: <GreenPointCatalogPanel scenario={office} />,
    heading: "Puntos verdes",
    base: { pageSize: "100" },
    sortable: { Código: "code", Nombre: "name", Estado: "active" },
    notSortable: ["Zona", "Residuos aceptados", "Ubicación"],
  },
  {
    name: "espacios verdes",
    path: "/api/green-spaces",
    element: <GreenSpacesPanel scenario={office} />,
    heading: "Espacios verdes",
    base: { page: "1", pageSize: "20" },
    sortable: { Nombre: "name", Tipo: "spaceType", Estado: "active" },
    notSortable: ["Superficie", "Zona"],
  },
];

const server = setupServer(...handlers);
let requests: URL[] = [];

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
  server.events.on("request:start", ({ request }) => {
    requests.push(new URL(request.url));
  });
});
afterEach(() => {
  server.resetHandlers();
  requests = [];
  window.history.replaceState(null, "", "/");
});
afterAll(() => server.close());

const sortButton = (label: string, state = "sin ordenar") =>
  screen.getByRole("button", { name: `Ordenar por ${label}, actualmente ${state}` });

describe.each(cases)("orden por columna en $name", ({ path, element, heading, base, sortable, notSortable }) => {
  const listRequests = () => requests.filter((url) => url.pathname === path);
  const lastParams = () => Object.fromEntries(listRequests().at(-1)?.searchParams ?? []);

  async function renderReady() {
    render(element);
    await screen.findByRole("heading", { name: heading });
    await screen.findAllByRole("row");
    await waitFor(() => expect(lastParams()).toEqual(base));
  }

  it("ofrece ordenar solo las columnas con campo en el Backend", async () => {
    await renderReady();

    const offered = screen.getAllByRole("button", { name: /^Ordenar por / }).map((button) => button.getAttribute("aria-label"));
    expect(offered).toEqual(Object.keys(sortable).map((label) => `Ordenar por ${label}, actualmente sin ordenar`));
    for (const label of notSortable) {
      expect(screen.queryByRole("button", { name: new RegExp(`^Ordenar por ${label},`) })).not.toBeInTheDocument();
    }
  });

  it("pide al Backend el orden de cada columna: asc, desc y de vuelta al orden por defecto", async () => {
    const user = userEvent.setup();
    await renderReady();

    for (const [label, field] of Object.entries(sortable)) {
      await user.click(sortButton(label));
      await waitFor(() => expect(lastParams()).toEqual({ ...base, sort: field, order: "asc" }));

      await user.click(sortButton(label, "ascendente"));
      await waitFor(() => expect(lastParams()).toEqual({ ...base, sort: field, order: "desc" }));

      await user.click(sortButton(label, "descendente"));
      await waitFor(() => expect(lastParams()).toEqual(base));
    }
  });

  it("cambiar de columna reemplaza el orden anterior en vez de sumarlo", async () => {
    const user = userEvent.setup();
    await renderReady();
    const [[firstLabel], [secondLabel, secondField]] = Object.entries(sortable);

    await user.click(sortButton(firstLabel));
    await user.click(sortButton(secondLabel));

    await waitFor(() => expect(lastParams()).toEqual({ ...base, sort: secondField, order: "asc" }));
    expect(sortButton(firstLabel)).toBeVisible();
  });
});
