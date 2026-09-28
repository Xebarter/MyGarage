import type { SeoLandingPage } from '@/lib/seo/landing/types';
import { servicesHref, shopQueryHref } from '@/lib/seo/landing/links';

export type BrandRecord = {
  slug: string;
  name: string;
  origin: string;
  ugandaNote: string;
  jobs: string[];
  parts: string[];
};

export const SEO_BRANDS: BrandRecord[] = [
  {
    slug: 'toyota',
    name: 'Toyota',
    origin: 'Japan',
    ugandaNote:
      'Toyota is the default car on Ugandan roads: Premio, Fielder, Harrier, Noah, Hilux, Hiace, Land Cruiser, and Prado fill Kampala parks and upcountry highways.',
    jobs: ['scheduled service', 'brake jobs', 'suspension on pothole damage', 'diesel Hilux and Hiace work'],
    parts: ['brake pads', 'oil filters', 'shock absorbers', 'spark plugs', 'body clips'],
  },
  {
    slug: 'nissan',
    name: 'Nissan',
    origin: 'Japan',
    ugandaNote:
      'Nissan X-Trail, Serena, Note, Dualis, Juke, Navara, Patrol, Caravan, and Wingroad are everyday Kampala and family cars, with CVT care a frequent workshop topic.',
    jobs: ['CVT service conversations', 'suspension', 'brake service', 'battery and starter jobs'],
    parts: ['brake pads', 'filters', 'driveshaft boots', 'sensors'],
  },
  {
    slug: 'subaru',
    name: 'Subaru',
    origin: 'Japan',
    ugandaNote:
      'Forester, Impreza, Legacy, Outback, XV, and Exiga owners in Kampala need AWD-aware mechanics, equal tyre wear, and boxer-engine service habits.',
    jobs: ['wheel alignment', 'equal tyre replacement', 'head gasket watch on older boxers', 'brake service'],
    parts: ['tyres in matching sets', 'spark plugs', 'timing components', 'suspension bushes'],
  },
  {
    slug: 'honda',
    name: 'Honda',
    origin: 'Japan',
    ugandaNote:
      'Honda Fit, CR-V, Civic, and Accord remain in Kampala as efficient used imports. VTEC engines want timely oil and genuine-equivalent filters.',
    jobs: ['oil and filter service', 'suspension knocks', 'AC service', 'electrical gremlins on older Fits'],
    parts: ['oil filters', 'engine mounts', 'brake pads', 'ignition coils'],
  },
  {
    slug: 'mazda',
    name: 'Mazda',
    origin: 'Japan',
    ugandaNote:
      'Mazda Demio, Axela, CX-5, and BT-50 show up in Uganda with skyactiv oil specs that workshops sometimes ignore — do not.',
    jobs: ['correct-spec oil service', 'brake discs', 'suspension', 'body parts after parking-lot damage'],
    parts: ['oil filters', 'brake pads', 'wiper blades', 'headlight units'],
  },
  {
    slug: 'mitsubishi',
    name: 'Mitsubishi',
    origin: 'Japan',
    ugandaNote:
      'Lancer, Outlander, Pajero, and lorry-adjacent Canter/Fuso culture in Uganda means both family SUVs and work trucks on the same brand page.',
    jobs: ['cooling system', 'suspension', 'diesel service on work vehicles', 'brake overhauls'],
    parts: ['radiators', 'shock absorbers', 'clutch kits', 'filters'],
  },
  {
    slug: 'isuzu',
    name: 'Isuzu',
    origin: 'Japan',
    ugandaNote:
      'Isuzu D-Max, MU-X, and trucks are workhorses. Parts and mobile help matter more than salon cosmetics.',
    jobs: ['diesel service', 'clutch and flywheel', 'cooling', 'suspension for load'],
    parts: ['fuel filters', 'clutch components', 'leaf springs', 'batteries'],
  },
  {
    slug: 'suzuki',
    name: 'Suzuki',
    origin: 'Japan',
    ugandaNote:
      'Swift, Vitara, Jimny, and Alto-class cars are city cars in Kampala. Light, cheap to run, and easy to under-service.',
    jobs: ['routine service', 'CV joints', 'air conditioning', 'tyre and alignment'],
    parts: ['filters', 'brake shoes and pads', 'spark plugs', 'suspension links'],
  },
  {
    slug: 'hyundai',
    name: 'Hyundai',
    origin: 'South Korea',
    ugandaNote:
      'Tucson, Santa Fe, i10, and Accent-class Hyundais are growing in Uganda. Sensors and genuine-equivalent electrics are common searches.',
    jobs: ['electronics diagnosis', 'brake service', 'cooling', 'body clips and lights'],
    parts: ['brake pads', 'batteries', 'filters', 'lamps'],
  },
  {
    slug: 'kia',
    name: 'Kia',
    origin: 'South Korea',
    ugandaNote:
      'Sportage, Sorento, Picanto, and Rio share platforms and parts logic with Hyundai. Kampala owners still struggle to source numbered parts quickly.',
    jobs: ['service with correct oil', 'brake jobs', 'infotainment electrics', 'suspension'],
    parts: ['filters', 'brake pads', 'sensors', 'wipers'],
  },
  {
    slug: 'mercedes',
    name: 'Mercedes-Benz',
    origin: 'Germany',
    ugandaNote:
      'C-Class, E-Class, ML/GLE, and Sprinter vans in Kampala need specialists, not a general oil-and-hope garage. Star diagnosis and OEM numbers matter.',
    jobs: ['star diagnostics', 'air suspension where fitted', 'brake electronics', 'service with spec oil'],
    parts: ['brake discs', 'filters', 'sensors', 'body parts'],
  },
  {
    slug: 'bmw',
    name: 'BMW',
    origin: 'Germany',
    ugandaNote:
      '3 Series, X5, and 5 Series BMWs in Uganda fail expensively when ignored. Cooling, electronics, and underbody rust from wash bays are local patterns.',
    jobs: ['cooling system', 'electronic diagnosis', 'brake service', 'undercarriage inspection'],
    parts: ['thermostats', 'control arms', 'brake pads', 'batteries'],
  },
  {
    slug: 'volkswagen',
    name: 'Volkswagen',
    origin: 'Germany',
    ugandaNote:
      'Golf, Polo, Passat, Tiguan, and Amarok appear in Kampala. DSG and dry-clutch stories need honest diagnosis before parts shopping.',
    jobs: ['DSG conversations', 'coil packs', 'water pumps', 'suspension'],
    parts: ['ignition coils', 'filters', 'brake pads', 'window regulators'],
  },
  {
    slug: 'ford',
    name: 'Ford',
    origin: 'USA',
    ugandaNote:
      'Ranger, Everest, and a long tail of Focus/Mondeo cars serve mixed private and NGO fleets in Uganda.',
    jobs: ['diesel Ranger service', 'turbo pipes', 'suspension', 'electrical'],
    parts: ['fuel filters', 'shock absorbers', 'clutch', 'pads'],
  },
  {
    slug: 'land-rover',
    name: 'Land Rover',
    origin: 'UK',
    ugandaNote:
      'Defender, Discovery, and Freelander/Evoque owners need specialists who understand air suspension, electronics, and genuine-equivalent parts cost.',
    jobs: ['air suspension', 'electronics', 'cooling', 'brake service'],
    parts: ['air springs', 'sensors', 'brake discs', 'filters'],
  },
  {
    slug: 'jeep',
    name: 'Jeep',
    origin: 'USA',
    ugandaNote:
      'Wrangler, Cherokee, and Compass Jeeps in Uganda live a hard life. Cooling, electrics, and off-road damage show up in workshops.',
    jobs: ['cooling', 'steering and suspension', 'electrical', 'brake service'],
    parts: ['radiators', 'ball joints', 'pads', 'batteries'],
  },
  {
    slug: 'lexus',
    name: 'Lexus',
    origin: 'Japan',
    ugandaNote:
      'Lexus RX, GX, and LX sit on Toyota bones with Lexus-priced trim. Kampala owners often service them like Toyotas — sometimes correctly, sometimes not.',
    jobs: ['scheduled service', 'air suspension where fitted', 'brake electronics', 'body and lighting'],
    parts: ['filters', 'brake pads', 'sensors', 'headlight units'],
  },
  {
    slug: 'volvo',
    name: 'Volvo',
    origin: 'Sweden',
    ugandaNote:
      'Volvo XC60, XC90, and S60 cars are uncommon but expensive to guess. OEM numbers and a diagnostic-capable mechanic matter.',
    jobs: ['electronics', 'brake service', 'suspension', 'cooling'],
    parts: ['sensors', 'brake parts', 'filters', 'lamps'],
  },
  {
    slug: 'audi',
    name: 'Audi',
    origin: 'Germany',
    ugandaNote:
      'A4, A6, Q5, and Q7 Audis share Volkswagen-group pitfalls: coils, carbon, cooling, and electronics. Kampala specialists are fewer than Toyota shops.',
    jobs: ['coil packs', 'cooling', 'electronics', 'brake service'],
    parts: ['ignition coils', 'filters', 'control arms', 'pads'],
  },
  {
    slug: 'peugeot',
    name: 'Peugeot',
    origin: 'France',
    ugandaNote:
      'Peugeot 206/207, 307, 508, and Partner vans appear in Kampala fleets. Parts availability is spikier than Toyota — numbers help.',
    jobs: ['electrics', 'timing-sensitive engines', 'suspension', 'climate control'],
    parts: ['sensors', 'filters', 'pads', 'window motors'],
  },
  {
    slug: 'chevrolet',
    name: 'Chevrolet',
    origin: 'USA',
    ugandaNote:
      'Chevrolet cruze/spark-class cars and some SUVs are a minority in Uganda. Treat them with numbered parts, not Toyota bin guesses.',
    jobs: ['service', 'brake jobs', 'electrical', 'cooling'],
    parts: ['filters', 'pads', 'batteries', 'sensors'],
  },
];

export function composeBrandPage(brand: BrandRecord, modelLinks: { label: string; href: string }[]): SeoLandingPage {
  const path = `/brands/${brand.slug}`;
  const partList = brand.parts.join(', ');
  const jobList = brand.jobs.join(', ');
  return {
    kind: 'brand',
    slug: brand.slug,
    path,
    h1: `${brand.name} spare parts, service and repair in Uganda`,
    title: `${brand.name} Spare Parts Uganda — Mechanics & Service Kampala`,
    description: `${brand.name} spare parts in Uganda and Kampala. Book a ${brand.name} mechanic, shop OEM and aftermarket parts, and service ${brand.name} cars on MyGarage.`,
    keywords: [
      `${brand.name} spare parts Uganda`,
      `${brand.name} parts Kampala`,
      `${brand.name} mechanic Kampala`,
      `${brand.name} service Kampala`,
      `${brand.name} repair Kampala`,
      `${brand.name} genuine parts`,
    ],
    intro: `${brand.ugandaNote} MyGarage is where you shop ${brand.name} parts, book a ${brand.name} mechanic in Kampala, and keep service history on the vehicle.`,
    sections: [
      {
        heading: `${brand.name} parts online`,
        body: `Search the marketplace for ${partList} and other ${brand.name} components. Use OEM numbers when you have them. Fitment still depends on year, engine, and facelift — especially on popular Kampala models.`,
      },
      {
        heading: `${brand.name} mechanics and service`,
        body: `Typical ${brand.name} workshop jobs in Uganda include ${jobList}. Book through MyGarage instead of a random stall, and take the car in if the job needs a ramp or dealer-level diagnosis.`,
      },
      {
        heading: `Genuine and aftermarket ${brand.name} parts`,
        body: `${brand.name} genuine parts and OEM equivalents are the safe default for brakes, steering, and sensors. Aftermarket is common for older high-mileage cars if the brand on the box is real. Read the genuine-parts guide before you buy unbranded plastic bags.`,
      },
    ],
    faqs: [
      {
        question: `Where can I buy ${brand.name} spare parts in Kampala?`,
        answer: `Shop MyGarage search for ${brand.name} and the part name, or open the model pages linked below. Support can help if you send the chassis number.`,
      },
      {
        question: `Do you have ${brand.name} mechanics in Kampala?`,
        answer: `Book a service or repair request and name the ${brand.name} model. Providers who handle that brand will respond. German and specialist brands may take longer than Toyota.`,
      },
      {
        question: `Can I look up ${brand.name} part numbers?`,
        answer: `Yes. Use the OEM parts page and paste the number into storefront search. Photograph the old part.`,
      },
    ],
    ctas: [
      { label: `Shop ${brand.name} parts`, href: shopQueryHref(brand.name) },
      { label: `Book ${brand.name} service`, href: servicesHref() },
    ],
    related: [
      { label: 'All brands', href: '/brands' },
      { label: 'OEM lookup', href: '/oem-parts' },
      { label: 'Spare parts', href: '/spare-parts' },
      { label: 'Mechanics', href: '/mechanics' },
      ...modelLinks.slice(0, 8),
    ],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Brands', href: '/brands' },
      { label: brand.name, href: path },
    ],
    priority: 0.86,
  };
}
