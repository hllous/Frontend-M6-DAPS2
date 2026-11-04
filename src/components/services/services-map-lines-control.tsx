"use client";

import { Layers } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import styles from "./services-map.module.css";

type MapLinesState = {
  showCommunes: boolean;
  showBarrios: boolean;
  setShowCommunes: (value: boolean) => void;
  setShowBarrios: (value: boolean) => void;
};

/** Muestra u oculta las líneas de comunas y de barrios del mapa. No filtra: los filtros viven en la barra (#854). */
export function ServicesMapLinesControl({ state }: { state: MapLinesState }) {
  return (
    <div className={styles.linesControl} data-slot="map-lines-control">
      <Popover>
        <PopoverTrigger
          render={
            <Button type="button" variant="outline" size="sm" className={styles.linesTrigger} aria-label="Líneas del mapa">
              <Layers data-icon="inline-start" aria-hidden />
              Líneas
            </Button>
          }
        />
        <PopoverContent align="end" aria-label="Líneas del mapa" className="w-48">
          <Label htmlFor="services-map-lines-communes">
            <Checkbox id="services-map-lines-communes" checked={state.showCommunes} onCheckedChange={(checked) => state.setShowCommunes(Boolean(checked))} />
            Comunas
          </Label>
          <Label htmlFor="services-map-lines-barrios">
            <Checkbox id="services-map-lines-barrios" checked={state.showBarrios} onCheckedChange={(checked) => state.setShowBarrios(Boolean(checked))} />
            Barrios
          </Label>
        </PopoverContent>
      </Popover>
    </div>
  );
}
