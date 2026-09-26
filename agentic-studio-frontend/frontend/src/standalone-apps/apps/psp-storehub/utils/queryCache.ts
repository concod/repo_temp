type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

class QueryCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();

  generateKey(params: unknown[]): string {
    return params
      .map((param) => {
        if (param instanceof Date) {
          return param.toISOString();
        }
        return String(param);
      })
      .join("::");
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry) {
      return entry.data as T;
    }
    return null;
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

export const queryCache = new QueryCache();
