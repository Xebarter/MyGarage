import type { CatalogService, ServiceCategory } from '@/types';

function svc(name: string, defaultPriceUgx: number): CatalogService {
  return { name, defaultPriceUgx };
}

export const userServiceCategories: ServiceCategory[] = [
  {
    id: 'emergency-help',
    emoji: '🚨',
    title: "Emergency Help (I'm Stuck)",
    useWhen: "Use when: car won't move / urgent situation",
    priority: 'urgent',
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
    priority: 'common',
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
    priority: 'common',
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
    priority: 'common',
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
    priority: 'common',
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
    priority: 'optional',
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
    priority: 'common',
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
    priority: 'optional',
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
    priority: 'optional',
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
    priority: 'optional',
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
    priority: 'common',
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
    priority: 'optional',
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
    priority: 'optional',
    services: [
      svc('Install music system', 200000),
      svc('Tint windows', 120000),
      svc('Car wrapping', 400000),
      svc('Interior upgrades', 250000),
      svc('Lights upgrade', 100000),
    ],
  },
];

export function getServiceCategoryById(id: string): ServiceCategory | undefined {
  return userServiceCategories.find((c) => c.id === id);
}

export function getCatalogServiceNames(category: ServiceCategory): string[] {
  return category.services.map((s) => s.name);
}
