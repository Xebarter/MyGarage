export type SeoFaq = {
  question: string;
  answer: string;
};

export type SeoSection = {
  heading: string;
  body: string;
};

export type SeoCta = {
  label: string;
  href: string;
};

export type SeoLink = {
  label: string;
  href: string;
};

export type SeoKind = 'pillar' | 'brand' | 'model' | 'part' | 'location' | 'academy' | 'hub';

export type SeoLandingPage = {
  kind: SeoKind;
  slug: string;
  path: string;
  h1: string;
  title: string;
  description: string;
  keywords: string[];
  intro: string;
  sections: SeoSection[];
  faqs: SeoFaq[];
  ctas: SeoCta[];
  related: SeoLink[];
  breadcrumbs: SeoLink[];
  priority: number;
};
