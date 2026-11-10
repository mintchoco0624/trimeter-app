import * as L from 'leaflet';

/** Cache Storage bucket for map tiles. Bump the version to drop old tiles. */
export const TILE_CACHE = 'trimeter-tiles-v1';
/** About 25–40 MB of tiles; the oldest are removed first. */
export const MAX_TILES = 2000;
const PRUNE_EVERY = 50;

let added = 0;

/**
 * Gets a tile image: from the phone's tile cache when it has been seen before, otherwise from
 * the tile server (then it is cached). Areas you have already viewed keep their map offline, and
 * the app downloads fewer tiles (as the OpenStreetMap tile policy asks).
 */
export async function loadTile(url: string): Promise<Blob> {
  const cache = await openCache();
  const hit = await cache?.match(url);
  if (hit) return hit.blob();

  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) throw new Error(`Tile HTTP ${res.status}`);
  if (cache) {
    await cache.put(url, res.clone()).catch(() => undefined);
    if (++added % PRUNE_EVERY === 0) void prune(cache);
  }
  return res.blob();
}

/** Where a tile sits inside one of its cached "parent" tiles from a lower zoom. */
export interface ParentTile {
  z: number;
  x: number;
  y: number;
  /** Top-left corner and size, in pixels of the 256 px parent, of the part that covers the tile. */
  sx: number;
  sy: number;
  size: number;
}

/** Parent tiles of a tile, nearest zoom first, down to `maxUp` levels (each level halves the detail). */
export function parentTiles(coords: { x: number; y: number; z: number }, maxUp = 6, tileSize = 256): ParentTile[] {
  const out: ParentTile[] = [];
  for (let up = 1; up <= maxUp && coords.z - up >= 0; up++) {
    const scale = 2 ** up;
    const x = Math.floor(coords.x / scale);
    const y = Math.floor(coords.y / scale);
    const size = tileSize / scale;
    out.push({ z: coords.z - up, x, y, sx: (coords.x - x * scale) * size, sy: (coords.y - y * scale) * size, size });
  }
  return out;
}

/**
 * Offline and zoomed past what was cached: enlarges the matching part of the nearest cached tile from
 * a lower zoom, so the map looks blurry instead of empty. Rejects when no parent is cached either.
 */
export async function loadFromParent(
  coords: { x: number; y: number; z: number },
  urlFor: (z: number, x: number, y: number) => string,
  tileSize = 256,
): Promise<Blob> {
  const cache = await openCache();
  if (!cache) throw new Error('No tile cache');
  for (const p of parentTiles(coords, 6, tileSize)) {
    const hit = await cache.match(urlFor(p.z, p.x, p.y));
    if (!hit) continue;
    const bitmap = await createImageBitmap(await hit.blob());
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = tileSize;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, p.sx, p.sy, p.size, p.size, 0, 0, tileSize, tileSize);
    bitmap.close();
    return new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))), 'image/png'),
    );
  }
  throw new Error('No cached tile for this area');
}

async function openCache(): Promise<Cache | null> {
  try {
    return typeof caches === 'undefined' ? null : await caches.open(TILE_CACHE);
  } catch {
    return null; // e.g. storage blocked: tiles still load from the network
  }
}

/** Keeps the cache under MAX_TILES. keys() is in insertion order, so the oldest go first. */
export async function prune(cache: Cache, max = MAX_TILES): Promise<void> {
  const keys = await cache.keys();
  for (const req of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(req);
}

/** An OpenStreetMap tile layer that reads and fills the tile cache. */
export class CachedTileLayer extends L.TileLayer {
  protected override createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
    const img = document.createElement('img');
    img.alt = '';
    img.setAttribute('role', 'presentation');
    loadTile(this.getTileUrl(coords))
      .catch(() => loadFromParent(coords, (z, x, y) => this.urlFor(z, x, y)))
      .then((blob) => {
        const src = URL.createObjectURL(blob);
        img.onload = () => {
          URL.revokeObjectURL(src);
          done(undefined, img);
        };
        img.onerror = () => {
          URL.revokeObjectURL(src);
          done(new Error('Bad tile image'), img);
        };
        img.src = src;
      })
      .catch((err: unknown) => done(err instanceof Error ? err : new Error(String(err)), img));
    return img;
  }

  /** Tile URL for any zoom (Leaflet's getTileUrl always uses the current map zoom). */
  private urlFor(z: number, x: number, y: number): string {
    const template = (this as unknown as { _url: string })._url;
    return L.Util.template(template, { ...this.options, s: 'a', r: '', x, y, z });
  }
}
