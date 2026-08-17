/// <reference lib="webworker" />
import { SeedScout } from './lib/wasm';
import {
  BE_BIOME_FILTERS,
  BE_BURIED_TREASURE,
  BE_END_CITY,
  BE_NETHER,
  BE_OCEAN_MONUMENT,
  BE_OCEAN_RUIN,
  BE_PILLAGER_OUTPOST,
  BE_RANDOM_SCATTERED,
  BE_RUIN_PORTAL_OW,
  BE_SHIPWRECK,
  BE_VILLAGE,
  BE_WOODLAND_MANSION,
  bedrockNetherAtRegion,
  bedrockStrongholds,
  candidateChunkInRegion,
  isBedrockMineshaftChunk,
  scalaDown,
  type BEConfig,
} from './lib/bedrock';

export interface InitMsg {
  kind: 'init';
  mc: number;
  seed: string;
  dim: number;
  platform: 'java' | 'bedrock';
  requestId: number;
}
export interface BiomesMsg {
  kind: 'biomes';
  tileId: string;
  scale: number;
  x: number;
  z: number;
  sx: number;
  sz: number;
  y: number;
}
export interface StructuresMsg {
  kind: 'structures';
  area: { x: number; z: number; w: number; h: number };
  types: number[]; /* cubiomes structure types */
  withMineshafts: boolean;
  requestId: number;
}
export interface SlimeMsg {
  kind: 'slime';
  cx: number;
  cz: number;
  cw: number;
  ch: number;
  requestId: number;
}

export type WorkerMsg = InitMsg | BiomesMsg | StructuresMsg | SlimeMsg;

export interface TileResult {
  kind: 'tiles';
  tileId: string;
  data: ArrayBuffer; /* RGBA, sx*sz*4 */
  ids: ArrayBuffer; /* Int32 biome ids, sx*sz */
}
export interface StructuresResult {
  kind: 'structures';
  requestId: number;
  list: { type: number; x: number; z: number; approx: boolean }[];
}
export interface SlimeResult {
  kind: 'slime';
  requestId: number;
  cx: number;
  cz: number;
  cw: number;
  ch: number;
  grid: Uint8Array;
}
export interface InitResult {
  kind: 'init';
  requestId: number;
  ok: boolean;
  error?: string;
  spawn?: { x: number; z: number };
  colors?: Uint8Array;
  strongholds?: { x: number; z: number }[];
  versionLabel?: string;
}

export type WorkerResult = TileResult | StructuresResult | SlimeResult | InitResult;

let api: SeedScout | null = null;
let gen: number | null = null;
let mc = 0;
let dim = 0;
let platform: 'java' | 'bedrock' = 'java';
let seed32 = 0;

self.onmessage = async (e: MessageEvent<WorkerMsg>) => {
  const msg = e.data;
  try {
    if (msg.kind === 'init') {
      await initGen(msg);
      return;
    }
    if (!gen) return;
    if (msg.kind === 'biomes') {
      const ids = api!.genBiomes(gen, msg.scale, msg.x, msg.z, msg.sx, msg.sz, msg.y);
      postTile(msg.tileId, ids, msg.sx, msg.sz);
      return;
    }
    if (msg.kind === 'structures') {
      const list: StructuresResult['list'] =
        platform === 'bedrock' ? bedrockStructures(msg) : javaStructures(msg);
      const res: StructuresResult = { kind: 'structures', requestId: msg.requestId, list };
      self.postMessage(res);
      return;
    }
    if (msg.kind === 'slime') {
      const grid = new Uint8Array(msg.cw * msg.ch);
      const seed = BigInt(seedStr);
      for (let z = 0; z < msg.ch; z++) {
        for (let x = 0; x < msg.cw; x++) {
          grid[z * msg.cw + x] = api!.isSlimeChunk(seed, msg.cx + x, msg.cz + z) ? 1 : 0;
        }
      }
      const res: SlimeResult = { kind: 'slime', requestId: msg.requestId, cx: msg.cx, cz: msg.cz, cw: msg.cw, ch: msg.ch, grid };
      self.postMessage(res, [grid.buffer as ArrayBuffer]);
      return;
    }
  } catch (err) {
    self.postMessage({ kind: 'error', error: String(err) } as any);
  }
};

let seedStr = '0';

function javaStructures(msg: StructuresMsg): StructuresResult['list'] {
  const list: StructuresResult['list'] = [];
  const g = gen!;
  for (const t of msg.types) {
    const pos = api!.getStructures(g, t, msg.area.x, msg.area.z, msg.area.w, msg.area.h);
    for (const p of pos) list.push({ type: t, x: p.x, z: p.z, approx: false });
  }
  if (msg.withMineshafts) {
    const cx = Math.floor(msg.area.x / 16);
    const cz = Math.floor(msg.area.z / 16);
    const cw = Math.ceil(msg.area.w / 16) + 1;
    const ch = Math.ceil(msg.area.h / 16) + 1;
    const m = api!.getMineshafts(g, cx, cz, cw, ch);
    for (const p of m) list.push({ type: 15, x: p.x, z: p.z, approx: true });
  }
  return list;
}

/* Overworld Bedrock structures: region rule + optional biome validation. */
const BE_OVERWORLD: Record<number, { cfg: BEConfig; filter?: number[]; r?: number; double?: { filter: number[]; r: number } }> = {
  1: { cfg: BE_RANDOM_SCATTERED, filter: BE_BIOME_FILTERS.desertTemple, r: 0 },
  2: { cfg: BE_RANDOM_SCATTERED, filter: BE_BIOME_FILTERS.jungleTemple, r: 0 },
  3: { cfg: BE_RANDOM_SCATTERED, filter: BE_BIOME_FILTERS.witchHut, r: 0 },
  4: { cfg: BE_RANDOM_SCATTERED, filter: BE_BIOME_FILTERS.igloo, r: 0 },
  5: { cfg: BE_VILLAGE, filter: BE_BIOME_FILTERS.village, r: 2 },
  6: { cfg: BE_OCEAN_RUIN },
  7: { cfg: BE_SHIPWRECK },
  8: { cfg: BE_OCEAN_MONUMENT, double: { filter: BE_BIOME_FILTERS.monumentSpawn, r: 16 }, filter: BE_BIOME_FILTERS.monument, r: 29 },
  9: { cfg: BE_WOODLAND_MANSION, filter: BE_BIOME_FILTERS.mansion, r: 32 },
  10: { cfg: BE_PILLAGER_OUTPOST, filter: BE_BIOME_FILTERS.outpost, r: 0 },
  11: { cfg: BE_RUIN_PORTAL_OW },
  14: { cfg: BE_BURIED_TREASURE, filter: BE_BIOME_FILTERS.buriedTreasure, r: 3 },
  20: { cfg: BE_END_CITY },
};

function regionsCovering(area: { x: number; z: number; w: number; h: number }, spacing: number) {
  const cx0 = scalaDown(area.x, 16);
  const cz0 = scalaDown(area.z, 16);
  const cx1 = scalaDown(area.x + area.w - 1, 16);
  const cz1 = scalaDown(area.z + area.h - 1, 16);
  return {
    x0: scalaDown(cx0, spacing),
    x1: scalaDown(cx1, spacing),
    z0: scalaDown(cz0, spacing),
    z1: scalaDown(cz1, spacing),
  };
}

function biomeAreaValid(px: number, pz: number, r: number, filter: number[]): boolean {
  const x0 = Math.floor((px - r) / 4);
  const z0 = Math.floor((pz - r) / 4);
  const w = Math.floor((px + r) / 4) - x0 + 1;
  const h = Math.floor((pz + r) / 4) - z0 + 1;
  const ids = api!.genBiomes(gen!, 4, x0, z0, w, h, 15);
  for (let i = 0; i < ids.length; i++) {
    if (!filter.includes(ids[i])) return false;
  }
  return true;
}

function bedrockStructures(msg: StructuresMsg): StructuresResult['list'] {
  const list: StructuresResult['list'] = [];
  const area = msg.area;
  for (const t of msg.types) {
    if (t === 18 || t === 19) {
      const { x0, x1, z0, z1 } = regionsCovering(area, BE_NETHER.spacing);
      for (let rz = z0; rz <= z1; rz++) {
        for (let rx = x0; rx <= x1; rx++) {
          const { chunk, type } = bedrockNetherAtRegion({ x: rx, z: rz }, seed32);
          if (type !== (t === 18 ? 'fortress' : 'bastion')) continue;
          const bx = chunk.x * 16 + 8;
          const bz = chunk.z * 16 + 8;
          if (bx >= area.x && bx < area.x + area.w && bz >= area.z && bz < area.z + area.h) {
            list.push({ type: t, x: bx, z: bz, approx: false });
          }
        }
      }
      continue;
    }
    const spec = BE_OVERWORLD[t];
    if (!spec) continue;
    const { x0, x1, z0, z1 } = regionsCovering(area, spec.cfg.spacing);
    for (let rz = z0; rz <= z1; rz++) {
      for (let rx = x0; rx <= x1; rx++) {
        const c = candidateChunkInRegion({ x: rx, z: rz }, spec.cfg, seed32);
        const bx = c.x * 16 + 8;
        const bz = c.z * 16 + 8;
        if (bx < area.x || bx >= area.x + area.w || bz < area.z || bz >= area.z + area.h) continue;
        if (spec.double && !biomeAreaValid(bx, bz, spec.double.r, spec.double.filter)) continue;
        if (spec.filter && !biomeAreaValid(bx, bz, spec.r!, spec.filter)) continue;
        list.push({ type: t, x: bx, z: bz, approx: false });
      }
    }
  }
  if (msg.withMineshafts) {
    const cx0 = Math.floor(area.x / 16);
    const cz0 = Math.floor(area.z / 16);
    const cx1 = Math.floor((area.x + area.w - 1) / 16);
    const cz1 = Math.floor((area.z + area.h - 1) / 16);
    for (let cz = cz0; cz <= cz1; cz++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        if (isBedrockMineshaftChunk(cx, cz)) {
          list.push({ type: 15, x: cx * 16 + 8, z: cz * 16 + 8, approx: true });
        }
      }
    }
  }
  return list;
}

async function initGen(msg: InitMsg): Promise<void> {
  if (!api) api = await SeedScout.init();
  if (gen) api.genFree(gen);
  seedStr = msg.seed;
  mc = msg.mc;
  dim = msg.dim;
  platform = msg.platform;
  seed32 = Number(BigInt(msg.seed) & 0xffffffffn);
  gen = api.genNew(mc, 0);
  api.genApply(gen, dim, BigInt(msg.seed));
  const colors = api.biomeColors();
  colorTable = [];
  for (let i = 0; i < 256; i++) {
    colorTable.push([colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2]]);
  }
  let spawn: { x: number; z: number } | undefined;
  let strongholds: { x: number; z: number }[] = [];
  if (dim === 0) {
    spawn = api.getSpawn(gen);
    if (platform === 'bedrock') {
      strongholds = bedrockStrongholds(seed32);
    } else if (mc >= 10) {
      strongholds = api.strongholds(mc, BigInt(msg.seed), gen);
    }
  }
  const versionLabel = api.versionStr(mc) ?? '';
  const res: InitResult = {
    kind: 'init',
    requestId: msg.requestId,
    ok: true,
    spawn,
    colors,
    strongholds,
    versionLabel,
  };
  self.postMessage(res, [colors.buffer as ArrayBuffer]);
}

function postTile(tileId: string, ids: Int32Array, sx: number, sz: number): void {
  const rgba = new Uint8Array(sx * sz * 4);
  const colors = colorTable;
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const c = id >= 0 && id < colors.length ? colors[id] : [0, 0, 0];
    rgba[i * 4] = c[0];
    rgba[i * 4 + 1] = c[1];
    rgba[i * 4 + 2] = c[2];
    rgba[i * 4 + 3] = 255;
  }
  const res: TileResult = {
    kind: 'tiles',
    tileId,
    data: rgba.buffer as ArrayBuffer,
    ids: ids.buffer.slice(ids.byteOffset, ids.byteOffset + ids.byteLength) as ArrayBuffer,
  };
  self.postMessage(res, [res.data, res.ids]);
}

let colorTable: number[][] = [];