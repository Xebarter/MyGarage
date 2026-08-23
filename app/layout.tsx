import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { Nunito } from 'next/font/google';

import { JsonLdScript } from '@/components/seo/json-ld-script';
import { MobileAppFooterHost } from '@/components/mobile-app-footer-host';
import { ThemeProvider } from '@/components/theme-provider';
import { buildRootMetadata } from '@/lib/seo/metadata';
import { globalSiteJsonLd } from '@/lib/seo/json-ld';

import './globals.css';

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-nunito',
  display: 'swap',
});

export const metadata: Metadata = buildRootMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-UG" className={nunito.variable} suppressHydrationWarning>
      <body className={`${nunito.className} font-sans antialiased`}>
        <JsonLdScript data={globalSiteJsonLd()} />
        <ThemeProvider
          attribute="class"
          forcedTheme="light"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <MobileAppFooterHost />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
