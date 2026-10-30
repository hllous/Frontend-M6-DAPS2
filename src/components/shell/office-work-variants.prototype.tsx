"use client";

// PROTOTYPE #754 (throwaway, branch prototype/754-mi-trabajo-layout). Three layouts for the Office
// "Mi trabajo" panel, switched with ?variant=A|B|C on /app?destination=work. Read-only, no tests.

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import type { GroupState, WorkGroupDefinition, WorkItem } from "./office-work-panel";

export type GroupView = { group: WorkGroupDefinition; state: GroupState };
type Props = { groups: GroupView[]; onRetry: (group: WorkGroupDefinition) => void };

const VARIANTS = [
  { key: "A", name: "Cola única" },
  { key: "B", name: "Pestañas" },
  { key: "C", name: "Tablero" },
] as const;

export function useVariant() {
  const value = useSearchParams().get("variant")?.toUpperCase();
  return VARIANTS.some((variant) => variant.key === value) ? (value as "A" | "B" | "C") : "A";
}

export function PrototypeSwitcher({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const index = VARIANTS.findIndex((variant) => variant.key === current);

  const go = (step: number) => {
    const next = VARIANTS[(index + step + VARIANTS.length) % VARIANTS.length];
    const search = new URLSearchParams(params.toString());
    search.set("variant", next.key);
    router.replace(`${pathname}?${search.toString()}`);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable], [role=tab]")) return;
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (process.env.NODE_ENV === "production") return null;
  return (
    <div
      role="group"
      aria-label="Variantes del prototipo"
      className="fixed bottom-4 max-sm:bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-foreground p-1 text-background shadow-lg"
    >
      <Button variant="ghost" size="icon" aria-label="Variante anterior" onClick={() => go(-1)} className="rounded-full hover:text-foreground">
        <ChevronLeft aria-hidden />
      </Button>
      <span className="min-w-36 text-center text-sm font-medium">
        {current} ({VARIANTS[index].name})
      </span>
      <Button variant="ghost" size="icon" aria-label="Variante siguiente" onClick={() => go(1)} className="rounded-full hover:text-foreground">
        <ChevronRight aria-hidden />
      </Button>
    </div>
  );
}

const loadOf = (state: GroupState) => (state.status === "ready" ? state.load : null);
const readyGroups = (groups: GroupView[]) => groups.filter(({ state }) => !(state.status === "ready" && state.load.total === 0));

function Errors({ groups, onRetry }: Props) {
  return groups
    .filter(({ state }) => state.status === "error")
    .map(({ group }) => (
      <Alert key={group.id} variant="danger">
        <AlertDescription className="flex flex-wrap items-center gap-3">
          {group.errorMessage} Intente nuevamente.
          <Button variant="outline" size="sm" onClick={() => onRetry(group)}>Reintentar</Button>
        </AlertDescription>
      </Alert>
    ));
}

function Rows({ items }: { items: WorkItem[] }) {
  return (
    <ItemGroup>
      {items.map((item) => (
        <Item key={item.id} variant="outline" size="sm">
          <ItemContent>
            <ItemTitle><Link href={item.href} className="hover:underline focus-visible:underline">{item.title}</Link></ItemTitle>
            <ItemDescription>{item.detail}</ItemDescription>
          </ItemContent>
        </Item>
      ))}
    </ItemGroup>
  );
}

function SeeAll({ group }: { group: WorkGroupDefinition }) {
  return (
    <Link href={group.seeAllHref} aria-label={group.seeAllLabel} className="self-start text-sm font-medium underline-offset-4 hover:underline focus-visible:underline">
      Ver todos
    </Link>
  );
}

// A: una sola cola cronológica (lo más antiguo primero) con filtro por grupo.
export function VariantA({ groups, onRetry }: Props) {
  const [filter, setFilter] = useFilter();
  if (groups.length === 0) return null;
  const shown = readyGroups(groups);
  const loading = groups.some(({ state }) => state.status === "loading");
  const rows = shown
    .filter(({ group }) => filter === "all" || group.id === filter)
    .flatMap(({ group, state }) => (loadOf(state)?.items ?? []).map((item) => ({ item, group })))
    .sort((a, b) => (a.item.waitingSince ?? "9").localeCompare(b.item.waitingSince ?? "9"));
  const total = shown.reduce((sum, { state }) => sum + (loadOf(state)?.total ?? 0), 0);
  const active = shown.find(({ group }) => group.id === filter);

  return (
    <div className="flex flex-col gap-4">
      <ToggleGroup
        value={[filter]}
        onValueChange={(values) => values[0] && setFilter(values[0])}
        aria-label="Filtrar por grupo"
        variant="outline"
        spacing={2}
        className="flex-wrap"
      >
        <ToggleGroupItem value="all">Todos <Badge variant="secondary">{total}</Badge></ToggleGroupItem>
        {shown.map(({ group, state }) => (
          <ToggleGroupItem key={group.id} value={group.id}>
            {group.title} {loadOf(state) ? <Badge variant="secondary">{loadOf(state)!.total}</Badge> : null}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Errors groups={groups} onRetry={onRetry} />
      {loading && rows.length === 0 ? <Skeleton className="h-40 w-full" /> : null}
      <ItemGroup>
        {rows.map(({ item, group }) => (
          <Item key={`${group.id}-${item.id}`} variant="outline" size="sm">
            <ItemContent>
              <ItemTitle><Link href={item.href} className="hover:underline focus-visible:underline">{item.title}</Link></ItemTitle>
              <ItemDescription>{item.detail}</ItemDescription>
            </ItemContent>
            <Badge variant="outline" className="max-sm:basis-full">{group.title}</Badge>
          </Item>
        ))}
      </ItemGroup>
      {active ? <SeeAll group={active.group} /> : null}
    </div>
  );
}

import { useState } from "react";
function useFilter() {
  return useState("all");
}

// B: una pestaña por grupo, con el conteo en la pestaña; una sola lista visible.
export function VariantB({ groups, onRetry }: Props) {
  const shown = readyGroups(groups);
  return (
    <div className="flex flex-col gap-4">
      <Errors groups={groups} onRetry={onRetry} />
      <Tabs defaultValue={shown[0]?.group.id} key={shown[0]?.group.id}>
        <TabsList className="h-auto! w-full flex-wrap justify-start max-sm:flex-col max-sm:items-stretch">
          {shown.map(({ group, state }) => (
            <TabsTrigger key={group.id} value={group.id}>
              {group.title} {loadOf(state) ? <Badge variant="secondary">{loadOf(state)!.total}</Badge> : null}
            </TabsTrigger>
          ))}
        </TabsList>
        {shown.map(({ group, state }) => (
          <TabsContent key={group.id} value={group.id} className="flex flex-col gap-3 pt-2">
            {state.status === "loading" ? <Skeleton className="h-40 w-full" /> : null}
            {loadOf(state) ? <Rows items={loadOf(state)!.items} /> : null}
            {loadOf(state) ? <SeeAll group={group} /> : null}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

// C: tablero: cifras grandes arriba (cada una lleva a su listado) y tarjetas compactas en cuadrícula.
export function VariantC({ groups, onRetry }: Props) {
  const shown = readyGroups(groups);
  return (
    <div className="flex flex-col gap-6">
      <Errors groups={groups} onRetry={onRetry} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {shown.map(({ group, state }) => (
          <Link key={group.id} href={group.seeAllHref} aria-label={group.seeAllLabel} className="rounded-xl border p-3 hover:bg-muted focus-visible:bg-muted">
            <div className="text-3xl font-semibold tabular-nums">{loadOf(state)?.total ?? "–"}</div>
            <div className="text-sm text-muted-foreground">{group.title}</div>
          </Link>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {shown.map(({ group, state }) => (
          <Card key={group.id} size="sm">
            <CardHeader><CardTitle>{group.title}</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              {state.status === "loading" ? <Skeleton className="h-24 w-full" /> : null}
              {loadOf(state)?.items.map((item) => (
                <Link key={item.id} href={item.href} className="flex flex-col rounded-md px-2 py-1.5 hover:bg-muted focus-visible:bg-muted">
                  <span className="text-sm font-medium">{item.title}</span>
                  <span className="text-xs text-muted-foreground">{item.detail}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
