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
      <body className={`${inter.className} bg-black text-white min-h-screen antialiased overflow-x-hidden`} suppressHydrationWarning>
        <SupabaseSync />
        <div className="relative z-10 w-full max-w-7xl mx-auto min-h-screen pb-24">
          <Onboarding />
          <main className="pb-24 pt-4 p-4 mx-auto w-full max-w-5xl">
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

