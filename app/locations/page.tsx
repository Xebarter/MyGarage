import { SeoLandingView } from '@/components/seo/seo-landing-page';
import { LOCATIONS_HUB } from '@/lib/seo/landing';
import { metadataFromLanding } from '@/lib/seo/landing/metadata';

export const metadata = metadataFromLanding(LOCATIONS_HUB);

export default function LocationsHubPage() {
  return <SeoLandingView page={LOCATIONS_HUB} />;
}
