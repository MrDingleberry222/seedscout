import type { WorkerMsg, WorkerResult } from '../worker';
import type { Dimension } from './structures';

export interface StructureMarker {
  type: number;
  x: number;
  z: number;
  approx: boolean;
}

const TILE = 256;

export class Session {
  readonly key: string;
  readonly mc: number;
  readonly seed: bigint;
  readonly dim: Dimension;

  private worker: Worker;
  private requestSeq = 0;
  private tiles = new Map<string, ImageBitmap>();
  private biomeTiles = new Map<string, Int32Array>();
  private tileQueue: string[] = [];
  private tileCallbacks = new Map<string, () => void>();
  private structuresCache = new Map<string, StructureMarker[]>();
  private pendingStructures: { area: { x: number; z: number; w: number; h: number }; cb: (m: StructureMarker[]) => void }[] = [];
  private slimeCache = new Map<string, Uint8Array>();

  spawn: { x: number; z: number } | null = null;
  strongholds: { x: number; z: number }[] = [];
  colors: Uint8Array | null = null;

  private constructor(key: string, mc: number, seed: bigint, dim: Dimension) {
    this.key = key;
    this.mc = mc;
    this.seed = seed;
    this.dim = dim;
    this.worker = new Worker(new URL('../worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (e: MessageEvent<WorkerResult>) => this.handle(e.data);
  }

  static async create(mc: number, seed: bigint, dim: Dimension, platform: 'java' | 'bedrock' = 'java'): Promise<Session> {
    const dimNum = dim === 'nether' ? -1 : dim === 'end' ? 1 : 0;
    const key = `${seed.toString()}:${mc}:${dimNum}:${platform}`;
    const s = new Session(key, mc, seed, dim);
    const handle = s.handle.bind(s);
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('WASM init timed out')), 30000);
      s.worker.onmessage = (e: MessageEvent<WorkerResult>) => {
        if (e.data.kind === 'init') {
          clearTimeout(t);
          s.worker.onmessage = (ev: MessageEvent<WorkerResult>) => handle(ev.data);
          if (e.data.ok) {
            s.spawn = e.data.spawn ?? null;
            s.strongholds = e.data.strongholds ?? [];
            s.colors = e.data.colors ?? null;
            resolve();
          } else {
            reject(new Error(e.data.error ?? 'init failed'));
          }
        }
      };
      const msg: WorkerMsg = { kind: 'init', mc, seed: seed.toString(), dim: dimNum, platform, requestId: s.requestSeq++ };
      s.worker.postMessage(msg);
    });
    return s;
  }

  private handle(msg: WorkerResult): void {
    switch (msg.kind) {
      case 'tiles': {
        const key = msg.tileId;
        if (this.tiles.has(key)) return;
        this.biomeTiles.set(key, new Int32Array(msg.ids));
        createImageBitmap(new ImageData(new Uint8ClampedArray(msg.data), 256, 256)).then((bmp) => {
          this.tiles.set(key, bmp);
          const cb = this.tileCallbacks.get(key);
          this.tileCallbacks.delete(key);
          this.tileQueue = this.tileQueue.filter((t) => t !== key);
          cb?.();
        });
        break;
      }
      case 'structures': {
        const req = this.pendingStructures.shift();
        if (req) req.cb(msg.list);
        break;
      }
      case 'slime': {
        const key = `${msg.cx}:${msg.cz}:${msg.cw}:${msg.ch}`;
        this.slimeCache.set(key, msg.grid);
        break;
      }
    }
  }

  /* ---- tiles ---- */

  requestTile(scale: number, x: number, z: number, y: number, cb?: () => void): boolean {
    const key = `${scale}:${x}:${z}:${y}`;
    if (this.tiles.has(key)) return false;
    if (this.tileCallbacks.has(key)) return false;
    if (cb) this.tileCallbacks.set(key, cb);
    this.tileQueue.push(key);
    this.flushTiles();
    return true;
  }

  private flushing = false;
  private flushTiles(): void {
    if (this.flushing) return;
    this.flushing = true;
    while (this.tileQueue.length > 0) {
      const key = this.tileQueue.shift()!;
      const [scale, x, z, y] = key.split(':').map(Number);
      const msg: WorkerMsg = {
        kind: 'biomes',
        tileId: key,
        scale,
        x,
        z,
        sx: TILE,
        sz: TILE,
        y,
      };
      this.worker.postMessage(msg);
    }
    this.flushing = false;
  }

  hasTile(scale: number, x: number, z: number, y: number): boolean {
    return this.tiles.has(`${scale}:${x}:${z}:${y}`);
  }

  getTile(scale: number, x: number, z: number, y: number): ImageBitmap | undefined {
    return this.tiles.get(`${scale}:${x}:${z}:${y}`);
  }

  biomeTileData(scale: number, x: number, z: number, y: number): Int32Array | undefined {
    return this.biomeTiles.get(`${scale}:${x}:${z}:${y}`);
  }

  /* ---- structures ---- */

  requestStructures(area: { x: number; z: number; w: number; h: number }, types: number[], withMineshafts: boolean, cb: (m: StructureMarker[]) => void): void {
    const cacheKey = `${area.x}:${area.z}:${area.w}:${area.h}`;
    const cached = this.structuresCache.get(cacheKey);
    if (cached) {
      cb(cached);
      return;
    }
    const reqId = this.requestSeq++;
    this.pendingStructures.push({ area, cb: (list) => {
      this.structuresCache.set(cacheKey, list);
      cb(list);
    } });
    const msg: WorkerMsg = { kind: 'structures', area, types, withMineshafts, requestId: reqId };
    this.worker.postMessage(msg);
  }

  /* ---- slime ---- */

  requestSlime(cx: number, cz: number, cw: number, ch: number): void {
    const key = `${cx}:${cz}:${cw}:${ch}`;
    if (this.slimeCache.has(key)) return;
    const msg: WorkerMsg = { kind: 'slime', cx, cz, cw, ch, requestId: this.requestSeq++ };
    this.worker.postMessage(msg);
  }

  slimeGrid(cx: number, cz: number, cw: number, ch: number): Uint8Array | undefined {
    return this.slimeCache.get(`${cx}:${cz}:${cw}:${ch}`);
  }

  destroy(): void {
    this.worker.terminate();
  }
}