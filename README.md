# SeedScout

An interactive Minecraft seed map that runs entirely in your browser. Paste a seed,
pick your edition, version and dimension, and explore biomes, structures, slime
chunks and world spawn on a pan/zoomable canvas map.

Powered by the open-source [cubiomes](https://github.com/Cubitect/cubiomes) library
(MIT) compiled to WebAssembly. Your seed never leaves your device.

## Features

- Java Edition biomes & structures (Beta 1.7 → 1.21 Winter Drop), exact positions
- 128 strongholds, world spawn, slime chunks (Java formula)
- 20+ structure types with custom SVG icons, toggleable layers
- Underground view: biome map at any Y level (1.18+)
- Shareable deep links (`?seed=…&platform=…&version=…&dimension=…&x=…&z=…&zoom=…`)
- Bedrock Edition (1.18+): terrain/biomes via seed parity; Bedrock structure
  placement rules (region system, 3 strongholds, Bedrock nether rule) with the
  lower 32 bits of the seed — villages, desert/jungle temples, witch huts,
  igloos, ocean monuments, ocean ruins, shipwrecks, buried treasure, woodland
  mansions, pillager outposts, ruined portals, mineshafts, fortresses, bastions,
  end cities

Not an official Minecraft product. Not approved by or associated with Mojang or
Microsoft. Minecraft names and assets belong to Mojang Studios / Microsoft.

## Development

```sh
npm install
npm run dev          # dev server
npm run build        # typecheck + production build
npm run preview      # serve the build
```

### Rebuilding the WASM engine

Requires the Emscripten SDK (emsdk). Then:

```sh
npm run wasm:build
```

The wrapper lives in `wasm/seedscout.c`; output goes to `public/wasm/`. A quick
engine verification suite runs with:

```sh
node wasm/smoke.test.mjs
```

## Deployment

Pushes to `main` are deployed to GitHub Pages by the workflow in
`.github/workflows/deploy.yml`. The Vite `base` is relative (`./`), so the site
works from any Pages subpath.

## Credits

- [cubiomes](https://github.com/Cubitect/cubiomes) — Java biome and structure
  generation (MIT), used under license. Biome colors derive from cubiomes'
  Amidst-style default colormap.
- Bedrock structure placement informed by
  [MCBEStructureFinder](https://github.com/bedrock-dev/MCBEStructureFinder)
  (MIT).