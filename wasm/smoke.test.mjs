/* Node smoke test for the compiled cubiomes WASM module.
 * Run: node wasm/smoke.test.mjs
 */
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import assert from 'node:assert';
import {
  mtNGet,
  scalaDown,
  candidateChunkInRegion,
  BE_OCEAN_MONUMENT,
  BE_BIOME_FILTERS,
} from '../src/lib/bedrock.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const wasmDir = path.join(__dirname, '..', 'public', 'wasm');

const mod = await import(pathToFileURL(path.join(wasmDir, 'seedscout.js')).href);
const factory = mod.default;
const m = await factory({ locateFile: (p) => path.join(wasmDir, p) });

const H = m.HEAP32;

/* --- 1. version registry --- */
assert.equal(m._ss_valid_version(22), 1, 'MC_1_18 valid');
assert.equal(m.UTF8ToString(m._ss_version_str(22)), '1.18');
assert.equal(m._ss_valid_version(99), 0, 'invalid version rejected');

/* --- 2. cubiomes README vector: seed 262 -> mushroom_fields (14) at (0,0) --- */
{
  const g = m._ss_gen_new(22, 0);
  m._ss_gen_apply(g, 0, 262n);
  const biome = m._ss_get_biome_at(g, 1, 0, 63, 0);
  assert.equal(biome, 14, `seed 262 biome at (0,63,0) should be mushroom_fields(14), got ${biome}`);
  m._ss_gen_free(g);
  console.log('OK  seed 262 @ (0,63,0) = mushroom_fields (14)');
}

/* --- 3. batch genBiomes sanity (scale 4) --- */
{
  const g = m._ss_gen_new(22, 0);
  m._ss_gen_apply(g, 0, 262n);
  const needed = m._ss_min_cache_size(g, 4, 64, 64);
  assert.ok(needed >= 64 * 64, 'cache size covers output area');
  const p = m._malloc(needed * 4);
  const err = m._ss_gen_biomes(g, p, 4, 0, 0, 64, 64, 0);
  assert.equal(err, 0, 'genBiomes ok');
  let invalid = 0;
  for (let i = 0; i < 64 * 64; i++) {
    const id = H[(p >> 2) + i];
    if (id < 0) invalid++;
  }
  assert.equal(invalid, 0, 'no invalid biome ids');
  assert.ok(H[(p >> 2) + 32 * 64 + 32] >= 0);
  m._free(p);
  m._ss_gen_free(g);
  console.log('OK  batch genBiomes scale=4 produces only valid ids');
}

/* --- 4. spawn near origin --- */
{
  const g = m._ss_gen_new(22, 0);
  m._ss_gen_apply(g, 0, 262n);
  const p = m._malloc(8);
  m._ss_get_spawn(g, p, p + 4);
  const x = H[(p >> 2)], z = H[(p >> 2) + 1];
  assert.ok(Math.abs(x) < 3000 && Math.abs(z) < 3000, `spawn ${x},${z} within 3000`);
  m._free(p);
  m._ss_gen_free(g);
  console.log(`OK  spawn for seed 262 = (${x}, ${z})`);
}

/* --- 5. slime chunks: ~1 in 10 --- */
{
  const seed = 262n;
  let hits = 0;
  for (let i = 0; i < 400; i++) {
    if (m._ss_slime_chunk(seed, i, 0)) hits++;
  }
  assert.ok(hits > 20 && hits < 70, `slime hit rate ${hits}/400`);
  console.log(`OK  slime chunk rate ~${hits}/400 (expect ~40)`);
}

/* --- 6. structures: villages exist in a wide area (1.18) --- */
{
  const g = m._ss_gen_new(22, 0);
  m._ss_gen_apply(g, 0, 262n);
  const p = m._malloc(65536 * 8);
  const n = m._ss_get_structures(g, 5, -8192, -8192, 16384, 16384, p, 65536);
  m._free(p);
  m._ss_gen_free(g);
  assert.ok(n > 0, `villages in 16k area for seed 262, got ${n}`);
  console.log(`OK  ${n} viable villages near origin (1.18, seed 262)`);
}

/* --- 7. structures: 1.21 Winter Drop trial chambers --- */
{
  const g = m._ss_gen_new(28, 0);
  m._ss_gen_apply(g, 0, 262n);
  const p = m._malloc(65536 * 8);
  const n = m._ss_get_structures(g, 24, -8192, -8192, 16384, 16384, p, 65536);
  m._free(p);
  m._ss_gen_free(g);
  console.log(`OK  ${n} viable trial chambers (1.21 WD, seed 262)`);
}

/* --- 8. strongholds: 128 for 1.18+ --- */
{
  const s = m._ss_stronghold_new(22, 262n);
  assert.ok(s > 0, 'stronghold iterator created');
  const g = m._ss_gen_new(22, 0);
  m._ss_gen_apply(g, 0, 262n);
  const p = m._malloc(8);
  let count = 0;
  const v = H;
  while (m._ss_stronghold_next(s, g, p, p + 4)) {
    assert.ok(Math.abs(v[p >> 2]) < 500000, 'stronghold within 500k');
    count++;
    if (count >= 128) break; /* rings 0-5 total exactly 128 */
  }
  m._ss_stronghold_free(s);
  m._free(p);
  m._ss_gen_free(g);
  assert.equal(count, 128, `128 strongholds for 1.18, got ${count}`);
  console.log(`OK  ${count} strongholds iterated`);
}

/* --- 9. biome colors --- */
{
  const p = m._malloc(768);
  m._ss_biome_colors(p);
  const bytes = new Uint8Array(m.HEAPU8.buffer.slice(p, p + 768));
  assert.equal(bytes.length, 768);
  assert.ok(bytes[0] + bytes[1] + bytes[2] > 0, 'ocean biome has color');
  m._free(p);
  console.log('OK  biome color table loaded');
}

/* --- 10. Bedrock MT19937 matches the standard algorithm --- */
{
  const ref = (seed) => {
    const mt = new Uint32Array(624);
    mt[0] = seed >>> 0;
    for (let i = 1; i < 624; i++) {
      mt[i] = (Math.imul(0x6c078965, mt[i - 1] ^ (mt[i - 1] >>> 30)) + i) >>> 0;
    }
    let idx = 624;
    return () => {
      if (idx >= 624) {
        for (let i = 0; i < 624; i++) {
          const y = (mt[i] & 0x80000000) + (mt[(i + 1) % 624] & 0x7fffffff);
          mt[i] = (y >>> 1) ^ mt[(i + 397) % 624];
          if (y % 2 !== 0) mt[i] ^= 0x9908b0df;
        }
        idx = 0;
      }
      let y = mt[idx++];
      y ^= y >>> 11;
      y = (y ^ ((y << 7) & 0x9d2c5680)) >>> 0;
      y = (y ^ ((y << 15) & 0xefc60000)) >>> 0;
      y ^= y >>> 18;
      return y >>> 0;
    };
  };
  for (const seed of [0, 123, 0xdeadbeef, 0xffffffff]) {
    const next = ref(seed);
    const got = mtNGet(seed, 8);
    for (let i = 0; i < 8; i++) {
      assert.equal(got[i], next(), `mtNGet(${seed})[${i}]`);
    }
  }
  console.log('OK  bedrock mtNGet matches standard MT19937');
}

/* --- 11. Bedrock ocean monument placement vs in-game verified positions
 * (seeds + coordinates from MCBEStructureFinder's search results) --- */
{
  const cases = [
    [1938075687, -1144, -632],
    [2221315309, 1384, 1064],
    [2366329760, 72, -504],
  ];
  for (const [seed, bx, bz] of cases) {
    const cx = scalaDown(bx, 16);
    const cz = scalaDown(bz, 16);
    const region = {
      x: scalaDown(cx, BE_OCEAN_MONUMENT.spacing),
      z: scalaDown(cz, BE_OCEAN_MONUMENT.spacing),
    };
    const cand = candidateChunkInRegion(region, BE_OCEAN_MONUMENT, seed >>> 0);
    assert.equal(cand.x, cx, `monument chunk x for seed ${seed}`);
    assert.equal(cand.z, cz, `monument chunk z for seed ${seed}`);
  }
  console.log('OK  bedrock monument chunks match in-game verified positions');
}

/* --- 12. Bedrock monument biome gates pass at a verified position.
 * The reference positions were verified in 1.17-era worlds; 1.18+ reshuffled
 * biomes, so this validates the gate port against the 1.17 generator. --- */
{
  const g = m._ss_gen_new(21, 0); /* MC_1_17 */
  m._ss_gen_apply(g, 0, 1938075687n);
  const check = (r, filter) => {
    const x0 = Math.floor((-1144 - r) / 4);
    const z0 = Math.floor((-632 - r) / 4);
    const w = Math.floor((-1144 + r) / 4) - x0 + 1;
    const h = Math.floor((-632 + r) / 4) - z0 + 1;
    const needed = m._ss_min_cache_size(g, 4, w, h);
    const p = m._malloc(needed * 4);
    m._ss_gen_biomes(g, p, 4, x0, z0, w, h, 15);
    let ok = true;
    for (let i = 0; i < w * h && ok; i++) {
      if (!filter.includes(H[(p >> 2) + i])) ok = false;
    }
    m._free(p);
    return ok;
  };
  assert.ok(check(16, BE_BIOME_FILTERS.monumentSpawn), 'monument spawn-biome gate passes');
  assert.ok(check(29, BE_BIOME_FILTERS.monument), 'monument biome gate passes');
  m._ss_gen_free(g);
  console.log('OK  bedrock monument biome gates pass at verified position');
}

console.log('\nAll smoke tests passed.');