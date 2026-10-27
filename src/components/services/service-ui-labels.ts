import type { ServiceMode, ServiceOrigin, Service } from "@/lib/services";

export const SERVICE_MODE_LABEL: Record<ServiceMode, string> = {
  ROUTE: "Recorrido",
  POINT: "Punto",
};

export const SERVICE_ORIGIN_LABEL: Record<ServiceOrigin, string> = {
  PLANNED: "Planificación",
  TICKET: "Denuncia ciudadana",
  WEATHER_ALERT: "Alerta meteorológica",
  INSPECTION: "Inspección ambiental",
  MANUAL: "Registro manual",
};

const SERVICE_TARGET_TYPE_LABEL: Record<string, string> = {
  CONTAINER: "Contenedor",
  TREE: "Árbol",
  GREEN_SPACE: "Espacio verde",
  GREEN_POINT: "Punto verde",
};

export function serviceTargetTypeLabel(targetType: Service["targetType"]): string {
  return targetType ? SERVICE_TARGET_TYPE_LABEL[targetType] ?? "Objetivo operativo" : "Objetivo operativo";
}
