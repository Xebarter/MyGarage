import '../models/models.dart';

CatalogService _svc(String name, int defaultPriceUgx) =>
    CatalogService(name: name, defaultPriceUgx: defaultPriceUgx);

/// Local catalog used for discovery (same content as former Expo services-catalog).
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
    ],
  ),
  ServiceCategory(
    id: 'body-paint',
    emoji: '🎨',
    title: 'Body & Paint',
    useWhen: 'Appearance and bodywork',
    priority: 'optional',
    services: [
      _svc('Dent repair', 150000),
      _svc('Scratch repair', 80000),
      _svc('Full respray estimate', 500000),
      _svc('Bumper repair', 120000),
    ],
  ),
  ServiceCategory(
    id: 'inspection-paperwork',
    emoji: '📋',
    title: 'Inspection & Paperwork',
    useWhen: 'Compliance and documentation',
    priority: 'optional',
    services: [
      _svc('Pre-purchase inspection', 100000),
      _svc('Insurance assessment support', 80000),
      _svc('Roadworthy checklist', 60000),
    ],
  ),
];

ServiceCategory? categoryById(String id) {
  for (final c in userServiceCategories) {
    if (c.id == id) return c;
  }
  return null;
}
