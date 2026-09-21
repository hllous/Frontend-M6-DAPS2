/**
 * El backend expone las relaciones como arrays de objetos y, en varios recursos,
 * sólo en el detalle:
 *
 *   GET /crews        → sin miembros          GET /crews/{id} → members: [{ userId }]
 *   GET /zones        → sin barrios           GET /zones/{id} → neighborhoods: [{ neighborhoodId }]
 *   GET /tree-interventions → trees: [{ treeId }]
 *
 * El frontend los consume como ids planos (`memberUserIds`, `neighborhoodIds`,
 * `treeIds`). `withFlatIds` copia la lista plana a partir de la anidada antes de
 * validar, para que un mismo schema acepte el listado y el detalle del backend y
 * las fixtures del modo mock, que ya vienen planas.
 *
 * Se aplana en el frontend y no se pide el campo al backend porque la forma
 * anidada es la que puede crecer (el `zones` de un servicio lleva `sequence`
 * además del id) y porque estos ids sólo se usan en los diálogos de detalle.
 *
 * La clave anidada se descarta al traducirla: en intervenciones, `trees` es
 * además el nombre que el frontend usa para los árboles completos que resuelve
 * por su cuenta, y dejar pasar los `[{ treeId }]` del backend rompería ese campo.
 */
export function withFlatIds(from: string, idKey: string, to: string) {
  return (value: unknown) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return value;
    const record = value as Record<string, unknown>;
    // Lo que ya viene plano gana: el modo mock no pasa por el backend.
    if (to in record || !Array.isArray(record[from])) return value;
    const { [from]: nested, ...rest } = record;
    return {
      ...rest,
      [to]: (nested as unknown[]).map((item) =>
        item && typeof item === "object" ? (item as Record<string, unknown>)[idKey] : item,
      ),
    };
  };
}
