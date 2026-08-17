/* Typed wrapper around the cubiomes WASM module (public/wasm/seedscout.js). */

export const WASM_BASE = `${import.meta.env.BASE_URL}wasm/`;

type Module = Awaited<ReturnType<typeof createSeedScoutModule>>;

declare global {
  function createSeedScoutModule(opts?: {
    locateFile?: (path: string) => string;
  }): Promise<Record<string, any>>;
}

let modulePromise: Promise<Module> | null = null;

export async function loadSeedScoutModule(): Promise<Module> {
  if (!modulePromise) {
    modulePromise = (async () => {
      const mod: any = await import(/* @vite-ignore */ `${WASM_BASE}seedscout.js`);
      const factory = mod.default ?? mod;
      const m = await factory({ locateFile: (p: string) => WASM_BASE + p });
      m._api = m;
      return m as Module;
    })();
  }
  return modulePromise;
}

export class SeedScout {
  private m: Module;
  private cacheBytes = 0;
  private cachePtr = 0;

  private constructor(m: Module) {
    this.m = m;
  }

  static async init(): Promise<SeedScout> {
    const m = await loadSeedScoutModule();
    return new SeedScout(m);
  }

  get module(): Module {
    return this.m;
  }

  private malloc(n: number): number {
    return this.m._malloc(n);
  }

  free(p: number): void {
    if (p) this.m._free(p);
  }

  /* int buffers (HEAP32) */
  private i32(p: number): Int32Array {
    return this.m.HEAP32.subarray(p >> 2);
  }

  validVersion(mc: number): boolean {
    return this.m._ss_valid_version(mc) !== 0;
  }

  versionStr(mc: number): string | null {
    const p = this.m._ss_version_str(mc);
    if (!p) return null;
    return this.m.UTF8ToString(p);
  }

  genNew(mc: number, flags = 0): number {
    return this.m._ss_gen_new(mc, flags);
  }

  genApply(g: number, dim: number, seed: bigint): void {
    this.m._ss_gen_apply(g, dim, BigInt.asUintN(64, seed));
  }

  genFree(g: number): void {
    this.m._ss_gen_free(g);
  }

  getBiomeAt(g: number, scale: number, x: number, y: number, z: number): number {
    return this.m._ss_get_biome_at(g, scale, x, y, z);
  }

  /* Generate a biome grid of sx*sz ints at (x,z) block coords, scale 1 or 4.
   * Returns a copy of the int array. */
  genBiomes(g: number, scale: number, x: number, z: number, sx: number, sz: number, y = 0): Int32Array {
    const needed = this.m._ss_min_cache_size(g, scale, sx, sz);
    if (needed > this.cacheBytes) {
      if (this.cachePtr) this.free(this.cachePtr);
      this.cachePtr = this.malloc(needed * 4);
      this.cacheBytes = needed;
    }
    this.m._ss_gen_biomes(g, this.cachePtr, scale, x, z, sx, sz, y);
    return new Int32Array(this.m.HEAP32.buffer.slice(this.cachePtr, this.cachePtr + sx * sz * 4));
  }

  getSpawn(g: number): { x: number; z: number } {
    const p = this.malloc(8);
    try {
      this.m._ss_get_spawn(g, p, p + 4);
      const v = this.i32(p);
      return { x: v[0], z: v[1] };
    } finally {
      this.free(p);
    }
  }

  isSlimeChunk(seed: bigint, cx: number, cz: number): boolean {
    return this.m._ss_slime_chunk(BigInt.asUintN(64, seed), cx, cz) !== 0;
  }

  /* Viable structures of a type in a block area. Returns {x,z}[] */
  getStructures(g: number, stype: number, bx: number, bz: number, bw: number, bh: number): { x: number; z: number }[] {
    const max = 65536;
    const p = this.malloc(max * 8);
    try {
      const n = this.m._ss_get_structures(g, stype, bx, bz, bw, bh, p, max);
      const v = this.i32(p);
      const out: { x: number; z: number }[] = [];
      for (let i = 0; i < n; i++) {
        out.push({ x: v[i * 2], z: v[i * 2 + 1] });
      }
      return out;
    } finally {
      this.free(p);
    }
  }

  getMineshafts(g: number, cx: number, cz: number, cw: number, ch: number): { x: number; z: number }[] {
    const max = 65536;
    const p = this.malloc(max * 8);
    try {
      const n = this.m._ss_get_mineshafts(g, cx, cz, cw, ch, p, max);
      const v = this.i32(p);
      const out: { x: number; z: number }[] = [];
      for (let i = 0; i < n; i++) {
        out.push({ x: v[i * 2] * 16, z: v[i * 2 + 1] * 16 });
      }
      return out;
    } finally {
      this.free(p);
    }
  }

  strongholds(mc: number, seed: bigint, g: number): { x: number; z: number }[] {
    const s = this.m._ss_stronghold_new(mc, BigInt.asUintN(64, seed));
    if (!s) return [];
    const p = this.malloc(8);
    const out: { x: number; z: number }[] = [];
    try {
      const v = this.i32(p);
      for (let i = 0; i < 128; i++) {
        if (!this.m._ss_stronghold_next(s, g, p, p + 4)) break;
        out.push({ x: v[0], z: v[1] });
      }
      return out;
    } finally {
      this.m._ss_stronghold_free(s);
      this.free(p);
    }
  }

  biomeColors(): Uint8Array {
    const p = this.malloc(768);
    try {
      this.m._ss_biome_colors(p);
      return new Uint8Array(this.m.HEAPU8.slice(p, p + 768));
    } finally {
      this.free(p);
    }
  }

  biomeName(mc: number, id: number): string | null {
    const p = this.m._ss_biome_name(mc, id);
    if (!p) return null;
    return this.m.UTF8ToString(p);
  }
}

let apiPromise: Promise<SeedScout> | null = null;
export function getSeedScout(): Promise<SeedScout> {
  if (!apiPromise) apiPromise = SeedScout.init();
  return apiPromise;
}