type Listener = (count: number) => void;
const listeners = new Set<Listener>();

export function emitPendingCount(count: number): void {
  listeners.forEach((fn) => fn(count));
}

export function onPendingCount(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
