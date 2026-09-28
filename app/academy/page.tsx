import { SeoLandingView } from '@/components/seo/seo-landing-page';
import { ACADEMY_HUB } from '@/lib/seo/landing';
import { metadataFromLanding } from '@/lib/seo/landing/metadata';

export const metadata = metadataFromLanding(ACADEMY_HUB);

export default function AcademyHubPage() {
  return <SeoLandingView page={ACADEMY_HUB} />;
}
