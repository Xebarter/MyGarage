import { SeoLandingView } from '@/components/seo/seo-landing-page';
import { PARTS_HUB } from '@/lib/seo/landing';
import { metadataFromLanding } from '@/lib/seo/landing/metadata';

export const metadata = metadataFromLanding(PARTS_HUB);

export default function PartsHubPage() {
  return <SeoLandingView page={PARTS_HUB} />;
}
