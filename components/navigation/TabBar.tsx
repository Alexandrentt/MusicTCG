'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Library, ShoppingBag, User } from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { t } from '@/lib/i18n';

export default function TabBar() {
  const pathname = usePathname();
  const { language, isInBattle } = usePlayerStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted || isInBattle) return null;

  return (
    <nav className="fixed bottom-0 w-full bg-[#121212]/90 backdrop-blur-md border-t border-white/10 px-6 py-3 z-50">
      <ul className="flex justify-between items-center max-w-2xl mx-auto">
        <TabItem href="/" icon={<Home size={24} />} label={t(language, 'nav', 'home')} isActive={pathname === '/'} />
        <TabItem href="/search" icon={<Search size={24} />} label={t(language, 'nav', 'search')} isActive={pathname === '/search'} />
        <TabItem href="/studio" icon={<Library size={24} />} label={t(language, 'nav', 'studio')} isActive={pathname === '/studio'} />
        <TabItem href="/store" icon={<ShoppingBag size={24} />} label={t(language, 'nav', 'store')} isActive={pathname === '/store'} />
        <TabItem href="/profile" icon={<User size={24} />} label={t(language, 'nav', 'profile')} isActive={pathname === '/profile'} />
      </ul>
    </nav>
  );
}

function TabItem({ href, icon, label, isActive }: { href: string; icon: React.ReactNode; label: string; isActive: boolean }) {
  return (
    <li>
      <Link 
        href={href} 
        className={`flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
      >
        {icon}
        <span className="text-[10px] uppercase font-bold tracking-tighter">{label}</span>
      </Link>
    </li>
  );
}
