/* Seed parsing and conversions. Java and Bedrock (1.18+) both turn text seeds
 * into numbers with the same algorithm Minecraft uses. */

/* Java's String.hashCode() over UTF-16 code units, as signed 32-bit. */
export function javaStringHash(s: string): bigint {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return BigInt(h);
}

/* Convert any user seed input (number or text) into the 64-bit world seed. */
export function parseSeed(input: string): bigint {
  const trimmed = input.trim();
  if (/^-?\d+$/.test(trimmed)) {
    return BigInt(trimmed);
  }
  return javaStringHash(trimmed);
}

export function seedToString(seed: bigint): string {
  return seed.toString();
}

export const SEED_MIN = -(1n << 63n);
export const SEED_MAX = (1n << 63n) - 1n;

export function clampSeed(seed: bigint): bigint {
  if (seed < SEED_MIN) return SEED_MIN;
  if (seed > SEED_MAX) return SEED_MAX;
  return seed;
}