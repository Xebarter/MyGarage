/** Subtle premium fills for service-flow cards. Length is odd so
 *  neighbors differ in 2- and 3-column grids. */
export const SERVICE_CARD_TONES = [
  '#E8EDF4', // slate mist
  '#E7F1EA', // sage
  '#F1E9E3', // warm stone
  '#E3EEF3', // sky mist
  '#EEE8F2', // lilac dust
  '#EBEAE4', // pewter
  '#E6F1EF', // sea foam
] as const;

/** Reserved for Emergency Help — garnet wash, clearly urgent without going loud. */
export const SERVICE_EMERGENCY_TONE = '#EBC8C4';

export type ServiceCardTone = (typeof SERVICE_CARD_TONES)[number];

export function serviceCardTone(index: number): ServiceCardTone {
  const len = SERVICE_CARD_TONES.length;
  return SERVICE_CARD_TONES[((index % len) + len) % len];
}

export const serviceCardSurfaceClass =
  'border border-black/[0.06] shadow-[0_1px_2px_rgba(15,23,42,0.04)]';

export const serviceEmergencySurfaceClass =
  'border border-[#9F2A2A]/20 shadow-[0_8px_22px_-6px_rgba(127,29,29,0.18)]';
