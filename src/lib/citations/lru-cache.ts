interface Entry<V> {
  value: V;
  expiresAt: number;
}

export interface LruOptions {
  maxSize?: number;
  ttlMs?: number;
}

// Map-backed LRU. Production should swap for Redis when multi-instance.
export class LruCache<V> {
  private readonly map = new Map<string, Entry<V>>();
  private readonly maxSize: number;
  private readonly ttlMs: number;

  constructor(opts: LruOptions = {}) {
    this.maxSize = opts.maxSize ?? 500;
    this.ttlMs = opts.ttlMs ?? 24 * 60 * 60 * 1000;
  }

  get(key: string): V | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key: string, value: V): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    if (this.map.size > this.maxSize) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
  }

  clear(): void {
    this.map.clear();
  }

  size(): number {
    return this.map.size;
  }
}
