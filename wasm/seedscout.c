/*
 * seedscout.c — Emscripten wrapper around cubiomes for the SeedScout web app.
 * cubiomes (MIT) by Cubitect: https://github.com/Cubitect/cubiomes
 */
#include <stdlib.h>
#include <string.h>
#include "generator.h"
#include "finders.h"
#include "util.h"

/* 1 if the version enum is supported by this build */
int ss_valid_version(int mc)
{
    const char *s = mc2str(mc);
    return s != NULL && s[0] != '?' && s[1] != '\0';
}

/* returns the display string for a version, or NULL */
const char *ss_version_str(int mc)
{
    const char *s = mc2str(mc);
    if (!s || (s[0] == '?' && s[1] == '\0'))
        return NULL;
    return s;
}

/* generator lifecycle -------------------------------------------------- */

Generator *ss_gen_new(int mc, uint32_t flags)
{
    Generator *g = (Generator *)malloc(sizeof(Generator));
    if (!g)
        return NULL;
    setupGenerator(g, mc, flags);
    return g;
}

void ss_gen_apply(Generator *g, int dim, uint64_t seed)
{
    applySeed(g, dim, seed);
}

void ss_gen_free(Generator *g)
{
    if (g)
        free(g);
}

/* single biome query (scale: 1 or 4) */
int ss_get_biome_at(Generator *g, int scale, int x, int y, int z)
{
    return getBiomeAt(g, scale, x, y, z);
}

/* batch generation into a caller-provided int buffer (scale 1 or 4) */
int ss_gen_biomes(Generator *g, int *cache, int scale, int x, int z,
                  int sx, int sz, int y)
{
    Range r;
    r.scale = scale;
    r.x = x;
    r.z = z;
    r.sx = sx;
    r.sz = sz;
    r.y = y;
    r.sy = 0;
    return genBiomes(g, cache, r);
}

/* required int buffer size for a 2D area */
int ss_min_cache_size(Generator *g, int scale, int sx, int sz)
{
    return (int)getMinCacheSize(g, scale, sx, 1, sz);
}

/* world spawn ---------------------------------------------------------- */

int ss_get_spawn(Generator *g, int *x, int *z)
{
    Pos p = getSpawn(g);
    *x = p.x;
    *z = p.z;
    return 1;
}

/* slime chunks (Java formula) ------------------------------------------- */

int ss_slime_chunk(uint64_t seed, int chunkX, int chunkZ)
{
    return isSlimeChunk(seed, chunkX, chunkZ);
}

/* structures --------------------------------------------------------------
 * Fills `out` with (x,z) block positions of every viable structure of type
 * `stype` whose generation attempt falls inside the block area
 * [bx, bx+bw) x [bz, bz+bh). Returns the number of positions written
 * (0 if the structure type is unsupported for this version).
 */
int ss_get_structures(Generator *g, int stype, int bx, int bz,
                      int bw, int bh, int *out, int max)
{
    StructureConfig sconf;
    if (!getStructureConfig(stype, g->mc, &sconf))
        return 0;

    int rs = sconf.regionSize;
    int chunkRange = sconf.chunkRange;
    int r = rs * 16; /* region size in blocks */

    int rx0 = bx >= 0 ? bx / r : (bx - r + 1) / r;
    int rx1 = (bx + bw - 1) >= 0 ? (bx + bw - 1) / r : ((bx + bw - 1) - r + 1) / r;
    int rz0 = bz >= 0 ? bz / r : (bz - r + 1) / r;
    int rz1 = (bz + bh - 1) >= 0 ? (bz + bh - 1) / r : ((bz + bh - 1) - r + 1) / r;

    int n = 0;
    for (int rz = rz0; rz <= rz1 && n < max; rz++)
    {
        for (int rx = rx0; rx <= rx1 && n < max; rx++)
        {
            Pos pos;
            if (!getStructurePos(stype, g->mc, g->seed, rx, rz, &pos))
                continue;
            if (pos.x < bx || pos.x >= bx + bw || pos.z < bz || pos.z >= bz + bh)
                continue;
            if (!isViableStructurePos(stype, g, pos.x, pos.z, 0))
                continue;
            if (g->mc >= MC_1_18 && g->dim == DIM_OVERWORLD)
            {
                if (!isViableStructureTerrain(stype, g, pos.x, pos.z))
                    continue;
            }
            out[n * 2 + 0] = pos.x;
            out[n * 2 + 1] = pos.z;
            n++;
        }
    }
    return n;
}

/* mineshafts: returns number of chunks containing mineshafts in chunk area */
int ss_get_mineshafts(Generator *g, int chunkX, int chunkZ,
                      int chunkW, int chunkH, int *out, int max)
{
    return getMineshafts(g->mc, g->seed, chunkX, chunkZ, chunkW, chunkH,
                         (Pos *)out, max);
}

/* strongholds -------------------------------------------------------------- */

typedef struct
{
    StrongholdIter iter;
    int remaining;
    int started;
} StrongholdState;

StrongholdState *ss_stronghold_new(int mc, uint64_t seed)
{
    StrongholdState *s = (StrongholdState *)malloc(sizeof(StrongholdState));
    if (!s)
        return NULL;
    s->iter.mc = mc;
    s->remaining = 1;
    s->started = 0;
    initFirstStronghold(&s->iter, mc, seed & MASK48);
    return s;
}

/* returns 1 and writes the next stronghold block position, or 0 when done */
int ss_stronghold_next(StrongholdState *s, Generator *g, int *x, int *z)
{
    if (!s || s->remaining <= 0)
        return 0;
    s->remaining = nextStronghold(&s->iter, g);
    *x = s->iter.pos.x;
    *z = s->iter.pos.z;
    return 1;
}

void ss_stronghold_free(StrongholdState *s)
{
    if (s)
        free(s);
}

/* biome color table (Amidst-derived defaults) ------------------------------ */

void ss_biome_colors(unsigned char *out)
{
    static unsigned char colors[256][3];
    initBiomeColors(colors);
    memcpy(out, colors, 256 * 3);
}

/* biome name for a version (resource id) ----------------------------------- */

const char *ss_biome_name(int mc, int id)
{
    return biome2str(mc, id);
}