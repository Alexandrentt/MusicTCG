import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import TabBar from '@/components/navigation/TabBar';
import MiniPlayer from '@/components/ui/MiniPlayer';
import StatsBar from '@/components/ui/StatsBar';
import FirebaseSync from '@/components/FirebaseSync';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MusicTCG',
  description: 'Un juego de cartas coleccionables procedural basado en música real.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-[#000000] text-white min-h-screen antialiased`} suppressHydrationWarning>
        <FirebaseSync />
        <StatsBar />
        <main className="pb-24 pt-16 p-4 max-w-2xl mx-auto">
          {children}
        </main>
        <MiniPlayer />
        <TabBar />
        <Toaster theme="dark" position="top-center" />
      </body>
    </html>
  );
}
