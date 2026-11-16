/**
 * `search` de los fixtures igual que el del Backend: coincidencia parcial y sin
 * distinguir mayúsculas en cualquiera de los campos, cada uno por separado (no
 * sobre los campos concatenados). Cada fixture pasa exactamente los campos que
 * busca su endpoint del Backend, para que un mock no encuentre lo que producción
 * no encuentra.
 */
export function matchesSearch(search: string | undefined, fields: ReadonlyArray<string | null | undefined>): boolean {
  const needle = search?.trim().toLowerCase();
  if (!needle) return true;
  return fields.some((field) => field?.toLowerCase().includes(needle));
}
