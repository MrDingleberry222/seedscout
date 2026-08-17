import { useEffect, useRef, useState } from 'react';
import { MapRenderer, type MarkerHit } from '../lib/renderer';
import { useMapStore } from '../store';
import { STRUCTURE_TYPES } from '../lib/structures';

interface PopoverState {
  hit: MarkerHit;
  x: number;
  y: number;
}

export function MapView({ onRendererReady }: { onRendererReady: (r: MapRenderer) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<MapRenderer | null>(null);
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const dragRef = useRef<{ px: number; py: number; vx: number; vz: number; moved: boolean } | null>(null);

  const view = useMapStore((s) => s.view);
  const setView = useMapStore((s) => s.setView);
  const setCursor = useMapStore((s) => s.setCursor);
  const layers = useMapStore((s) => s.layers);
  const showSlime = useMapStore((s) => s.showSlime);
  const showSpawn = useMapStore((s) => s.showSpawn);
  const underground = useMapStore((s) => s.underground);
  const yLevel = useMapStore((s) => s.yLevel);
  const loading = useMapStore((s) => s.loading);
  const loadedKey = useMapStore((s) => s.loadedKey);
  const versionId = useMapStore((s) => s.versionId);
  const mc = versionId;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const renderer = new MapRenderer(canvas);
    rendererRef.current = renderer;
    renderer.onCursor = (x, z, biome) => setCursor({ x, z, biome: biome ?? undefined } as any);
    renderer.view = view;
    renderer.mc = mc;
    const onResize = () => {
      const parent = canvas.parentElement!;
      renderer.resize(parent.clientWidth, parent.clientHeight);
    };
    onResize();
    window.addEventListener('resize', onResize);
    onRendererReady(renderer);
    return () => {
      window.removeEventListener('resize', onResize);
      renderer.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const r = rendererRef.current;
    if (!r) return;
    r.view = view;
    r.layers = layers;
    r.showSlime = showSlime;
    r.showSpawn = showSpawn;
    r.underground = underground;
    r.yLevel = yLevel;
    r.mc = mc;
    r.scheduleRedraw();
  }, [view, layers, showSlime, showSpawn, underground, yLevel, mc]);

  useEffect(() => {
    if (popover) setPopover(null);
  }, [loadedKey]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const r = rendererRef.current!;
    dragRef.current = { px: e.clientX, py: e.clientY, vx: r.view.x, vz: r.view.z, moved: false };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const r = rendererRef.current!;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const drag = dragRef.current;
    if (drag) {
      const bpp = r.bpp;
      const dx = (e.clientX - drag.px) * bpp;
      const dy = (e.clientY - drag.py) * bpp;
      if (Math.abs(e.clientX - drag.px) + Math.abs(e.clientY - drag.py) > 3) drag.moved = true;
      setView({ x: drag.vx - dx, z: drag.vz - dy });
    } else {
      r.cursorAt(px, py);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const r = rendererRef.current!;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag && drag.moved) return;
    const hit = r.hitTest(e.clientX - rect.left, e.clientY - rect.top);
    if (hit) {
      setPopover({ hit, x: e.clientX - rect.left, y: e.clientY - rect.top });
    } else {
      setPopover(null);
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const r = rendererRef.current!;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const { x, z } = r.screenToWorld(px, py);
    const zoom = Math.max(0, Math.min(4, r.view.zoom + (e.deltaY < 0 ? 0.5 : -0.5)));
    const nbpp = underground ? 2 ** zoom : 4 * 2 ** zoom;
    const w = canvas.width / r.dpr;
    const h = canvas.height / r.dpr;
    setView({ zoom, x: x - (px - w / 2) * nbpp, z: z - (py - h / 2) * nbpp });
  };

  const zoomBy = (d: number) => {
    const r = rendererRef.current!;
    setView({ zoom: Math.max(0, Math.min(4, r.view.zoom + d)) });
  };

  const share = () => {
    const s = useMapStore.getState();
    const r = rendererRef.current!;
    const params = new URLSearchParams({
      seed: s.seedText,
      platform: s.platform,
      version: String(s.versionId),
      dimension: s.dimension,
      x: String(Math.round(r.view.x)),
      z: String(Math.round(r.view.z)),
      zoom: String(r.view.zoom),
    });
    navigator.clipboard?.writeText(`${location.origin}${location.pathname}?${params}`);
  };

  const def = popover ? STRUCTURE_TYPES[popover.hit.key] : null;

  return (
    <div className="map-wrap">
      <canvas
        ref={canvasRef}
        className="map-canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => { setCursor(null as any); }}
        onWheel={onWheel}
        onDoubleClick={() => zoomBy(1)}
      />

      {loading && (
        <div className="map-loading">
          <div className="spinner" />
          <span>Generating world…</span>
        </div>
      )}

      {popover && def && (
        <div className="popover" style={{ left: Math.min(popover.x + 14, window.innerWidth - 260), top: Math.max(popover.y - 10, 8) }}>
          <div className="popover-title">
            <span style={{ color: def.color }}>{def.label}</span>
            {popover.hit.approx && <span className="approx">approx.</span>}
          </div>
          <div className="popover-coords">
            X {popover.hit.x} · Z {popover.hit.z}
          </div>
          <div className="popover-actions">
            <code>/tp @p {popover.hit.x} ~ {popover.hit.z}</code>
            <button
              className="btn btn-small"
              onClick={() => navigator.clipboard?.writeText(`/tp @p ${popover.hit.x} ~ ${popover.hit.z}`)}
            >
              Copy
            </button>
          </div>
        </div>
      )}

      <div className="map-controls">
        <button className="btn" title="Zoom in" onClick={() => zoomBy(1)}>+</button>
        <button className="btn" title="Zoom out" onClick={() => zoomBy(-1)}>−</button>
        <button className="btn" title="Copy share link" onClick={share}>🔗</button>
      </div>
    </div>
  );
}