export interface VersionDef {
  id: number;
  label: string;
}

/* cubiomes MCVersion enum values + display labels */
export const JAVA_VERSIONS: VersionDef[] = [
  { id: 1, label: 'Beta 1.7' },
  { id: 2, label: 'Beta 1.8' },
  { id: 3, label: '1.0' },
  { id: 4, label: '1.1' },
  { id: 5, label: '1.2' },
  { id: 6, label: '1.3' },
  { id: 7, label: '1.4' },
  { id: 8, label: '1.5' },
  { id: 9, label: '1.6' },
  { id: 10, label: '1.7' },
  { id: 11, label: '1.8' },
  { id: 12, label: '1.9' },
  { id: 13, label: '1.10' },
  { id: 14, label: '1.11' },
  { id: 15, label: '1.12' },
  { id: 16, label: '1.13' },
  { id: 17, label: '1.14' },
  { id: 18, label: '1.15' },
  { id: 19, label: '1.16.1' },
  { id: 20, label: '1.16' },
  { id: 21, label: '1.17' },
  { id: 22, label: '1.18' },
  { id: 23, label: '1.19.2' },
  { id: 24, label: '1.19' },
  { id: 25, label: '1.20' },
  { id: 26, label: '1.21.1' },
  { id: 27, label: '1.21.2 – 1.21.3' },
  { id: 28, label: '1.21 Winter Drop' },
];

export const DEFAULT_JAVA_VERSION = 28; /* MC_1_21_WD */

/* Bedrock: world generation matches Java 1.18+ (seed parity). These map to
 * the closest cubiomes version used for the terrain/biome generator. */
export const BEDROCK_VERSIONS: VersionDef[] = [
  { id: 22, label: '1.18' },
  { id: 23, label: '1.19' },
  { id: 24, label: '1.19.2' },
  { id: 25, label: '1.20' },
  { id: 26, label: '1.21.1' },
  { id: 27, label: '1.21.2 – 1.21.3' },
  { id: 28, label: '1.21 Winter Drop' },
];

export const DEFAULT_BEDROCK_VERSION = 28;

export type Platform = 'java' | 'bedrock';

export const versionsFor = (platform: Platform): VersionDef[] =>
  platform === 'java' ? JAVA_VERSIONS : BEDROCK_VERSIONS;

export const defaultVersionFor = (platform: Platform): number =>
  platform === 'java' ? DEFAULT_JAVA_VERSION : DEFAULT_BEDROCK_VERSION;