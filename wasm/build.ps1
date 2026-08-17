# Builds the cubiomes WASM module for SeedScout.
# Requires Emscripten (emsdk). Set $env:EMSDK_DIR to your emsdk root, or this
# falls back to the default opencode temp location.

$ErrorActionPreference = "Stop"

$emsdkDir = $env:EMSDK_DIR
if (-not $emsdkDir -or -not (Test-Path $emsdkDir)) {
    $emsdkDir = Join-Path $env:TEMP "opencode\emsdk"
}
$emcc = Join-Path $emsdkDir "upstream\emscripten\emcc.bat"
if (-not (Test-Path $emcc)) {
    $emcc = Join-Path $emsdkDir "upstream\emscripten\emcc.exe"
}
if (-not (Test-Path $emcc)) {
    throw "emcc not found at $emcc. Install the Emscripten SDK first (emsdk install latest; emsdk activate latest)."
}

$root = Split-Path $PSScriptRoot -Parent
$outDir = Join-Path $root "public\wasm"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$src = @(
    "seedscout.c",
    "cubiomes\biomenoise.c",
    "cubiomes\biomes.c",
    "cubiomes\finders.c",
    "cubiomes\generator.c",
    "cubiomes\layers.c",
    "cubiomes\noise.c",
    "cubiomes\quadbase.c",
    "cubiomes\util.c"
)

$exports = @(
    "_ss_valid_version", "_ss_version_str",
    "_ss_gen_new", "_ss_gen_apply", "_ss_gen_free",
    "_ss_get_biome_at", "_ss_gen_biomes", "_ss_min_cache_size",
    "_ss_get_spawn", "_ss_slime_chunk",
    "_ss_get_structures", "_ss_get_mineshafts",
    "_ss_stronghold_new", "_ss_stronghold_next", "_ss_stronghold_free",
    "_ss_biome_colors", "_ss_biome_name",
    "_malloc", "_free"
) -join ","

& $emcc @src @("-O3", "-I", "cubiomes",
    "-o", (Join-Path $outDir "seedscout.js"),
    "-s", "WASM=1",
    "-s", "MODULARIZE=1",
    "-s", "EXPORT_ES6=1",
    "-s", "EXPORT_NAME=createSeedScoutModule",
    "-s", "WASM_BIGINT=1",
    "-s", "ALLOW_MEMORY_GROWTH=1",
    "-s", "FILESYSTEM=0",
    "-s", "ENVIRONMENT=web,worker,node",
    "-s", "EXPORTED_FUNCTIONS=$exports",
    "-s", "EXPORTED_RUNTIME_METHODS=ccall,cwrap,UTF8ToString,getValue,setValue,HEAP32,HEAPU8"
) 2>&1 | ForEach-Object { $_ }

if ($LASTEXITCODE -ne 0) {
    throw "emcc failed with exit code $LASTEXITCODE"
}
Write-Host "WASM build complete -> $outDir"