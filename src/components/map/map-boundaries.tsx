"use client";

import { Layers } from "lucide-react";
import { Fragment, memo, useCallback, useEffect, useMemo, useState } from "react";
import { divIcon } from "leaflet";
import { Marker, Pane, Polygon, Tooltip } from "react-leaflet";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { communesAdapter } from "@/lib/communes";
import {
  EMPTY_BOUNDARIES,
  buildMapBoundaries,
  fetchBoundaryGeoJson,
  hideAll,
  isFilterActive,
  isPointVisible,
  setBarrioVisible,
  setCommuneVisible,
  showAll,
  type BoundaryVisibility,
  type MapBoundaries,
} from "@/lib/map-boundaries";
import { neighborhoodsAdapter } from "@/lib/neighborhoods";
import type { MapCoordinate } from "@/lib/operational-zones";

import styles from "./map-boundaries.module.css";

export type MapBoundariesState = {
  boundaries: MapBoundaries;
  visibility: BoundaryVisibility;
  showCommunes: boolean;
  showBarrios: boolean;
  /** No se pudieron cargar los GeoJSON: no hay capas ni filtro. */
  loadFailed: boolean;
  /** Hay algo oculto: los marcadores se filtran. */
  filterActive: boolean;
  setShowCommunes: (value: boolean) => void;
  setShowBarrios: (value: boolean) => void;
  setCommune: (code: string, visible: boolean) => void;
  setBarrio: (code: string, visible: boolean) => void;
  showEverything: () => void;
  hideEverything: () => void;
  /**
   * Con todo visible no filtra. Con filtro activo solo pasa lo que cae dentro de un barrio visible: un punto
   * fuera de todos los barrios se oculta.
   */
  isPointVisible: (point: MapCoordinate) => boolean;
};

// Una sola descarga por sesión: cada canvas que monta \`useMapBoundaries\` comparte estas promesas.
// \`first\` dibuja apenas llegan los GeoJSON; \`final\` agrega los nombres del catálogo (que puede fallar sin
// impedir la capa).
type BoundariesRequest = { first: Promise<MapBoundaries>; final: Promise<MapBoundaries> };
let boundariesRequest: BoundariesRequest | undefined;

function loadBoundaries(): BoundariesRequest {
  if (boundariesRequest) return boundariesRequest;
  const geoJson = fetchBoundaryGeoJson();
  const catalog = Promise.allSettled([communesAdapter.list(), neighborhoodsAdapter.list({ soloActivos: true })]).then(
    ([communes, neighborhoods]) => ({
      communes: communes.status === "fulfilled" ? communes.value : undefined,
      neighborhoods: neighborhoods.status === "fulfilled" ? neighborhoods.value : undefined,
    }),
  );
  const request: BoundariesRequest = {
    first: geoJson.then(([communes, barrios]) => buildMapBoundaries(communes, barrios)),
    final: Promise.all([geoJson, catalog]).then(([[communes, barrios], names]) => buildMapBoundaries(communes, barrios, names)),
  };
  // Un fallo no se cachea: el próximo montaje reintenta.
  request.first.catch(() => {
    if (boundariesRequest === request) boundariesRequest = undefined;
  });
  request.final.catch(() => undefined);
  boundariesRequest = request;
  return request;
}

/** Solo para tests: olvida la descarga cacheada. */
export function resetMapBoundariesCache() {
  boundariesRequest = undefined;
}

/**
 * Comunas y barrios del mapa (#708, #709, #720): carga los GeoJSON estáticos, los cruza con el catálogo
 * de la API y guarda la visibilidad. El estado es local al mapa: no se persiste.
 */
export function useMapBoundaries(): MapBoundariesState {
  const [boundaries, setBoundaries] = useState<MapBoundaries>(EMPTY_BOUNDARIES);
  const [visibility, setVisibility] = useState<BoundaryVisibility>(hideAll);
  const [showCommunes, setShowCommunes] = useState(true);
  const [showBarrios, setShowBarrios] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    const { first, final } = loadBoundaries();

    first.then(
      (built) => {
        if (!isCurrent) return;
        setBoundaries(built);
        setVisibility(showAll(built));
        // Los nombres del catálogo reemplazan a los del GeoJSON sin tocar la visibilidad.
        void final.then((named) => {
          if (isCurrent) setBoundaries(named);
        }, () => undefined);
      },
      () => {
        if (isCurrent) setLoadFailed(true);
      },
    );

    return () => {
      isCurrent = false;
    };
  }, []);

  const filterActive = isFilterActive(boundaries, visibility);

  return useMemo(
    () => ({
      boundaries,
      visibility,
      showCommunes,
      showBarrios,
      loadFailed,
      filterActive,
      setShowCommunes,
      setShowBarrios,
      setCommune: (code, visible) => setVisibility((current) => setCommuneVisible(boundaries, current, code, visible)),
      setBarrio: (code, visible) => setVisibility((current) => setBarrioVisible(current, code, visible)),
      showEverything: () => setVisibility(showAll(boundaries)),
      hideEverything: () => setVisibility(hideAll()),
      isPointVisible: (point) => !filterActive || isPointVisible(boundaries, visibility, point),
    }),
    [boundaries, visibility, showCommunes, showBarrios, loadFailed, filterActive],
  );
}

const COMMUNE_PATH = { color: "#0B1F3A", weight: 3, opacity: 0.9, fill: false };
const BARRIO_FILL = 0.38;
// Compartidos por todos los barrios: usan `event.target`, así que no hace falta uno por polígono.
const BARRIO_HANDLERS = {
  mouseover: (event: { target: { setStyle: (style: object) => void } }) => event.target.setStyle({ fillOpacity: 0.6, weight: 2 }),
  mouseout: (event: { target: { setStyle: (style: object) => void } }) => event.target.setStyle({ fillOpacity: BARRIO_FILL, weight: 1 }),
};

// react-leaflet llama `setStyle`/`setIcon` cuando cambia la identidad de `pathOptions`/`icon`: se calculan una
// vez por conjunto de límites, no en cada render.
export function buildLayerProps(boundaries: MapBoundaries) {
  const communeName = new Map(boundaries.communes.map((commune) => [commune.code, commune.name]));
  return {
    barrios: boundaries.barrios.map((barrio) => ({
      barrio,
      pathOptions: { color: barrio.stroke, weight: 1, fillColor: barrio.fill, fillOpacity: BARRIO_FILL },
      communeName: communeName.get(barrio.communeCode) ?? barrio.communeCode,
    })),
    communes: boundaries.communes.map((commune) => ({
      commune,
      icon: divIcon({ className: styles.communeLabel, html: String(commune.number), iconSize: [26, 20] }),
    })),
  };
}

/** Capas dentro del `MapContainer`: barrios de color debajo, bordes de comunas encima. */
export const MapBoundaryLayers = memo(function MapBoundaryLayers({ state }: { state: MapBoundariesState }) {
  const { boundaries, visibility, showCommunes, showBarrios } = state;
  const layers = useMemo(() => buildLayerProps(boundaries), [boundaries]);

  return (
    <>
      <Pane name="barriosPane" style={{ zIndex: 350 }}>
        {showBarrios
          ? layers.barrios
              .filter(({ barrio }) => visibility.barrios.has(barrio.code))
              .flatMap(({ barrio, pathOptions, communeName }) =>
                barrio.coordinates.map((polygon, partIndex) => (
                  <Polygon
                    key={`${barrio.code}-${partIndex}`}
                    positions={polygon}
                    pane="barriosPane"
                    pathOptions={pathOptions}
                    eventHandlers={BARRIO_HANDLERS}
                  >
                    <Tooltip sticky>
                      <strong>{barrio.name}</strong> · {communeName}
                    </Tooltip>
                  </Polygon>
                )),
              )
          : null}
      </Pane>

      <Pane name="comunasPane" style={{ zIndex: 360 }}>
        {showCommunes
          ? layers.communes
              .filter(({ commune }) => visibility.communes.has(commune.code))
              .map(({ commune, icon }) => (
                <Fragment key={commune.code}>
                  {commune.coordinates.map((polygon, partIndex) => (
                    <Polygon
                      key={`${commune.code}-${partIndex}`}
                      positions={polygon}
                      pane="comunasPane"
                      interactive={false}
                      pathOptions={COMMUNE_PATH}
                    />
                  ))}
                  {/* Marcador decorativo (sin rol ni foco): el nombre de la comuna está en la lista del control. */}
                  <Marker position={commune.center} interactive={false} keyboard={false} zIndexOffset={-1000} icon={icon} />
                </Fragment>
              ))
          : null}
      </Pane>
    </>
  );
});

/** Botón "Comunas y barrios" con la lista de comunas y barrios. Se monta fuera del `MapContainer`. */
export function MapBoundaryControl({ state }: { state: MapBoundariesState }) {
  const { boundaries, visibility } = state;
  const barriosByCommune = useCallback(
    (communeCode: string) => boundaries.barrios.filter((barrio) => barrio.communeCode === communeCode),
    [boundaries.barrios],
  );
  const withoutPolygon = useCallback(
    (communeCode: string) => boundaries.barriosWithoutPolygon.filter((barrio) => barrio.communeCode === communeCode),
    [boundaries.barriosWithoutPolygon],
  );

  if (state.loadFailed) {
    return (
      <div className={styles.control}>
        <p role="status" className={styles.loadError}>
          No se pudieron cargar las comunas y barrios.
        </p>
      </div>
    );
  }
  if (boundaries.communes.length === 0) return null;

  return (
    <div className={styles.control} data-slot="map-boundary-control">
      <Popover>
        <PopoverTrigger
          render={
            <Button type="button" variant="outline" size="sm" className={styles.trigger}>
              <Layers aria-hidden />
              Comunas y barrios
              {state.filterActive ? <span className={styles.filterDot} aria-hidden /> : null}
              {state.filterActive ? <span className="sr-only">(filtro activo)</span> : null}
            </Button>
          }
        />
        <PopoverContent align="end" className={`w-[min(22rem,calc(100vw-2rem))] ${styles.panel}`} aria-label="Comunas y barrios">
          <div className={styles.layerToggles}>
            <Label htmlFor="map-layer-communes">
              <Checkbox id="map-layer-communes" checked={state.showCommunes} onCheckedChange={(checked) => state.setShowCommunes(Boolean(checked))} />
              Comunas
            </Label>
            <Label htmlFor="map-layer-barrios">
              <Checkbox id="map-layer-barrios" checked={state.showBarrios} onCheckedChange={(checked) => state.setShowBarrios(Boolean(checked))} />
              Barrios
            </Label>
          </div>
          <div className={styles.bulkActions}>
            <Button type="button" variant="outline" size="sm" onClick={state.showEverything}>Mostrar todos</Button>
            <Button type="button" variant="outline" size="sm" onClick={state.hideEverything}>Ocultar todos</Button>
          </div>
          <p className={styles.hint}>
            Lo que oculte en la lista también se quita de los marcadores del mapa, aunque apague las capas Comunas o Barrios (que solo ocultan el dibujo).
          </p>
          <ul className={styles.list} aria-label="Lista de comunas y barrios">
            {boundaries.communes.map((commune) => (
              <li key={commune.code}>
                <Label htmlFor={`map-commune-${commune.code}`} className={styles.communeRow}>
                  <Checkbox
                    id={`map-commune-${commune.code}`}
                    checked={visibility.communes.has(commune.code)}
                    onCheckedChange={(checked) => state.setCommune(commune.code, Boolean(checked))}
                  />
                  {commune.name}
                </Label>
                <ul className={styles.barrioList}>
                  {barriosByCommune(commune.code).map((barrio) => (
                    <li key={barrio.code}>
                      <Label htmlFor={`map-barrio-${barrio.code}`} className={styles.barrioRow}>
                        <Checkbox
                          id={`map-barrio-${barrio.code}`}
                          checked={visibility.barrios.has(barrio.code)}
                          onCheckedChange={(checked) => state.setBarrio(barrio.code, Boolean(checked))}
                        />
                        <span className={styles.swatch} style={{ background: barrio.fill }} aria-hidden />
                        {barrio.name}
                      </Label>
                    </li>
                  ))}
                  {withoutPolygon(commune.code).map((barrio) => (
                    <li key={barrio.code}>
                      <Label htmlFor={`map-barrio-${barrio.code}`} className={styles.barrioRow}>
                        <Checkbox id={`map-barrio-${barrio.code}`} checked={false} disabled />
                        {barrio.name} (sin mapa)
                      </Label>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
}
