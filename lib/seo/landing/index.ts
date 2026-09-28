import { SEO_ACADEMY } from '@/lib/seo/landing/academy';
import { composeBrandPage, SEO_BRANDS } from '@/lib/seo/landing/brands';
import { composeLocationPage, SEO_LOCATIONS } from '@/lib/seo/landing/locations';
import { composeModelPage, SEO_MODELS } from '@/lib/seo/landing/models';
import { composePartPage, SEO_PARTS } from '@/lib/seo/landing/parts';
import { getPillar, SEO_PILLARS } from '@/lib/seo/landing/pillars';
import type { SeoLandingPage, SeoLink } from '@/lib/seo/landing/types';

const PART_NAME_TO_SLUG: Record<string, string> = Object.fromEntries(
  SEO_PARTS.map((part) => [part.name.toLowerCase(), part.slug]),
);

function partLinksFromNames(names: string[]): SeoLink[] {
  const links: SeoLink[] = [];
  for (const name of names) {
    const lower = name.toLowerCase();
    const exact = PART_NAME_TO_SLUG[lower];
    if (exact) {
      const part = SEO_PARTS.find((p) => p.slug === exact);
      if (part) links.push({ label: part.name, href: `/parts/${part.slug}` });
      continue;
    }
    const fuzzy = SEO_PARTS.find(
      (p) => lower.includes(p.search) || p.name.toLowerCase().includes(lower.split(' ')[0] ?? ''),
    );
    if (fuzzy) links.push({ label: fuzzy.name, href: `/parts/${fuzzy.slug}` });
  }
  return links.filter((link, index, arr) => arr.findIndex((item) => item.href === link.href) === index);
}

export function getBrandPage(slug: string): SeoLandingPage | undefined {
  const brand = SEO_BRANDS.find((item) => item.slug === slug);
  if (!brand) return undefined;
  const modelLinks = SEO_MODELS.filter((model) => model.brandSlug === slug).map((model) => ({
    label: model.name,
    href: `/models/${model.slug}`,
  }));
  return composeBrandPage(brand, modelLinks);
}

export function getModelPage(slug: string): SeoLandingPage | undefined {
  const model = SEO_MODELS.find((item) => item.slug === slug);
  if (!model) return undefined;
  return composeModelPage(model, partLinksFromNames(model.commonParts));
}

export function getPartPage(slug: string): SeoLandingPage | undefined {
  const part = SEO_PARTS.find((item) => item.slug === slug);
  return part ? composePartPage(part) : undefined;
}

export function getLocationPage(slug: string): SeoLandingPage | undefined {
  const location = SEO_LOCATIONS.find((item) => item.slug === slug);
  return location ? composeLocationPage(location) : undefined;
}

export function getAcademyPage(slug: string): SeoLandingPage | undefined {
  return SEO_ACADEMY.find((item) => item.slug === slug);
}

export function getAllLandingPages(): SeoLandingPage[] {
  return [
    SERVICE_DIRECTORY_HUB,
    BRANDS_HUB,
    MODELS_HUB,
    PARTS_HUB,
    LOCATIONS_HUB,
    ACADEMY_HUB,
    ...SEO_PILLARS,
    ...SEO_BRANDS.map((brand) => getBrandPage(brand.slug)!),
    ...SEO_MODELS.map((model) => getModelPage(model.slug)!),
    ...SEO_PARTS.map((part) => composePartPage(part)),
    ...SEO_LOCATIONS.map((location) => composeLocationPage(location)),
    ...SEO_ACADEMY,
  ];
}

export function hubPage(
  path: string,
  h1: string,
  title: string,
  description: string,
  keywords: string[],
  intro: string,
  links: SeoLink[],
): SeoLandingPage {
  return {
    kind: 'hub',
    slug: path.replace(/^\//, ''),
    path,
    h1,
    title,
    description,
    keywords,
    intro,
    sections: [
      {
        heading: 'Browse this section',
        body: 'Each page targets a specific search — brand, model, part, neighbourhood, or guide — instead of stuffing every keyword onto the homepage. Open a page, then book a service or shop parts.',
      },
    ],
    faqs: [
      {
        question: 'Why are there so many pages?',
        answer:
          'People search differently: “Premio brake pads Kampala” is not the same query as “roadside assistance”. Dedicated pages rank and help humans faster.',
      },
    ],
    ctas: [
      { label: 'Book a service', href: '/buyer/services' },
      { label: 'Shop parts', href: '/' },
    ],
    related: links,
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: h1, href: path },
    ],
    priority: 0.8,
  };
}

export const BRANDS_HUB = hubPage(
  '/brands',
  'Car brands — spare parts and service in Uganda',
  'Car Brands Uganda — Toyota, Nissan, Subaru Parts & Mechanics',
  'Toyota, Nissan, Subaru, Honda and more. Open a brand page for spare parts, mechanics, and service in Kampala and Uganda.',
  ['Toyota spare parts Uganda', 'Nissan parts Kampala', 'Subaru mechanic Kampala', 'car brands Uganda'],
  'Start with the brand you drive. Each page leads to models, parts, and booking — the architecture for searches such as Toyota spare parts Kampala and Subaru mechanic Kampala.',
  SEO_BRANDS.map((brand) => ({ label: brand.name, href: `/brands/${brand.slug}` })),
);

export const MODELS_HUB = hubPage(
  '/models',
  'Car models — Premio, Fielder, X-Trail, Forester and more',
  'Car Models Uganda — Premio, Harrier, X-Trail, Forester Parts',
  'Model pages for the cars Ugandans actually search: Toyota Premio, Fielder, Harrier, Nissan X-Trail, Subaru Forester, and more.',
  ['Toyota Premio spare parts', 'Toyota Fielder mechanic', 'Nissan X-Trail parts Kampala', 'Subaru Forester service'],
  'Programmatic model pages exist because “Toyota Premio brake pads Kampala” is a real search. Pick your model, then parts or a mechanic.',
  SEO_MODELS.map((model) => ({ label: model.name, href: `/models/${model.slug}` })),
);

export const PARTS_HUB = hubPage(
  '/parts',
  'Car parts — brakes, suspension, engine, electrics',
  'Car Parts Index Uganda — Brake Pads, Shocks, Filters, Batteries',
  'Dedicated pages for brake pads, shock absorbers, oil filters, batteries, headlights and other high-demand spare parts in Uganda.',
  ['brake pads Uganda', 'shock absorbers Kampala', 'oil filter', 'car battery Kampala'],
  'This index is the parts pillar of MyGarage SEO: one useful page per component family, linked from brands and models.',
  SEO_PARTS.map((part) => ({ label: part.name, href: `/parts/${part.slug}` })),
);

export const LOCATIONS_HUB = hubPage(
  '/locations',
  'Mechanics and garages by location',
  'Mechanic Near Me — Kampala Areas, Uganda Cities & East Africa',
  'Location pages for Kampala divisions, major roads, Ugandan cities, and East African expansion searches — mechanics, repair, parts, and roadside help.',
  ['mechanic near me', 'mechanic Ntinda', 'car repair Entebbe', 'garages Kampala'],
  'Local search is not only “Uganda” and “Kampala”. Open your area, then book. Regional pages are honest about Uganda-first dispatch.',
  SEO_LOCATIONS.map((location) => ({ label: location.name, href: `/locations/${location.slug}` })),
);

export const ACADEMY_HUB = hubPage(
  '/academy',
  'MyGarage Academy — car care guides for Uganda',
  'Car Maintenance Tips Uganda — Academy Guides & Checklists',
  'Car maintenance tips, repair explainers, used-car checklists, OEM vs aftermarket, and cost guides for drivers in Uganda.',
  ['car maintenance tips', 'car care tips', 'automotive education Uganda', 'car maintenance for beginners'],
  'Academy is informational SEO: people learn here, then book a mechanic or buy a part. Start with servicing, brakes, batteries, or buying a used car.',
  SEO_ACADEMY.map((item) => ({ label: item.h1, href: item.path })),
);

export const SERVICE_DIRECTORY_HUB = hubPage(
  '/explore',
  'Explore MyGarage — repair, parts, roadside and guides',
  'MyGarage Uganda — Car Repair, Spare Parts, Mechanics & Roadside',
  'Directory of MyGarage SEO pages: car repair, mechanics, garages, spare parts, roadside assistance, brands, models, locations, and Academy.',
  ['MyGarage Uganda', 'car services Uganda', 'automotive platform Uganda', 'MyGarage app'],
  'The homepage is the shop. This directory is the map of service and guide pages so Google and humans can find car repair Uganda, spare parts Kampala, and roadside assistance without stuffing every keyword into one URL.',
  [
    ...SEO_PILLARS.map((pillar) => ({ label: pillar.h1, href: pillar.path })),
    { label: 'Brands', href: '/brands' },
    { label: 'Models', href: '/models' },
    { label: 'Parts', href: '/parts' },
    { label: 'Locations', href: '/locations' },
    { label: 'Academy', href: '/academy' },
  ],
);

export function getHub(path: string): SeoLandingPage | undefined {
  const hubs = [BRANDS_HUB, MODELS_HUB, PARTS_HUB, LOCATIONS_HUB, ACADEMY_HUB, SERVICE_DIRECTORY_HUB];
  return hubs.find((hub) => hub.path === path);
}

export { getPillar, SEO_PILLARS, SEO_BRANDS, SEO_MODELS, SEO_PARTS, SEO_LOCATIONS, SEO_ACADEMY };
