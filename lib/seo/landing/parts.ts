import type { SeoLandingPage } from '@/lib/seo/landing/types';
import { servicesHref, shopQueryHref } from '@/lib/seo/landing/links';

export type PartRecord = {
  slug: string;
  name: string;
  group: string;
  search: string;
  note: string;
  symptoms: string[];
};

export const SEO_PARTS: PartRecord[] = [
  { slug: 'brake-pads', name: 'Brake pads', group: 'Braking', search: 'brake pads', note: 'Highest-frequency friction part in Kampala stop-start traffic and taxi use.', symptoms: ['squeaking brakes', 'long stopping distance', 'metal-on-metal grinding'] },
  { slug: 'brake-discs', name: 'Brake discs', group: 'Braking', search: 'brake disc', note: 'Discs (rotors) warp or lip after overheating on Entebbe Road descents and overloaded vans.', symptoms: ['steering shake under braking', 'visible lip on the disc', 'pulsing pedal'] },
  { slug: 'brake-calipers', name: 'Brake calipers', group: 'Braking', search: 'brake caliper', note: 'Seized calipers from dusty roads make pads wear on one side only.', symptoms: ['car pulling to one side', 'hot wheel after a short drive', 'uneven pad wear'] },
  { slug: 'shock-absorbers', name: 'Shock absorbers', group: 'Suspension', search: 'shock absorber', note: 'Potholes finish shocks early. Pair replacement left-and-right on the same axle.', symptoms: ['bouncing after bumps', 'nose dive', 'uneven tyre wear'] },
  { slug: 'control-arms', name: 'Control arms', group: 'Suspension', search: 'control arm', note: 'Bushes collapse on Kampala roads long before the arm itself cracks.', symptoms: ['clunks over speed humps', 'vague steering', 'inner tyre wear'] },
  { slug: 'ball-joints', name: 'Ball joints', group: 'Suspension', search: 'ball joint', note: 'Safety item. Play in a joint is not a “wait until payday” job.', symptoms: ['knocking on lock', 'wander', 'uneven tyre wear'] },
  { slug: 'tie-rods', name: 'Tie rods', group: 'Suspension', search: 'tie rod', note: 'Alignment will not hold if inner or outer tie rods are worn.', symptoms: ['dead steering in the centre', 'click on lock', 'rapid tyre wear'] },
  { slug: 'wheel-bearings', name: 'Wheel bearings', group: 'Suspension', search: 'wheel bearing', note: 'Growl that rises with speed is often a bearing, not a “mystery tyre”.', symptoms: ['hum that changes in corners', 'play at the wheel', 'ABS light on some cars'] },
  { slug: 'oil-filter', name: 'Oil filters', group: 'Engine', search: 'oil filter', note: 'Cheap filters bypass early. Match the thread and bypass valve to the engine, not just “Toyota filter”.', symptoms: ['overdue service', 'low oil pressure light', 'sludge on the cap'] },
  { slug: 'air-filter', name: 'Air filters', group: 'Engine', search: 'air filter', note: 'Kampala dust loads paper filters fast. A blocked filter is a fuel-consumption complaint waiting to happen.', symptoms: ['lazy acceleration', 'black smoke on diesels', 'dirty filter on inspection'] },
  { slug: 'fuel-filter', name: 'Fuel filters', group: 'Engine', search: 'fuel filter', note: 'Diesel Hilux, Hiace, and Navara cars live or die on fuel filter discipline.', symptoms: ['loss of power', 'hard start when hot', 'injector complaints'] },
  { slug: 'spark-plugs', name: 'Spark plugs', group: 'Engine', search: 'spark plugs', note: 'Misfires, coil damage, and rough idle often start with worn plugs on petrol Toyotas.', symptoms: ['misfire', 'check engine light', 'poor fuel economy'] },
  { slug: 'timing-belt', name: 'Timing belts', group: 'Engine', search: 'timing belt', note: 'Interference engines punish skipped interval changes. Confirm belt vs chain for your engine code.', symptoms: ['due mileage unknown', 'ticking from covers', 'no-start after jump'] },
  { slug: 'water-pump', name: 'Water pumps', group: 'Engine', search: 'water pump', note: 'Often replaced with the timing belt. Weep holes and bearing noise are the tells.', symptoms: ['coolant puddle', 'overheating', 'squeal from the front'] },
  { slug: 'thermostat', name: 'Thermostats', group: 'Engine', search: 'thermostat', note: 'Stuck-open thermostats hide as “car never warms”; stuck-closed as overheating in jam.', symptoms: ['overheating', 'cold gauge in traffic', 'heater not working'] },
  { slug: 'radiator', name: 'Radiators', group: 'Engine', search: 'radiator', note: 'Stone chips, poor water, and electric-fan failures cook radiators. Plastic tanks crack in heat.', symptoms: ['overheating', 'sweet smell', 'visible leaks'] },
  { slug: 'alternator', name: 'Alternators', group: 'Electrical', search: 'alternator', note: 'If jump-starts keep happening with a new battery, test the alternator before buying a second battery.', symptoms: ['battery light', 'dim lights at idle', 'dead battery after a short park'] },
  { slug: 'starter-motor', name: 'Starter motors', group: 'Electrical', search: 'starter motor', note: 'Click-no-crank is not always the battery. Solenoids die on high-cycle taxis.', symptoms: ['single click', 'intermittent crank', 'starter stays engaged'] },
  { slug: 'car-battery', name: 'Car batteries', group: 'Electrical', search: 'car battery', note: 'Heat kills batteries in Uganda faster than European replacement intervals suggest.', symptoms: ['slow crank', 'clicking', 'age over three years'] },
  { slug: 'oxygen-sensor', name: 'Oxygen sensors', group: 'Electrical', search: 'oxygen sensor', note: 'A classic check-engine cause on older imports. Buy by position (upstream/downstream) and number.', symptoms: ['check engine light', 'high fuel use', 'failed emissions sniff'] },
  { slug: 'mass-airflow-sensor', name: 'MAF sensors', group: 'Electrical', search: 'MAF sensor', note: 'Dirty or failing MAF sensors mimic vacuum leaks. Do not oil a MAF with the wrong cleaner.', symptoms: ['rough idle', 'stalling', 'check engine light'] },
  { slug: 'headlights', name: 'Headlights', group: 'Body', search: 'headlight', note: 'Harrier, Voxy, and Juke lamps are generation-specific. HID vs halogen vs LED is not interchangeable by guess.', symptoms: ['cracked lens', 'moisture', 'dim beam'] },
  { slug: 'side-mirrors', name: 'Side mirrors', group: 'Body', search: 'side mirror', note: 'Kampala parking-lot damage. Confirm indicator-in-mirror, camera, and paint code.', symptoms: ['broken glass', 'loose housing', 'dead indicator'] },
  { slug: 'bumpers', name: 'Bumpers', group: 'Body', search: 'bumper', note: 'Body parts need photos. Premio and Allion fronts are not a random swap.', symptoms: ['cracks', 'missing clips', 'sensor holes on later cars'] },
  { slug: 'windscreen', name: 'Windscreens', group: 'Body', search: 'windscreen', note: 'Stone chips on Jinja Road. Rain sensors and cameras on later cars need calibrated glass.', symptoms: ['crack in driver view', 'leaks', 'failed ADAS camera'] },
  { slug: 'engine-oil', name: 'Engine oil', group: 'Engine', search: 'engine oil', note: 'Correct spec matters more than a famous bottle. Diesels, skyactiv, and VW-group cars are picky.', symptoms: ['due service', 'ticking on start', 'unknown last oil'] },
];

export function composePartPage(part: PartRecord): SeoLandingPage {
  const path = `/parts/${part.slug}`;
  const symptomText = part.symptoms.join(', ');
  return {
    kind: 'part',
    slug: part.slug,
    path,
    h1: `${part.name} in Uganda`,
    title: `${part.name} Uganda — Buy ${part.name} in Kampala | MyGarage`,
    description: `Buy ${part.name.toLowerCase()} in Kampala and Uganda. ${part.note} Shop on MyGarage and book fitting with a mechanic.`,
    keywords: [
      `${part.name} Uganda`,
      `${part.name} Kampala`,
      `${part.name} near me`,
      `buy ${part.search}`,
      `${part.search} Toyota`,
      'car spare parts Uganda',
    ],
    intro: `${part.note} MyGarage is how you buy ${part.name.toLowerCase()} in Kampala, confirm fitment, and book a mechanic if you need them fitted.`,
    sections: [
      {
        heading: `When you need ${part.name.toLowerCase()}`,
        body: `Drivers usually search this part after: ${symptomText}. Do not wait if the part is safety-critical (brakes, steering joints, tyres).`,
      },
      {
        heading: 'Fitment and OEM numbers',
        body: `${part.name} for a Toyota Premio are not automatically right for a Fielder or Harrier. Use the OEM part number, chassis, and year. Brand pages and model pages exist so you can start from the car, not only the part.`,
      },
      {
        heading: 'Buy and fit on one platform',
        body: `Shop ${part.name.toLowerCase()} on the marketplace, then book repair or servicing if you cannot fit it yourself. Keep the invoice on the vehicle profile.`,
      },
    ],
    faqs: [
      {
        question: `Can I buy ${part.name.toLowerCase()} online in Uganda?`,
        answer: `Yes. Search MyGarage for “${part.search}” and filter by your car details. Support can match a photo of the old part.`,
      },
      {
        question: `Do you have ${part.name.toLowerCase()} in Kampala for Toyota and Nissan?`,
        answer: `Those brands dominate the catalogue opportunity. Open the Toyota or Nissan brand page and search the part name together.`,
      },
      {
        question: 'Genuine or aftermarket?',
        answer: `For ${part.group.toLowerCase()} items that affect safety or engine timing, prefer OEM or a known brand. Read OEM vs aftermarket in Academy.`,
      },
    ],
    ctas: [
      { label: `Shop ${part.name.toLowerCase()}`, href: shopQueryHref(part.search) },
      { label: 'Book fitting / repair', href: servicesHref() },
    ],
    related: [
      { label: 'All parts', href: '/parts' },
      { label: 'Spare parts', href: '/spare-parts' },
      { label: 'OEM lookup', href: '/oem-parts' },
      { label: 'Car repair', href: '/car-repair' },
      { label: 'Toyota parts', href: '/brands/toyota' },
      { label: 'Nissan parts', href: '/brands/nissan' },
    ],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Parts', href: '/parts' },
      { label: part.name, href: path },
    ],
    priority: 0.84,
  };
}
