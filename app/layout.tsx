import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { Nunito } from 'next/font/google';
import Script from 'next/script';
import { Suspense } from 'react';

import { JsonLdScript } from '@/components/seo/json-ld-script';
import { MobileAppFooterHost } from '@/components/mobile-app-footer-host';
import { ThemeProvider } from '@/components/theme-provider';
import { WelcomeDialogHost } from '@/components/welcome-dialog';
import { CollectDisplayNameHost } from '@/components/auth/collect-display-name';
import { ConciergeChatHost } from '@/components/concierge/concierge-chat-host';
import { ScrollToTopOnNavigate } from '@/components/scroll-to-top';
import { buildRootMetadata } from '@/lib/seo/metadata';
import { globalSiteJsonLd } from '@/lib/seo/json-ld';

import './globals.css';

/** esbuild's keepNames helper is emitted into the theme snippet, but not defined in the browser. */
const defineNameHelper =
  'var __name=function(t,v){try{Object.defineProperty(t,"name",{value:v,configurable:!0})}catch(e){}return t};';

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-nunito',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#FFF6EA',
};

export const metadata: Metadata = buildRootMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-UG" className={nunito.variable} suppressHydrationWarning>
      <body className={`${nunito.className} font-sans antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: defineNameHelper }} />
        <Script src="/api/public-config" strategy="beforeInteractive" />
        <JsonLdScript data={globalSiteJsonLd()} />
        <ThemeProvider
          attribute="class"
          forcedTheme="light"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Suspense fallback={null}>
            <ScrollToTopOnNavigate />
          </Suspense>
          <WelcomeDialogHost />
          <CollectDisplayNameHost />
          <ConciergeChatHost />
          <MobileAppFooterHost />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
