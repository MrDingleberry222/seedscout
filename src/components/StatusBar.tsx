import { useMapStore } from '../store';

export function StatusBar() {
  const cursor = useMapStore((s) => s.cursor);
  const view = useMapStore((s) => s.view);
  const underground = useMapStore((s) => s.underground);

  const bpp = underground ? 2 ** view.zoom : 4 * 2 ** view.zoom;

  return (
    <footer className="statusbar">
      <span>
        {cursor
          ? `X ${cursor.x} · Z ${cursor.z}${cursor.biome ? ` · ${cursor.biome}` : ''}`
          : 'Drag to pan · scroll to zoom'}
      </span>
      <span className="status-right">1 px = {bpp} blocks · zoom {view.zoom.toFixed(1)}</span>
    </footer>
  );
}