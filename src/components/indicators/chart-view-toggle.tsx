"use client";

import { ChartNoAxesColumn, Table2 } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export function ChartViewToggle({ value, onChange, label }: { value: "bars" | "table"; onChange: (value: "bars" | "table") => void; label: string }) {
  return <ToggleGroup variant="outline" size="sm" aria-label={label} value={[value]} onValueChange={(values) => { if (values[0] === "bars" || values[0] === "table") onChange(values[0]); }}>
    <ToggleGroupItem value="bars" aria-label="Ver gráfico"><ChartNoAxesColumn aria-hidden="true" /></ToggleGroupItem>
    <ToggleGroupItem value="table" aria-label="Ver tabla"><Table2 aria-hidden="true" /></ToggleGroupItem>
  </ToggleGroup>;
}
