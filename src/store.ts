import { create } from 'zustand';
import { parseSeed } from './lib/seed';
import type { Platform } from './lib/versions';
import { defaultVersionFor } from './lib/versions';
import type { Dimension } from './lib/structures';
import { DEFAULT_LAYERS } from './lib/structures';

export interface ViewState {
  x: number;
  z: number;
  zoom: number; /* 0..4 -> blocks per pixel 4,8,16,32,64 */
}

interface MapStore {
  seedText: string;
  resolvedSeed: bigint | null;
  platform: Platform;
  versionId: number;
  dimension: Dimension;
  view: ViewState;
  layers: Record<string, boolean>;
  showSlime: boolean;
  showSpawn: boolean;
  underground: boolean;
  yLevel: number;
  loading: boolean;
  loadedKey: string | null; /* seed:platform:version:dim when map loaded */
  cursor: { x: number; z: number; biome?: string } | null;

  setSeedText: (t: string) => void;
  setPlatform: (p: Platform) => void;
  setVersion: (v: number) => void;
  setDimension: (d: Dimension) => void;
  setView: (v: Partial<ViewState>) => void;
  toggleLayer: (k: string) => void;
  toggleSlime: () => void;
  toggleSpawn: () => void;
  toggleUnderground: () => void;
  setYLevel: (y: number) => void;
  setCursor: (c: { x: number; z: number; biome?: string } | null) => void;
  loadSeed: () => void;
  setLoaded: (key: string, loading: boolean) => void;
}

const initialLayers: Record<string, boolean> = {};
for (const k of DEFAULT_LAYERS) initialLayers[k] = true;
initialLayers['stronghold'] = true;
initialLayers['village'] = true;

export const useMapStore = create<MapStore>((set, get) => ({
  seedText: '',
  resolvedSeed: null,
  platform: 'java',
  versionId: defaultVersionFor('java'),
  dimension: 'overworld',
  view: { x: 0, z: 0, zoom: 0 },
  layers: initialLayers,
  showSlime: false,
  showSpawn: true,
  underground: false,
  yLevel: 0,
  loading: false,
  loadedKey: null,
  cursor: null,

  setSeedText: (t) => set({ seedText: t }),
  setPlatform: (p) =>
    set((s) => ({
      platform: p,
      versionId: p !== s.platform ? defaultVersionFor(p) : s.versionId,
    })),
  setVersion: (v) => set({ versionId: v }),
  setDimension: (d) => set({ dimension: d, view: { x: 0, z: 0, zoom: 0 } }),
  setView: (v) => set((s) => ({ view: { ...s.view, ...v } })),
  toggleLayer: (k) => set((s) => ({ layers: { ...s.layers, [k]: !s.layers[k] } })),
  toggleSlime: () => set((s) => ({ showSlime: !s.showSlime })),
  toggleSpawn: () => set((s) => ({ showSpawn: !s.showSpawn })),
  toggleUnderground: () => set((s) => ({ underground: !s.underground, yLevel: s.yLevel })),
  setYLevel: (y) => set({ yLevel: y }),
  setCursor: (c) => set({ cursor: c }),
  loadSeed: () => {
    const s = get();
    if (!s.seedText.trim()) return;
    const seed = parseSeed(s.seedText);
    set({
      resolvedSeed: seed,
      view: { x: 0, z: 0, zoom: 0 },
    });
  },
  setLoaded: (key, loading) => set({ loadedKey: key, loading }),
}));