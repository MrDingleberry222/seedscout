import { useMapStore } from '../store';
import { versionsFor } from '../lib/versions';
import type { Dimension } from '../lib/structures';
import { iconDataUrl } from '../icons';

const DIMENSIONS: { key: Dimension; label: string }[] = [
  { key: 'overworld', label: 'Overworld' },
  { key: 'nether', label: 'Nether' },
  { key: 'end', label: 'The End' },
];

export function TopBar() {
  const {
    seedText, setSeedText, platform, setPlatform, versionId, setVersion,
    dimension, setDimension, loadSeed, loading,
  } = useMapStore();

  const randomSeed = () => {
    const n = BigInt.asUintN(64, BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)));
    const text = n.toString();
    setSeedText(text);
    setTimeout(loadSeed, 0);
  };

  return (
    <header className="topbar">
      <div className="brand">
        <img src={iconDataUrl('spawn', '#5ad86e')} alt="" width="26" height="26" />
        <span className="brand-name">SeedScout</span>
        <span className="brand-tag">Minecraft seed map</span>
      </div>

      <div className="seed-box">
        <input
          className="seed-input"
          type="text"
          value={seedText}
          onChange={(e) => setSeedText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && loadSeed()}
          placeholder="World seed (number or text)"
          spellCheck={false}
        />
        <button className="btn" title="Random seed" onClick={randomSeed}>🎲</button>
        <button className="btn btn-primary" onClick={loadSeed} disabled={loading}>
          {loading ? 'Loading…' : 'Load Map'}
        </button>
      </div>

      <div className="segmented" role="tablist" aria-label="Edition">
        {(['java', 'bedrock'] as const).map((p) => (
          <button
            key={p}
            role="tab"
            aria-selected={platform === p}
            className={platform === p ? 'seg active' : 'seg'}
            onClick={() => setPlatform(p)}
          >
            {p === 'java' ? 'Java' : 'Bedrock'}
          </button>
        ))}
      </div>

      <select className="version-select" value={versionId} onChange={(e) => setVersion(Number(e.target.value))}>
        {versionsFor(platform).map((v) => (
          <option key={v.id} value={v.id}>{v.label}</option>
        ))}
      </select>

      <div className="segmented" role="tablist" aria-label="Dimension">
        {DIMENSIONS.map((d) => (
          <button
            key={d.key}
            role="tab"
            aria-selected={dimension === d.key}
            className={dimension === d.key ? 'seg active' : 'seg'}
            onClick={() => setDimension(d.key)}
          >
            {d.label}
          </button>
        ))}
      </div>
    </header>
  );
}