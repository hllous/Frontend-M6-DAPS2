// PROTOTYPE route for Wayfinder ticket #14 — throwaway, not production UI.
// Sub-shape B per .claude/skills/prototype/UI.md: no existing page hosts a
// map+table workspace yet, so this is a dedicated throwaway route rather
// than an adjustment to an existing one.
import { Suspense } from "react";
import type { Metadata } from "next";
import { MapTableClient } from "./Client";

export const metadata: Metadata = {
  title: "Prototipo — Mapa + Tabla (no producción)",
};

export default function MapTablePrototypePage() {
  return (
    <Suspense fallback={null}>
      <MapTableClient />
    </Suspense>
  );
}
