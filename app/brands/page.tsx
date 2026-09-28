import { SeoLandingView } from '@/components/seo/seo-landing-page';
import { BRANDS_HUB } from '@/lib/seo/landing';
import { metadataFromLanding } from '@/lib/seo/landing/metadata';

export const metadata = metadataFromLanding(BRANDS_HUB);

export default function BrandsHubPage() {
  return <SeoLandingView page={BRANDS_HUB} />;
}
