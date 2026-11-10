import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadFromParent, loadTile, parentTiles, prune } from './cached-tile-layer';

/** A tiny Cache Storage stand-in, keyed by URL, in insertion order. */
class FakeCache {
  readonly store = new Map<string, Response>();
  async match(url: string) {
    return this.store.get(url)?.clone();
  }
  async put(url: string, res: Response) {
    this.store.set(url, res);
  }
  async keys() {
    return [...this.store.keys()].map((url) => ({ url }) as Request);
  }
  async delete(req: Request) {
    return this.store.delete(req.url);
  }
}

describe('tile cache', () => {
  let cache: FakeCache;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    cache = new FakeCache();
    vi.stubGlobal('caches', { open: async () => cache });
    fetchMock = vi.fn(async () => new Response('png', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('downloads a new tile once, then serves it from the cache (works offline)', async () => {
    const url = 'https://tile.openstreetmap.org/15/1/2.png';
    await loadTile(url);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(cache.store.has(url)).toBe(true);

    fetchMock.mockRejectedValue(new TypeError('Failed to fetch')); // offline
    const blob = await loadTile(url);
    expect(await blob.text()).toBe('png');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('fails for a tile that was never viewed while offline, so the map can show its notice', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(loadTile('https://tile.openstreetmap.org/15/9/9.png')).rejects.toThrow();
  });

  it('does not cache error responses', async () => {
    fetchMock.mockResolvedValue(new Response('busy', { status: 503 }));
    await expect(loadTile('https://tile.openstreetmap.org/15/3/3.png')).rejects.toThrow('503');
    expect(cache.store.size).toBe(0);
  });

  it('still loads tiles when Cache Storage is not available', async () => {
    vi.stubGlobal('caches', undefined);
    const blob = await loadTile('https://tile.openstreetmap.org/15/4/4.png');
    expect(await blob.text()).toBe('png');
  });

  it('prunes the oldest tiles first', async () => {
    for (let i = 0; i < 5; i++) await cache.put(`t${i}`, new Response('x'));
    await prune(cache as unknown as Cache, 3);
    expect([...cache.store.keys()]).toEqual(['t2', 't3', 't4']);
  });

  it('finds the parent tiles of a zoomed-in tile, nearest first', () => {
    const [p1, p2] = parentTiles({ x: 5, y: 3, z: 17 });
    // z16: tile 5 is the right half (x 2*2+1), tile 3 the bottom half of parent (2, 1).
    expect(p1).toEqual({ z: 16, x: 2, y: 1, sx: 128, sy: 128, size: 128 });
    // z15: a quarter of parent (1, 0); 5 = 4+1 -> second column, 3 -> fourth row.
    expect(p2).toEqual({ z: 15, x: 1, y: 0, sx: 64, sy: 192, size: 64 });
    expect(parentTiles({ x: 0, y: 0, z: 1 }, 6)).toHaveLength(1);
  });

  it('gives up when no parent tile is cached either', async () => {
    await expect(loadFromParent({ x: 5, y: 3, z: 17 }, (z, x, y) => `${z}/${x}/${y}`)).rejects.toThrow('No cached tile');
  });
});
