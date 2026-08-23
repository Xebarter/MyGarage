/** Subtle premium tints for home marketplace cards. Length is odd so
 *  neighbors differ in common 2/3/4/6-column grids. */
export const HOME_CARD_TONES = [
  '#E8EDF4', // slate mist
  '#E6F0EA', // soft sage
  '#EFE8E2', // warm stone
  '#E3EEF3', // sky mist
  '#EBEAE6', // pewter
] as const;

export type HomeCardTone = (typeof HOME_CARD_TONES)[number];

export function homeCardTone(index: number): HomeCardTone {
  const len = HOME_CARD_TONES.length;
  return HOME_CARD_TONES[((index % len) + len) % len];
}
