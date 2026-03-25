type Listener = (count: number) => void;
const listeners = new Set<Listener>();

export function emitDueCount(count: number): void {
  listeners.forEach((fn) => fn(count));
}

export function onDueCount(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
