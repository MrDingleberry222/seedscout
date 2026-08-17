import { useEffect, useRef } from 'react';
import { TopBar } from './components/TopBar';
import { LayerPanel } from './components/LayerPanel';
import { MapView } from './components/MapView';
import { StatusBar } from './components/StatusBar';
import { useMapStore } from './store';
import { Session } from './lib/session';
import type { MapRenderer } from './lib/renderer';
import type { Dimension } from './lib/structures';

function dimToNum(d: Dimension): number {
  return d === 'nether' ? -1 : d === 'end' ? 1 : 0;
}

function readUrl(): void {
  const q = new URLSearchParams(location.search);
  const s = useMapStore.getState();
  const seed = q.get('seed');
  const platform = q.get('platform');
  const version = q.get('version');
  const dimension = q.get('dimension');
  const x = q.get('x');
  const z = q.get('z');
  const zoom = q.get('zoom');
  if (seed) s.setSeedText(seed);
  if (platform === 'bedrock' || platform === 'java') s.setPlatform(platform);
  if (version) s.setVersion(Number(version));
  if (dimension === 'nether' || dimension === 'end' || dimension === 'overworld') s.setDimension(dimension);
  const vx = x ? Number(x) : 0;
  const vz = z ? Number(z) : 0;
  const vzoom = zoom ? Number(zoom) : 0;
  if (Number.isFinite(vx) && Number.isFinite(vz) && Number.isFinite(vzoom)) {
    s.setView({ x: vx, z: vz, zoom: Math.max(0, Math.min(4, vzoom)) });
  }
  if (seed) setTimeout(() => s.loadSeed(), 0);
}

export default function App() {
  const rendererRef = useRef<MapRenderer | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const resolvedSeed = useMapStore((s) => s.resolvedSeed);
  const versionId = useMapStore((s) => s.versionId);
  const platform = useMapStore((s) => s.platform);
  const dimension = useMapStore((s) => s.dimension);
  const setLoaded = useMapStore((s) => s.setLoaded);
  const seedText = useMapStore((s) => s.seedText);
  const view = useMapStore((s) => s.view);

  useEffect(() => {
    readUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (resolvedSeed === null) return;
    let cancelled = false;
    (async () => {
      setLoaded('', true);
      const key = `${resolvedSeed.toString()}:${versionId}:${platform}:${dimToNum(dimension)}`;
      try {
        const session = await Session.create(versionId, resolvedSeed, dimension, platform);
        if (cancelled) {
          session.destroy();
          return;
        }
        sessionRef.current?.destroy();
        sessionRef.current = session;
        rendererRef.current?.attach(session);
        setLoaded(key, false);
      } catch (err) {
        console.error('session init failed', err);
        setLoaded('', false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedSeed, versionId, dimension, platform]);

  /* sync view to URL (debounced) */
  useEffect(() => {
    const t = setTimeout(() => {
      if (!seedText.trim()) return;
      const params = new URLSearchParams({
        seed: seedText,
        platform,
        version: String(versionId),
        dimension,
        x: String(Math.round(view.x)),
        z: String(Math.round(view.z)),
        zoom: String(view.zoom),
      });
      history.replaceState(null, '', `${location.pathname}?${params}`);
    }, 300);
    return () => clearTimeout(t);
  }, [seedText, platform, versionId, dimension, view]);

  return (
    <div className="app">
      <TopBar />
      <div className="main">
        <LayerPanel />
        <MapView onRendererReady={(r) => (rendererRef.current = r)} />
      </div>
      <StatusBar />
    </div>
  );
}