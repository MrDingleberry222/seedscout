import { useMapStore } from '../store';
import { structuresForDim, STRUCTURE_TYPES } from '../lib/structures';
import { iconDataUrl } from '../icons';

export function LayerPanel() {
  const {
    dimension, layers, toggleLayer, showSlime, toggleSlime,
    showSpawn, toggleSpawn, underground, toggleUnderground,
    yLevel, setYLevel, versionId,
  } = useMapStore();

  const keys = structuresForDim(dimension);

  return (
    <aside className="layer-panel">
      <div className="panel-title">Structures</div>

      <div className="layer-list">
        {keys.map((k) => {
          const def = STRUCTURE_TYPES[k];
          const on = !!layers[k];
          return (
            <label key={k} className={`layer-row ${on ? 'on' : ''}`}>
              <input type="checkbox" checked={on} onChange={() => toggleLayer(k)} />
              <img className="layer-icon" src={iconDataUrl(k, def.color)} alt="" width="18" height="18" />
              <span className="layer-label">{def.label}</span>
            </label>
          );
        })}
      </div>

      <div className="panel-title">Map features</div>
      <label className={`layer-row ${showSlime ? 'on' : ''}`}>
        <input type="checkbox" checked={showSlime} onChange={toggleSlime} />
        <img className="layer-icon" src={iconDataUrl('slime', '#5ad86e')} alt="" width="18" height="18" />
        <span className="layer-label">Slime chunks</span>
      </label>
      <label className={`layer-row ${showSpawn ? 'on' : ''}`}>
        <input type="checkbox" checked={showSpawn} onChange={toggleSpawn} />
        <img className="layer-icon" src={iconDataUrl('spawn', '#5ad86e')} alt="" width="18" height="18" />
        <span className="layer-label">World spawn</span>
      </label>

      {dimension === 'overworld' && versionId >= 22 && (
        <>
          <div className="panel-title">Underground view</div>
          <label className={`layer-row ${underground ? 'on' : ''}`}>
            <input type="checkbox" checked={underground} onChange={toggleUnderground} />
            <span className="layer-label">Show biome at Y level</span>
          </label>
          {underground && (
            <div className="y-control">
              <input
                type="range"
                min={-64}
                max={320}
                value={yLevel}
                onChange={(e) => setYLevel(Number(e.target.value))}
              />
              <span className="y-value">Y = {yLevel}</span>
            </div>
          )}
        </>
      )}

      <div className="panel-note">
        Not affiliated with Mojang or Microsoft. Java biomes &amp; structures computed with
        the open-source cubiomes library.
      </div>
    </aside>
  );
}