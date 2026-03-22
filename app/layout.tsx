import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import TabBar from '@/components/navigation/TabBar';
import MiniPlayer from '@/components/ui/MiniPlayer';
import Onboarding from '@/components/Onboarding';
import SupabaseSync from '@/components/SupabaseSync';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MusicTCG | Tu mazo musical',
  description: 'Un juego de cartas coleccionables procedural basado en música real.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="theme-color" content="#0a0a0a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={`${inter.className} bg-black text-white min-h-screen antialiased overflow-x-hidden mobile-safe-area`} suppressHydrationWarning>
        <SupabaseSync />
        <div className="relative z-10 w-full max-w-7xl mx-auto min-h-screen pb-20 md:pb-24">
          <Onboarding />
          <main className="layout-mobile md:layout-tablet lg:layout-desktop pt-2 md:pt-4 px-3 md:px-4 lg:px-6 mx-auto w-full max-w-5xl">
            {children}
          </main>
        </div>
        <MiniPlayer />
        <TabBar />
        <Toaster theme="dark" position="top-center" />
      </body>
    </html>
  );
}

