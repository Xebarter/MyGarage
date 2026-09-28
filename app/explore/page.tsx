import { SeoLandingView } from '@/components/seo/seo-landing-page';
import { SERVICE_DIRECTORY_HUB } from '@/lib/seo/landing';
import { metadataFromLanding } from '@/lib/seo/landing/metadata';

export const metadata = metadataFromLanding(SERVICE_DIRECTORY_HUB);

export default function ExplorePage() {
  return <SeoLandingView page={SERVICE_DIRECTORY_HUB} />;
}
