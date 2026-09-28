import type { SeoLandingPage } from '@/lib/seo/landing/types';
import { servicesHref, shopQueryHref } from '@/lib/seo/landing/links';

export type ModelRecord = {
  slug: string;
  name: string;
  brandSlug: string;
  brandName: string;
  note: string;
  commonParts: string[];
};

export const SEO_MODELS: ModelRecord[] = [
  { slug: 'toyota-premio', name: 'Toyota Premio', brandSlug: 'toyota', brandName: 'Toyota', note: 'The default Kampala saloon. High mileage, taxi-adjacent examples, and family cars share the same parts bins.', commonParts: ['brake pads', 'shock absorbers', 'oil filters', 'spark plugs'] },
  { slug: 'toyota-fielder', name: 'Toyota Fielder', brandSlug: 'toyota', brandName: 'Toyota', note: 'Wagon practicality with Premio-like running gear. Rear suspension and boot rust checks matter on older imports.', commonParts: ['brake pads', 'rear shocks', 'control arms', 'filters'] },
  { slug: 'toyota-harrier', name: 'Toyota Harrier', brandSlug: 'toyota', brandName: 'Toyota', note: 'Kampala SUV status car. Facelifts change headlights and sensors — buy by chassis, not by “Harrier” nickname.', commonParts: ['brake pads', 'air filters', 'suspension bushes', 'headlights'] },
  { slug: 'toyota-noah', name: 'Toyota Noah', brandSlug: 'toyota', brandName: 'Toyota', note: 'Family and church-run MPV. Sliding-door rollers and rear AC jobs are local workshop regulars.', commonParts: ['brake pads', 'door rollers', 'filters', 'spark plugs'] },
  { slug: 'toyota-voxy', name: 'Toyota Voxy', brandSlug: 'toyota', brandName: 'Toyota', note: 'Sister to the Noah with different nose and lamps. Do not mix body parts without a photo of the year.', commonParts: ['headlights', 'brake pads', 'filters', 'side mirrors'] },
  { slug: 'toyota-wish', name: 'Toyota Wish', brandSlug: 'toyota', brandName: 'Toyota', note: 'Compact MPV that still fills school-run parks. Cooling and ignition parts are frequent.', commonParts: ['thermostat', 'spark plugs', 'brake pads', 'radiator'] },
  { slug: 'toyota-corolla', name: 'Toyota Corolla', brandSlug: 'toyota', brandName: 'Toyota', note: 'Global name, many generations. Confirm E120 vs later Axio-related cars before ordering body parts.', commonParts: ['brake pads', 'filters', 'wipers', 'batteries'] },
  { slug: 'toyota-axio', name: 'Toyota Axio', brandSlug: 'toyota', brandName: 'Toyota', note: 'Corolla Axio is a Kampala taxi and family staple. Consumables turn over constantly.', commonParts: ['brake pads', 'oil filters', 'air filters', 'spark plugs'] },
  { slug: 'toyota-allion', name: 'Toyota Allion', brandSlug: 'toyota', brandName: 'Toyota', note: 'Premio’s sibling. Many mechanical parts cross; lamps and bumper covers often do not.', commonParts: ['brake pads', 'shocks', 'filters', 'headlights'] },
  { slug: 'toyota-rav4', name: 'Toyota RAV4', brandSlug: 'toyota', brandName: 'Toyota', note: 'Compact SUV with generation-specific engines. Drivetrain clicks and bushings after potholes are common.', commonParts: ['brake pads', 'control arms', 'filters', 'wheel bearings'] },
  { slug: 'toyota-prado', name: 'Toyota Prado', brandSlug: 'toyota', brandName: 'Toyota', note: 'NGO and family 4x4. Cooling, underbody, and diesel service (where fitted) deserve a proper workshop.', commonParts: ['brake pads', 'filters', 'shock absorbers', 'batteries'] },
  { slug: 'toyota-land-cruiser', name: 'Toyota Land Cruiser', brandSlug: 'toyota', brandName: 'Toyota', note: '70, 80, 100, 200 series are different animals. Always state the series when you order parts.', commonParts: ['brake parts', 'steering components', 'filters', 'body parts'] },
  { slug: 'toyota-hilux', name: 'Toyota Hilux', brandSlug: 'toyota', brandName: 'Toyota', note: 'Uganda’s pick-up. Clutch, cooling, and load-related suspension are the daily workshop list.', commonParts: ['clutch components', 'fuel filters', 'brake pads', 'shock absorbers'] },
  { slug: 'toyota-hiace', name: 'Toyota Hiace', brandSlug: 'toyota', brandName: 'Toyota', note: 'Taxis and church vans. High idle hours destroy oil, clutches, and brakes. Service more often than a private saloon.', commonParts: ['brake parts', 'clutch', 'filters', 'batteries'] },
  { slug: 'toyota-fortuner', name: 'Toyota Fortuner', brandSlug: 'toyota', brandName: 'Toyota', note: 'Hilux-based SUV. Shares many running-gear parts with Hilux of the same generation.', commonParts: ['brake pads', 'filters', 'shocks', 'control arms'] },
  { slug: 'toyota-alphard', name: 'Toyota Alphard', brandSlug: 'toyota', brandName: 'Toyota', note: 'Luxury MPV. Power-door and air-suspension variants need specialists and numbered parts.', commonParts: ['brake pads', 'air springs where fitted', 'filters', 'sensors'] },
  { slug: 'toyota-sienta', name: 'Toyota Sienta', brandSlug: 'toyota', brandName: 'Toyota', note: 'Small MPV for Kampala lanes. CVT care and sliding-door hardware show up in requests.', commonParts: ['filters', 'brake pads', 'spark plugs', 'door parts'] },
  { slug: 'toyota-raum', name: 'Toyota Raum', brandSlug: 'toyota', brandName: 'Toyota', note: 'Older compact MPV still in school traffic. Aftermarket parts are common; measure before buying body pieces.', commonParts: ['brake pads', 'filters', 'wipers', 'lamps'] },
  { slug: 'toyota-passo', name: 'Toyota Passo', brandSlug: 'toyota', brandName: 'Toyota', note: 'City kei-adjacent car. Light parts, frequent brake and tyre work in potholes.', commonParts: ['brake pads', 'tyres', 'filters', 'batteries'] },
  { slug: 'toyota-vitz', name: 'Toyota Vitz', brandSlug: 'toyota', brandName: 'Toyota', note: 'Hatchback school and first-car staple. Ignition and cooling parts are cheap until you buy the wrong generation.', commonParts: ['spark plugs', 'thermostat', 'brake pads', 'filters'] },
  { slug: 'toyota-belta', name: 'Toyota Belta', brandSlug: 'toyota', brandName: 'Toyota', note: 'Vitz-based saloon. Many mechanical parts cross with Vitz of the same years.', commonParts: ['brake pads', 'filters', 'spark plugs', 'shocks'] },
  { slug: 'toyota-probox', name: 'Toyota Probox', brandSlug: 'toyota', brandName: 'Toyota', note: 'Work wagon. Beat on daily. Expect brakes, bushes, and cooling — and confirm 2WD/4WD.', commonParts: ['brake shoes and pads', 'bushes', 'filters', 'clutch'] },
  { slug: 'toyota-succeed', name: 'Toyota Succeed', brandSlug: 'toyota', brandName: 'Toyota', note: 'Probox sibling. Same caution on generation and drivetrain when ordering parts.', commonParts: ['brake parts', 'filters', 'shocks', 'lamps'] },
  { slug: 'toyota-ist', name: 'Toyota Ist', brandSlug: 'toyota', brandName: 'Toyota', note: 'Compact crossover-hatch. Urban scratches make body parts a live category.', commonParts: ['bumpers', 'side mirrors', 'brake pads', 'filters'] },
  { slug: 'toyota-mark-x', name: 'Toyota Mark X', brandSlug: 'toyota', brandName: 'Toyota', note: 'RWD saloon. Different spare-parts logic from Premio. State GRX year when you order.', commonParts: ['brake discs', 'suspension', 'filters', 'spark plugs'] },
  { slug: 'nissan-x-trail', name: 'Nissan X-Trail', brandSlug: 'nissan', brandName: 'Nissan', note: 'Kampala family SUV. CVT behaviour, transfer-case chatter, and tyre size mistakes are the classic tickets.', commonParts: ['brake pads', 'driveshaft boots', 'filters', 'tyres'] },
  { slug: 'nissan-serena', name: 'Nissan Serena', brandSlug: 'nissan', brandName: 'Nissan', note: 'MPV rival to Noah. Door hardware and rear HVAC matter as much as engine service.', commonParts: ['brake pads', 'filters', 'spark plugs', 'sliding door parts'] },
  { slug: 'nissan-note', name: 'Nissan Note', brandSlug: 'nissan', brandName: 'Nissan', note: 'Compact hatch. Electrics and CVT conversations show up more than people expect.', commonParts: ['filters', 'brake pads', 'batteries', 'spark plugs'] },
  { slug: 'nissan-dualis', name: 'Nissan Dualis', brandSlug: 'nissan', brandName: 'Nissan', note: 'Qashqai/Dualis generation in Uganda. Confirm J10 vs later before body parts.', commonParts: ['brake pads', 'control arms', 'filters', 'lamps'] },
  { slug: 'nissan-juke', name: 'Nissan Juke', brandSlug: 'nissan', brandName: 'Nissan', note: 'Styling-heavy crossover. Unique body panels — photograph before you order a bumper.', commonParts: ['bumpers', 'headlights', 'brake pads', 'filters'] },
  { slug: 'nissan-navara', name: 'Nissan Navara', brandSlug: 'nissan', brandName: 'Nissan', note: 'Pick-up competitor to Hilux. Diesel filters and clutch jobs dominate.', commonParts: ['fuel filters', 'clutch', 'brake pads', 'shocks'] },
  { slug: 'nissan-patrol', name: 'Nissan Patrol', brandSlug: 'nissan', brandName: 'Nissan', note: 'Full-size 4x4. Parts are heavier and more expensive — use OEM numbers.', commonParts: ['brake parts', 'filters', 'steering', 'body'] },
  { slug: 'nissan-caravan', name: 'Nissan Caravan', brandSlug: 'nissan', brandName: 'Nissan', note: 'Van workhorse. High idle, high brake wear, similar story to Hiace.', commonParts: ['brake parts', 'filters', 'clutch', 'batteries'] },
  { slug: 'nissan-wingroad', name: 'Nissan Wingroad', brandSlug: 'nissan', brandName: 'Nissan', note: 'Wagon that still serves families. Rear suspension and lamps are frequent.', commonParts: ['rear shocks', 'brake pads', 'filters', 'lamps'] },
  { slug: 'subaru-forester', name: 'Subaru Forester', brandSlug: 'subaru', brandName: 'Subaru', note: 'The Uganda Subaru. Equal tyres, head-gasket awareness on older engines, and honest alignment.', commonParts: ['tyres', 'spark plugs', 'timing components', 'brake pads'] },
  { slug: 'subaru-impreza', name: 'Subaru Impreza', brandSlug: 'subaru', brandName: 'Subaru', note: 'Saloon and hatch. Turbo vs NA changes everything — state it in the parts search.', commonParts: ['spark plugs', 'brake pads', 'clutch on turbo', 'filters'] },
  { slug: 'subaru-legacy', name: 'Subaru Legacy', brandSlug: 'subaru', brandName: 'Subaru', note: 'Estate and saloon. Same boxer rules: leaks, equal tyres, numbered sensors.', commonParts: ['head gasket related parts on older cars', 'brake pads', 'filters', 'shocks'] },
  { slug: 'subaru-outback', name: 'Subaru Outback', brandSlug: 'subaru', brandName: 'Subaru', note: 'Raised Legacy. Bushes and tyres take the pothole tax.', commonParts: ['control arms', 'tyres', 'brake pads', 'filters'] },
  { slug: 'subaru-xv', name: 'Subaru XV', brandSlug: 'subaru', brandName: 'Subaru', note: 'Crosstrek/XV. Confirm year for lighting and bumper covers.', commonParts: ['brake pads', 'filters', 'tyres', 'lamps'] },
  { slug: 'subaru-exiga', name: 'Subaru Exiga', brandSlug: 'subaru', brandName: 'Subaru', note: 'Seven-seat Subaru. Less common, so parts need photos and numbers, not guesses.', commonParts: ['brake pads', 'filters', 'spark plugs', 'rear lamps'] },
];

export function composeModelPage(model: ModelRecord, partLinks: { label: string; href: string }[]): SeoLandingPage {
  const path = `/models/${model.slug}`;
  const parts = model.commonParts.join(', ');
  return {
    kind: 'model',
    slug: model.slug,
    path,
    h1: `${model.name} spare parts, mechanic and service in Uganda`,
    title: `${model.name} Spare Parts Kampala — Service, Repair & Mechanics`,
    description: `${model.name} spare parts in Uganda and Kampala. Book a ${model.name} mechanic, service, and repair, and shop common ${model.name} parts on MyGarage.`,
    keywords: [
      `${model.name} spare parts`,
      `${model.name} parts Uganda`,
      `${model.name} parts Kampala`,
      `${model.name} mechanic Kampala`,
      `${model.name} service Kampala`,
      `${model.name} repair Kampala`,
    ],
    intro: `${model.note} MyGarage targets the searches people actually type: ${model.name} spare parts Kampala, ${model.name} mechanic, and ${model.name} service.`,
    sections: [
      {
        heading: `${model.name} parts`,
        body: `Common ${model.name} parts on Ugandan roads include ${parts}. Search the storefront with the model plus the part, or use an OEM number from the old component. Generation mistakes are the usual returns.`,
      },
      {
        heading: `${model.name} mechanic and service in Kampala`,
        body: `Book ${model.name} service or repair through MyGarage. Tell the provider the year and engine (petrol or diesel). If the car will not move, request roadside help or a tow to a garage that knows ${model.brandName} cars.`,
      },
      {
        heading: `Repair versus servicing`,
        body: `Servicing is oil, filters, and inspection. Repair is the fault: brakes, suspension after potholes, overheating, or electrics. Keep both on the ${model.name} vehicle profile so the next job is cheaper to quote.`,
      },
    ],
    faqs: [
      {
        question: `Where can I buy ${model.name} parts in Kampala?`,
        answer: `Search MyGarage for ${model.name} and the part name. Open the ${model.brandName} brand page for more models. Send chassis details to support if listings look ambiguous.`,
      },
      {
        question: `Can I book a ${model.name} mechanic?`,
        answer: `Yes. Use Book Services, name the ${model.name}, and describe the symptom. Mobile mechanics can handle some jobs; gearboxes and alignment still need a workshop.`,
      },
      {
        question: `Do ${model.name} brake pads fit other ${model.brandName} cars?`,
        answer: `Sometimes they share platforms, often they do not. Use the part number or a year-specific listing. See the brake pads part page for how we talk about fitment.`,
      },
    ],
    ctas: [
      { label: `Shop ${model.name} parts`, href: shopQueryHref(model.name) },
      { label: `Book ${model.name} service`, href: servicesHref() },
    ],
    related: [
      { label: `${model.brandName} parts & service`, href: `/brands/${model.brandSlug}` },
      { label: 'All models', href: '/models' },
      { label: 'Spare parts', href: '/spare-parts' },
      { label: 'Mechanics', href: '/mechanics' },
      ...partLinks.slice(0, 6),
    ],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Models', href: '/models' },
      { label: model.name, href: path },
    ],
    priority: 0.82,
  };
}
