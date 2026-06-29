import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ClientLayout } from '@/components/client-layout';
import { ConsentBanner } from '@/components/consent-banner';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Lead Ace - AI-Powered Lead Intelligence',
  description: 'Advanced AI-Powered Lead Generation and CRM Management',
};

import { validateEnvironment } from '@/lib/startup-check';
import '@/lib/cleanup';

// Run environmental and Puppeteer diagnostics on start
validateEnvironment().catch(err => console.error('Startup check failed:', err));


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={cn('antialiased font-body')}>
        <ClientLayout>{children}</ClientLayout>
        <ConsentBanner />
        <Toaster />
      </body>
    </html>
  );
}
