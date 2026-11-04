"use client";
// PROTOTIPO DESCARTABLE (#849, fase 1). Se borra al implementar la variante elegida.
import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { buildSignals, UPDATED_AT, VARIANTS, type PeriodId, type VariantId } from "./prototype-data";
import { MoreFilters, PeriodPicker } from "./shared";
import { VariantA } from "./variant-a";
import { VariantB } from "./variant-b";
import { VariantC } from "./variant-c";

export function PrototypeShell({ variant }: { variant: VariantId }) {
  const router = useRouter();
  const pathname = usePathname();
  const [period, setPeriod] = useState<PeriodId>("month");
  const signals = useMemo(() => buildSignals(period), [period]);
  const current = VARIANTS.find((item) => item.id === variant) ?? VARIANTS[0];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6 max-[760px]:p-4">
      <div className="flex flex-col gap-2 rounded-xl border border-dashed p-3">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline">Prototipo descartable</Badge>
          <ToggleGroup variant="outline" value={[current.id]} onValueChange={(values) => { if (values[0]) router.replace(`${pathname}?v=${values[0]}`); }} aria-label="Variante del prototipo" className="flex-wrap">
            {VARIANTS.map((item) => <ToggleGroupItem key={item.id} value={item.id} className="aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary">{item.label}</ToggleGroupItem>)}
          </ToggleGroup>
        </div>
        <p className="text-sm text-muted-foreground">{current.note} Datos de ejemplo.</p>
      </div>

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">Tableros</h1>
            <p className="text-sm text-muted-foreground">{UPDATED_AT}</p>
          </div>
          <PeriodPicker period={period} onChange={setPeriod} />
        </div>
        <MoreFilters />
      </header>

      {current.id === "a" ? <VariantA signals={signals} /> : null}
      {current.id === "b" ? <VariantB key={period} signals={signals} /> : null}
      {current.id === "c" ? <VariantC signals={signals} period={period} /> : null}
    </main>
  );
}
