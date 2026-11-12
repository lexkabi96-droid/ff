import type {Metadata, Viewport} from 'next';
import './globals.css';
import { StoreProvider } from '@/context/store-context';
import { Toaster } from '@/components/ui/toaster';
import { RegisterServiceWorker } from '@/components/pwa/register-sw';

export const metadata: Metadata = {
  title: 'LaunderSync',
  description: 'Effortless laundry and dry-cleaning management system with Pesapal and M-Pesa payment gateways.',
};

export const viewport: Viewport = {
  themeColor: '#3380CC',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <StoreProvider>
          {children}
          <Toaster />
          <RegisterServiceWorker />
        </StoreProvider>
      </body>
    </html>
  );
}
