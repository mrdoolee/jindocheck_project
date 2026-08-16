type Listener = () => void;

const listeners = new Set<Listener>();
let suppressed = false;

export function onDirty(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function notifyDirty(): void {
  if (suppressed) return;
  listeners.forEach((fn) => fn());
}

export async function withDirtySuppressed<T>(fn: () => Promise<T>): Promise<T> {
  suppressed = true;
  try {
    return await fn();
  } finally {
    suppressed = false;
  }
}
