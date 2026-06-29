import type { Metadata } from 'next';

import type { Product } from '@/lib/db';

import {
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE_PATH,
  DEFAULT_TITLE,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_TAGLINE,
  absoluteImageUrl,
  absoluteUrl,
  getSiteUrl,
} from '@/lib/seo/site';

export type PageSeoInput = {
  title: string;
  description?: string;
  path?: string;
  keywords?: string[];
  /** Set false for checkout, auth, dashboards. Default true. */
  index?: boolean;
  image?: string | null;
  type?: 'website' | 'article';
};

const NOINDEX_ROBOTS: Metadata['robots'] = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false },
};

const INDEX_ROBOTS: Metadata['robots'] = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    'max-image-preview': 'large',
    'max-snippet': -1,
    'max-video-preview': -1,
  },
};

function resolveTitleString(title: Metadata['title'], fallback: string): string {
  if (typeof title === 'string') return title;
  if (title && typeof title === 'object' && 'absolute' in title && typeof title.absolute === 'string') {
    return title.absolute;
  }
  return fallback;
}

function buildOpenGraph(
  input: PageSeoInput & { title: Metadata['title']; description: string },
): Metadata['openGraph'] {
  const titleString = resolveTitleString(input.title, SITE_NAME);
  const url = input.path ? absoluteUrl(input.path) : getSiteUrl();
  const image = absoluteImageUrl(input.image ?? DEFAULT_OG_IMAGE_PATH);

  return {
    type: input.type ?? 'website',
    locale: 'en_UG',
    url,
    siteName: SITE_NAME,
    title: titleString,
    description: input.description,
    ...(image ? { images: [{ url: image, width: 512, height: 512, alt: SITE_NAME }] } : {}),
  };
}

function buildTwitter(input: {
  title: Metadata['title'];
  description: string;
  image?: string;
  fallbackTitle?: string;
}): Metadata['twitter'] {
  const titleString = resolveTitleString(input.title, input.fallbackTitle ?? SITE_NAME);
  const image = absoluteImageUrl(input.image ?? DEFAULT_OG_IMAGE_PATH);
  return {
    card: 'summary_large_image',
    title: titleString,
    description: input.description,
    ...(image ? { images: [image] } : {}),
  };
}

/** Full page metadata with canonical, Open Graph, and Twitter. */
export function buildPageMetadata(input: PageSeoInput): Metadata {
  const description = input.description ?? DEFAULT_DESCRIPTION;
  /** Root layout uses title.template; use absolute when the string already includes the brand. */
  const title: Metadata['title'] = input.title.includes(SITE_NAME)
    ? { absolute: input.title }
    : input.title;
  const index = input.index !== false;
  const canonical = input.path ? absoluteUrl(input.path) : getSiteUrl();

  return {
    title,
    description,
    keywords: input.keywords ?? [...SITE_KEYWORDS],
    alternates: { canonical },
    robots: index ? INDEX_ROBOTS : NOINDEX_ROBOTS,
    openGraph: buildOpenGraph({ ...input, title, description }),
    twitter: buildTwitter({
      title,
      description,
      image: input.image ?? undefined,
      fallbackTitle: input.title,
    }),
  };
}

export function buildNoIndexMetadata(title: string, description?: string): Metadata {
  return buildPageMetadata({
    title,
    description: description ?? 'Private account area.',
    index: false,
  });
}

/** Root layout defaults — title template for child pages. */
export function buildRootMetadata(): Metadata {
  const siteUrl = getSiteUrl();
  const ogImage = absoluteImageUrl(DEFAULT_OG_IMAGE_PATH);

  const verification: Metadata['verification'] = {};
  if (process.env.GOOGLE_SITE_VERIFICATION?.trim()) {
    verification.google = process.env.GOOGLE_SITE_VERIFICATION.trim();
  }
  if (process.env.BING_SITE_VERIFICATION?.trim()) {
    verification.other = {
      'msvalidate.01': process.env.BING_SITE_VERIFICATION.trim(),
    };
  }

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: DEFAULT_TITLE,
      template: `%s | ${SITE_NAME}`,
    },
    description: DEFAULT_DESCRIPTION,
    applicationName: SITE_NAME,
    authors: [{ name: SITE_NAME, url: siteUrl }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    category: 'automotive',
    keywords: [...SITE_KEYWORDS],
    robots: INDEX_ROBOTS,
    alternates: {
      canonical: '/',
    },
    openGraph: {
      type: 'website',
      locale: 'en_UG',
      url: siteUrl,
      siteName: SITE_NAME,
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      ...(ogImage ? { images: [{ url: ogImage, width: 512, height: 512, alt: SITE_NAME }] } : {}),
    },
    twitter: buildTwitter({
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
    }),
    icons: {
      icon: [
        { url: '/icon0.svg', type: 'image/svg+xml' },
        { url: '/web-app-manifest-192x192.png', type: 'image/png', sizes: '192x192' },
        { url: '/web-app-manifest-512x512.png', type: 'image/png', sizes: '512x512' },
      ],
      shortcut: ['/icon0.svg'],
      apple: [{ url: '/web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png' }],
    },
    manifest: '/manifest.webmanifest',
    other: {
      'apple-mobile-web-app-title': SITE_NAME,
    },
    ...(Object.keys(verification).length > 0 ? { verification } : {}),
  };
}

export function buildProductMetadata(product: Product): Metadata {
  const path = `/products/${product.id}`;
  const price = product.variants?.length
    ? Math.min(...product.variants.map((v) => v.price))
    : product.price;
  const description =
    product.description?.trim().slice(0, 155) ||
    `Buy ${product.name} — ${product.category} from ${product.brand || 'trusted vendors'} on MyGarage Uganda.`;

  const keywords = [
    product.name,
    product.brand,
    product.category,
    product.subcategory,
    ...(product.tags ?? []),
    'car parts Uganda',
    SITE_NAME,
  ].filter(Boolean) as string[];

  const index = product.published !== false;

  return buildPageMetadata({
    title: product.brand ? `${product.name} — ${product.brand}` : product.name,
    description,
    path,
    keywords,
    index,
    image: product.image || product.images?.[0],
    type: 'website',
  });
}

export const STATIC_PAGE_SEO: Record<string, PageSeoInput> = {
  '/': {
    title: 'MyGarage - Buy Car Spare Parts and Automotive Services',
    description:
      'A trusted automotive marketplace for spare parts, accessories, and garage services.',
    path: '/',
    keywords: [
      'Car spare parts Uganda',
      'Auto parts marketplace',
      'Vehicle accessories',
      'Garage services',
      ...SITE_KEYWORDS,
    ],
  },
  '/faq': {
    title: 'Help Center & FAQs',
    description:
      'Answers about orders, fitment, payments, delivery, returns, warranties, and account support for MyGarage customers in Uganda.',
    path: '/faq',
    keywords: ['MyGarage FAQ', 'car parts help', 'returns policy', 'order tracking Uganda'],
  },
  '/contact-us': {
    title: 'Contact Us',
    description:
      'Contact MyGarage support for orders, returns, fitment advice, and delivery. Email, phone, and business hours for customers in Uganda.',
    path: '/contact-us',
    keywords: ['MyGarage contact', 'customer support Uganda', 'auto parts support'],
  },
  '/terms-and-conditions': {
    title: 'Terms and Conditions',
    description: 'Terms governing use of MyGarage, purchases, payments, shipping, and services in Uganda.',
    path: '/terms-and-conditions',
    index: true,
  },
  '/privacy-policy': {
    title: 'Privacy Policy',
    description: 'How MyGarage collects, uses, and protects your personal data under applicable Ugandan law.',
    path: '/privacy-policy',
  },
  '/refund-policy': {
    title: 'Refund & Return Policy',
    description:
      'Return windows, refund timelines, exchanges, and statutory remedies for MyGarage orders in Uganda.',
    path: '/refund-policy',
    keywords: ['returns', 'refund policy', 'car parts returns Uganda'],
  },
  '/buyer/services': {
    title: 'Book Automotive Services',
    description:
      'Request towing, mobile mechanics, car wash, tyres, AC repair, and more from verified providers across Uganda.',
    path: '/buyer/services',
    keywords: [
      'roadside assistance Uganda',
      'mobile mechanic Kampala',
      'car towing',
      'automotive services booking',
    ],
  },
  '/vendor-login': {
    title: 'Vendor & Partner Sign In',
    description: 'Sign in to the MyGarage vendor or service provider portal to manage listings and orders.',
    path: '/vendor-login',
    index: false,
  },
};

export { SITE_TAGLINE };
