import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';

import { JsonLdScript } from '@/components/seo/json-ld-script';
import { ThemeProvider } from '@/components/theme-provider';
import { buildRootMetadata } from '@/lib/seo/metadata';
import { globalSiteJsonLd } from '@/lib/seo/json-ld';

import './globals.css';

export const metadata: Metadata = buildRootMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-UG" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <JsonLdScript data={globalSiteJsonLd()} />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
