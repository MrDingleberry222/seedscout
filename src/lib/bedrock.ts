/* Bedrock Edition structure placement, ported from MCBEStructureFinder (MIT).
 * Bedrock uses the lower 32 bits of the world seed for structure placement;
 * position viability additionally checks biomes (Java seed parity, 1.18+).
 * Reference: https://github.com/bedrock-dev/MCBEStructureFinder */

export interface Vec2 {
  x: number;
  z: number;
}

export interface BEConfig {
  spacing: number; /* region size in chunks */
  spawnRange: number; /* max candidate offset in chunks */
  salt: number;
  num: number; /* MT19937 outputs consumed (2 or 4) */
}

export const BE_RANDOM_SCATTERED: BEConfig = { spacing: 32, spawnRange: 24, salt: 14357617, num: 2 };
export const BE_BURIED_TREASURE: BEConfig = { spacing: 4, spawnRange: 2, salt: 16842397, num: 4 };
export const BE_PILLAGER_OUTPOST: BEConfig = { spacing: 80, spawnRange: 56, salt: 165745296, num: 4 };
export const BE_VILLAGE: BEConfig = { spacing: 27, spawnRange: 17, salt: 10387312, num: 4 };
export const BE_WOODLAND_MANSION: BEConfig = { spacing: 80, spawnRange: 60, salt: 10387319, num: 4 };
export const BE_END_CITY: BEConfig = { spacing: 20, spawnRange: 9, salt: 10387313, num: 4 };
export const BE_OCEAN_MONUMENT: BEConfig = { spacing: 32, spawnRange: 27, salt: 10387313, num: 4 };
export const BE_NETHER: BEConfig = { spacing: 30, spawnRange: 26, salt: 430084232, num: 4 };
export const BE_SHIPWRECK: BEConfig = { spacing: 10, spawnRange: 5, salt: 1, num: 4 };
export const BE_OCEAN_RUIN: BEConfig = { spacing: 12, spawnRange: 5, salt: 14357621, num: 4 };
export const BE_RUIN_PORTAL_OW: BEConfig = { spacing: 40, spawnRange: 25, salt: 40552231, num: 4 };

/* Bedrock's MT19937: seeded like standard init_genrand (0x6c078965 = 1812433253),
 * but only the first n outputs are produced. */
export function mtNGet(seed: number, n: number): Uint32Array {
  seed >>>= 0;
  const head = new Uint32Array(n + 1);
  const last = new Uint32Array(n + 1);
  const out = new Uint32Array(n);
  head[0] = seed;
  for (let i = 1; i <= n; i++) {
    head[i] = (Math.imul(0x6c078965, head[i - 1] ^ (head[i - 1] >>> 30)) + i) >>> 0;
  }
  let t = head[n];
  for (let i = n; i < 397; i++) {
    t = (Math.imul(0x6c078965, t ^ (t >>> 30)) + (i + 1)) >>> 0;
  }
  last[0] = t;
  for (let i = 1; i <= n; i++) {
    last[i] = (Math.imul(0x6c078965, last[i - 1] ^ (last[i - 1] >>> 30)) + (i + 397)) >>> 0;
  }
  for (let i = 0; i < n; i++) {
    const y = (head[i] & 0x80000000) + (head[i + 1] & 0x7fffffff);
    head[i] = (y >>> 1) ^ last[i];
    if (y % 2 !== 0) head[i] ^= 0x9908b0df;
  }
  for (let i = 0; i < n; i++) {
    let y = head[i];
    y ^= y >>> 11;
    y = (y ^ ((y << 7) & 0x9d2c5680)) >>> 0;
    y = (y ^ ((y << 15) & 0xefc60000)) >>> 0;
    y ^= y >>> 18;
    out[i] = y >>> 0;
  }
  return out;
}

export function int2Float(x: number): number {
  return Math.fround(x * 2.328306436538696e-10);
}

/* floor-divide into s-sized buckets, truncating like C++ (for negatives too). */
export function scalaDown(v: number, s: number): number {
  const q = v < 0 ? v + 1 - s : v;
  return Math.trunc(q / s);
}

export function calCandidateSeed(p: Vec2, salt: number): number {
  return (salt - Math.imul(245998635, p.z) - Math.imul(1724254968, p.x)) >>> 0;
}

/* smallest number >= begin that is congruent to remain (mod modulo). */
export function getCongWithModule(begin: number, modulo: number, remain: number): number {
  let r = begin - (begin % modulo);
  if (begin > 0) r += modulo;
  const c1 = r + remain;
  return begin <= c1 && c1 <= begin + modulo ? c1 : c1 - modulo;
}

export function candidateChunkInRegion(region: Vec2, cfg: BEConfig, seed32: number): Vec2 {
  const areaSeed = (calCandidateSeed(region, cfg.salt) + seed32) >>> 0;
  const mt = mtNGet(areaSeed, cfg.num);
  const r1 = mt[0] % cfg.spawnRange;
  const r2 = mt[1] % cfg.spawnRange;
  let avgX: number;
  let avgZ: number;
  if (cfg.num === 2) {
    avgX = r1;
    avgZ = r2;
  } else {
    const r3 = mt[2] % cfg.spawnRange;
    const r4 = mt[3] % cfg.spawnRange;
    avgX = Math.trunc(((r1 + r2) >>> 0) / 2);
    avgZ = Math.trunc(((r3 + r4) >>> 0) / 2);
  }
  const bx = region.x * cfg.spacing;
  const bz = region.z * cfg.spacing;
  return {
    x: getCongWithModule(bx, cfg.spacing, avgX),
    z: getCongWithModule(bz, cfg.spacing, avgZ),
  };
}

/* Nether fortress / bastion share a region rule (1.16+). */
export function bedrockNetherAtRegion(
  region: Vec2,
  seed32: number,
): { chunk: Vec2; type: 'fortress' | 'bastion' } {
  const areaSeed = (calCandidateSeed(region, BE_NETHER.salt) + seed32) >>> 0;
  const mt = mtNGet(areaSeed, 3);
  return {
    chunk: {
      x: region.x * BE_NETHER.spacing + (mt[0] % BE_NETHER.spawnRange),
      z: region.z * BE_NETHER.spacing + (mt[1] % BE_NETHER.spawnRange),
    },
    type: mt[2] % 6 >= 2 ? 'bastion' : 'fortress',
  };
}

/* Bedrock has exactly 3 strongholds (ring rule, no biome check). */
export function bedrockStrongholds(seed32: number): Vec2[] {
  const mt = mtNGet(seed32, 2);
  let angle = 6.2831855 * int2Float(mt[0]);
  let dist = (mt[1] % 16) + 40;
  const out: Vec2[] = [];
  for (let i = 0; i < 3; i++) {
    const cx = Math.floor(Math.cos(angle) * dist);
    const cz = Math.floor(Math.sin(angle) * dist);
    out.push({ x: (cx - 8) * 16, z: (cz - 8) * 16 });
    angle += 1.8849558;
    dist += 8;
  }
  return out;
}

/* Chunk-independent part of the mineshaft check (reference passes seed 0). */
const MINESHAFT_MT = mtNGet(0, 2);

export function isBedrockMineshaftChunk(cx: number, cz: number): boolean {
  const chunkSeed = (Math.imul(MINESHAFT_MT[1], cz) ^ Math.imul(MINESHAFT_MT[0], cx)) >>> 0;
  const mt2 = mtNGet(chunkSeed, 3);
  if (int2Float(mt2[1]) >= 0.004) return false;
  return mt2[2] % 80 < Math.max(Math.abs(cx), Math.abs(cz));
}

/* Biome filters use cubiomes BiomeID values, stable from 1.17 to 1.21+. */
export const BE_BIOME_FILTERS: Record<string, number[]> = {
  village: [1, 35, 12, 5, 19, 30, 31, 2], /* plains, savanna, icePlains, taiga, taiga_hills, coldTaiga, coldTaigaHills, desert */
  monumentSpawn: [24, 49, 47, 50, 48], /* deep_ocean, deep_cold_ocean, deep_warm_ocean, deep_frozen_ocean, deep_lukewarm_ocean */
  monument: [0, 24, 45, 46, 10, 44, 48, 47, 50, 49, 7, 11], /* oceans + river/frozen_river */
  desertTemple: [2, 17, 130],
  jungleTemple: [21, 22],
  witchHut: [6],
  igloo: [12, 30],
  buriedTreasure: [16, 26, 25, 15], /* beach, coldBeach, stone_shore, mushroom_field_shore */
  mansion: [29],
  outpost: [1, 129, 35, 12, 19, 5, 30, 31, 2],
};