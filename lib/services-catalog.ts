export type UserServiceCategory = {
  id: string;
  emoji: string;
  title: string;
  useWhen: string;
  services: string[];
};

export type ProviderServiceGroup = {
  id: string;
  title: string;
  services: string[];
};

export const userServiceCategories: UserServiceCategory[] = [
  {
    id: 'emergency-help',
    emoji: '🚨',
    title: "Emergency Help (I'm Stuck)",
    useWhen: "Use when: car won't move / urgent situation",
    services: [
      'Towing (accident / breakdown)',
      'Jump-start (dead battery)',
      'Flat tyre change',
      'Fuel delivery (ran out of fuel)',
      "Car won't start (mobile mechanic)",
      'Keys locked in car',
      'Vehicle stuck (mud, ditch recovery)',
    ],
  },
  {
    id: 'fix-my-car',
    emoji: '🔧',
    title: 'Fix My Car (Something is Wrong)',
    useWhen: 'Use when: car has a problem but not urgent',
    services: [
      'Engine problems (noise, overheating, smoke)',
      'Brake problems (not stopping well)',
      'Suspension issues (noise, rough ride)',
      'Electrical issues (lights, battery draining)',
      'AC not cooling',
      'Gearbox / clutch issues',
      'Exhaust problems',
    ],
  },
  {
    id: 'service-my-car',
    emoji: '🛠',
    title: 'Service My Car (Routine Maintenance)',
    useWhen: 'Use when: regular care / no problem yet',
    services: [
      'Oil change',
      'Full service (minor / major)',
      'Brake check',
      'Tyre rotation / alignment',
      'Battery check',
      'General inspection',
    ],
  },
  {
    id: 'tyres-battery',
    emoji: '🚗',
    title: 'Tyres & Battery',
    useWhen: 'High-frequency, simple category',
    services: ['Buy tyres', 'Fix puncture', 'Replace tyres', 'Wheel alignment', 'Battery replacement', 'Battery charging'],
  },
  {
    id: 'car-wash-cleaning',
    emoji: '🧼',
    title: 'Car Wash & Cleaning',
    useWhen: 'Very frequent + easy entry service',
    services: ['Basic wash', 'Interior cleaning', 'Full detailing', 'Engine cleaning', 'Mobile car wash (come to me)'],
  },
  {
    id: 'body-repair-painting',
    emoji: '🎨',
    title: 'Body Repair & Painting',
    useWhen: 'Use when: physical damage',
    services: ['Dent removal', 'Scratch repair', 'Full painting', 'Bumper repair', 'Accident repair'],
  },
  {
    id: 'ac-cooling',
    emoji: '❄️',
    title: 'Air Conditioning & Cooling',
    useWhen: 'Simple mental model for users',
    services: ['AC repair', 'AC gas refill', 'Car overheating', 'Radiator issues'],
  },
  {
    id: 'security-tracking',
    emoji: '🔐',
    title: 'Security & Tracking',
    useWhen: 'High relevance in Uganda',
    services: ['Install car tracker', 'Install alarm', 'Anti-theft systems', 'Track my car'],
  },
  {
    id: 'documents-insurance',
    emoji: '📄',
    title: 'Documents & Insurance',
    useWhen: 'Non-technical but essential',
    services: ['Motor insurance', 'Renew insurance', 'Transfer ownership', 'Road license', 'Driving permit help'],
  },
  {
    id: 'drivers-transport',
    emoji: '🚘',
    title: 'Drivers & Transport',
    useWhen: 'Human + mobility layer',
    services: ['Hire driver', 'Learn driving', 'Chauffeur services'],
  },
  {
    id: 'fuel-delivery',
    emoji: '⛽',
    title: 'Fuel & Delivery',
    useWhen: 'Convenience',
    services: ['Fuel delivery', 'Oil delivery', 'Battery delivery'],
  },
  {
    id: 'rent-buy-car',
    emoji: '🚙',
    title: 'Rent or Buy a Car',
    useWhen: 'Marketplace layer',
    services: ['Rent a car', 'Hire car with driver', 'Buy a car', 'Sell a car'],
  },
  {
    id: 'upgrade-my-car',
    emoji: '⭐',
    title: 'Upgrade My Car',
    useWhen: 'Lifestyle category',
    services: ['Install music system', 'Tint windows', 'Car wrapping', 'Interior upgrades', 'Lights upgrade'],
  },
];

export const providerServiceGroups: ProviderServiceGroup[] = [
  { id: 'a', title: 'A. Emergency & Roadside Services', services: ['Towing & recovery', 'Mobile mechanic', 'Jump-start', 'Lockout services', 'Fuel delivery'] },
  { id: 'b', title: 'B. General Mechanical Services', services: ['Engine repair', 'Gearbox repair', 'Brake systems', 'Suspension & steering', 'Exhaust systems'] },
  { id: 'c', title: 'C. Routine Maintenance', services: ['Oil service', 'Full service packages', 'Filter replacement', 'Fluid services'] },
  { id: 'd', title: 'D. Tyre & Battery Services', services: ['Tyre sales & repair', 'Wheel alignment & balancing', 'Battery sales & installation'] },
  { id: 'e', title: 'E. Auto Electrical & Electronics', services: ['Wiring & diagnostics', 'Alternator / starter repair', 'Key programming', 'Accessories installation'] },
  { id: 'f', title: 'F. AC & Cooling Specialists', services: ['AC repair', 'Gas refill', 'Radiator & cooling'] },
  { id: 'g', title: 'G. Bodywork & Paint', services: ['Panel beating', 'Spray painting', 'Dent repair'] },
  { id: 'h', title: 'H. Car Wash & Detailing', services: ['Basic wash', 'Detailing', 'Ceramic coating'] },
  { id: 'i', title: 'I. Security & Tracking', services: ['GPS tracking', 'Alarm systems', 'Immobilizers'] },
  { id: 'j', title: 'J. Documentation & Insurance Agents', services: ['Insurance services', 'Registration & licensing'] },
  { id: 'k', title: 'K. Mobility Services', services: ['Drivers', 'Driving schools', 'Chauffeurs'] },
  { id: 'l', title: 'L. Rental & Marketplace Providers', services: ['Car rentals', 'Car dealers'] },
  { id: 'm', title: 'M. Customization & Accessories', services: ['Sound systems', 'Interior upgrades', 'Car modifications'] },
];

export const providerSignupServiceOptions = providerServiceGroups.flatMap((group) => group.services);

export function servicesForPublicCategory(categoryTitle: string): string[] {
  return userServiceCategories.find((c) => c.title === categoryTitle)?.services ?? [];
}
