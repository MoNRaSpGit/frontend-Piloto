import { readJsonStorage, writeJsonStorage } from "../../shared/lib/persistence";
import type { PilotoProduct } from "./piloto.types";

type CachedLookupEntry = {
  cachedAt: number;
  product: PilotoProduct;
};

const PRODUCT_LOOKUP_CACHE_KEY = "piloto.product-lookup-cache.v1";
const PRODUCT_LOOKUP_CACHE_TTL_MS = 1000 * 60 * 60 * 12;
const PRODUCT_LOOKUP_CACHE_MAX_ENTRIES = 250;

let inMemoryLookupCache: Map<string, CachedLookupEntry> | null = null;

function hydrateLookupCache(): Map<string, CachedLookupEntry> {
  if (inMemoryLookupCache) {
    return inMemoryLookupCache;
  }

  const stored = readJsonStorage<Record<string, CachedLookupEntry>>(PRODUCT_LOOKUP_CACHE_KEY, {});
  const now = Date.now();
  const entries = Object.entries(stored).filter(([, entry]) => now - entry.cachedAt <= PRODUCT_LOOKUP_CACHE_TTL_MS);

  inMemoryLookupCache = new Map(entries);
  return inMemoryLookupCache;
}

function persistLookupCache() {
  const cache = hydrateLookupCache();
  const sortedEntries = Array.from(cache.entries())
    .sort((a, b) => b[1].cachedAt - a[1].cachedAt)
    .slice(0, PRODUCT_LOOKUP_CACHE_MAX_ENTRIES);

  inMemoryLookupCache = new Map(sortedEntries);
  writeJsonStorage(PRODUCT_LOOKUP_CACHE_KEY, Object.fromEntries(sortedEntries));
}

export function getCachedLookup(cacheKey: string): PilotoProduct | null {
  const cache = hydrateLookupCache();
  const entry = cache.get(cacheKey);
  if (!entry) {
    return null;
  }

  if (Date.now() - entry.cachedAt > PRODUCT_LOOKUP_CACHE_TTL_MS) {
    cache.delete(cacheKey);
    return null;
  }

  return entry.product;
}

export function setCachedLookup(cacheKey: string, product: PilotoProduct) {
  const cache = hydrateLookupCache();
  cache.set(cacheKey, { cachedAt: Date.now(), product });
  persistLookupCache();
}
