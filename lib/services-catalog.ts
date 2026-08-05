export type CatalogService = {
  name: string;
  defaultPriceUgx: number;
};

export type UserServiceCategory = {
  id: string;
  emoji: string;
  title: string;
  useWhen: string;
  services: CatalogService[];
};

/** Keywords for matching catalog products to a buyer service category (home feed + discovery). */
export const serviceIntentKeywordsByCategoryId: Record<string, string[]> = {
  'emergency-help': ['jump', 'start', 'tow', 'battery', 'flat', 'tyre', 'tire', 'fuel', 'stuck', 'rescue'],
  'fix-my-car': ['engine', 'brake', 'overheat', 'cooling', 'gearbox', 'clutch', 'suspension', 'electrical', 'repair'],
  'service-my-car': ['oil', 'filter', 'service', 'inspection', 'maintenance', 'fluid'],
  'tyres-battery': ['tyre', 'tire', 'wheel', 'alignment', 'battery'],
  'car-wash-cleaning': ['wash', 'clean', 'detailing', 'interior'],
  'body-repair-painting': ['body', 'paint', 'bumper', 'dent', 'scratch'],
  'ac-cooling': ['ac', 'air', 'cooling', 'radiator', 'overheat'],
  'security-tracking': ['tracker', 'tracking', 'alarm', 'gps', 'immobilizer', 'theft', 'security', 'anti-theft'],
  'documents-insurance': ['insurance', 'license', 'permit', 'registration', 'ownership', 'logbook', 'renew'],
  'drivers-transport': ['driver', 'chauffeur', 'driving', 'school', 'hire driver'],
  'fuel-delivery': ['fuel', 'petrol', 'diesel', 'delivery', 'oil delivery'],
  'rent-buy-car': ['rent', 'hire car', 'buy car', 'sell car', 'dealer', 'rental'],
  'upgrade-my-car': ['tint', 'wrap', 'stereo', 'speaker', 'upgrade', 'leather', 'lights', 'music', 'subwoofer'],
};

export type ProviderServiceGroup = {
  id: string;
  title: string;
  services: string[];
};

function svc(name: string, defaultPriceUgx: number): CatalogService {
  return { name, defaultPriceUgx };
}

export const userServiceCategories: UserServiceCategory[] = [
  {
    id: 'emergency-help',
    emoji: '🚨',
    title: "Emergency Help (I'm Stuck)",
    useWhen: "Use when: car won't move / urgent situation",
    services: [
      svc('Towing (accident / breakdown)', 180000),
      svc('Jump-start (dead battery)', 50000),
      svc('Flat tyre change', 45000),
      svc('Fuel delivery (ran out of fuel)', 40000),
      svc("Car won't start (mobile mechanic)", 80000),
      svc('Keys locked in car', 60000),
      svc('Vehicle stuck (mud, ditch recovery)', 200000),
    ],
  },
  {
    id: 'fix-my-car',
    emoji: '🔧',
    title: 'Fix My Car (Something is Wrong)',
    useWhen: 'Use when: car has a problem but not urgent',
    services: [
      svc('Engine problems (noise, overheating, smoke)', 150000),
      svc('Brake problems (not stopping well)', 120000),
      svc('Suspension issues (noise, rough ride)', 130000),
      svc('Electrical issues (lights, battery draining)', 90000),
      svc('AC not cooling', 100000),
      svc('Gearbox / clutch issues', 200000),
      svc('Exhaust problems', 80000),
    ],
  },
  {
    id: 'service-my-car',
    emoji: '🛠',
    title: 'Service My Car (Routine Maintenance)',
    useWhen: 'Use when: regular care / no problem yet',
    services: [
      svc('Oil change', 80000),
      svc('Full service (minor / major)', 180000),
      svc('Brake check', 50000),
      svc('Tyre rotation / alignment', 60000),
      svc('Battery check', 30000),
      svc('General inspection', 40000),
    ],
  },
  {
    id: 'tyres-battery',
    emoji: '🚗',
    title: 'Tyres & Battery',
    useWhen: 'High-frequency, simple category',
    services: [
      svc('Buy tyres', 250000),
      svc('Fix puncture', 25000),
      svc('Replace tyres', 80000),
      svc('Wheel alignment', 70000),
      svc('Battery replacement', 180000),
      svc('Battery charging', 30000),
    ],
  },
  {
    id: 'car-wash-cleaning',
    emoji: '🧼',
    title: 'Car Wash & Cleaning',
    useWhen: 'Very frequent + easy entry service',
    services: [
      svc('Basic wash', 15000),
      svc('Interior cleaning', 35000),
      svc('Full detailing', 120000),
      svc('Engine cleaning', 50000),
      svc('Mobile car wash (come to me)', 40000),
    ],
  },
  {
    id: 'body-repair-painting',
    emoji: '🎨',
    title: 'Body Repair & Painting',
    useWhen: 'Use when: physical damage',
    services: [
      svc('Dent removal', 150000),
      svc('Scratch repair', 100000),
      svc('Full painting', 800000),
      svc('Bumper repair', 200000),
      svc('Accident repair', 500000),
    ],
  },
  {
    id: 'ac-cooling',
    emoji: '❄️',
    title: 'Air Conditioning & Cooling',
    useWhen: 'Simple mental model for users',
    services: [
      svc('AC repair', 120000),
      svc('AC gas refill', 80000),
      svc('Car overheating', 100000),
      svc('Radiator issues', 110000),
    ],
  },
  {
    id: 'security-tracking',
    emoji: '🔐',
    title: 'Security & Tracking',
    useWhen: 'High relevance in Uganda',
    services: [
      svc('Install car tracker', 250000),
      svc('Install alarm', 180000),
      svc('Anti-theft systems', 300000),
      svc('Track my car', 50000),
    ],
  },
  {
    id: 'documents-insurance',
    emoji: '📄',
    title: 'Documents & Insurance',
    useWhen: 'Non-technical but essential',
    services: [
      svc('Motor insurance', 150000),
      svc('Renew insurance', 80000),
      svc('Transfer ownership', 120000),
      svc('Road license', 60000),
      svc('Driving permit help', 70000),
    ],
  },
  {
    id: 'drivers-transport',
    emoji: '🚘',
    title: 'Drivers & Transport',
    useWhen: 'Human + mobility layer',
    services: [
      svc('Hire driver', 80000),
      svc('Learn driving', 200000),
      svc('Chauffeur services', 150000),
    ],
  },
  {
    id: 'fuel-delivery',
    emoji: '⛽',
    title: 'Fuel & Delivery',
    useWhen: 'Convenience',
    services: [
      svc('Fuel delivery', 35000),
      svc('Oil delivery', 40000),
      svc('Battery delivery', 45000),
    ],
  },
  {
    id: 'rent-buy-car',
    emoji: '🚙',
    title: 'Rent or Buy a Car',
    useWhen: 'Marketplace layer',
    services: [
      svc('Rent a car', 150000),
      svc('Hire car with driver', 250000),
      svc('Buy a car', 0),
      svc('Sell a car', 0),
    ],
  },
  {
    id: 'upgrade-my-car',
    emoji: '⭐',
    title: 'Upgrade My Car',
    useWhen: 'Lifestyle category',
    services: [
      svc('Install music system', 200000),
      svc('Tint windows', 120000),
      svc('Car wrapping', 400000),
      svc('Interior upgrades', 250000),
      svc('Lights upgrade', 100000),
    ],
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

const FALLBACK_DEFAULT_PRICE_UGX = 50000;

export { FALLBACK_DEFAULT_PRICE_UGX };

export function getCatalogServiceNames(category: UserServiceCategory): string[] {
  return category.services.map((s) => s.name);
}

export function findCatalogService(
  serviceName: string,
  categoryId?: string,
): CatalogService | undefined {
  const needle = serviceName.trim().toLowerCase();
  const cats = categoryId
    ? userServiceCategories.filter((c) => c.id === categoryId)
    : userServiceCategories;
  for (const cat of cats) {
    const found = cat.services.find((s) => s.name.toLowerCase() === needle);
    if (found) return found;
  }
  return undefined;
}

export function getServiceDefaultPrice(serviceName: string, categoryId?: string): number {
  return findCatalogService(serviceName, categoryId)?.defaultPriceUgx ?? FALLBACK_DEFAULT_PRICE_UGX;
}

export function servicesForPublicCategory(categoryTitle: string): string[] {
  const cat = userServiceCategories.find((c) => c.title === categoryTitle);
  return cat ? getCatalogServiceNames(cat) : [];
}

export function getUserServiceCategoryById(id: string): UserServiceCategory | undefined {
  return userServiceCategories.find((c) => c.id === id);
}

export function getUserServiceCategoryByTitle(title: string): UserServiceCategory | undefined {
  const needle = title.trim().toLowerCase();
  return userServiceCategories.find((c) => c.title.toLowerCase() === needle);
}
