/** Subtle premium tints for home marketplace cards. Length is odd so
 *  neighbors differ in common 2/3/4/6-column grids. */
export const HOME_CARD_TONES = [
  '#F3E7C8', // champagne
  '#D8F3E6', // mint
  '#F8E3D4', // peach
  '#E7F1D8', // citrus leaf
  '#F6EDDF', // warm sand
] as const;

export type HomeCardTone = (typeof HOME_CARD_TONES)[number];

export function homeCardTone(index: number): HomeCardTone {
  const len = HOME_CARD_TONES.length;
  return HOME_CARD_TONES[((index % len) + len) % len];
}
