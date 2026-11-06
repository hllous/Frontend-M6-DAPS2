"use client";

import { ChartNoAxesColumn, Table2 } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";

/** Un único botón por panel: pasa de gráfico a tabla y vuelve. El nombre dice a qué vista pasa; `aria-pressed` indica que la tabla está activa. */
export function ChartViewToggle({ value, onChange }: { value: "bars" | "table"; onChange: (value: "bars" | "table") => void; label?: string }) {
  const showingTable = value === "table";
  const Icon = showingTable ? ChartNoAxesColumn : Table2;
  return <Toggle variant="outline" size="sm" pressed={showingTable} onPressedChange={(pressed) => onChange(pressed ? "table" : "bars")} aria-label={showingTable ? "Ver gráfico" : "Ver tabla"} className="min-h-10 min-w-10 [@media(max-width:760px)]:min-h-12 [@media(max-width:760px)]:min-w-12">
    <Icon aria-hidden="true" />
  </Toggle>;
}
