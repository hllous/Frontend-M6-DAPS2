const listeners = new Set<() => void>();

export function onMapInventoryChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function notifyMapInventoryChanged(): void {
  listeners.forEach((listener) => listener());
}
