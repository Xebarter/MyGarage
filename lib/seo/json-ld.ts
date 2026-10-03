import type { Product } from '@/lib/db';
import { userServiceCategories } from '@/lib/services-catalog';
import type { SeoLandingPage } from '@/lib/seo/landing/types';

import { SITE_NAME, absoluteUrl, getSiteUrl } from '@/lib/seo/site';

type JsonLd = Record<string, unknown>;

const ORG_ID = `${getSiteUrl()}/#organization`;
const WEBSITE_ID = `${getSiteUrl()}/#website`;

export function organizationJsonLd(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORG_ID,
    name: SITE_NAME,
    url: getSiteUrl(),
    logo: absoluteUrl('/web-app-manifest-512x512.png'),
    description:
      'MyGarage Uganda — marketplace for car spare parts, mechanics, garages, servicing, and roadside assistance in Kampala and East Africa.',
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: '+256-726-931-908',
        contactType: 'customer service',
        email: 'support@mygarage.ug',
        areaServed: 'UG',
        availableLanguage: ['English'],
      },
      {
        '@type': 'ContactPoint',
        telephone: '+256-752-405-877',
        contactType: 'customer service',
        areaServed: 'UG',
        availableLanguage: ['English'],
      },
    ],
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Kampala',
      addressCountry: 'UG',
    },
    sameAs: [],
    areaServed: [
      { '@type': 'Country', name: 'Uganda' },
      { '@type': 'City', name: 'Kampala' },
    ],
    knowsAbout: [
      'Car spare parts',
      'Auto repair',
      'Roadside assistance',
      'Vehicle maintenance',
      'OEM part numbers',
    ],
  };
}

export function websiteJsonLd(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE_NAME,
    url: getSiteUrl(),
    publisher: { '@id': ORG_ID },
    inLanguage: 'en-UG',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${getSiteUrl()}/?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function productJsonLd(product: Product): JsonLd {
  const url = absoluteUrl(`/products/${product.id}`);
  const images = [
    product.image,
    ...(product.images ?? []),
  ].filter((src): src is string => Boolean(src?.trim()));

  const prices = product.variants?.length
    ? product.variants.map((v) => v.price)
    : [product.price];
  const lowPrice = Math.min(...prices);
  const highPrice = Math.max(...prices);
  const offerPrice = lowPrice;

  const availability =
    product.published === false
      ? 'https://schema.org/OutOfStock'
      : 'https://schema.org/InStock';

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: images.map((src) =>
      src.startsWith('http://') || src.startsWith('https://')
        ? src
        : absoluteUrl(src.startsWith('/') ? src : `/${src}`),
    ),
    sku: product.sku || product.id,
    brand: product.brand
      ? { '@type': 'Brand', name: product.brand }
      : undefined,
    category: product.category,
    url,
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'UGX',
      lowPrice,
      highPrice: highPrice !== lowPrice ? highPrice : undefined,
      offerCount: product.variants?.length || 1,
      availability,
      url,
      price: offerPrice,
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function productPageJsonLd(product: Product): JsonLd[] {
  return [
    productJsonLd(product),
    breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: product.category, path: `/category/products/${encodeURIComponent(product.category)}` },
      { name: product.name, path: `/products/${product.id}` },
    ]),
  ];
}

export function categoryProductsJsonLd(categoryName: string): JsonLd[] {
  const path = `/category/products/${encodeURIComponent(categoryName)}`;
  return [
    breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: categoryName, path },
    ]),
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${categoryName} — Car Parts`,
      description: `Browse ${categoryName} parts and accessories on MyGarage Uganda.`,
      url: absoluteUrl(path),
      isPartOf: { '@id': WEBSITE_ID },
    },
  ];
}

export function categoryServicesJsonLd(categoryTitle: string): JsonLd[] {
  const path = `/category/services/${encodeURIComponent(categoryTitle)}`;
  const category = userServiceCategories.find(
    (c) => c.title.toLowerCase() === categoryTitle.trim().toLowerCase(),
  );

  return [
    breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Services', path: '/buyer/services' },
      { name: categoryTitle, path },
    ]),
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: category?.title ?? categoryTitle,
      description: category?.useWhen ?? 'Automotive services available through MyGarage.',
      url: absoluteUrl(path),
      provider: { '@id': ORG_ID },
      areaServed: { '@type': 'Country', name: 'Uganda' },
      serviceType: 'Automotive',
    },
  ];
}

export function faqPageJsonLd(
  sections: { title: string; faqs: { question: string; answer: string }[] }[],
): JsonLd {
  const mainEntity = sections.flatMap((section) =>
    section.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  );

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity,
  };
}

export function localBusinessJsonLd(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'AutoPartsStore',
    '@id': `${getSiteUrl()}/#store`,
    name: SITE_NAME,
    url: getSiteUrl(),
    image: absoluteUrl('/web-app-manifest-512x512.png'),
    telephone: ['+256-726-931-908', '+256-752-405-877'],
    email: 'support@mygarage.ug',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Kampala',
      addressCountry: 'UG',
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '08:00',
        closes: '18:00',
      },
    ],
    priceRange: '$$',
    areaServed: [
      { '@type': 'Country', name: 'Uganda' },
      { '@type': 'City', name: 'Kampala' },
      { '@type': 'City', name: 'Entebbe' },
      { '@type': 'City', name: 'Jinja' },
      { '@type': 'City', name: 'Mbarara' },
    ],
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 0.3476,
      longitude: 32.5825,
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Automotive parts and services',
      itemListElement: [
        { '@type': 'OfferCatalog', name: 'Car spare parts' },
        { '@type': 'OfferCatalog', name: 'Roadside assistance' },
        { '@type': 'OfferCatalog', name: 'Car repair and servicing' },
      ],
    },
  };
}

export function landingPageJsonLd(page: SeoLandingPage): JsonLd[] {
  const url = absoluteUrl(page.path);
  const crumbs = breadcrumbJsonLd(
    page.breadcrumbs.map((item) => ({ name: item.label, path: item.href })),
  );

  const faq =
    page.faqs.length > 0
      ? faqPageJsonLd([{ title: page.h1, faqs: page.faqs }])
      : null;

  const main: JsonLd =
    page.kind === 'academy'
      ? {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: page.h1,
          description: page.description,
          url,
          author: { '@id': ORG_ID },
          publisher: { '@id': ORG_ID },
          inLanguage: 'en-UG',
          mainEntityOfPage: url,
        }
      : page.kind === 'hub'
        ? {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: page.h1,
            description: page.description,
            url,
            isPartOf: { '@id': WEBSITE_ID },
            mainEntity: {
              '@type': 'ItemList',
              itemListElement: page.related.map((item, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: item.label,
                url: absoluteUrl(item.href),
              })),
            },
          }
        : {
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: page.h1,
            description: page.description,
            url,
            provider: { '@id': ORG_ID },
            areaServed: { '@type': 'Country', name: 'Uganda' },
            serviceType: 'Automotive',
            brand: { '@id': ORG_ID },
          };

  return faq ? [main, crumbs, faq] : [main, crumbs];
}

export function globalSiteJsonLd(): JsonLd[] {
  return [organizationJsonLd(), websiteJsonLd(), localBusinessJsonLd()];
}
