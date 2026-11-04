import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { LocationPointStatus } from "./location-picker";
import * as zones from "@/lib/operational-zones";
vi.mock("next/dynamic", () => ({ default: () => () => null }));

it("shows loading rather than an incorrect zone, then shows the actual zone", async () => {
  let finish!: (value: Awaited<ReturnType<typeof zones.loadOperationalZoneGeometries>>) => void;
  const original = zones.loadOperationalZoneGeometries;
  vi.spyOn(zones, "loadOperationalZoneGeometries").mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  render(<LocationPointStatus point={{ lat: -34.5446871, lng: -58.4386826 }} />);
  expect(screen.getByRole("status")).toHaveTextContent("Ubicando");
  finish(await original());
  expect(await screen.findByText("Belgrano")).toBeInTheDocument();
  vi.restoreAllMocks();
});

it("reports a failed zone load and lets the user retry", async () => {
  vi.spyOn(zones, "loadOperationalZoneGeometries").mockRejectedValueOnce(new Error("failed"));
  render(<LocationPointStatus point={{ lat: -34.5446871, lng: -58.4386826 }} />);
  expect(await screen.findByText("No se pudo ubicar la zona.")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
  expect(await screen.findByText("Belgrano")).toBeInTheDocument();
  vi.restoreAllMocks();
});
