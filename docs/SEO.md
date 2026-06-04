# SEO (MyGarage)

## Environment

```env
NEXT_PUBLIC_APP_URL=https://mygarage.ug
# Optional search-console verification:
GOOGLE_SITE_VERIFICATION=your-token
BING_SITE_VERIFICATION=your-token
```

`NEXT_PUBLIC_APP_URL` drives canonical URLs, Open Graph links, `sitemap.xml`, and `robots.txt`.

## What is implemented

| Area | Location |
|------|----------|
| Site config & URLs | `lib/seo/site.ts` |
| Page metadata helpers | `lib/seo/metadata.ts` |
| JSON-LD (Organization, Product, FAQ, …) | `lib/seo/json-ld.ts` |
| Dynamic sitemap | `app/sitemap.ts` (revalidates hourly) |
| Robots rules | `app/robots.ts` |
| Global structured data | `app/layout.tsx` |
| Product `generateMetadata` | `app/products/[id]/page.tsx` |
| Category layouts | `app/category/**/layout.tsx` |
| Public service booking SEO | `app/buyer/services/layout.tsx` |
| Portal/auth/checkout `noindex` | respective `layout.tsx` files |

## Indexable URLs (examples)

- `/` — storefront (supports `?q=` search and `?category=` filters)
- `/products/{id}` — published products only
- `/category/products/{name}`
- `/category/services/{name}`
- `/buyer/services`
- `/faq`, `/contact-us`, legal policies

## Not indexed

Admin, vendor, service-provider portals, buyer account (except `/buyer/services`), auth, cart, checkout, payments.

## After deploy

1. Open [Google Search Console](https://search.google.com/search-console) → add property `https://mygarage.ug`
2. Verify via `GOOGLE_SITE_VERIFICATION` env var (or DNS)
3. Submit sitemap: `https://mygarage.ug/sitemap.xml`
4. Request indexing for home and top category URLs
5. Monitor Coverage and Core Web Vitals

## Extending

- New **public** marketing page: add entry to `STATIC_PAGE_SEO` in `lib/seo/metadata.ts` and `collectSitemapEntries()` in `lib/seo/sitemap-data.ts`
- New **private** area: add `buildNoIndexMetadata()` on its `layout.tsx` and a `Disallow` path in `lib/seo/robots-rules.ts`
