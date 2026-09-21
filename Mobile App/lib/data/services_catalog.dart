import '../models/models.dart';

CatalogService _svc(String name, int defaultPriceUgx) =>
    CatalogService(name: name, defaultPriceUgx: defaultPriceUgx);

/// Buyer Play Store ids that differ from the shared web catalog.
const Map<String, String> _categoryIdAliases = {
  'body-paint': 'body-repair-painting',
  'inspection-paperwork': 'documents-insurance',
};

/// Keywords for matching catalog services (mirrors `lib/services-catalog.ts`).
const Map<String, List<String>> serviceIntentKeywordsByCategoryId = {
  'emergency-help': [
    'jump',
    'start',
    'tow',
    'battery',
    'flat',
    'tyre',
    'tire',
    'fuel',
    'stuck',
    'rescue',
  ],
  'fix-my-car': [
    'engine',
    'brake',
    'overheat',
    'cooling',
    'gearbox',
    'clutch',
    'suspension',
    'electrical',
    'repair',
  ],
  'service-my-car': [
    'oil',
    'filter',
    'service',
    'inspection',
    'maintenance',
    'fluid',
  ],
  'tyres-battery': ['tyre', 'tire', 'wheel', 'alignment', 'battery'],
  'car-wash-cleaning': ['wash', 'clean', 'detailing', 'interior'],
  'body-repair-painting': ['body', 'paint', 'bumper', 'dent', 'scratch'],
  'ac-cooling': ['ac', 'air', 'cooling', 'radiator', 'overheat'],
  'security-tracking': [
    'tracker',
    'tracking',
    'alarm',
    'gps',
    'immobilizer',
    'theft',
    'security',
    'anti-theft',
  ],
  'documents-insurance': [
    'insurance',
    'license',
    'permit',
    'registration',
    'ownership',
    'logbook',
    'renew',
  ],
  'drivers-transport': [
    'driver',
    'chauffeur',
    'driving',
    'school',
    'hire driver',
  ],
  'fuel-delivery': ['fuel', 'petrol', 'diesel', 'delivery', 'oil delivery'],
  'rent-buy-car': [
    'rent',
    'hire car',
    'buy car',
    'sell car',
    'dealer',
    'rental',
  ],
  'upgrade-my-car': [
    'tint',
    'wrap',
    'stereo',
    'speaker',
    'upgrade',
    'leather',
    'lights',
    'music',
    'subwoofer',
  ],
};

/// Same catalog as `lib/services-catalog.ts` on the web app.
final List<ServiceCategory> userServiceCategories = [
  ServiceCategory(
    id: 'emergency-help',
    emoji: '🚨',
    title: "Emergency Help (I'm Stuck)",
    useWhen: "Use when: car won't move / urgent situation",
    priority: 'urgent',
    services: [
      _svc('Towing (accident / breakdown)', 180000),
      _svc('Jump-start (dead battery)', 50000),
      _svc('Flat tyre change', 45000),
      _svc('Fuel delivery (ran out of fuel)', 40000),
      _svc("Car won't start (mobile mechanic)", 80000),
      _svc('Keys locked in car', 60000),
      _svc('Vehicle stuck (mud, ditch recovery)', 200000),
    ],
  ),
  ServiceCategory(
    id: 'fix-my-car',
    emoji: '🔧',
    title: 'Fix My Car (Something is Wrong)',
    useWhen: 'Use when: car has a problem but not urgent',
    priority: 'common',
    services: [
      _svc('Engine problems (noise, overheating, smoke)', 150000),
      _svc('Brake problems (not stopping well)', 120000),
      _svc('Suspension issues (noise, rough ride)', 130000),
      _svc('Electrical issues (lights, battery draining)', 90000),
      _svc('AC not cooling', 100000),
      _svc('Gearbox / clutch issues', 200000),
      _svc('Exhaust problems', 80000),
    ],
  ),
  ServiceCategory(
    id: 'service-my-car',
    emoji: '🛠',
    title: 'Service My Car (Routine Maintenance)',
    useWhen: 'Use when: regular care / no problem yet',
    priority: 'common',
    services: [
      _svc('Oil change', 80000),
      _svc('Full service (minor / major)', 180000),
      _svc('Brake check', 50000),
      _svc('Tyre rotation / alignment', 60000),
      _svc('Battery check', 30000),
      _svc('General inspection', 40000),
    ],
  ),
  ServiceCategory(
    id: 'tyres-battery',
    emoji: '🚗',
    title: 'Tyres & Battery',
    useWhen: 'High-frequency, simple category',
    priority: 'common',
    services: [
      _svc('Buy tyres', 250000),
      _svc('Fix puncture', 25000),
      _svc('Replace tyres', 80000),
      _svc('Wheel alignment', 70000),
      _svc('Battery replacement', 180000),
      _svc('Battery charging', 30000),
    ],
  ),
  ServiceCategory(
    id: 'car-wash-cleaning',
    emoji: '🧼',
    title: 'Car Wash & Cleaning',
    useWhen: 'Very frequent + easy entry service',
    priority: 'common',
    services: [
      _svc('Basic wash', 15000),
      _svc('Interior cleaning', 35000),
      _svc('Full detailing', 120000),
      _svc('Engine cleaning', 50000),
      _svc('Mobile car wash (come to me)', 40000),
    ],
  ),
  ServiceCategory(
    id: 'body-repair-painting',
    emoji: '🎨',
    title: 'Body Repair & Painting',
    useWhen: 'Use when: physical damage',
    priority: 'optional',
    services: [
      _svc('Dent removal', 150000),
      _svc('Scratch repair', 100000),
      _svc('Full painting', 800000),
      _svc('Bumper repair', 200000),
      _svc('Accident repair', 500000),
    ],
  ),
  ServiceCategory(
    id: 'ac-cooling',
    emoji: '❄️',
    title: 'Air Conditioning & Cooling',
    useWhen: 'Simple mental model for users',
    priority: 'common',
    services: [
      _svc('AC repair', 120000),
      _svc('AC gas refill', 80000),
      _svc('Car overheating', 100000),
      _svc('Radiator issues', 110000),
    ],
  ),
  ServiceCategory(
    id: 'security-tracking',
    emoji: '🔐',
    title: 'Security & Tracking',
    useWhen: 'High relevance in Uganda',
    priority: 'optional',
    services: [
      _svc('Install car tracker', 250000),
      _svc('Install alarm', 180000),
      _svc('Anti-theft systems', 300000),
      _svc('Track my car', 50000),
    ],
  ),
  ServiceCategory(
    id: 'documents-insurance',
    emoji: '📄',
    title: 'Documents & Insurance',
    useWhen: 'Non-technical but essential',
    priority: 'optional',
    services: [
      _svc('Motor insurance', 150000),
      _svc('Renew insurance', 80000),
      _svc('Transfer ownership', 120000),
      _svc('Road license', 60000),
      _svc('Driving permit help', 70000),
    ],
  ),
  ServiceCategory(
    id: 'drivers-transport',
    emoji: '🚘',
    title: 'Drivers & Transport',
    useWhen: 'Human + mobility layer',
    priority: 'optional',
    services: [
      _svc('Hire driver', 80000),
      _svc('Learn driving', 200000),
      _svc('Chauffeur services', 150000),
    ],
  ),
  ServiceCategory(
    id: 'fuel-delivery',
    emoji: '⛽',
    title: 'Fuel & Delivery',
    useWhen: 'Convenience',
    priority: 'common',
    services: [
      _svc('Fuel delivery', 35000),
      _svc('Oil delivery', 40000),
      _svc('Battery delivery', 45000),
    ],
  ),
  ServiceCategory(
    id: 'rent-buy-car',
    emoji: '🚙',
    title: 'Rent or Buy a Car',
    useWhen: 'Marketplace layer',
    priority: 'optional',
    services: [
      _svc('Rent a car', 150000),
      _svc('Hire car with driver', 250000),
      _svc('Buy a car', 0),
      _svc('Sell a car', 0),
    ],
  ),
  ServiceCategory(
    id: 'upgrade-my-car',
    emoji: '⭐',
    title: 'Upgrade My Car',
    useWhen: 'Lifestyle category',
    priority: 'optional',
    services: [
      _svc('Install music system', 200000),
      _svc('Tint windows', 120000),
      _svc('Car wrapping', 400000),
      _svc('Interior upgrades', 250000),
      _svc('Lights upgrade', 100000),
    ],
  ),
];

ServiceCategory? categoryById(String id) {
  final canonical = _categoryIdAliases[id] ?? id;
  for (final c in userServiceCategories) {
    if (c.id == canonical) return c;
  }
  return null;
}
