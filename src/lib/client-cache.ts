const cacheStore = new Map<string, { data: unknown; updatedAt: number }>();
const inFlightStore = new Map<string, Promise<unknown>>();

export function getCachedValue<T>(key: string, maxAgeMs = 180_000): T | null {
  const entry = cacheStore.get(key);
  if (!entry) return null;
  if (Date.now() - entry.updatedAt > maxAgeMs) {
    cacheStore.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCachedValue<T>(key: string, data: T): T {
  cacheStore.set(key, { data, updatedAt: Date.now() });
  return data;
}

export function invalidateCachePrefix(prefix: string): void {
  for (const key of cacheStore.keys()) {
    if (key.startsWith(prefix)) {
      cacheStore.delete(key);
    }
  }
}

export async function prefetchJson<T = unknown>(
  key: string,
  url: string,
  maxAgeMs = 30_000
): Promise<T | null> {
  const cached = getCachedValue<T>(key, maxAgeMs);
  if (cached) return cached;

  const existingPromise = inFlightStore.get(key);
  if (existingPromise) {
    return (await existingPromise) as T | null;
  }

  const req = fetch(url, { cache: "no-store" })
    .then(async (res) => {
      if (!res.ok) return null;
      const json = (await res.json()) as T;
      setCachedValue(key, json);
      return json;
    })
    .catch(() => null)
    .finally(() => {
      inFlightStore.delete(key);
    });

  inFlightStore.set(key, req);
  return (await req) as T | null;
}
