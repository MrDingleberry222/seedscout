export type Dimension = 'overworld' | 'nether' | 'end';

export interface StructureDef {
  key: string;
  label: string;
  cubiomesType: number; /* cubiomes StructureType enum */
  dims: Dimension[];
  color: string;
  approx?: boolean; /* position is approximate (no biome/terrain check) */
}

export const STRUCTURE_TYPES: Record<string, StructureDef> = {
  village:        { key: 'village',        label: 'Village',        cubiomesType: 5,  dims: ['overworld'], color: '#e8a13c' },
  outpost:        { key: 'outpost',        label: 'Pillager Outpost', cubiomesType: 10, dims: ['overworld'], color: '#a06a4a' },
  desert_pyramid: { key: 'desert_pyramid', label: 'Desert Pyramid',  cubiomesType: 1,  dims: ['overworld'], color: '#e0c05a' },
  jungle_temple:  { key: 'jungle_temple',  label: 'Jungle Temple',   cubiomesType: 2,  dims: ['overworld'], color: '#5aa04a' },
  swamp_hut:      { key: 'swamp_hut',      label: 'Witch Hut',       cubiomesType: 3,  dims: ['overworld'], color: '#7a6a4a' },
  igloo:          { key: 'igloo',          label: 'Igloo',           cubiomesType: 4,  dims: ['overworld'], color: '#b8e0f0' },
  monument:       { key: 'monument',       label: 'Ocean Monument',  cubiomesType: 8,  dims: ['overworld'], color: '#3aa8c8' },
  mansion:        { key: 'mansion',        label: 'Woodland Mansion', cubiomesType: 9, dims: ['overworld'], color: '#8a4a6a' },
  stronghold:     { key: 'stronghold',     label: 'Stronghold',      cubiomesType: -1, dims: ['overworld'], color: '#b060b0', approx: true },
  mineshaft:      { key: 'mineshaft',      label: 'Mineshaft',       cubiomesType: 15, dims: ['overworld'], color: '#8a8a8a', approx: true },
  shipwreck:      { key: 'shipwreck',      label: 'Shipwreck',       cubiomesType: 7,  dims: ['overworld'], color: '#7a5a3a' },
  ocean_ruin:     { key: 'ocean_ruin',     label: 'Ocean Ruins',     cubiomesType: 6,  dims: ['overworld'], color: '#5a8aa8' },
  treasure:       { key: 'treasure',       label: 'Buried Treasure', cubiomesType: 14, dims: ['overworld'], color: '#e8d040' },
  ruined_portal:  { key: 'ruined_portal',  label: 'Ruined Portal',   cubiomesType: 11, dims: ['overworld'], color: '#c06ac0' },
  ancient_city:   { key: 'ancient_city',   label: 'Ancient City',    cubiomesType: 13, dims: ['overworld'], color: '#3a4a5a' },
  trail_ruins:    { key: 'trail_ruins',    label: 'Trail Ruins',     cubiomesType: 23, dims: ['overworld'], color: '#b09a6a' },
  trial_chambers: { key: 'trial_chambers', label: 'Trial Chambers',  cubiomesType: 24, dims: ['overworld'], color: '#c89a3a' },
  desert_well:    { key: 'desert_well',    label: 'Desert Well',     cubiomesType: 16, dims: ['overworld'], color: '#c0b090', approx: true },
  fortress:       { key: 'fortress',       label: 'Nether Fortress', cubiomesType: 18, dims: ['nether'],    color: '#c04040' },
  bastion:        { key: 'bastion',        label: 'Bastion Remnant', cubiomesType: 19, dims: ['nether'],    color: '#604040' },
  end_city:       { key: 'end_city',       label: 'End City',        cubiomesType: 20, dims: ['end'],       color: '#d8b060' },
  end_gateway:    { key: 'end_gateway',    label: 'End Gateway',     cubiomesType: 21, dims: ['end'],       color: '#e8e8c0' },
};

export const DEFAULT_LAYERS = [
  'village',
  'stronghold',
  'trial_chambers',
  'ancient_city',
  'monument',
  'mansion',
  'outpost',
  'desert_pyramid',
  'jungle_temple',
  'swamp_hut',
  'igloo',
  'shipwreck',
  'ocean_ruin',
  'treasure',
  'ruined_portal',
  'trail_ruins',
  'mineshaft',
  'desert_well',
  'fortress',
  'bastion',
  'end_city',
  'end_gateway',
];

export function structuresForDim(dim: Dimension): string[] {
  return DEFAULT_LAYERS.filter((k) => STRUCTURE_TYPES[k].dims.includes(dim));
}