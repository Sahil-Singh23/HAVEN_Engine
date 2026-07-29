// src/map/AssetCache.ts
//
// Client-side asset caching using the Cache API.
// Assets are stored in a versioned cache so the map, tileset images,
// and sprite sheets survive page reloads without re-downloading.
// Bump CACHE_VERSION when assets on the server change.

const CACHE_NAME = 'haven-assets-v2';

/**
 * Cache-first fetch. Returns a cached response if available,
 * otherwise fetches from the network and caches the result.
 * Falls back to plain fetch when the Cache API is unavailable.
 */
export async function cachedFetch(url: string): Promise<Response> {
  if (typeof caches === 'undefined') return fetch(url);

  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(url);
  if (cached) return cached;

  const response = await fetch(url);
  if (response.ok) {
    // Clone before caching — body can only be consumed once
    cache.put(url, response.clone());
  }
  return response;
}

/**
 * Load an image through the Cache API.
 * On first load the image bytes are fetched and stored in cache.
 * On subsequent loads the cached bytes are used via a Blob URL,
 * avoiding a network round-trip entirely.
 */
export async function cachedLoadImage(url: string): Promise<HTMLImageElement> {
  let response: Response;

  if (typeof caches !== 'undefined') {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(url);
    if (cached) {
      response = cached;
    } else {
      response = await fetch(url);
      if (response.ok) {
        cache.put(url, response.clone());
      }
    }
  } else {
    response = await fetch(url);
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${url} (${response.status})`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to decode image: ${url}`));
    };
    img.src = objectUrl;
  });
}
