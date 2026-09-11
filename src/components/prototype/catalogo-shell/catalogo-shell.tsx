"use client";

import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  CalendarClock,
  Check,
  ChevronDown,
  MapPin,
  Recycle,
  Route as RouteIcon,
  Scissors,
  Trash2,
  Trees,
  Truck,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { ContainerCatalogPanel } from "@/components/catalog/container-catalog-panel";
import { CrewCatalogPanel } from "@/components/catalog/crew-catalog-panel";
import { DisposalSitesPanel } from "@/components/catalog/disposal-sites-panel";
import { GreenPointCatalogPanel } from "@/components/catalog/green-point-catalog-panel";
import { GreenSpacesPanel } from "@/components/catalog/green-spaces-panel";
import { RouteCatalogPanel } from "@/components/catalog/route-catalog-panel";
import { ServiceFrequenciesPanel } from "@/components/catalog/service-frequencies-panel";
import { ServiceTypesPanel } from "@/components/catalog/service-types-panel";
import { TreeCatalogPanel } from "@/components/catalog/tree-catalog-panel";
import { TreeInterventionsPanel } from "@/components/catalog/tree-interventions-panel";
import { VehicleCatalogPanel } from "@/components/catalog/vehicle-catalog-panel";
import { ZoneCatalogPanel } from "@/components/catalog/zone-catalog-panel";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuPositioner,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppShell } from "@/components/shell/app-shell";
import { ShellLoading } from "@/components/shell/shell-states";
import { ensureMockWorkerStarted } from "@/mocks/ensure-worker-started";
import type { OperationalScenario } from "@/lib/scenarios";

import styles from "./catalogo-shell.module.css";
import {
  catalogCategorySlugs,
  isCatalogCategorySlug,
  type CatalogCategorySlug,
  type PrototypeVariant,
} from "./catalogo-shell-data";

const catalogCategories = [
  { slug: "service-types", label: "Tipos de servicio", icon: Boxes },
  { slug: "disposal-sites", label: "Sitios de disposición", icon: MapPin },
  { slug: "zones", label: "Zonas operativas", icon: MapPin },
  { slug: "routes", label: "Recorridos", icon: RouteIcon },
  { slug: "service-frequencies", label: "Frecuencias de servicio", icon: CalendarClock },
  { slug: "vehicles", label: "Vehículos", icon: Truck },
  { slug: "crews", label: "Cuadrillas", icon: UsersRound },
  { slug: "green-spaces", label: "Espacios verdes", icon: Trees },
  { slug: "containers", label: "Contenedores", icon: Trash2 },
  { slug: "green-points", label: "Puntos verdes", icon: Recycle },
  { slug: "trees", label: "Árboles", icon: Trees },
  { slug: "tree-interventions", label: "Intervenciones de arbolado", icon: Scissors },
] as const satisfies ReadonlyArray<{ slug: (typeof catalogCategorySlugs)[number]; label: string; icon: LucideIcon }>;

export function CatalogoPrototypeApp({
  scenario,
  catalogContent,
}: {
  scenario: OperationalScenario;
  catalogContent: ReactNode;
}) {
  const [workerReady, setWorkerReady] = useState(process.env.NODE_ENV !== "development");

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    void ensureMockWorkerStarted().finally(() => setWorkerReady(true));
  }, []);

  if (!workerReady) return <ShellLoading />;

  return <AppShell scenario={scenario} initialDestination="catalog" catalogContent={catalogContent} />;
}

export function DestinationCatalogPrototype({
  scenario,
  initialCategory,
}: {
  scenario: OperationalScenario;
  initialCategory: CatalogCategorySlug;
}) {
  const [activeCategory, setActiveCategory] = useState(initialCategory);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("variant", "A");
    url.searchParams.set("destination", "catalog");
    url.searchParams.set("category", initialCategory);
    window.history.replaceState(window.history.state, "", url);
  }, [initialCategory]);

  const selectCategory = (category: CatalogCategorySlug) => {
    setActiveCategory(category);
    const url = new URL(window.location.href);
    url.searchParams.set("variant", "A");
    url.searchParams.set("destination", "catalog");
    url.searchParams.set("category", category);
    window.history.replaceState(window.history.state, "", url);
  };

  return (
    <div className={styles.destinationView}>
      <nav className={styles.destinationNav} aria-label="Categorías del catálogo">
        <div className={styles.destinationNavTitle}>Catálogo</div>
        <div className={styles.destinationTabs} role="tablist" aria-label="Categorías">
          {catalogCategories.map(({ slug, label, icon: Icon }) => {
            const selected = slug === activeCategory;
            return (
              <Button
                key={slug}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-current={selected ? "page" : undefined}
                variant={selected ? "default" : "outline"}
                size="sm"
                className={styles.destinationTab}
                onClick={() => selectCategory(slug)}
              >
                <Icon data-icon="inline-start" aria-hidden />
                {label}
              </Button>
            );
          })}
        </div>
      </nav>
      <div key={activeCategory} className={styles.categoryPanel}>
        <CatalogCategoryPanel scenario={scenario} category={activeCategory} />
      </div>
    </div>
  );
}

export function DropdownCatalogPrototype({
  scenario,
  initialCategory,
}: {
  scenario: OperationalScenario;
  initialCategory: CatalogCategorySlug;
}) {
  const [activeCategory, setActiveCategory] = useState(initialCategory);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("variant", "C");
    url.searchParams.set("destination", "catalog");
    url.searchParams.set("category", initialCategory);
    window.history.replaceState(window.history.state, "", url);
  }, [initialCategory]);

  const selectCategory = (category: CatalogCategorySlug) => {
    setActiveCategory(category);
    const url = new URL(window.location.href);
    url.searchParams.set("variant", "C");
    url.searchParams.set("destination", "catalog");
    url.searchParams.set("category", category);
    window.history.replaceState(window.history.state, "", url);
  };

  const activeOption = catalogCategories.find(({ slug }) => slug === activeCategory) ?? catalogCategories[0];
  const ActiveIcon = activeOption.icon;

  return (
    <div className={styles.dropdownView}>
      <nav className={styles.dropdownNav} aria-label="Categorías del catálogo">
        <div>
          <div className={styles.destinationNavTitle}>Catálogo</div>
          <p className={styles.dropdownDescription}>Seleccione el recurso que desea administrar.</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="lg"
                className={styles.dropdownTrigger}
                aria-label={`Categoría seleccionada: ${activeOption.label}`}
              />
            }
          >
            <span className={styles.dropdownTriggerLabel}>
              <ActiveIcon data-icon="inline-start" aria-hidden />
              {activeOption.label}
            </span>
            <ChevronDown data-icon="inline-end" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuPortal>
            <DropdownMenuPositioner side="bottom" align="start" sideOffset={8}>
              <DropdownMenuContent className={styles.dropdownContent}>
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Recursos del catálogo</DropdownMenuLabel>
                  {catalogCategories.map(({ slug, label, icon: Icon }) => {
                    const selected = slug === activeCategory;
                    return (
                      <DropdownMenuItem
                        key={slug}
                        className={styles.dropdownItem}
                        aria-current={selected ? "page" : undefined}
                        onClick={() => selectCategory(slug)}
                      >
                        <Icon data-icon="inline-start" aria-hidden />
                        <span>{label}</span>
                        {selected ? <Check className={styles.dropdownCheck} aria-hidden /> : null}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenuPositioner>
          </DropdownMenuPortal>
        </DropdownMenu>
      </nav>
      <div key={activeCategory} className={styles.categoryPanel}>
        <CatalogCategoryPanel scenario={scenario} category={activeCategory} />
      </div>
    </div>
  );
}

export function NestedCatalogPrototype({
  scenario,
  category,
}: {
  scenario: OperationalScenario;
  category: CatalogCategorySlug;
}) {
  return (
    <div className={styles.routeView}>
      <nav className={styles.routeNav} aria-label="Categorías del catálogo">
        <div className={styles.routeNavTitle}>Catálogo</div>
        <ul className={styles.routeList}>
          {catalogCategories.map(({ slug, label, icon: Icon }) => {
            const selected = slug === category;
            return (
              <li key={slug}>
                <Link
                  href={`/prototype/catalogo-shell/routes/${slug}?variant=B`}
                  className={`${styles.routeLink} ${selected ? styles.routeLinkActive : ""}`}
                  aria-current={selected ? "page" : undefined}
                >
                  <Icon aria-hidden />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className={styles.categoryPanel}>
        <CatalogCategoryPanel scenario={scenario} category={category} />
      </div>
    </div>
  );
}

export function CatalogoPrototypeSwitcher({
  variant,
  category,
}: {
  variant: PrototypeVariant;
  category?: CatalogCategorySlug;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const pathCategory = pathname.split("/").filter(Boolean).at(-1);
  const activeCategory = category ?? (isCatalogCategorySlug(pathCategory) ? pathCategory : "zones");

  const move = useCallback((delta: number) => {
    const variants: PrototypeVariant[] = ["A", "B", "C"];
    const currentIndex = variants.indexOf(variant);
    const nextVariant = variants[(currentIndex + delta + variants.length) % variants.length];
    const urlCategory = new URL(window.location.href).searchParams.get("category") ?? undefined;
    const currentCategory = isCatalogCategorySlug(urlCategory) ? urlCategory : activeCategory;

    if (nextVariant === "A" || nextVariant === "C") {
      router.push(
        `/prototype/catalogo-shell?variant=${nextVariant}&destination=catalog&category=${currentCategory}`,
        { scroll: false },
      );
      return;
    }

    router.push(`/prototype/catalogo-shell/routes/${currentCategory}?variant=B`, { scroll: false });
  }, [activeCategory, router, variant]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      move(event.key === "ArrowRight" ? 1 : -1);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [move]);

  if (process.env.NODE_ENV === "production") return null;

  const label = variant === "A" ? "A · Destino interno" : variant === "B" ? "B · Rutas anidadas" : "C · Dropdown en Catálogo";

  return (
    <div className={styles.switcher} aria-label="Selector de variantes del prototipo">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={styles.switcherButton}
        aria-label="Variante anterior"
        onClick={() => move(-1)}
      >
        <ArrowLeft data-icon="inline-start" aria-hidden />
      </Button>
      <span className={styles.switcherLabel}>{label}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={styles.switcherButton}
        aria-label="Variante siguiente"
        onClick={() => move(1)}
      >
        <ArrowRight data-icon="inline-end" aria-hidden />
      </Button>
    </div>
  );
}

function CatalogCategoryPanel({
  scenario,
  category,
}: {
  scenario: OperationalScenario;
  category: CatalogCategorySlug;
}) {
  switch (category) {
    case "containers":
      return <ContainerCatalogPanel scenario={scenario} />;
    case "crews":
      return <CrewCatalogPanel scenario={scenario} />;
    case "disposal-sites":
      return <DisposalSitesPanel scenario={scenario} />;
    case "green-points":
      return <GreenPointCatalogPanel scenario={scenario} />;
    case "green-spaces":
      return <GreenSpacesPanel scenario={scenario} />;
    case "routes":
      return <RouteCatalogPanel scenario={scenario} />;
    case "service-frequencies":
      return <ServiceFrequenciesPanel scenario={scenario} />;
    case "service-types":
      return <ServiceTypesPanel scenario={scenario} />;
    case "tree-interventions":
      return <TreeInterventionsPanel scenario={scenario} />;
    case "trees":
      return <TreeCatalogPanel scenario={scenario} />;
    case "vehicles":
      return <VehicleCatalogPanel scenario={scenario} />;
    case "zones":
      return <ZoneCatalogPanel scenario={scenario} />;
  }
}
