import type { SeoLandingPage } from '@/lib/seo/landing/types';
import { servicesHref } from '@/lib/seo/landing/links';

function article(
  slug: string,
  title: string,
  description: string,
  keywords: string[],
  h1: string,
  intro: string,
  sections: SeoLandingPage['sections'],
  faqs: SeoLandingPage['faqs'],
  related: SeoLandingPage['related'],
): SeoLandingPage {
  const path = `/academy/${slug}`;
  return {
    kind: 'academy',
    slug,
    path,
    h1,
    title,
    description,
    keywords,
    intro,
    sections,
    faqs,
    ctas: [
      { label: 'Book a service', href: servicesHref() },
      { label: 'Shop parts', href: '/' },
    ],
    related: [{ label: 'Academy home', href: '/academy' }, ...related],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Academy', href: '/academy' },
      { label: h1, href: path },
    ],
    priority: 0.7,
  };
}

export const SEO_ACADEMY: SeoLandingPage[] = [
  article(
    'when-should-i-service-my-car',
    'When Should I Service My Car in Uganda?',
    'How often to service a car in Uganda and Kampala traffic: oil intervals, minor vs major service, and when to book on MyGarage.',
    ['when should I service my car', 'how often should I service my car', 'car service schedule Uganda'],
    'When should you service your car in Uganda?',
    'Handbook intervals assume clean highways. Kampala dust, heat, and idle time shorten oil life. Use mileage, time, and how you drive — then book the service instead of stretching another month.',
    [
      {
        heading: 'A practical interval',
        body: 'For many petrol Toyotas and Nissans in Kampala, plan an oil service every 5,000–7,500 km or six months, whichever comes first. Diesels that idle in traffic or tow may need fuel-filter attention even sooner. If the last service is unknown because you just bought the car, do a full inspection and oil change now, then reset the clock.',
      },
      {
        heading: 'Minor versus major',
        body: 'Minor service is oil, oil filter, top-ups, and a look at brakes and tyres. Major service adds air and cabin filters, plugs on petrol cars, brake fluid when due, and a deeper inspection. MyGarage lists oil change and full service separately so you can ask for the right one.',
      },
      {
        heading: 'Do not wait for a noise',
        body: 'Servicing is cheaper than sanded camshafts. If the oil is black and gritty, you are late. Set a next-service reminder on the vehicle profile after every job.',
      },
    ],
    [
      {
        question: 'How often should I service my car if I only drive on weekends?',
        answer: 'Use time as well as kilometres. Oil still ages. Six months is a sensible maximum between oil changes in this climate even with low mileage.',
      },
      {
        question: 'Does a dealer stamp matter?',
        answer: 'A record matters more than a logo. Keep invoices on MyGarage so any garage can see what was done.',
      },
    ],
    [
      { label: 'Car servicing', href: '/car-servicing' },
      { label: 'Maintenance checklist', href: '/academy/car-maintenance-checklist' },
      { label: 'Oil change cost', href: '/academy/oil-change-cost-uganda' },
    ],
  ),
  article(
    'how-often-to-change-engine-oil',
    'How Often Should I Change Engine Oil in Uganda?',
    'Engine oil change intervals for Kampala traffic, diesel vs petrol, and what happens if you wait too long.',
    ['how often should I change engine oil', 'oil change Uganda', 'engine oil interval'],
    'How often should you change engine oil?',
    'Oil is the cheapest insurance on a high-mileage Japanese import. Stretching intervals to “10,000 km because the bottle says so” is how Kampala engines get noisy.',
    [
      {
        heading: 'Petrol cars',
        body: 'If you commute in jam, change oil and filter together around 5,000 km. Highway-only cars can go longer, but few Uganda cars are highway-only. Use the grade the engine actually specifies, not the thickest oil on the shelf.',
      },
      {
        heading: 'Diesel pick-ups and vans',
        body: 'Hilux, Hiace, Navara, and similar work vehicles ingest soot. Fuel quality varies. Change oil on the short side and never skip the fuel filter. Loss of power is often fuel, not “the turbo is dead”.',
      },
      {
        heading: 'After you change it',
        body: 'Log mileage and date. Shop filters on MyGarage so the garage does not fit a mystery brand. Book the oil change if you cannot do it at home.',
      },
    ],
    [
      {
        question: 'Can I just top up instead of changing?',
        answer: 'Top-up keeps the level safe. It does not remove acid, fuel dilution, or sludge. Change it.',
      },
      {
        question: 'Is cheaper oil fine?',
        answer: 'Wrong spec is worse than a mid-brand that meets the spec. Skyactiv, some VW-group, and many diesels are picky.',
      },
    ],
    [
      { label: 'Engine oil', href: '/parts/engine-oil' },
      { label: 'Oil filters', href: '/parts/oil-filter' },
      { label: 'Car servicing', href: '/car-servicing' },
    ],
  ),
  article(
    'when-to-change-brake-pads',
    'When to Change Brake Pads — Wear Signs in Uganda',
    'How to know brake pads are worn, when to replace them in Kampala traffic, and typical next steps on MyGarage.',
    ['when to change brake pads', 'how to know brake pads are worn', 'brake pads Uganda'],
    'When should you change brake pads?',
    'Kampala traffic eats pads. Taxis and Hiace vans eat them faster. Waiting for metal-on-metal is how you buy discs as well as pads.',
    [
      {
        heading: 'Wear signs',
        body: 'Squeal on light braking, a grinding that does not go away, a pedal that feels longer, or a pad wear warning on later cars. Pull a wheel if you can: less than about 3 mm of friction material is time to replace.',
      },
      {
        heading: 'Pads versus discs',
        body: 'If you hear grinding, budget for discs (rotors) too. Replacing pads on a lipped disc is a short-term trick. See the brake discs part page.',
      },
      {
        heading: 'Fitment',
        body: 'Premio front pads are not a universal Toyota pad. Use the model page and OEM number. Book brake problems under Fix My Car if you want a mechanic to confirm.',
      },
    ],
    [
      {
        question: 'Can I change only the fronts?',
        answer: 'Fronts usually wear first. Replace in axle pairs. Inspect rears while the car is up.',
      },
      {
        question: 'Why did new pads still squeak?',
        answer: 'Glazed discs, missing shims, cheap pads, or a seized caliper. Diagnose rather than buying a second set of pads.',
      },
    ],
    [
      { label: 'Brake pads', href: '/parts/brake-pads' },
      { label: 'Brake discs', href: '/parts/brake-discs' },
      { label: 'Brake pad cost', href: '/academy/brake-pad-replacement-cost-uganda' },
    ],
  ),
  article(
    'how-to-know-car-battery-is-bad',
    'How to Know a Car Battery Is Bad',
    'Signs of a dying car battery in Uganda heat, versus a bad alternator, and when to jump-start or replace.',
    ['how to know car battery is bad', 'dead car battery', 'car battery Kampala'],
    'How do you know a car battery is bad?',
    'Heat in Uganda cooks batteries. Many “won’t start” mornings are a battery that tested fine last year and is finished now.',
    [
      {
        heading: 'Classic signs',
        body: 'Slow crank, rapid clicking, interior lights that sag when you crank, a battery older than about three years, or a case that is swollen. A single event after you left the lights on may only need a jump-start.',
      },
      {
        heading: 'Battery versus alternator',
        body: 'If the car dies again shortly after a jump, test charging voltage. A new battery that keeps going flat is often the alternator or a parasitic drain. Read the alternator article before you buy a second battery.',
      },
      {
        heading: 'What to do on MyGarage',
        body: 'Request a jump-start if you are stuck. Book a battery check or replacement. Shop a battery by size, not by “Toyota battery” as a vague phrase.',
      },
    ],
    [
      {
        question: 'Can a battery fail suddenly?',
        answer: 'Yes, especially after a night of rain or a short-trip week where it never fully charges.',
      },
      {
        question: 'Should I buy the cheapest battery?',
        answer: 'Buy the correct size and a warranty you can actually use. Fit it firmly; loose batteries die from vibration.',
      },
    ],
    [
      { label: 'Batteries', href: '/batteries' },
      { label: 'Alternator signs', href: '/academy/how-to-know-alternator-is-bad' },
      { label: 'Car batteries for sale', href: '/parts/car-battery' },
    ],
  ),
  article(
    'how-to-know-alternator-is-bad',
    'How to Know an Alternator Is Bad',
    'Signs of a failing alternator: battery light, dim lights, repeated jump-starts, and what to test before replacing.',
    ['how to know alternator is bad', 'alternator symptoms', 'battery warning light'],
    'How do you know an alternator is bad?',
    'Replacing a battery because the car died, then watching the new battery die, is the standard Kampala alternator story.',
    [
      {
        heading: 'Symptoms',
        body: 'Battery warning light, headlights that brighten with revving, a burning smell from the belt, whining from the front of the engine, or a battery that is fine on a bench test but goes flat overnight after a drive.',
      },
      {
        heading: 'Quick check',
        body: 'With the engine running, charging voltage at the battery should typically sit around 13.8–14.7V on many cars. Lower can mean a weak alternator or bad connections. Higher can cook the battery. A mechanic should confirm with load.',
      },
      {
        heading: 'Parts',
        body: 'Shop alternators by engine and year. Some cars use the alternator as part of start-stop systems — those are not random swaps. Book electrical issues if you are not set up to change it.',
      },
    ],
    [
      {
        question: 'Can a belt cause the same symptoms?',
        answer: 'A glazed or loose serpentine belt can stop charging. Inspect the belt before condemning the alternator.',
      },
      {
        question: 'Will a jump-start damage an alternator?',
        answer: 'Incorrect jump procedure can. Follow polarity. If in doubt, wait for a provider.',
      },
    ],
    [
      { label: 'Alternators', href: '/parts/alternator' },
      { label: 'Batteries', href: '/batteries' },
      { label: 'Car diagnostics', href: '/car-diagnostics' },
    ],
  ),
  article(
    'signs-of-bad-suspension',
    'Signs of Bad Suspension in Uganda',
    'Pothole damage: shocks, bushes, ball joints, and when to book suspension repair in Kampala.',
    ['signs of bad suspension', 'signs of bad shock absorbers', 'suspension repair Kampala'],
    'Signs of bad suspension',
    'Ugandan roads write suspension invoices. Bouncing, clunks, and inner tyre wear are not “the car is just old”.',
    [
      {
        heading: 'What you feel',
        body: 'The car keeps bouncing after a hump, nose-dives under brakes, wanders on the highway, or knocks over small bumps. One corner sitting lower than the others is a clue.',
      },
      {
        heading: 'What to inspect',
        body: 'Shocks/struts, control-arm bushes, ball joints, tie rods, stabilizer links, and wheel bearings. Replacing only the shock on a car with dead bushes wastes money.',
      },
      {
        heading: 'Alignment after parts',
        body: 'New arms and rods need wheel alignment. Otherwise the new tyres you just bought will wear like the old ones.',
      },
    ],
    [
      {
        question: 'Should I replace shocks in pairs?',
        answer: 'Yes, on the same axle. Mixing a new shock with a dead one upsets the car.',
      },
      {
        question: 'Is a knocking always a ball joint?',
        answer: 'No. It can be a loose heat shield, a drop-link, or a bearing. Book a mechanic if you cannot isolate it.',
      },
    ],
    [
      { label: 'Shock absorbers', href: '/parts/shock-absorbers' },
      { label: 'Control arms', href: '/parts/control-arms' },
      { label: 'Car repair', href: '/car-repair' },
    ],
  ),
  article(
    'signs-of-engine-problems',
    'Signs of Engine Problems — Smoke, Knocking, Overheating',
    'Engine warning signs in Uganda: smoke colour, knocking, overheating, and when to stop driving.',
    ['signs of engine problems', 'engine knocking', 'car overheating', 'car smoking'],
    'Signs of engine problems',
    'Engines talk before they fail. Smoke colour, temperature, and knocking are the language. Ignoring them on a Premio with 250,000 km is how you buy another engine.',
    [
      {
        heading: 'Smoke',
        body: 'White smoke that stays after warm-up can be coolant. Blue is often oil. Black is usually fuel. None of these are “normal for Uganda”. Stop if temperature climbs or the smoke is thick.',
      },
      {
        heading: 'Knocking and loss of power',
        body: 'Knocking under load, misfire, or a car that will not rev may be ignition, sensors, or something mechanical. Book diagnostics rather than pouring random additives.',
      },
      {
        heading: 'Overheating',
        body: 'Pull over. Running hot for “just to Ntinda” is how you warp a head. Check coolant when cold, not when boiling. See water pump, thermostat, and radiator pages.',
      },
    ],
    [
      {
        question: 'The car uses too much fuel. Is that an engine problem?',
        answer: 'It can be plugs, a MAF, a jammed brake caliper, or simply a dirty air filter. Diagnose; do not guess injectors first.',
      },
      {
        question: 'Should I keep driving with the check engine light?',
        answer: 'Flashing light usually means stop. Steady light still deserves a scan this week, not next year.',
      },
    ],
    [
      { label: 'Car diagnostics', href: '/car-diagnostics' },
      { label: 'Check engine light', href: '/academy/check-engine-light' },
      { label: 'Overheating', href: '/academy/car-overheating' },
    ],
  ),
  article(
    'how-to-maintain-a-car',
    'How to Maintain a Car in Uganda',
    'Practical car maintenance for Ugandan conditions: fluids, tyres, battery, and a simple monthly habit.',
    ['how to maintain a car', 'car maintenance Uganda', 'beginner car maintenance'],
    'How to maintain a car in Uganda',
    'You do not need to be a mechanic. You need a short list you actually do, plus a garage you can book when the list says so.',
    [
      {
        heading: 'Every week',
        body: 'Tyre pressure, lights, washer water, and a look under the car for new spots. Kampala heat and potholes change these fast.',
      },
      {
        heading: 'Every service',
        body: 'Oil and filter, air filter if dusty, brake check, battery terminals, and a scan if a light is on. Log it on MyGarage.',
      },
      {
        heading: 'Every year',
        body: 'Coolant condition, brake fluid age, belts, and an honest look at bushes. Used imports often skip this until something breaks.',
      },
    ],
    [
      {
        question: 'I have no handbook. What now?',
        answer: 'Use the model page for your car, book an inspection, and start a digital history from today’s mileage.',
      },
      {
        question: 'Is a car wash maintenance?',
        answer: 'Clean paint helps you see rust. Underbody wash after muddy trips helps. It does not replace oil.',
      },
    ],
    [
      { label: 'Car maintenance', href: '/car-maintenance' },
      { label: 'Checklist', href: '/academy/car-maintenance-checklist' },
      { label: 'Academy', href: '/academy' },
    ],
  ),
  article(
    'car-maintenance-checklist',
    'Car Maintenance Checklist for Uganda',
    'A printable-style car maintenance checklist: fluids, brakes, tyres, battery, lights, and documents.',
    ['car maintenance checklist', 'car service checklist', 'car inspection checklist'],
    'Car maintenance checklist',
    'Use this as a living list on your vehicle profile, not a poster you ignore. Tick items, then shop or book.',
    [
      {
        heading: 'Fluids',
        body: 'Engine oil level and colour, coolant when cold, brake fluid level and colour, washer, and power steering if hydraulic. Diesel: fuel filter service due date.',
      },
      {
        heading: 'Stopping and rolling',
        body: 'Pad thickness, disc condition, handbrake, tyre tread and age, spare, alignment pull, wheel nuts.',
      },
      {
        heading: 'Electrics and body',
        body: 'Battery age and terminals, charging warning light, headlights and brake lights, horn, wipers. Photograph the engine bay once a year.',
      },
      {
        heading: 'Paper',
        body: 'Insurance, licence, logbook, and service invoices. Store copies on the vehicle record.',
      },
    ],
    [
      {
        question: 'How often should I run the checklist?',
        answer: 'A two-minute walk-around weekly and a fuller check at every oil service.',
      },
      {
        question: 'Can a workshop use my checklist?',
        answer: 'Yes. That is the point of digital records. Share what you have already done.',
      },
    ],
    [
      { label: 'Car maintenance', href: '/car-maintenance' },
      { label: 'Vehicle history', href: '/vehicle-history' },
      { label: 'When to service', href: '/academy/when-should-i-service-my-car' },
    ],
  ),
  article(
    'how-to-choose-a-mechanic',
    'How to Choose a Mechanic or Garage in Kampala',
    'How to choose a mechanic in Kampala: questions to ask, red flags, and why verified booking beats a random stall.',
    ['how to choose a mechanic', 'how to choose a garage', 'trusted mechanic Kampala'],
    'How to choose a mechanic in Kampala',
    'The cheapest hourly rate is often the most expensive engine. Choose process, not only price.',
    [
      {
        heading: 'Ask before work starts',
        body: 'Will they diagnose before quoting? Do they use the OEM number for parts? Will you get the old parts back? Can they handle your brand (Subaru AWD, Mercedes electronics) or should you go elsewhere?',
      },
      {
        heading: 'Red flags',
        body: 'No written scope, pressure to “leave the car and we’ll see”, mixing every fluid into one jug, or refusing to explain a scan result. Trusted mechanics Uganda customers return to can explain a job in plain English.',
      },
      {
        heading: 'Use the platform',
        body: 'Book through MyGarage so the job is attached to an account. That is not magic honesty, but it is better than cash-only anonymity. Read the mechanics and garages pillar pages.',
      },
    ],
    [
      {
        question: 'Should I use a dealer or an independent?',
        answer: 'Dealers suit warranty and tricky electrics. Independents suit routine service if they know the model. Match the job to the shop.',
      },
      {
        question: 'Is a mobile mechanic enough?',
        answer: 'For jump-starts, some electrics, and inspections, yes. For alignment, gearbox, and welding, no.',
      },
    ],
    [
      { label: 'Mechanics', href: '/mechanics' },
      { label: 'Garages', href: '/garages' },
      { label: 'Garage software', href: '/garage-management-software' },
    ],
  ),
  article(
    'how-to-find-genuine-spare-parts',
    'How to Find Genuine Spare Parts in Uganda',
    'How to find genuine spare parts and identify fake car parts in Kampala markets versus online listings.',
    ['how to find genuine spare parts', 'how to identify fake car parts', 'genuine spare parts Uganda'],
    'How to find genuine spare parts',
    'Fake pads and filters are a Kampala tax on rushed buyers. Slow down, use numbers, and buy from listings that name the brand.',
    [
      {
        heading: 'Start with the number',
        body: 'Photograph the old part. Search the OEM number on MyGarage. If a seller cannot tell you the number, you are guessing.',
      },
      {
        heading: 'Packaging tells',
        body: 'Misspelled brands, holograms that look photocopied, and prices far below the market. Genuine is not always dealer-boxed OEM, but it is never a dusty bag with no markings.',
      },
      {
        heading: 'Aftermarket can still be honest',
        body: 'A known aftermarket brand with a real part number is different from a counterfeit “ Toyota” print. Read OEM vs aftermarket next.',
      },
    ],
    [
      {
        question: 'Are market stalls always fake?',
        answer: 'No. Some are excellent. The risk is higher without paperwork. Online listings with a vendor account are easier to follow up.',
      },
      {
        question: 'What if the part arrives wrong?',
        answer: 'Use the refund policy and contact support with photos and the order number. Do not fit a part you already suspect.',
      },
    ],
    [
      { label: 'Spare parts', href: '/spare-parts' },
      { label: 'OEM parts', href: '/oem-parts' },
      { label: 'Identify fakes', href: '/academy/how-to-identify-fake-car-parts' },
    ],
  ),
  article(
    'how-to-identify-fake-car-parts',
    'How to Identify Fake Car Parts',
    'Practical checks for counterfeit brake pads, filters, and batteries sold in Uganda.',
    ['how to identify fake car parts', 'fake brake pads', 'counterfeit auto parts'],
    'How to identify fake car parts',
    'Counterfeits copy the box, not the friction material or the filter paper. Your stopping distance does not care about the hologram.',
    [
      {
        heading: 'Brakes',
        body: 'Weigh the pad against a known genuine, check backing-plate stamping, and be suspicious of “ceramic” pads at half the price. If the mechanic cannot name the brand after unwrapping, pause.',
      },
      {
        heading: 'Filters',
        body: 'Look at the rubber seal, the metal end caps, and whether the paper is evenly potted. Cheap filters collapse and dump debris into the engine.',
      },
      {
        heading: 'Batteries and electrics',
        body: 'Date codes, weight, and warranty process. A battery with no date and a verbal warranty is a story.',
      },
    ],
    [
      {
        question: 'Is cheaper always fake?',
        answer: 'No. Aftermarket pricing can be honest. Fake means it pretends to be a brand it is not.',
      },
      {
        question: 'Should I buy from the first Google result?',
        answer: 'Buy from a platform where the seller is identifiable. MyGarage vendor listings are built for that follow-up.',
      },
    ],
    [
      { label: 'Genuine parts guide', href: '/academy/how-to-find-genuine-spare-parts' },
      { label: 'Brake pads', href: '/parts/brake-pads' },
      { label: 'Oil filters', href: '/parts/oil-filter' },
    ],
  ),
  article(
    'how-to-find-oem-part-number',
    'How to Find an OEM Part Number',
    'What an OEM part number is and how to find it on the part, invoice, or catalogue for Uganda cars.',
    ['how to find OEM part number', 'what is an OEM part number', 'part number lookup'],
    'How to find an OEM part number',
    'The OEM part number is the only sentence the factory and a serious parts person both understand. Names like “Premio pads” are a dialect.',
    [
      {
        heading: 'On the part',
        body: 'Clean the old pad, filter canister, sensor body, or shock. Numbers are stamped, stickered, or moulded. Photograph before the garage throws the part away.',
      },
      {
        heading: 'On paperwork',
        body: 'Dealer invoices, import documents, and previous job cards. If you bought the car yesterday, ask the seller for the last parts receipt.',
      },
      {
        heading: 'On MyGarage',
        body: 'Paste the number into search. Use the OEM parts pillar. Support can help with Toyota, Nissan, and Subaru numbers if you send chassis plus photo.',
      },
    ],
    [
      {
        question: 'Is MPN the same as OEM number?',
        answer: 'MPN usually means manufacturer part number. For this site, treat it as the same job: a precise identity for the component.',
      },
      {
        question: 'What if two numbers are printed?',
        answer: 'One may be a date or batch. Send both photos. Do not guess which one to type.',
      },
    ],
    [
      { label: 'OEM parts', href: '/oem-parts' },
      { label: 'OEM vs aftermarket', href: '/academy/oem-vs-aftermarket-parts' },
      { label: 'Spare parts', href: '/spare-parts' },
    ],
  ),
  article(
    'oem-vs-aftermarket-parts',
    'OEM vs Aftermarket Parts — What to Buy in Uganda',
    'Difference between OEM and aftermarket parts, when genuine matters, and how MyGarage listings describe quality.',
    ['difference between OEM and aftermarket parts', 'OEM vs aftermarket', 'genuine OEM parts'],
    'OEM versus aftermarket parts',
    'Both can be correct. The wrong choice is a fake, or an aftermarket part on a safety job you treated like a cup holder.',
    [
      {
        heading: 'OEM and genuine',
        body: 'OEM tracks the original specification. Genuine dealer boxes add distribution and warranty path. Use these for brakes, steering, airbags, and many sensors.',
      },
      {
        heading: 'Aftermarket',
        body: 'Independent brands. Some are excellent and common on high-mileage Fielders. Some are dust. Buy named brands with a number you can search.',
      },
      {
        heading: 'Uganda reality',
        body: 'If the car is a 2007 Premio that will never see a dealer again, a good aftermarket filter is rational. If you just bought a late Harrier, do not cheap out on a caliper.',
      },
    ],
    [
      {
        question: 'Will aftermarket void something?',
        answer: 'There is rarely a Ugandan factory warranty left on used imports. The risk is reliability and safety, not a stamp.',
      },
      {
        question: 'How does MyGarage label this?',
        answer: 'Product pages carry brand and seller information. Read them. Ask support if the listing is unclear.',
      },
    ],
    [
      { label: 'OEM lookup', href: '/oem-parts' },
      { label: 'Spare parts', href: '/spare-parts' },
      { label: 'Genuine parts', href: '/academy/how-to-find-genuine-spare-parts' },
    ],
  ),
  article(
    'how-to-check-car-history',
    'How to Check Car History in Uganda',
    'How to check car history: documents, service records, inspections, and what MyGarage digital history can and cannot show.',
    ['how to check car history', 'vehicle history report Uganda', 'car service records'],
    'How to check car history',
    'Uganda does not give you a single button equal to some overseas history sites. You combine documents, a physical inspection, and whatever service records exist.',
    [
      {
        heading: 'Documents',
        body: 'Logbook, IDs, import paperwork, and whether chassis and engine numbers match the plates. Walk away from chaos.',
      },
      {
        heading: 'Service and repair history',
        body: 'Stamps, WhatsApp invoices, and now MyGarage vehicle records if the current owner used the platform. No record is itself a finding.',
      },
      {
        heading: 'Inspection',
        body: 'A pre-purchase inspection plus a scan will catch more than a PDF. Book that on MyGarage before you pay a deposit if you can.',
      },
    ],
    [
      {
        question: 'Does MyGarage sell Carfax-style reports?',
        answer: 'No. We store the history you and your booked jobs create, plus files you upload. That is still more than an empty glovebox.',
      },
      {
        question: 'What about auction grades?',
        answer: 'Useful context for Japanese imports, not a substitute for a Ugandan road test and underside look.',
      },
    ],
    [
      { label: 'Vehicle history', href: '/vehicle-history' },
      { label: 'Car inspection', href: '/car-inspection' },
      { label: 'Used cars', href: '/used-cars' },
    ],
  ),
  article(
    'how-to-reduce-fuel-consumption',
    'How to Reduce Fuel Consumption in Kampala Traffic',
    'Practical ways to reduce fuel consumption: tyres, plugs, driving style, and jammed brakes.',
    ['how to reduce fuel consumption', 'car consuming too much fuel', 'fuel economy Uganda'],
    'How to reduce fuel consumption',
    'Kampala jam already burns fuel. Mechanical drag and neglected service make it worse. Fix the car before you blame the pump price alone.',
    [
      {
        heading: 'Mechanical causes',
        body: 'Underinflated tyres, worn plugs, a dirty air filter, a stuck caliper, a failing sensor (O2, MAF), or carrying a boot full of cement. Diagnose if consumption jumped suddenly.',
      },
      {
        heading: 'Driving',
        body: 'Hard launches, high idle AC in sun, and roof racks you never remove. You cannot out-drive a jammed brake, but you can stop making it worse.',
      },
      {
        heading: 'Fuel quality stories',
        body: 'If every tank is bad, that is a pattern for a workshop. If one tank is bad, do not add six bottles of additive on the roadside.',
      },
    ],
    [
      {
        question: 'Will a cheap “fuel saver” gadget help?',
        answer: 'Almost never. Spend on plugs, filters, and tyres.',
      },
      {
        question: 'Is AC a big factor?',
        answer: 'In Uganda heat, yes. That is comfort. Service the AC if it is weak rather than running windows down at highway speed.',
      },
    ],
    [
      { label: 'Spark plugs', href: '/parts/spark-plugs' },
      { label: 'Air filters', href: '/parts/air-filter' },
      { label: 'Tyres', href: '/tyres' },
    ],
  ),
  article(
    'how-to-prepare-car-for-long-trip',
    'How to Prepare a Car for a Long Trip in Uganda',
    'Trip checklist: tyres, cooling, lights, spare, and what to do if you break down upcountry.',
    ['how to prepare car for long trip', 'Uganda road trip car checklist'],
    'How to prepare your car for a long trip',
    'Masaka, Gulu, Mbarara, and Mbale roads punish neglected cooling and tyres. Prepare in Kampala, not at the first trading centre after dark.',
    [
      {
        heading: 'The night before',
        body: 'Tyres including spare, lights, oil and coolant when cold, wipers, jack, wheel spanner, and a torch. Confirm the spare actually holds air.',
      },
      {
        heading: 'Cooling and belts',
        body: 'Overheating at speed is a classic. If the fan or radiator is already weak in town, it will fail upcountry. Book a check if the gauge already sits high in jam.',
      },
      {
        heading: 'If it fails on the road',
        body: 'Get off the carriageway if you can. Request roadside assistance or towing with a pin. Do not pour cold water on a screaming-hot engine.',
      },
    ],
    [
      {
        question: 'Should I change oil just before a trip?',
        answer: 'If you are due, yes. Do not start a 400 km trip on oil you already know is black.',
      },
      {
        question: 'Is a second battery necessary?',
        answer: 'No. A healthy battery and charging system is. Test instead of carrying random spares you cannot fit.',
      },
    ],
    [
      { label: 'Roadside assistance', href: '/roadside-assistance' },
      { label: 'Radiators', href: '/parts/radiator' },
      { label: 'Checklist', href: '/academy/car-maintenance-checklist' },
    ],
  ),
  article(
    'how-to-inspect-a-used-car',
    'How to Inspect a Used Car in Uganda',
    'Used car buying checklist: body, engine, documents, test drive, and when to pay for a professional inspection.',
    ['how to inspect a used car', 'used car buying checklist', 'used cars Kampala'],
    'How to inspect a used car',
    'The asking price is the start of the conversation, not the end. A two-hour inspection is cheaper than a quiet engine knock that appears on day four.',
    [
      {
        heading: 'Cold start',
        body: 'Hear the engine from cold. Smoke, knocking, and warning lights are more honest before a seller idles it for twenty minutes.',
      },
      {
        heading: 'Underside and body',
        body: 'Rust, oil, mismatched paint, and flood signs. Kampala cars hide inner-wing rust and boot-floor surprises.',
      },
      {
        heading: 'Pay a professional',
        body: 'If the car is expensive (Prado, Harrier, Forester turbo), book a MyGarage inspection. Take a scan. Read the used cars pillar.',
      },
    ],
    [
      {
        question: 'Should I buy without a test drive?',
        answer: 'Almost never. If it cannot be driven, budget for recovery and a workshop inspection, or walk away.',
      },
      {
        question: 'Is a low odometer always good?',
        answer: 'No. Cluster games exist. Judge the pedals, seats, and service story together.',
      },
    ],
    [
      { label: 'Car inspection', href: '/car-inspection' },
      { label: 'Used cars', href: '/used-cars' },
      { label: 'Car history', href: '/academy/how-to-check-car-history' },
    ],
  ),
  article(
    'car-wont-start',
    'Car Won’t Start — What to Check in Kampala',
    'Car not starting: battery, starter, fuel, immobilizer, and when to call a mobile mechanic.',
    ['car won\'t start', 'car not starting', 'engine won\'t start'],
    'Car won’t start: what to do',
    'Most Kampala no-starts are battery, then starter, then fuel or immobilizer. Work through that order before you approve an engine swap.',
    [
      {
        heading: 'Lights and clicks',
        body: 'Dim lights and rapid clicks: battery or connections. One solid click: often starter. Silent with good lights: immobilizer, neutral safety, or a more interesting electrical fault.',
      },
      {
        heading: 'Cranks but no start',
        body: 'Fuel, spark, or security. Do not keep cranking until the battery is dead. Book a mobile mechanic and share what you already heard.',
      },
      {
        heading: 'Emergency Help',
        body: 'Jump-start if it is clearly a battery. Tow if you smell fuel or the engine seized. Roadside assistance exists for this exact hour.',
      },
    ],
    [
      {
        question: 'Should I pour petrol in the air filter?',
        answer: 'No.',
      },
      {
        question: 'The car started after a rain. Is that the battery?',
        answer: 'Sometimes ignition coils or wet connectors. If it repeats, book diagnostics rather than another jump.',
      },
    ],
    [
      { label: 'Roadside assistance', href: '/roadside-assistance' },
      { label: 'Batteries', href: '/batteries' },
      { label: 'Starter motors', href: '/parts/starter-motor' },
    ],
  ),
  article(
    'car-overheating',
    'Car Overheating — What to Do and What Breaks Next',
    'Car overheating in Uganda traffic: stop safely, cooling parts to check, and when to tow.',
    ['car overheating', 'engine overheating', 'car leaking coolant'],
    'Car overheating',
    'Overheating in jam is a Ugandan special. The gauge does not negotiate. Stop before you buy a head gasket.',
    [
      {
        heading: 'Immediate',
        body: 'Hazard lights, get off the live lane if you can, heater on full (it dumps heat), and do not open a hot cap. Request help if you are on the bypass.',
      },
      {
        heading: 'Likely parts',
        body: 'Low coolant, stuck thermostat, failed fan, rotten radiator, water pump, or a leak. Shop those parts after a diagnosis, not as a five-item shopping list you fit all at once without testing.',
      },
      {
        heading: 'After it cools',
        body: 'If the oil looks like milkshake, do not drive. Tow. Book engine diagnostics.',
      },
    ],
    [
      {
        question: 'Can I add water?',
        answer: 'Only when the engine is cool, and prefer proper coolant mix after. Water-only is an emergency, not a lifestyle.',
      },
      {
        question: 'Why does it overheat only in traffic?',
        answer: 'Often the electric fan, fan switch, or a thermostat. Highway airflow was hiding it.',
      },
    ],
    [
      { label: 'Thermostats', href: '/parts/thermostat' },
      { label: 'Radiators', href: '/parts/radiator' },
      { label: 'Towing', href: '/towing' },
    ],
  ),
  article(
    'check-engine-light',
    'Check Engine Light — What It Means and What to Do',
    'Check engine light diagnosis in Kampala: when to scan, flashing vs steady, and common sensors.',
    ['check engine light', 'check engine light diagnosis', 'OBD scan Kampala'],
    'Check engine light',
    'The light is a request for data, not a request for a random sensor from Kisekka. Scan it.',
    [
      {
        heading: 'Steady versus flashing',
        body: 'Flashing often means misfire that can damage a catalytic converter — reduce load and get help. Steady still needs a scan this week.',
      },
      {
        heading: 'Common Kampala codes',
        body: 'Oxygen sensors, MAF, misfires from plugs and coils, EVAP on some cars, and ABS-related lights that people confuse with engine lights. Look at which lamp actually came on.',
      },
      {
        heading: 'Book a diagnostic',
        body: 'MyGarage car diagnostics is the path if you do not own a scanner you trust. Clearing the code at a stall without repair is how it returns on Jinja Road.',
      },
    ],
    [
      {
        question: 'Can I pass a trip with the light on?',
        answer: 'If it is steady, the car drives normally, and you have an appointment, maybe. If it flashes, or the car is in limp mode, no.',
      },
      {
        question: 'Will disconnecting the battery fix it?',
        answer: 'It may hide the light until the computer is angry again. Fix the cause.',
      },
    ],
    [
      { label: 'Car diagnostics', href: '/car-diagnostics' },
      { label: 'Oxygen sensors', href: '/parts/oxygen-sensor' },
      { label: 'MAF sensors', href: '/parts/mass-airflow-sensor' },
    ],
  ),
  article(
    'brake-pad-replacement-cost-uganda',
    'Brake Pad Replacement Cost in Uganda',
    'What affects brake pad replacement cost in Kampala: parts quality, discs, labour, and how to get a real quote.',
    ['brake pad replacement cost Uganda', 'brake pad replacement cost Kampala', 'car repair cost Uganda'],
    'Brake pad replacement cost in Uganda',
    'There is no single national price. Pads for a Vitz are not pads for a Land Cruiser. Quality and whether discs are included change the invoice more than the labour hour.',
    [
      {
        heading: 'What you are paying for',
        body: 'Parts (axle set, genuine vs aftermarket), machining or replacing discs, clips, and labour. Seized calipers add a surprise line. Starting service catalogue prices on MyGarage are a floor, not a promise for every car.',
      },
      {
        heading: 'How to get a useful quote',
        body: 'Name the make, model, year, and whether the car already grinds. Ask if the quote is pads only. Shop pads on the marketplace if you want to see parts prices separately.',
      },
      {
        heading: 'False economy',
        body: 'The cheapest pads on a Hiace taxi last a week. Budget like an adult.',
      },
    ],
    [
      {
        question: 'Why is Kampala more expensive than a village workshop?',
        answer: 'Parts availability, rent, and the quality of the pad. Compare like-for-like brands, not rumours.',
      },
      {
        question: 'Can I supply my own pads?',
        answer: 'Often yes. Buy from MyGarage so the part is documented, then book fitting.',
      },
    ],
    [
      { label: 'Brake pads', href: '/parts/brake-pads' },
      { label: 'Car repair', href: '/car-repair' },
      { label: 'Service costs', href: '/academy/car-service-cost-uganda' },
    ],
  ),
  article(
    'oil-change-cost-uganda',
    'Oil Change Cost in Uganda',
    'Oil change cost in Uganda and Kampala: oil spec, filter quality, and labour versus DIY.',
    ['oil change cost Uganda', 'car service price Uganda', 'mechanic prices Kampala'],
    'Oil change cost in Uganda',
    'The oil grade and the filter decide the bill more than the ten minutes of labour. A 5W-30 that meets the spec is not the same product as a mystery 20W-50 poured because “it is for Africa”.',
    [
      {
        heading: 'Parts of the price',
        body: 'Litres of oil, oil filter, washer, disposal, and labour. Diesels and some Europeans take more litres. MyGarage lists an oil-change starting price in the service catalogue; confirm litres for your engine.',
      },
      {
        heading: 'Do it right',
        body: 'Filter every time. Reset reminders. Log mileage. A cheap oil change that skips the filter is not a saving.',
      },
    ],
    [
      {
        question: 'Is dealer oil change worth it?',
        answer: 'For cars still in a meaningful warranty path, maybe. For a 2010 Axio, a careful independent with the right oil is the usual Kampala answer.',
      },
      {
        question: 'Can I buy oil on MyGarage and pay only labour?',
        answer: 'Often yes. Shop engine oil and oil filters, then book the service.',
      },
    ],
    [
      { label: 'Engine oil', href: '/parts/engine-oil' },
      { label: 'Car servicing', href: '/car-servicing' },
      { label: 'When to service', href: '/academy/when-should-i-service-my-car' },
    ],
  ),
  article(
    'car-service-cost-uganda',
    'Car Service Cost in Uganda',
    'Car service and mechanic charges in Uganda: what changes the price and how to read a quote.',
    ['car service cost Uganda', 'mechanic charges Uganda', 'garage prices Kampala'],
    'Car service cost in Uganda',
    '“How much is a service?” is unanswerable until you name the car and whether you mean oil-only or a major service with plugs and brake fluid.',
    [
      {
        heading: 'Minor vs major',
        body: 'Minor is oil and a look-around. Major is more parts. Catalogue starting prices on MyGarage show the shape of the market, not your final invoice.',
      },
      {
        heading: 'What inflates quotes',
        body: 'European cars, diesels, seized bolts, and “while we are here” extras. Ask for a written scope. Compare garages on process, not only the first number.',
      },
    ],
    [
      {
        question: 'Why do taxi Hiace services cost more?',
        answer: 'Hours, oil volume, and worn hardware. They are work vehicles. Service them like it.',
      },
      {
        question: 'Are mobile mechanic prices lower?',
        answer: 'Sometimes for simple jobs. You pay for travel. Complex jobs still belong in a garage.',
      },
    ],
    [
      { label: 'Car servicing', href: '/car-servicing' },
      { label: 'Garages', href: '/garages' },
      { label: 'Oil change cost', href: '/academy/oil-change-cost-uganda' },
    ],
  ),
  article(
    'towing-cost-kampala',
    'Towing Cost in Kampala',
    'What affects towing and car recovery cost in Kampala: distance, vehicle size, accident vs breakdown.',
    ['towing cost Kampala', 'car recovery cost Uganda', 'roadside assistance cost Uganda'],
    'Towing cost in Kampala',
    'Towing is sold by distance, vehicle size, time, and how stuck you are — not by a single Facebook comment price.',
    [
      {
        heading: 'Breakdown vs accident',
        body: 'A rolling breakdown on a good road is one job. An accident with a jammed wheel, or a car in a ditch, is another. Say which one you have.',
      },
      {
        heading: 'How to keep it sane',
        body: 'Share the pin, the vehicle type, and the destination garage. Confirm the fee before the truck moves. Catalogue starting prices exist; they are not a 40 km flatbed.',
      },
    ],
    [
      {
        question: 'Do I pay if they arrive and I started the car?',
        answer: 'Ask when you book. Call-out fees are normal if a truck was already dispatched.',
      },
      {
        question: 'Can they take the car to my chosen garage?',
        answer: 'Yes — say so in the request. Do not accept a mystery yard if you have a workshop.',
      },
    ],
    [
      { label: 'Towing', href: '/towing' },
      { label: 'Roadside assistance', href: '/roadside-assistance' },
      { label: 'Accident recovery', href: '/academy/car-accident-recovery' },
    ],
  ),
  article(
    'car-accident-recovery',
    'Car Accident Recovery in Uganda',
    'What to do after an accident: safety, police, towing, and repair next steps with MyGarage.',
    ['car accident recovery', 'accident towing Kampala', 'accident recovery Uganda'],
    'Car accident recovery',
    'Safety, then documentation, then recovery. Parts and repair come after the car is somewhere honest.',
    [
      {
        heading: 'On scene',
        body: 'Hazards, triangles if you have them, and do not stand in the live lane. Call for help. Photograph positions before anything is moved if it is safe.',
      },
      {
        heading: 'Recovery',
        body: 'Request accident towing on MyGarage. A flatbed is kinder to broken wheels than dragging. Name the garage or yard you trust.',
      },
      {
        heading: 'After',
        body: 'Body repair, diagnostics if airbags fired, and a written estimate. Shop body parts with photos. Do not let anyone start cutting until you agree the scope.',
      },
    ],
    [
      {
        question: 'Should I use the first tow truck that appears?',
        answer: 'Prefer a dispatched provider with a confirmed fee. Scene hustlers are expensive.',
      },
      {
        question: 'What if the car still drives?',
        answer: 'If steering, lights, and wheels are intact, you may drive a short distance. If not, tow. Fluid leaks are a no.',
      },
    ],
    [
      { label: 'Towing', href: '/towing' },
      { label: 'Body parts', href: '/parts/bumpers' },
      { label: 'Car repair', href: '/car-repair' },
    ],
  ),
  article(
    'locked-keys-in-car',
    'Keys Locked in the Car — Kampala Lockout Help',
    'Car lockout in Kampala: what to try, what not to do, and how to request key assistance.',
    ['keys locked in car', 'car lockout Kampala', 'car lockout service'],
    'Keys locked in the car',
    'Lockouts happen in mall parks and school gates. Do not smash a window as the first idea.',
    [
      {
        heading: 'Before you panic',
        body: 'Check every door, the boot, and whether a spare is at home. If a child or pet is inside, say so immediately in the request — that changes urgency.',
      },
      {
        heading: 'What not to do',
        body: 'Wire hangers on modern cars waste time and scratch paint. Avoid random “locksmiths” who only know how to break the lock.',
      },
      {
        heading: 'MyGarage',
        body: 'Emergency Help includes keys locked in car. Share the exact park name and a pin. Body shops exist if a window is already broken — that is a different job.',
      },
    ],
    [
      {
        question: 'Can you cut a new key on the spot?',
        answer: 'Some cars need dealer-level programming. The first job is getting in. Programming is a follow-up.',
      },
      {
        question: 'Will this damage the car?',
        answer: 'A competent entry should not. Ask the provider what method they will use on your make.',
      },
    ],
    [
      { label: 'Roadside assistance', href: '/roadside-assistance' },
      { label: 'Kampala', href: '/locations/kampala' },
      { label: 'Emergency mechanic', href: '/mechanics' },
    ],
  ),
];
