import { SeoLandingView } from '@/components/seo/seo-landing-page';
import { MODELS_HUB } from '@/lib/seo/landing';
import { metadataFromLanding } from '@/lib/seo/landing/metadata';

export const metadata = metadataFromLanding(MODELS_HUB);

export default function ModelsHubPage() {
  return <SeoLandingView page={MODELS_HUB} />;
}
