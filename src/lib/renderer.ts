import { Session } from './session';
import { STRUCTURE_TYPES } from './structures';
import { iconDataUrl } from '../icons';
import { biomeName } from './biomes';

export interface ViewState {
  x: number;
  z: number;
  zoom: number; /* 0..4 -> 4,8,16,32,64 blocks per pixel */
}

export interface MarkerHit {
  key: string;
  x: number;
  z: number;
  approx: boolean;
}

const TILE = 256;
const TILE_SCALE = 4;
const MAX_ZOOM = 4;
const MIN_ZOOM = 0;

/* structure keys always shown even when zoomed far out */
const MAJOR_KEYS = new Set(['village', 'stronghold', 'monument', 'mansion', 'fortress', 'bastion', 'end_city']);

const typeToKey = new Map<number, string>();
for (const [k, v] of Object.entries(STRUCTURE_TYPES)) {
  if (v.cubiomesType >= 0) typeToKey.set(v.cubiomesType, k);
}

export class MapRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private session: Session | null = null;
  dpr = 1;
  private raf = 0;
  private markers: { key: string; x: number; z: number; approx: boolean }[] = [];
  private iconCache = new Map<string, HTMLImageElement>();
  private markersArea = '';
  private structuresTimer = 0;

  view: ViewState = { x: 0, z: 0, zoom: 0 };
  onCursor: ((x: number, z: number, biome: string | null) => void) | null = null;
  onMarkersUpdated: (() => void) | null = null;
  showSlime = false;
  showSpawn = true;
  layers: Record<string, boolean> = {};
  underground = false;
  yLevel = 0;
  mc = 0;
  redrawPending = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  attach(session: Session): void {
    this.session = session;
    this.markers = [];
    this.scheduleRedraw();
  }

  setView(v: Partial<ViewState>): void {
    const next = { ...this.view, ...v };
    next.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next.zoom));
    this.view = next;
    this.scheduleRedraw();
  }

  resize(w: number, h: number): void {
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.scheduleRedraw();
  }

  get bpp(): number {
    return this.underground ? 2 ** this.view.zoom : 4 * 2 ** this.view.zoom;
  }

  worldToScreen(x: number, z: number): { x: number; y: number } {
    const bpp = this.bpp;
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;
    return {
      x: w / 2 + (x - this.view.x) / bpp,
      y: h / 2 + (z - this.view.z) / bpp,
    };
  }

  screenToWorld(px: number, py: number): { x: number; z: number } {
    const bpp = this.bpp;
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;
    return {
      x: this.view.x + (px - w / 2) * bpp,
      z: this.view.z + (py - h / 2) * bpp,
    };
  }

  scheduleRedraw(): void {
    if (this.redrawPending) return;
    this.redrawPending = true;
    this.raf = requestAnimationFrame(() => {
      this.redrawPending = false;
      this.draw();
    });
  }

  private requestVisibleTiles(): void {
    const s = this.session;
    if (!s) return;
    const bpp = this.bpp;
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;
    const scale = this.underground ? 1 : TILE_SCALE;
    const tb = TILE * scale;
    const x0 = Math.floor((this.view.x - (w / 2) * bpp) / tb);
    const x1 = Math.floor((this.view.x + (w / 2) * bpp) / tb);
    const z0 = Math.floor((this.view.z - (h / 2) * bpp) / tb);
    const z1 = Math.floor((this.view.z + (h / 2) * bpp) / tb);
    const y = this.underground ? this.yLevel : 0;
    for (let tz = z0; tz <= z1; tz++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (s.hasTile(scale, tx * tb, tz * tb, y)) continue;
        s.requestTile(scale, tx * tb, tz * tb, y, () => this.scheduleRedraw());
      }
    }
  }

  private requestStructures(): void {
    const s = this.session;
    if (!s) return;
    const bpp = this.bpp;
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;
    const margin = 1024;
    const area = {
      x: Math.floor(this.view.x - (w / 2) * bpp - margin),
      z: Math.floor(this.view.z - (h / 2) * bpp - margin),
      w: Math.ceil(w * bpp + 2 * margin),
      h: Math.ceil(h * bpp + 2 * margin),
    };
    const key = `${area.x}:${area.z}:${area.w}:${area.h}`;
    if (key === this.markersArea) return;
    this.markersArea = key;
    const types: number[] = [];
    for (const [k, v] of Object.entries(STRUCTURE_TYPES)) {
      if (v.cubiomesType >= 0 && this.layers[k]) types.push(v.cubiomesType);
    }
    const withMineshafts = !!this.layers['mineshaft'];
    s.requestStructures(area, types, withMineshafts, (list) => {
      this.markers = list
        .map((m) => ({ key: typeToKey.get(m.type) ?? 'mineshaft', x: m.x, z: m.z, approx: m.approx }))
        .filter((m) => this.layers[m.key]);
      if (this.layers['stronghold']) {
        for (const p of s.strongholds) this.markers.push({ key: 'stronghold', x: p.x, z: p.z, approx: true });
      }
      this.scheduleRedraw();
      this.onMarkersUpdated?.();
    });
  }

  private requestSlime(): void {
    const s = this.session;
    if (!s) return;
    const bpp = this.bpp;
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;
    const cw = Math.ceil(w * bpp / 16) + 2;
    const ch = Math.ceil(h * bpp / 16) + 2;
    const cx = Math.floor((this.view.x - (w / 2) * bpp) / 16) - 1;
    const cz = Math.floor((this.view.z - (h / 2) * bpp) / 16) - 1;
    s.requestSlime(cx, cz, cw, ch);
  }

  draw(): void {
    const ctx = this.ctx;
    const s = this.session;
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, w, h);

    if (!s) return;

    this.requestVisibleTiles();
    if (this.showSlime && this.bpp <= 8) this.requestSlime();
    if (this.bpp <= 16) this.requestStructures();

    const bpp = this.bpp;
    const scale = this.underground ? 1 : TILE_SCALE;
    const tb = TILE * scale;
    const y = this.underground ? this.yLevel : 0;
    const x0 = Math.floor((this.view.x - (w / 2) * bpp) / tb);
    const x1 = Math.floor((this.view.x + (w / 2) * bpp) / tb);
    const z0 = Math.floor((this.view.z - (h / 2) * bpp) / tb);
    const z1 = Math.floor((this.view.z + (h / 2) * bpp) / tb);

    for (let tz = z0; tz <= z1; tz++) {
      for (let tx = x0; tx <= x1; tx++) {
        const img = s.getTile(scale, tx * tb, tz * tb, y);
        if (!img) continue;
        const sx = w / 2 + (tx * tb - this.view.x) / bpp;
        const sy = h / 2 + (tz * tb - this.view.z) / bpp;
        const size = (TILE * scale) / bpp;
        const off = size / 2;
        ctx.drawImage(img, sx - off, sy - off, size, size);
      }
    }

    if (this.showSlime && this.bpp <= 8) this.drawSlime(ctx, w, h);
    if (this.bpp <= 16) this.drawMarkers(ctx, w, h, bpp);
    if (this.showSpawn && s.spawn) this.drawSpawn(ctx, s.spawn);
  }

  private drawSlime(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const s = this.session!;
    const bpp = this.bpp;
    const cw = Math.ceil(w * bpp / 16) + 2;
    const ch = Math.ceil(h * bpp / 16) + 2;
    const cx = Math.floor((this.view.x - (w / 2) * bpp) / 16) - 1;
    const cz = Math.floor((this.view.z - (h / 2) * bpp) / 16) - 1;
    const grid = s.slimeGrid(cx, cz, cw, ch);
    if (!grid) return;
    const px = (16 / bpp);
    ctx.fillStyle = 'rgba(90, 220, 120, 0.35)';
    for (let z = 0; z < ch; z++) {
      for (let x = 0; x < cw; x++) {
        if (!grid[z * cw + x]) continue;
        const sx = w / 2 + ((cx + x) * 16 - this.view.x) / bpp;
        const sy = h / 2 + ((cz + z) * 16 - this.view.z) / bpp;
        ctx.fillRect(sx, sy, px + 0.5, px + 0.5);
      }
    }
    ctx.strokeStyle = 'rgba(90, 220, 120, 0.6)';
    ctx.lineWidth = 1;
    ctx.strokeRect(w / 2 - 8 * px + 0.5, h / 2 - 8 * px + 0.5, 16 * px, 16 * px);
  }

  private getIcon(key: string): HTMLImageElement | null {
    const def = STRUCTURE_TYPES[key];
    if (!def) return null;
    let img = this.iconCache.get(key);
    if (!img) {
      img = new Image();
      img.src = iconDataUrl(key, def.color);
      this.iconCache.set(key, img);
    }
    return img;
  }

  private drawMarkers(ctx: CanvasRenderingContext2D, w: number, h: number, bpp: number): void {
    const far = bpp > 8;
    const size = far ? 22 : 26;
    for (const m of this.markers) {
      if (far && !MAJOR_KEYS.has(m.key)) continue;
      const p = this.worldToScreen(m.x, m.z);
      if (p.x < -40 || p.x > w + 40 || p.y < -40 || p.y > h + 40) continue;
      const img = this.getIcon(m.key);
      if (!img || !img.complete || img.naturalWidth === 0) continue;
      ctx.fillStyle = 'rgba(10,14,20,0.55)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, size / 2 + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.drawImage(img, p.x - size / 2, p.y - size / 2, size, size);
    }
  }

  private drawSpawn(ctx: CanvasRenderingContext2D, spawn: { x: number; z: number }): void {
    const p = this.worldToScreen(spawn.x, spawn.z);
    const size = 22;
    const img = this.getIcon('spawn');
    if (!img || !img.complete || img.naturalWidth === 0) return;
    ctx.fillStyle = 'rgba(10,14,20,0.55)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, size / 2 + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(img, p.x - size / 2, p.y - size / 2, size, size);
  }

  hitTest(px: number, py: number): MarkerHit | null {
    let best: MarkerHit | null = null;
    let bestDist = 14;
    for (const m of this.markers) {
      const p = this.worldToScreen(m.x, m.z);
      const d = Math.hypot(p.x - px, p.y - py);
      if (d < bestDist) {
        bestDist = d;
        best = m;
      }
    }
    if (best) return best;
    if (this.session?.spawn) {
      const p = this.worldToScreen(this.session.spawn.x, this.session.spawn.z);
      if (Math.hypot(p.x - px, p.y - py) < bestDist) {
        return { key: 'spawn', x: this.session.spawn.x, z: this.session.spawn.z, approx: false };
      }
    }
    return null;
  }

  cursorAt(px: number, py: number): void {
    if (!this.onCursor) return;
    const { x, z } = this.screenToWorld(px, py);
    const s = this.session;
    let biome: string | null = null;
    if (s) {
      const id = this.bpp > 16 ? -1 : (this.sampleBiome(x, z));
      biome = id >= 0 ? biomeName(id) : null;
    }
    this.onCursor(x, z, biome);
  }

  private sampleBiome(x: number, z: number): number {
    const s = this.session!;
    const scale = this.underground ? 1 : TILE_SCALE;
    const tb = TILE * scale;
    const tx = Math.floor(x / tb);
    const tz = Math.floor(z / tb);
    const y = this.underground ? this.yLevel : 0;
    const arr = s.biomeTileData(scale, tx * tb, tz * tb, y);
    if (!arr) return -1;
    const px = Math.floor((x - tx * tb) / scale);
    const pz = Math.floor((z - tz * tb) / scale);
    if (px < 0 || px >= TILE || pz < 0 || pz >= TILE) return -1;
    return arr[pz * TILE + px];
  }

  destroy(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this.structuresTimer) window.clearTimeout(this.structuresTimer);
  }
}