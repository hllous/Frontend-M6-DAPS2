import { serviceTypesAdapter } from "./service-types";
import { zonesAdapter } from "./zones";

/**
 * El backend no devuelve un título de servicio ni nombres de zona: `GET /services`
 * trae `serviceTypeId` y `zones: [{ zoneId, sequence }]`, todos UUID. El título es
 * presentación, no dominio, así que se compone en el frontend con los catálogos.
 *
 * Los dos mapas se piden una vez por carga de página y se memorizan: un listado de
 * 20 servicios no puede disparar 20 consultas de catálogo. Si el catálogo falla, se
 * devuelve un mapa vacío en lugar de propagar el error: un nombre que falta degrada
 * la etiqueta, no tiene que tirar abajo la pantalla de servicios.
 */
type Catalogo = { serviceTypes: Map<string, string>; zones: Map<string, string> };

let catalogoPendiente: Promise<Catalogo> | null = null;

async function cargarCatalogo(): Promise<Catalogo> {
  const [serviceTypes, zones] = await Promise.all([
    serviceTypesAdapter
      .list({ pageSize: 100 })
      .then((page) => new Map(page.serviceTypes.map((item) => [item.id, item.name])))
      .catch(() => new Map<string, string>()),
    zonesAdapter
      .list({ pageSize: 100 })
      .then((page) => new Map(page.zones.map((zone) => [zone.id, zone.name])))
      .catch(() => new Map<string, string>()),
  ]);
  return { serviceTypes, zones };
}

export function catalogoDeEtiquetas(): Promise<Catalogo> {
  catalogoPendiente ??= cargarCatalogo();
  return catalogoPendiente;
}

/** Sólo para los tests: vacía la memoria entre casos. */
export function olvidarCatalogoDeEtiquetas(): void {
  catalogoPendiente = null;
}

/**
 * Identifica un servicio en pantalla: el tipo de servicio y dónde se hace. Nunca
 * devuelve un UUID crudo; si no se puede resolver ningún nombre, cae a la fecha
 * programada, que siempre viene.
 */
export function componerTituloDeServicio(
  input: { serviceTypeId: string; scheduledDate: string; targetRef?: string | null; mode?: string },
  nombres: { serviceType?: string; zones: string[] },
): string {
  const tipo = nombres.serviceType ?? (input.mode === "ROUTE" ? "Servicio de recorrido" : "Servicio puntual");
  const donde = input.targetRef?.trim() || nombres.zones.join(", ");
  if (donde) return `${tipo} — ${donde}`;
  const fecha = input.scheduledDate.slice(0, 10);
  return `${tipo} — ${fecha}`;
}
