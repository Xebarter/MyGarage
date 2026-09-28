import type { SeoLandingPage } from '@/lib/seo/landing/types';
import { servicesHref, shopQueryHref } from '@/lib/seo/landing/links';

export type LocationRecord = {
  slug: string;
  name: string;
  kind: 'city' | 'area' | 'corridor' | 'regional';
  region: string;
  country: string;
  note: string;
};

export const SEO_LOCATIONS: LocationRecord[] = [
  { slug: 'kampala', name: 'Kampala', kind: 'city', region: 'Central', country: 'Uganda', note: 'Capital demand centre for mechanics, garages, spare parts, towing, and roadside assistance.' },
  { slug: 'ntinda', name: 'Ntinda', kind: 'area', region: 'Kampala', country: 'Uganda', note: 'Ntinda, Kisementi-adjacent traffic, and mall parking lots generate service and lockout jobs.' },
  { slug: 'kololo', name: 'Kololo', kind: 'area', region: 'Kampala', country: 'Uganda', note: 'Kololo and Kisementi drivers often want mobile mechanics rather than towing a premium SUV across town.' },
  { slug: 'bugolobi', name: 'Bugolobi', kind: 'area', region: 'Kampala', country: 'Uganda', note: 'Bugolobi–Nakawa corridor: offices, apartments, and evening breakdowns on the way to the bypass.' },
  { slug: 'nakawa', name: 'Nakawa', kind: 'area', region: 'Kampala', country: 'Uganda', note: 'Nakawa industrial and campus traffic, plus Jinja Road access for recovery jobs.' },
  { slug: 'luzira', name: 'Luzira', kind: 'area', region: 'Kampala', country: 'Uganda', note: 'Luzira and Port Bell Road: lakeside heat is hard on batteries and cooling systems.' },
  { slug: 'muyenga', name: 'Muyenga', kind: 'area', region: 'Kampala', country: 'Uganda', note: 'Hills, tight parking, and SUVs. Alignment and brake jobs after the descents are common.' },
  { slug: 'makindye', name: 'Makindye', kind: 'area', region: 'Kampala', country: 'Uganda', note: 'Makindye Division mix of residential and barracks traffic; puncture and service demand is steady.' },
  { slug: 'kansanga', name: 'Kansanga', kind: 'area', region: 'Kampala', country: 'Uganda', note: 'Student and nightlife corridor. Jump-starts and lockouts show up after dark.' },
  { slug: 'kabalagala', name: 'Kabalagala', kind: 'area', region: 'Kampala', country: 'Uganda', note: 'Ggaba Road traffic. Short-trip engines and neglected servicing are a pattern.' },
  { slug: 'mengo', name: 'Mengo', kind: 'area', region: 'Kampala', country: 'Uganda', note: 'Mengo–Rubaga side of the city. Workshop jobs and parts runs toward town.' },
  { slug: 'rubaga', name: 'Rubaga', kind: 'area', region: 'Kampala', country: 'Uganda', note: 'Lubaga/Rubaga hill and cathedral-side traffic. Same booking flow as the rest of Kampala.' },
  { slug: 'bwaise', name: 'Bwaise', kind: 'area', region: 'Kampala', country: 'Uganda', note: 'Bwaise flooding risk means recovery and electrics after heavy rain, not only ordinary servicing.' },
  { slug: 'kawempe', name: 'Kawempe', kind: 'area', region: 'Kampala', country: 'Uganda', note: 'Kawempe Division: Bombo Road access, taxis, and high-cycle Hiace wear.' },
  { slug: 'kalerwe', name: 'Kalerwe', kind: 'area', region: 'Kampala', country: 'Uganda', note: 'Market traffic, tight streets, and lots of short-trip cars that never get a proper service.' },
  { slug: 'kyebando', name: 'Kyebando', kind: 'area', region: 'Kampala', country: 'Uganda', note: 'Residential Kyebando bookings are often “mechanic at home” rather than a city-centre garage.' },
  { slug: 'kira', name: 'Kira', kind: 'area', region: 'Wakiso', country: 'Uganda', note: 'Kira Municipality commuters on the way into Kampala. Service on weekends, recovery on the highway.' },
  { slug: 'najjanankumbi', name: 'Najjanankumbi', kind: 'area', region: 'Kampala', country: 'Uganda', note: 'Masaka Road gate to the city. Breakdowns here often need a safe pull-off and a tow into town.' },
  { slug: 'entebbe-road', name: 'Entebbe Road', kind: 'corridor', region: 'Wakiso / Kampala', country: 'Uganda', note: 'Airport traffic, heat, and high-speed lanes. Jump-starts, tyres, and towing are the emergency mix.' },
  { slug: 'kampala-road', name: 'Kampala Road', kind: 'corridor', region: 'Kampala', country: 'Uganda', note: 'CBD. Lockouts, jump-starts, and “car won’t start after a meeting” jobs.' },
  { slug: 'gayaza-road', name: 'Gayaza Road', kind: 'corridor', region: 'Kampala / Wakiso', country: 'Uganda', note: 'Northbound commuter road. Evening breakdowns and weekend garage bookings.' },
  { slug: 'jinja-road', name: 'Jinja Road', kind: 'corridor', region: 'Kampala', country: 'Uganda', note: 'High-speed recovery, stone chips, and overheating in jam toward Nakawa.' },
  { slug: 'masaka-road', name: 'Masaka Road', kind: 'corridor', region: 'Kampala', country: 'Uganda', note: 'Long-distance heat and load. Fuel, tyres, and engine overheating stories.' },
  { slug: 'bombo-road', name: 'Bombo Road', kind: 'corridor', region: 'Kampala', country: 'Uganda', note: 'Kawempe–Bombo corridor. Taxi wear and clutch jobs on commercial vehicles.' },
  { slug: 'northern-bypass', name: 'Northern Bypass', kind: 'corridor', region: 'Kampala', country: 'Uganda', note: 'Fast lanes, limited shoulders. Send an accurate pin; providers need the nearest junction.' },
  { slug: 'entebbe', name: 'Entebbe', kind: 'city', region: 'Wakiso', country: 'Uganda', note: 'Airport town. Car repair, garages, spare parts, and recovery toward Kampala.' },
  { slug: 'jinja', name: 'Jinja', kind: 'city', region: 'Eastern', country: 'Uganda', note: 'Source of the Nile city. Parts shipping and mechanic coverage grow with verified providers.' },
  { slug: 'mbarara', name: 'Mbarara', kind: 'city', region: 'Western', country: 'Uganda', note: 'Western hub. Long-distance cars arrive overheated; local servicing still matters.' },
  { slug: 'mbale', name: 'Mbale', kind: 'city', region: 'Eastern', country: 'Uganda', note: 'Eastern hub. Elgon road heat and load on pick-ups.' },
  { slug: 'gulu', name: 'Gulu', kind: 'city', region: 'Northern', country: 'Uganda', note: 'Northern hub. Distance from Kampala parts stock means plan shipping or local pickup.' },
  { slug: 'fort-portal', name: 'Fort Portal', kind: 'city', region: 'Western', country: 'Uganda', note: 'Tourism and hills. Cooling systems and brakes on descents.' },
  { slug: 'masaka', name: 'Masaka', kind: 'city', region: 'Central', country: 'Uganda', note: 'Highway city. Recovery between Kampala and the southwest.' },
  { slug: 'nairobi', name: 'Nairobi', kind: 'regional', region: 'Nairobi', country: 'Kenya', note: 'East African expansion keyword. MyGarage is Uganda-first; parts advice still helps Kenyan-bound owners shopping online.' },
  { slug: 'dar-es-salaam', name: 'Dar es Salaam', kind: 'regional', region: 'Dar es Salaam', country: 'Tanzania', note: 'Regional expansion city. Treat this page as guidance for Tanzania-related searches, not a claim of a local yard.' },
  { slug: 'kigali', name: 'Kigali', kind: 'regional', region: 'Kigali', country: 'Rwanda', note: 'Regional expansion city. Same honesty: Uganda marketplace first, regional language for future coverage.' },
  { slug: 'juba', name: 'Juba', kind: 'regional', region: 'Juba', country: 'South Sudan', note: 'Regional expansion city. Spare parts and repair language for Juba-related searches, fulfilled from Uganda where logistics allow.' },
];

export function composeLocationPage(loc: LocationRecord): SeoLandingPage {
  const path = `/locations/${loc.slug}`;
  const localPhrase =
    loc.country === 'Uganda'
      ? `mechanic ${loc.name}, car repair ${loc.name}, garage ${loc.name}`
      : `car repair ${loc.country}, spare parts ${loc.name}`;
  const coverage =
    loc.kind === 'regional'
      ? `MyGarage is built in Uganda first. This page exists because people search automotive services around ${loc.name}. We do not pretend there is a MyGarage yard on every street. Use the marketplace for parts; services dispatch where providers actually operate.`
      : `Requests from ${loc.name} go through the same MyGarage booking flow as the rest of ${loc.country}. Arrival time depends on a verified provider accepting the job and on traffic. Share a map pin, not only the parish name.`;

  return {
    kind: 'location',
    slug: loc.slug,
    path,
    h1: `Car repair, mechanics and spare parts in ${loc.name}`,
    title: `Mechanic ${loc.name} — Car Repair, Garages & Parts | MyGarage`,
    description: `${localPhrase}. Book roadside assistance, towing, servicing, and shop auto parts with MyGarage coverage notes for ${loc.name}, ${loc.country}.`,
    keywords: [
      `mechanic ${loc.name}`,
      `car repair ${loc.name}`,
      `car garage ${loc.name}`,
      `spare parts ${loc.name}`,
      `roadside assistance ${loc.name}`,
      loc.country === 'Uganda' ? `mechanic near me` : `car parts ${loc.country}`,
    ],
    intro: `${loc.note} ${coverage}`,
    sections: [
      {
        heading: `Services people book in ${loc.name}`,
        body: `Typical searches from ${loc.name} include car mechanic, garage, car servicing, spare parts, roadside assistance, car towing, diagnostics, and inspection. Emergency Help is for cars that cannot continue. Service My Car is for oil and inspections. Fix My Car is for faults that are not immediately dangerous.`,
      },
      {
        heading: 'Parts without walking the market',
        body: `Shop ${loc.name}-bound spare parts on the MyGarage storefront and deliver to an address you control. For bulky glass and body parts, confirm logistics. Fitment still needs make, model, and year.`,
      },
      {
        heading: 'Local trust',
        body: `“Near me” does not mean the closest unverified stall. MyGarage sends work to providers who join as mechanics or garages. If you run a workshop in ${loc.name}, the garage software page explains how to receive jobs.`,
      },
    ],
    faqs: [
      {
        question: `Can I book a mechanic in ${loc.name} right now?`,
        answer:
          loc.kind === 'regional'
            ? `Service dispatch is Uganda-first. If you are in ${loc.name}, use the page for parts knowledge and check whether a provider lists your area. Do not assume instant roadside cover.`
            : `Open Book Services, send your pin in ${loc.name}, and describe the job. A provider covering that area can accept.`,
      },
      {
        question: `Do you deliver spare parts to ${loc.name}?`,
        answer: `Delivery depends on checkout logistics. Kampala and nearby corridors are the densest. Other Ugandan cities are planned at checkout or with support. Regional cities may be parts-only.`,
      },
      {
        question: `Is there towing in ${loc.name}?`,
        answer:
          loc.kind === 'corridor'
            ? `Corridor jobs need a precise junction pin. Request towing under Emergency Help and say which direction you are facing.`
            : `Request towing if the car cannot be driven. Confirm distance fees before the truck moves.`,
      },
    ],
    ctas: [
      { label: `Book help in ${loc.name}`, href: servicesHref() },
      { label: 'Shop parts', href: shopQueryHref('brake pads') },
    ],
    related: [
      { label: 'All locations', href: '/locations' },
      { label: 'Mechanics', href: '/mechanics' },
      { label: 'Roadside assistance', href: '/roadside-assistance' },
      { label: 'Garages', href: '/garages' },
      { label: 'Kampala', href: '/locations/kampala' },
      { label: 'Car repair', href: '/car-repair' },
    ],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Locations', href: '/locations' },
      { label: loc.name, href: path },
    ],
    priority: loc.slug === 'kampala' ? 0.9 : loc.kind === 'regional' ? 0.55 : 0.72,
  };
}
