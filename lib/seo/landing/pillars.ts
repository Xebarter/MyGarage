import type { SeoLandingPage } from '@/lib/seo/landing/types';
import { serviceCategoryHref, servicesHref, shopQueryHref } from '@/lib/seo/landing/links';

function pillar(page: Omit<SeoLandingPage, 'kind' | 'breadcrumbs'>): SeoLandingPage {
  return {
    ...page,
    kind: 'pillar',
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: page.h1, href: page.path },
    ],
  };
}

export const SEO_PILLARS: SeoLandingPage[] = [
  pillar({
    slug: 'car-repair',
    path: '/car-repair',
    h1: 'Car repair in Uganda',
    title: 'Car Repair Uganda — Mechanics, Garages & Mobile Repair',
    description:
      'Book professional car repair in Uganda and Kampala. Verified mechanics and garages for engine, brakes, suspension, electrics, and emergency mobile repair through MyGarage.',
    keywords: [
      'car repair Uganda',
      'car repair Kampala',
      'auto repair Uganda',
      'vehicle repair Kampala',
      'car repair near me',
      'affordable car repair Kampala',
    ],
    intro:
      'MyGarage connects you with verified mechanics and garages for car repair across Kampala and Uganda. Describe the fault, share your location, and book workshop or mobile repair without calling around for quotes.',
    sections: [
      {
        heading: 'What car repair covers on MyGarage',
        body: 'Drivers search for car repair when something is already wrong: engine noise, overheating, weak brakes, rough suspension, electrical faults, or smoke. MyGarage lists repair jobs under Fix My Car so you can request engine, brake, suspension, gearbox, clutch, exhaust, and electrical work from providers who actually handle those jobs in Kampala and other Ugandan cities.',
      },
      {
        heading: 'Workshop repair or a mechanic who comes to you',
        body: 'Not every repair needs a tow. If the vehicle still moves, book a garage appointment. If it will not start, overheats, or is unsafe to drive, request a mobile mechanic or recovery from Emergency Help. That mix of car repair Kampala workshops and on-site jobs is how MyGarage covers both planned fixes and breakdowns.',
      },
      {
        heading: 'Parts and repair on one platform',
        body: 'Many repairs stall because the spare part is missing. Shop brake pads, filters, batteries, and other parts on MyGarage, then book the mechanic who will fit them. Using one vehicle profile keeps the repair, parts, and service history together.',
      },
    ],
    faqs: [
      {
        question: 'How do I book car repair in Kampala on MyGarage?',
        answer:
          'Open Book Services, choose Fix My Car or Emergency Help, describe the problem, and send your location. A verified provider responds with availability and next steps.',
      },
      {
        question: 'Is MyGarage a garage or a booking platform?',
        answer:
          'MyGarage is an automotive platform. It does not replace your mechanic. It helps you find verified garages and mobile mechanics, buy parts, and keep digital service records.',
      },
      {
        question: 'Can I get affordable car repair without guessing prices?',
        answer:
          'Catalog services show starting prices in Ugandan shillings. Final cost depends on diagnosis, parts, and labour. Ask the provider to confirm the job before work starts.',
      },
    ],
    ctas: [
      { label: 'Book car repair', href: servicesHref() },
      { label: 'Shop repair parts', href: shopQueryHref('brake pads') },
    ],
    related: [
      { label: 'Mechanics in Kampala', href: '/mechanics' },
      { label: 'Garages', href: '/garages' },
      { label: 'Car diagnostics', href: '/car-diagnostics' },
      { label: 'Roadside assistance', href: '/roadside-assistance' },
    ],
    priority: 0.95,
  }),
  pillar({
    slug: 'mechanics',
    path: '/mechanics',
    h1: 'Find a mechanic in Kampala and Uganda',
    title: 'Mechanic Kampala — Book Verified Car Mechanics in Uganda',
    description:
      'Find a mechanic in Kampala, book mobile car mechanics, and schedule workshop appointments. MyGarage connects you with verified mechanic services across Uganda.',
    keywords: [
      'mechanic Kampala',
      'car mechanic Uganda',
      'mechanic near me',
      'mobile mechanic Kampala',
      'book a mechanic',
      'find a mechanic',
    ],
    intro:
      'Searching mechanic near me in Kampala should not mean a random roadside stall. MyGarage lets you book verified mechanics for diagnostics, servicing, and repair — at a garage or at your location.',
    sections: [
      {
        heading: 'Workshop mechanics and mobile mechanics',
        body: 'Use MyGarage when you need a professional mechanic Kampala drivers already trust for routine work, or a mobile mechanic when the car will not move. Mobile jobs cover jump-starts, no-start diagnosis, puncture changes, and many electrical checks. Heavier jobs still go to a equipped workshop.',
      },
      {
        heading: 'Book a mechanic online instead of calling around',
        body: 'Online mechanic booking is the point of the services flow. You submit the job, location, and vehicle details once. Providers see the request and respond. That is faster than collecting phone numbers for mechanic services Kampala neighbourhood by neighbourhood.',
      },
      {
        heading: 'Brand-aware mechanics',
        body: 'Toyota, Nissan, Subaru, and other Japanese cars dominate Ugandan roads. Brand and model pages on MyGarage help you pair the right spare parts with a mechanic who regularly services that vehicle — for example a Toyota Premio mechanic in Kampala who already knows common Premio faults.',
      },
    ],
    faqs: [
      {
        question: 'How do I find a reliable mechanic in Kampala?',
        answer:
          'Book through MyGarage so the job goes to a verified service provider. Share make, model, and symptoms. Ask for a diagnosis before approving major labour or parts.',
      },
      {
        question: 'Do you offer emergency mechanics?',
        answer:
          'Yes. Emergency Help includes mobile mechanic visits for cars that will not start, plus towing if the vehicle must go to a workshop.',
      },
      {
        question: 'Can a mechanic come to my home or office?',
        answer:
          'Many jobs are offered as mobile or on-site repair. If specialist tools or a pit are required, the provider will recommend a garage visit or recovery.',
      },
    ],
    ctas: [
      { label: 'Book a mechanic', href: servicesHref() },
      { label: 'See emergency help', href: serviceCategoryHref("Emergency Help (I'm Stuck)") },
    ],
    related: [
      { label: 'Car repair', href: '/car-repair' },
      { label: 'Mobile mechanic tips', href: '/academy/how-to-choose-a-mechanic' },
      { label: 'Kampala coverage', href: '/locations/kampala' },
      { label: 'Garages', href: '/garages' },
    ],
    priority: 0.95,
  }),
  pillar({
    slug: 'garages',
    path: '/garages',
    h1: 'Car garages in Kampala and Uganda',
    title: 'Car Garage Kampala — Find Verified Garages in Uganda',
    description:
      'Find car garages in Kampala and across Uganda. Book garage appointments for servicing, repair, and inspections through MyGarage verified workshops.',
    keywords: [
      'car garage Kampala',
      'garages Uganda',
      'garage near me',
      'car garages Kampala',
      'find a garage',
      'verified garages',
    ],
    intro:
      'MyGarage is how you find a garage without relying only on a neighbour’s WhatsApp chat. Book car garage services in Kampala and other Ugandan cities, then keep the workshop visit on your vehicle’s digital history.',
    sections: [
      {
        heading: 'What a garage appointment is for',
        body: 'Use a workshop when you need a pit, alignment rack, welding, gearbox work, or a full service. Garage near me searches often mean “someone equipped, not only a mobile fitter.” MyGarage routes those jobs to providers who list workshop capacity.',
      },
      {
        heading: 'Verified garages, not anonymous listings',
        body: 'Trust matters for professional garages Kampala customers will return to. Providers on MyGarage operate through the service portal with identifiable accounts. You still confirm the scope of work, but you are not starting from a blank Facebook post.',
      },
      {
        heading: 'Garages and spare parts together',
        body: 'Workshops stall when parts are late. Order filters, pads, and consumables from the MyGarage marketplace and take them to the garage, or ask the workshop to source through listed sellers. Either way the job is easier to track.',
      },
    ],
    faqs: [
      {
        question: 'How do I find garages in Kampala on MyGarage?',
        answer:
          'Go to Book Services, choose servicing or repair, and send the request. Providers covering your area can accept workshop jobs. You can also browse location pages for Kampala divisions.',
      },
      {
        question: 'Can I book a garage appointment online?',
        answer:
          'Yes. Online garage booking is built into MyGarage services. Include preferred time, vehicle details, and whether the car can be driven in.',
      },
      {
        question: 'Do you list garages outside Kampala?',
        answer:
          'Coverage follows where verified providers operate. Location pages include Entebbe, Jinja, Mbarara, Mbale, Gulu, Fort Portal, and Masaka as demand and partners grow.',
      },
    ],
    ctas: [
      { label: 'Book a garage', href: servicesHref() },
      { label: 'Garage software for workshops', href: '/garage-management-software' },
    ],
    related: [
      { label: 'Mechanics', href: '/mechanics' },
      { label: 'Car servicing', href: '/car-servicing' },
      { label: 'Locations', href: '/locations' },
      { label: 'Car inspection', href: '/car-inspection' },
    ],
    priority: 0.93,
  }),
  pillar({
    slug: 'car-servicing',
    path: '/car-servicing',
    h1: 'Car servicing in Uganda',
    title: 'Car Servicing Uganda — Oil Change, Full Service & Reminders',
    description:
      'Book car servicing in Kampala and Uganda. Minor and major service, oil changes, inspections, and digital service reminders on MyGarage.',
    keywords: [
      'car servicing Uganda',
      'car service Kampala',
      'vehicle servicing Kampala',
      'routine car service',
      'car service near me',
      'affordable car servicing',
    ],
    intro:
      'Regular car servicing keeps Japanese and European cars reliable on Ugandan roads. MyGarage is built for scheduled car service — oil, filters, inspections — plus reminders so the next service is not a guess.',
    sections: [
      {
        heading: 'Routine service versus repair',
        body: 'Car servicing is preventive: oil change, full service, brake check, tyre rotation, battery check, and general inspection. Repair is for faults. Use Service My Car when nothing is urgently wrong. That split stops you paying workshop diagnostic rates for a simple service.',
      },
      {
        heading: 'Car service Kampala without losing the paperwork',
        body: 'Workshops lose job cards. MyGarage vehicle profiles store service history so the next mechanic sees what was done. That is the difference between a one-off oil change and digital car maintenance.',
      },
      {
        heading: 'When to book',
        body: 'Most petrol cars in Uganda need oil around 5,000–7,500 km in dusty or stop-start Kampala traffic, sooner if you tow or idle in jam. Follow the handbook if you have it, and read our servicing guide if you do not.',
      },
    ],
    faqs: [
      {
        question: 'What is included in a car service on MyGarage?',
        answer:
          'Catalog options include oil change and full service (minor or major), plus brake checks and inspections. Confirm the exact checklist with the provider for your make and model.',
      },
      {
        question: 'Can I schedule car service in advance?',
        answer:
          'Yes. Send a service request with your preferred window. You can also set next-service reminders on your vehicle profile after the job.',
      },
      {
        question: 'Do you service Toyota, Nissan, and Subaru cars?',
        answer:
          'Those brands are the core of Ugandan traffic. Brand pages list typical service jobs and parts. Providers regularly handle Premio, Fielder, Harrier, X-Trail, Forester, and similar models.',
      },
    ],
    ctas: [
      { label: 'Book a service', href: serviceCategoryHref('Service My Car (Routine Maintenance)') },
      { label: 'Servicing guide', href: '/academy/when-should-i-service-my-car' },
    ],
    related: [
      { label: 'Car maintenance', href: '/car-maintenance' },
      { label: 'Vehicle history', href: '/vehicle-history' },
      { label: 'Oil change costs', href: '/academy/oil-change-cost-uganda' },
      { label: 'Spare parts', href: '/spare-parts' },
    ],
    priority: 0.93,
  }),
  pillar({
    slug: 'car-maintenance',
    path: '/car-maintenance',
    h1: 'Car maintenance in Uganda',
    title: 'Car Maintenance Uganda — Checklists, Tracking & Reminders',
    description:
      'Track car maintenance in Uganda with checklists, service reminders, and digital history. Book maintenance and buy parts on MyGarage Kampala.',
    keywords: [
      'car maintenance Uganda',
      'vehicle maintenance Kampala',
      'car maintenance app',
      'car service reminder',
      'preventive car maintenance',
      'car maintenance checklist',
    ],
    intro:
      'Car maintenance on MyGarage is not a blog checklist stuck in a PDF. It is a vehicle profile with service history, reminders, and a path to book the next oil change or inspection in Kampala.',
    sections: [
      {
        heading: 'Preventive maintenance for Ugandan conditions',
        body: 'Dust, heat, potholes, and traffic idle punish oil, filters, shocks, and batteries. Preventive vehicle maintenance here is more frequent than a European handbook assumes. Use MyGarage to log jobs and set the next service reminder after each visit.',
      },
      {
        heading: 'Maintenance tracking that mechanics can use',
        body: 'Digital car maintenance only helps if the next garage can see it. Store invoices, mileage, and notes on the vehicle. That becomes car service history you actually own, not a stamp in a booklet that stayed in the glovebox of the previous owner.',
      },
      {
        heading: 'Checklist to action',
        body: 'Oil, filters, brakes, coolant, tyres, battery, and lights belong on every car maintenance checklist. When an item is due, shop the part or book the service from the same platform instead of restarting the search.',
      },
    ],
    faqs: [
      {
        question: 'Is MyGarage a car maintenance app?',
        answer:
          'Yes. Alongside parts and booking, buyer vehicle profiles support service history, documents, and reminders — the jobs people search for as a car maintenance app or vehicle service reminder.',
      },
      {
        question: 'Can I track maintenance for more than one car?',
        answer:
          'Add multiple vehicles to your garage. Each keeps its own history, which matters for families and small fleets.',
      },
      {
        question: 'Where should I start if I just bought a used car?',
        answer:
          'Run a used car inspection, log the current mileage, replace unknown-age fluids and filters, and read the used-car checklist in Academy.',
      },
    ],
    ctas: [
      { label: 'Book maintenance', href: serviceCategoryHref('Service My Car (Routine Maintenance)') },
      { label: 'Maintenance checklist', href: '/academy/car-maintenance-checklist' },
    ],
    related: [
      { label: 'Car servicing', href: '/car-servicing' },
      { label: 'Vehicle history', href: '/vehicle-history' },
      { label: 'Academy', href: '/academy' },
      { label: 'Car inspection', href: '/car-inspection' },
    ],
    priority: 0.9,
  }),
  pillar({
    slug: 'spare-parts',
    path: '/spare-parts',
    h1: 'Car spare parts in Uganda',
    title: 'Car Spare Parts Uganda — Buy Auto Parts Online in Kampala',
    description:
      'Buy car spare parts in Uganda and Kampala. Genuine, OEM, and aftermarket auto parts online with fitment help on the MyGarage marketplace.',
    keywords: [
      'car spare parts Uganda',
      'car spare parts Kampala',
      'spare parts Uganda',
      'buy car spare parts',
      'car parts online',
      'genuine spare parts',
    ],
    intro:
      'Car spare parts Uganda is one of MyGarage’s core jobs: find the part, confirm fitment, and check out. Shop genuine, OEM, and aftermarket options from listed sellers instead of walking Kisekka with a torn paper list.',
    sections: [
      {
        heading: 'A parts marketplace, not a single shop shelf',
        body: 'MyGarage is an automotive marketplace. Vendors list brake pads, filters, suspension parts, body parts, and consumables. You compare availability and use product pages for brand, category, and compatibility notes.',
      },
      {
        heading: 'Genuine, OEM, and aftermarket',
        body: 'Genuine spare parts and OEM part numbers matter when you want dealer-equivalent quality. Aftermarket parts can be the right call for older Premio and Fielder cars if the seller is clear about the brand. Academy explains how to spot fakes and how to look up an OEM number.',
      },
      {
        heading: 'Kampala demand, Uganda delivery',
        body: 'Most search volume is spare parts Kampala, but checkout supports delivery planning across Uganda. Share make, model, year, and chassis details when the listing asks — that is how you avoid the wrong caliper for a facelift Harrier.',
      },
    ],
    faqs: [
      {
        question: 'Can I buy car parts online in Uganda on MyGarage?',
        answer:
          'Yes. Browse the storefront, search by part name or brand, and check out with supported mobile money and card options.',
      },
      {
        question: 'Do you sell Toyota spare parts in Kampala?',
        answer:
          'Toyota is the largest catalogue opportunity. Use the Toyota brand page, model pages such as Premio and Hilux, and the storefront search.',
      },
      {
        question: 'What if I only have a part number?',
        answer:
          'Search the part number on the storefront and read the OEM lookup guide. Support can help if you send a photo of the old part and the vehicle details.',
      },
    ],
    ctas: [
      { label: 'Shop spare parts', href: '/' },
      { label: 'OEM part numbers', href: '/oem-parts' },
    ],
    related: [
      { label: 'Auto parts', href: '/auto-parts' },
      { label: 'Parts index', href: '/parts' },
      { label: 'Brands', href: '/brands' },
      { label: 'How to find genuine parts', href: '/academy/how-to-find-genuine-spare-parts' },
    ],
    priority: 0.96,
  }),
  pillar({
    slug: 'auto-parts',
    path: '/auto-parts',
    h1: 'Auto parts in Kampala and Uganda',
    title: 'Auto Parts Kampala — Vehicle Parts Marketplace Uganda',
    description:
      'Shop auto parts in Kampala and vehicle parts online in Uganda. Aftermarket and OEM automotive parts from verified MyGarage sellers.',
    keywords: [
      'auto parts Kampala',
      'auto parts Uganda',
      'vehicle parts online',
      'automotive parts',
      'buy auto parts',
      'auto parts marketplace',
    ],
    intro:
      'Auto parts Kampala searches are the commercial twin of spare parts. This page is for drivers and workshops buying vehicle parts online — pads, filters, electrics, body, and fluids — through the MyGarage auto parts marketplace.',
    sections: [
      {
        heading: 'Workshops buying in volume',
        body: 'Garages need a parts supplier, not only retail packs. Contact support with a list when you are stocking a workshop. Day to day, search the storefront the same way a retail customer would.',
      },
      {
        heading: 'Fitment first',
        body: 'The expensive mistake in Ugandan parts retail is the almost-right part. Use brand and model pages, OEM numbers, and support. Do not assume a Noah part fits a Voxy without checking.',
      },
      {
        heading: 'Payments and delivery',
        body: 'Checkout uses encrypted payment partners. Delivery fees depend on size and location. Nationwide dispatch is the logistics promise; confirm bulky items such as bumpers and windscreens with support.',
      },
    ],
    faqs: [
      {
        question: 'What is the difference between auto parts and spare parts on MyGarage?',
        answer:
          'They overlap. Spare parts leans genuine/OEM replacements. Auto parts covers the broader marketplace language — including accessories and aftermarket — for the same catalogue.',
      },
      {
        question: 'Can I compare auto parts sellers?',
        answer:
          'Listings come from vendors on the marketplace. Compare brand, description, and price on the product page. Verified vendors are the trust layer for the platform.',
      },
      {
        question: 'Do you cover electrical auto parts?',
        answer:
          'Yes. Search batteries, alternators, starters, and sensors, or open those part pages for Kampala-focused guides.',
      },
    ],
    ctas: [
      { label: 'Browse auto parts', href: '/' },
      { label: 'Sell parts on MyGarage', href: '/auth?role=vendor&next=/vendor' },
    ],
    related: [
      { label: 'Spare parts', href: '/spare-parts' },
      { label: 'OEM parts', href: '/oem-parts' },
      { label: 'Batteries', href: '/batteries' },
      { label: 'Tyres', href: '/tyres' },
    ],
    priority: 0.9,
  }),
  pillar({
    slug: 'oem-parts',
    path: '/oem-parts',
    h1: 'OEM part numbers and genuine parts',
    title: 'OEM Part Number Lookup — Genuine Car Parts Uganda',
    description:
      'Look up OEM part numbers and shop genuine car parts in Uganda. Toyota, Nissan, Subaru, Honda and more on the MyGarage parts marketplace.',
    keywords: [
      'OEM part number',
      'OEM number lookup',
      'car part number lookup',
      'Toyota part number',
      'genuine OEM parts',
      'manufacturer part number',
    ],
    intro:
      'An OEM part number (MPN) is the manufacturer’s identity for a component. MyGarage treats OEM lookup as a first-class job so you can order the same pad, filter, or sensor the factory specified — not a visual guess from a market stall.',
    sections: [
      {
        heading: 'How to find the number',
        body: 'Read it on the old part, the dealer invoice, or a parts catalogue for your VIN/chassis. Toyota part numbers, Nissan part numbers, and Subaru part numbers follow brand patterns. Photograph the old part before you leave the garage.',
      },
      {
        heading: 'Search MyGarage with the number',
        body: 'Paste the OEM number into storefront search. If a listing uses a different brand’s cross-reference, confirm with support. Hilux, Land Cruiser, Premio, and Harrier parts are frequently requested with numbers rather than nicknames.',
      },
      {
        heading: 'OEM versus aftermarket',
        body: 'OEM and genuine parts track the manufacturer specification. Aftermarket can be excellent or poor. If the car is under a quality-sensitive repair (brakes, steering, airbags), prefer numbered OEM or a known brand. Academy covers the difference in detail.',
      },
    ],
    faqs: [
      {
        question: 'What is an OEM part number?',
        answer:
          'It is the original equipment manufacturer code for that spare part. It is more precise than “Premio brake pads” because it distinguishes axle, year, and facelift.',
      },
      {
        question: 'Can MyGarage look up a Toyota Hilux part number for me?',
        answer:
          'Yes. Send the chassis/VIN, year, and a photo of the old part to support, or start with the Hilux model page and storefront search.',
      },
      {
        question: 'Are OEM parts the same as genuine parts?',
        answer:
          'Genuine usually means dealer-boxed. OEM may be the same factory without the dealer box. Both beat unbranded copies when safety is involved. See OEM vs aftermarket in Academy.',
      },
    ],
    ctas: [
      { label: 'Search by part number', href: '/' },
      { label: 'OEM vs aftermarket', href: '/academy/oem-vs-aftermarket-parts' },
    ],
    related: [
      { label: 'Spare parts', href: '/spare-parts' },
      { label: 'How to find an OEM number', href: '/academy/how-to-find-oem-part-number' },
      { label: 'Brands', href: '/brands' },
      { label: 'Toyota parts', href: '/brands/toyota' },
    ],
    priority: 0.92,
  }),
  pillar({
    slug: 'roadside-assistance',
    path: '/roadside-assistance',
    h1: 'Roadside assistance in Kampala and Uganda',
    title: 'Roadside Assistance Kampala — 24/7 Breakdown Help Uganda',
    description:
      'Request roadside assistance in Kampala and Uganda: jump-starts, puncture help, fuel delivery, lockouts, mobile mechanics, towing, and vehicle recovery on MyGarage.',
    keywords: [
      'roadside assistance Kampala',
      'roadside assistance Uganda',
      'emergency roadside assistance',
      'roadside assistance near me',
      '24/7 roadside assistance',
      'car breakdown assistance',
    ],
    intro:
      'Roadside assistance Kampala is built for the moment the car stops — Northern Bypass, Entebbe Road, or a parish road after dark. MyGarage Emergency Help dispatches jump-starts, tyre changes, fuel, lockout help, mobile mechanics, and recovery.',
    sections: [
      {
        heading: 'What counts as roadside assistance',
        body: 'If the vehicle cannot safely continue, it is a roadside job: dead battery, flat tyre, empty tank, keys locked inside, car will not start, or it must be towed. That is different from booking a Saturday service.',
      },
      {
        heading: 'Kampala first, Uganda as providers cover',
        body: 'Most urgent volume is Kampala and Entebbe Road. Location pages exist so you can see how we talk about Ntinda, Nakawa, Makerere-side Kawempe, and other divisions. Send your live location in the request so the provider is not guessing the junction.',
      },
      {
        heading: 'App-style requesting, no membership card required',
        body: 'People search roadside assistance app because they want a button, not a call centre script. MyGarage services booking is that button. You do not need a separate insurance add-on to send a request, though you still pay the provider for the job.',
      },
    ],
    faqs: [
      {
        question: 'Is roadside assistance available 24/7 in Kampala?',
        answer:
          'Requests can be sent any time. Actual arrival depends on a provider accepting the job and traffic. Mark the request as emergency and share a pin.',
      },
      {
        question: 'What should I prepare before I request help?',
        answer:
          'Location pin, make and model, what failed (won’t start, puncture, smoke), and whether you are in a safe place off the carriageway.',
      },
      {
        question: 'When do I need towing instead of a mobile mechanic?',
        answer:
          'If the engine is seized, the car is in a crash, or the fault needs a workshop, request towing or recovery. Read the towing page for accident versus breakdown recovery.',
      },
    ],
    ctas: [
      { label: 'Request roadside help', href: serviceCategoryHref("Emergency Help (I'm Stuck)") },
      { label: 'Towing & recovery', href: '/towing' },
    ],
    related: [
      { label: 'Towing', href: '/towing' },
      { label: 'Batteries & jump-starts', href: '/batteries' },
      { label: 'Tyres', href: '/tyres' },
      { label: 'Car lockout', href: '/academy/locked-keys-in-car' },
    ],
    priority: 0.96,
  }),
  pillar({
    slug: 'towing',
    path: '/towing',
    h1: 'Car towing and recovery in Uganda',
    title: 'Car Towing Kampala — Tow Truck & Vehicle Recovery Uganda',
    description:
      'Book car towing in Kampala and vehicle recovery in Uganda. Accident towing, breakdown recovery, and tow trucks through MyGarage emergency services.',
    keywords: [
      'car towing Kampala',
      'car towing Uganda',
      'tow truck Kampala',
      'vehicle recovery Kampala',
      'emergency towing',
      'towing near me',
    ],
    intro:
      'Car towing Kampala is for when the vehicle must leave the scene: accident damage, a seized engine, or a breakdown you should not drive. MyGarage lists towing and stuck-vehicle recovery so you are not negotiating with the first tow truck that arrives.',
    sections: [
      {
        heading: 'Breakdown towing versus accident recovery',
        body: 'Breakdown towing is a car that will not move but is intact. Accident recovery may need a flatbed, police abstract coordination, and careful loading. Tell the provider which one you have. Vehicle recovery Kampala pricing follows distance, vehicle size, and how stuck it is.',
      },
      {
        heading: 'Where we see the most requests',
        body: 'Jinja Road, Entebbe Road, Masaka Road, Bombo Road, and the Northern Bypass generate a large share of tow truck Kampala searches. Share a landmark (mall, roundabout, parish) plus the map pin.',
      },
      {
        heading: 'After the tow',
        body: 'Ask the driver to take the car to a garage you choose, not an anonymous yard. Then book diagnostics or repair on MyGarage so the story stays on the vehicle record.',
      },
    ],
    faqs: [
      {
        question: 'How do I request a tow truck in Kampala?',
        answer:
          'Open Emergency Help and choose towing. Send the pin, vehicle type (saloon, SUV, van), and whether it is an accident or a breakdown.',
      },
      {
        question: 'Do you tow outside Kampala?',
        answer:
          'Long-distance recovery depends on the provider. Describe the route (for example Kampala to Jinja or Entebbe). Confirm the fee before the truck is dispatched.',
      },
      {
        question: 'What affects towing cost?',
        answer:
          'Distance, time of day, vehicle size, and whether a winch or off-road recovery is required. Starting prices appear in the services catalogue; the provider confirms the job.',
      },
    ],
    ctas: [
      { label: 'Request towing', href: serviceCategoryHref("Emergency Help (I'm Stuck)") },
      { label: 'Towing cost guide', href: '/academy/towing-cost-kampala' },
    ],
    related: [
      { label: 'Roadside assistance', href: '/roadside-assistance' },
      { label: 'Car repair', href: '/car-repair' },
      { label: 'Car diagnostics', href: '/car-diagnostics' },
      { label: 'Accident recovery tips', href: '/academy/car-accident-recovery' },
    ],
    priority: 0.92,
  }),
  pillar({
    slug: 'car-diagnostics',
    path: '/car-diagnostics',
    h1: 'Car diagnostics in Kampala',
    title: 'Car Diagnostics Kampala — OBD Scan & Engine Fault Diagnosis',
    description:
      'Book car diagnostics in Kampala and Uganda. OBD2 scans, check-engine light diagnosis, and engine fault finding through MyGarage.',
    keywords: [
      'car diagnostics Kampala',
      'car diagnostics Uganda',
      'OBD scan Kampala',
      'check engine light',
      'engine diagnostics',
      'OBD2 diagnostics',
    ],
    intro:
      'A check engine light without a scan is a guess. MyGarage car diagnostics Kampala connects you with providers who can run OBD2 diagnostics, read fault codes, and tell you whether you need a sensor, a loom, or a deeper engine investigation.',
    sections: [
      {
        heading: 'What an OBD scan can and cannot do',
        body: 'OBD diagnostics read stored and pending codes from the engine computer. That is the right first step for warning lights, rough idle, and sudden fuel consumption. It does not replace a mechanic who tests the actual sensor, fuel pressure, or compression.',
      },
      {
        heading: 'Common Kampala fault stories',
        body: 'Oxygen sensors, MAF sensors, crankshaft and camshaft sensors, and ABS sensors fail on high-mileage Toyotas and Nissans. Bring the chassis number. If you already know the code, put it in the request.',
      },
      {
        heading: 'From code to part',
        body: 'When the diagnosis names a part, open the matching parts page or search the storefront. That is how diagnostics become a completed repair instead of a printed code taped to the dash.',
      },
    ],
    faqs: [
      {
        question: 'Should I buy an OBD scanner or book a diagnostic?',
        answer:
          'A basic scanner is useful, but live data and brand-specific codes often need a workshop tool. Book car diagnostic service in Kampala if the light is on, the car is in limp mode, or you cannot clear a returning code.',
      },
      {
        question: 'Do you diagnose automatic gearboxes?',
        answer:
          'Ask in the request. Some providers scan transmission modules; others specialise in engines only. Describe the symptoms (delay, flare, bang into gear).',
      },
      {
        question: 'Will clearing the code fix the car?',
        answer:
          'No. Clearing without repair is how the light returns on Jinja Road. Fix the cause, then confirm with another scan.',
      },
    ],
    ctas: [
      { label: 'Book diagnostics', href: servicesHref() },
      { label: 'Check engine light guide', href: '/academy/check-engine-light' },
    ],
    related: [
      { label: 'Car repair', href: '/car-repair' },
      { label: 'Car inspection', href: '/car-inspection' },
      { label: 'Sensors & electrics', href: '/parts/oxygen-sensor' },
      { label: 'Mechanics', href: '/mechanics' },
    ],
    priority: 0.88,
  }),
  pillar({
    slug: 'car-inspection',
    path: '/car-inspection',
    h1: 'Car inspection in Uganda',
    title: 'Used Car Inspection Uganda — Pre-Purchase Checks in Kampala',
    description:
      'Book a used car inspection in Kampala and Uganda. Pre-purchase vehicle inspections, condition reports, and mobile checks through MyGarage.',
    keywords: [
      'used car inspection Uganda',
      'car inspection Kampala',
      'pre purchase car inspection',
      'vehicle inspection Kampala',
      'car inspection near me',
      'vehicle condition report',
    ],
    intro:
      'A used car inspection in Uganda is cheaper than buying someone else’s engine problem. MyGarage is built for pre-purchase vehicle inspection in Kampala — on the seller’s driveway, at a park, or at a garage.',
    sections: [
      {
        heading: 'What a serious inspection covers',
        body: 'Body gaps, underbody rust, engine leaks, gearbox behaviour, suspension play, tyre age, battery health, and a diagnostic scan. Ask for a vehicle condition report you can keep on the MyGarage profile if you buy.',
      },
      {
        heading: 'Mobile inspection versus ramp inspection',
        body: 'Mobile car inspection is convenient at the seller’s location. A garage ramp still sees more. For expensive SUVs (Prado, Harrier, Forester), pay for the ramp.',
      },
      {
        heading: 'Inspection is not a history report',
        body: 'A physical inspection does not replace ownership documents and service records. Pair this page with vehicle history guidance and the used-car buying checklist.',
      },
    ],
    faqs: [
      {
        question: 'Can I book a pre-purchase inspection in Kampala today?',
        answer:
          'Send a service request with the viewing time and location. Mobile inspections depend on provider availability; workshop inspections need the car brought in or recovered.',
      },
      {
        question: 'Do you inspect Japanese imported cars?',
        answer:
          'Yes. Most Kampala inventory is Japanese used cars. Tell the inspector the auction grade if you have it, but do not treat the grade as a Ugandan roadworthiness certificate.',
      },
      {
        question: 'Should I inspect before I pay a deposit?',
        answer:
          'Yes whenever you can. If the seller refuses any independent check, treat that as information.',
      },
    ],
    ctas: [
      { label: 'Book an inspection', href: servicesHref() },
      { label: 'Used car checklist', href: '/academy/how-to-inspect-a-used-car' },
    ],
    related: [
      { label: 'Used cars Uganda', href: '/used-cars' },
      { label: 'Vehicle history', href: '/vehicle-history' },
      { label: 'Car diagnostics', href: '/car-diagnostics' },
      { label: 'Academy', href: '/academy' },
    ],
    priority: 0.88,
  }),
  pillar({
    slug: 'tyres',
    path: '/tyres',
    h1: 'Tyres in Kampala and Uganda',
    title: 'Tyres Kampala — Replacement, Puncture Repair & Alignment',
    description:
      'Tyres in Kampala and Uganda: buy car tyres, puncture repair, mobile tyre help, wheel alignment, and balancing through MyGarage.',
    keywords: [
      'tyres Kampala',
      'tyres Uganda',
      'car tyres near me',
      'tyre shop Kampala',
      'puncture repair',
      'wheel alignment',
    ],
    intro:
      'Tyres Kampala is a high-frequency MyGarage category: buy tyres, fix a puncture, replace a damaged tyre, or book alignment after pothole season. British “tyres” and American “tires” both land here.',
    sections: [
      {
        heading: 'Roadside puncture versus a tyre shop',
        body: 'Emergency Help includes flat tyre change. That gets you moving. A proper tyre shop Kampala visit is still needed for a repairable puncture, replacement, balancing, and alignment. Do not drive for weeks on a skinny spare.',
      },
      {
        heading: 'Alignment and potholes',
        body: 'Kampala potholes eat inner edges and destroy geometry. If the car pulls or the steering shakes, book wheel alignment and inspect tyres, bushes, and tie rods together.',
      },
      {
        heading: 'Buying tyres on the marketplace',
        body: 'Search size (for example 205/65R16) rather than only the car name. Premio, X-Trail, and Forester sizes differ. Confirm load and speed rating for Hiace and Hilux work vehicles.',
      },
    ],
    faqs: [
      {
        question: 'Do you offer mobile tyre repair in Kampala?',
        answer:
          'Flat tyre change is listed under Emergency Help. Full fitting, balancing, and alignment are workshop jobs in Tyres & Battery.',
      },
      {
        question: 'Should I replace two tyres or four?',
        answer:
          'Replace in axle pairs at minimum, especially on AWD Subaru and some Nissan X-Trail systems. Ask the fitter if the remaining tyres are too worn to mix.',
      },
      {
        question: 'Where can I read about tyre care?',
        answer:
          'Academy covers trip preparation and maintenance checklists, including tyre pressure and tread.',
      },
    ],
    ctas: [
      { label: 'Tyres & battery services', href: serviceCategoryHref('Tyres & Battery') },
      { label: 'Shop tyres', href: shopQueryHref('tyre') },
    ],
    related: [
      { label: 'Batteries', href: '/batteries' },
      { label: 'Roadside assistance', href: '/roadside-assistance' },
      { label: 'Suspension parts', href: '/parts/shock-absorbers' },
      { label: 'Wheel bearings', href: '/parts/wheel-bearings' },
    ],
    priority: 0.9,
  }),
  pillar({
    slug: 'batteries',
    path: '/batteries',
    h1: 'Car batteries in Kampala',
    title: 'Car Battery Kampala — Replacement, Jump Start & Testing',
    description:
      'Car battery Kampala and Uganda: test, jump-start, and replace vehicle batteries. Mobile battery help and marketplace batteries on MyGarage.',
    keywords: [
      'car battery Kampala',
      'car battery Uganda',
      'car battery near me',
      'jump start Kampala',
      'car battery replacement Kampala',
      'dead car battery',
    ],
    intro:
      'A dead car battery is the most common Kampala morning failure after lights left on or a tired cell in heat. MyGarage covers jump-start, battery check, replacement, and buying a battery on the marketplace.',
    sections: [
      {
        heading: 'Jump-start versus replacement',
        body: 'Jump-start (or jumpstart service) is correct when you left an accessory on. If the battery is old, swollen, or fails a load test, replace it. Repeat jump-starts without testing often mean a dying alternator — read the alternator signs guide.',
      },
      {
        heading: 'Mobile battery replacement',
        body: 'Emergency Help lists jump-start. Tyres & Battery lists replacement and charging. Many Kampala jobs can be done in a parking lot if the provider stocks the size (DIN, JIS, and popular Toyota sizes).',
      },
      {
        heading: 'Match the spec',
        body: 'Cold cranking and physical size matter. Premio, Hiace, and Land Cruiser batteries are not interchangeable by guess. Search the storefront or send a photo of the label.',
      },
    ],
    faqs: [
      {
        question: 'Can I get a jump start in Kampala right now?',
        answer:
          'Request Jump-start under Emergency Help and share your pin. Stay with the vehicle if it is safe to do so.',
      },
      {
        question: 'How do I know the battery is bad?',
        answer:
          'Slow crank, clicking starter, lights dimming at idle, and a battery older than about three years in tropical heat are clues. See the Academy article on bad battery signs.',
      },
      {
        question: 'Do you sell car batteries online?',
        answer:
          'Yes. Search batteries on the storefront and confirm the size. Installation can be booked as a service.',
      },
    ],
    ctas: [
      { label: 'Request jump-start', href: serviceCategoryHref("Emergency Help (I'm Stuck)") },
      { label: 'Shop batteries', href: shopQueryHref('battery') },
    ],
    related: [
      { label: 'Signs of a bad battery', href: '/academy/how-to-know-car-battery-is-bad' },
      { label: 'Alternator signs', href: '/academy/how-to-know-alternator-is-bad' },
      { label: 'Roadside assistance', href: '/roadside-assistance' },
      { label: 'Car electrics', href: '/parts/alternator' },
    ],
    priority: 0.9,
  }),
  pillar({
    slug: 'vehicle-history',
    path: '/vehicle-history',
    h1: 'Digital car service history',
    title: 'Car Service History — Digital Vehicle Records Uganda',
    description:
      'Keep car service history, repair records, and maintenance logs in one place. Digital vehicle history for MyGarage owners in Uganda.',
    keywords: [
      'car service history',
      'vehicle service history',
      'digital vehicle history',
      'car maintenance history',
      'vehicle service records',
      'car history app',
    ],
    intro:
      'Car history in Uganda is usually a stamp, a WhatsApp invoice, or nothing. MyGarage vehicle profiles give you digital vehicle records — service, repair, and documents — so the next mechanic is not starting from zero.',
    sections: [
      {
        heading: 'What you can store',
        body: 'Service jobs, repairs, documents, and notes against a specific vehicle. That is car maintenance history you control, useful when you sell or when a new garage asks what oil was used last.',
      },
      {
        heading: 'Not a police file and not Carfax',
        body: 'MyGarage history is the record of work you log and jobs you book on the platform. It is not an automatic national accident register. Pair it with a physical inspection when buying.',
      },
      {
        heading: 'Why workshops should care',
        body: 'Repeat customers who arrive with records are faster to quote. Garage software on MyGarage is the workshop side of the same story.',
      },
    ],
    faqs: [
      {
        question: 'Is this a car history report like some import sites?',
        answer:
          'No. This is your running service and repair log on MyGarage, plus documents you upload. For import auction sheets, keep those files on the vehicle profile as well.',
      },
      {
        question: 'Can a buyer see the history if I sell the car?',
        answer:
          'You can share service records you own. Do not upload other people’s personal data. Use the selling checklist if you are listing the car privately.',
      },
      {
        question: 'How do I start a history for a car I just bought?',
        answer:
          'Add the vehicle, log today’s mileage, photograph the engine bay, and book an inspection if the past is unknown.',
      },
    ],
    ctas: [
      { label: 'Open services & garage', href: servicesHref() },
      { label: 'How to check car history', href: '/academy/how-to-check-car-history' },
    ],
    related: [
      { label: 'Car maintenance', href: '/car-maintenance' },
      { label: 'Car inspection', href: '/car-inspection' },
      { label: 'Used cars', href: '/used-cars' },
      { label: 'Garage software', href: '/garage-management-software' },
    ],
    priority: 0.84,
  }),
  pillar({
    slug: 'used-cars',
    path: '/used-cars',
    h1: 'Used cars in Uganda',
    title: 'Used Cars Uganda — Buy, Inspect & Maintain with MyGarage',
    description:
      'Used cars Uganda and Kampala: inspect before you buy, source spare parts, and keep service history. MyGarage supports car buyers beyond the classified ad.',
    keywords: [
      'used cars Uganda',
      'cars for sale Kampala',
      'Japanese used cars Uganda',
      'buy cars Kampala',
      'car marketplace Uganda',
      'second hand cars Kampala',
    ],
    intro:
      'Cars for sale Uganda mostly means Japanese used cars landing in Kampala. MyGarage is not only a classifieds wall — it is how you inspect, service, and parts-out that Premio or X-Trail after you buy. MyGarage Car Bond is the related buying-and-selling conversation; this page is the ownership layer.',
    sections: [
      {
        heading: 'Before you pay',
        body: 'Book a pre-purchase inspection. Check chassis against documents. Budget for unknown service history: oil, belts, brakes, and bushes. Academy has a used-car buying checklist.',
      },
      {
        heading: 'After you buy',
        body: 'Add the car to your MyGarage vehicle profile, buy the first service parts, and book servicing. That is how a classified purchase becomes a maintained vehicle.',
      },
      {
        heading: 'Selling later',
        body: 'A digital service history and honest photos help you sell a used car in Kampala. Keep invoices. Buyers of second hand cars Uganda listings are more cautious than they were five years ago.',
      },
    ],
    faqs: [
      {
        question: 'Does MyGarage list cars for sale?',
        answer:
          'The core marketplace today is parts and services. Use inspection, diagnostics, and parts to support a purchase you found privately or via MyGarage Car Bond when that flow is available.',
      },
      {
        question: 'What cars are most common?',
        answer:
          'Toyota Premio, Fielder, Harrier, Noah, Hilux, Hiace; Nissan X-Trail and Serena; Subaru Forester and Impreza. Model pages exist for those searches.',
      },
      {
        question: 'Should I buy without a logbook in order?',
        answer:
          'No. Documents and a physical inspection beat a cheap asking price.',
      },
    ],
    ctas: [
      { label: 'Book a used-car inspection', href: servicesHref() },
      { label: 'Buying checklist', href: '/academy/how-to-inspect-a-used-car' },
    ],
    related: [
      { label: 'Car inspection', href: '/car-inspection' },
      { label: 'Vehicle history', href: '/vehicle-history' },
      { label: 'Toyota models', href: '/brands/toyota' },
      { label: 'Spare parts', href: '/spare-parts' },
    ],
    priority: 0.8,
  }),
  pillar({
    slug: 'garage-management-software',
    path: '/garage-management-software',
    h1: 'Garage management software for Uganda workshops',
    title: 'Garage Management Software Uganda — Workshop & Mechanic Tools',
    description:
      'Garage management software for Uganda: bookings, customers, listings, and orders. MyGarage workshop tools for mechanics and auto repair shops.',
    keywords: [
      'garage management software',
      'garage management software Uganda',
      'workshop management software',
      'auto repair software',
      'garage booking software',
      'mechanic software Uganda',
    ],
    intro:
      'Garage management software Uganda is the B2B side of MyGarage: workshops and mechanics who need bookings, customer jobs, and parts sales without a stack of exercise books.',
    sections: [
      {
        heading: 'What workshops get',
        body: 'Service providers use the MyGarage services portal for incoming jobs, profile, and orders. Vendors list parts for the marketplace. That combination is garage booking software plus a path to auto parts inventory sold online.',
      },
      {
        heading: 'Why it fits Kampala workshops',
        body: 'Customers already search book a mechanic and garage near me. If the workshop is only on a gate sign, those jobs go elsewhere. Digital garage management is how you appear in that flow.',
      },
      {
        heading: 'CRM without enterprise theatre',
        body: 'You do not need a European dealer DMS on day one. You need inbound requests, a record of the customer’s vehicle, and a way to sell the pad you already have on the shelf.',
      },
    ],
    faqs: [
      {
        question: 'Is MyGarage garage software or a marketplace?',
        answer:
          'Both. Drivers book and buy. Workshops and parts sellers operate portals. The public SEO pages send demand into those portals.',
      },
      {
        question: 'How do I join as a garage or mechanic?',
        answer:
          'Use vendor or service provider sign-in, complete your profile, and list the jobs you actually do. Fake coverage areas hurt everyone.',
      },
      {
        question: 'Can I manage parts inventory?',
        answer:
          'Vendors publish product listings to the storefront. Treat the catalogue as your online inventory for items you can fulfil.',
      },
    ],
    ctas: [
      { label: 'Partner sign in', href: '/vendor-login' },
      { label: 'Sell on MyGarage', href: '/auth?role=vendor&next=/vendor' },
    ],
    related: [
      { label: 'Garages', href: '/garages' },
      { label: 'Mechanics', href: '/mechanics' },
      { label: 'Auto parts', href: '/auto-parts' },
      { label: 'Contact', href: '/contact-us' },
    ],
    priority: 0.78,
  }),
];

export function getPillar(slug: string): SeoLandingPage | undefined {
  return SEO_PILLARS.find((p) => p.slug === slug);
}
