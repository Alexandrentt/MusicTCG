'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Library, ShoppingBag, User, Users } from 'lucide-react';
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

  const navItems = [
    { href: '/', icon: Home, label: t(language, 'nav', 'home') },
    { href: '/studio', icon: Library, label: t(language, 'nav', 'studio') },
    { href: '/friends', icon: Users, label: t(language, 'nav', 'friends') || 'Amigos' },
    { href: '/store', icon: ShoppingBag, label: t(language, 'nav', 'store') },
    { href: '/profile', icon: User, label: t(language, 'nav', 'profile') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-t border-white/10">
      {/* Mobile - Always show this on small screens */}
      <div className="md:hidden">
        <ul className="flex justify-around items-center max-w-lg mx-auto px-2 py-2">
          {navItems.map((item) => (
            <TabItemMobile
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              isActive={pathname === item.href}
            />
          ))}
        </ul>
      </div>

      {/* Desktop - Show on md screens and up */}
      <div className="hidden md:block">
        <ul className="flex justify-between items-center max-w-4xl mx-auto px-8 py-3">
          {navItems.map((item) => (
            <TabItemDesktop
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              isActive={pathname === item.href}
            />
          ))}
        </ul>
      </div>

      {/* Safe area padding for mobile */}
      <div className="h-safe-bottom md:hidden" />
    </nav>
  );
}

function TabItemMobile({ href, icon: Icon, label, isActive }: {
  href: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
}) {
  return (
    <li className="flex-1">
      <Link
        href={href}
        className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-all duration-200 ${isActive
            ? 'text-cyan-400 bg-cyan-500/10'
            : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
          }`}
      >
        <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
        <span className="text-[10px] font-bold uppercase tracking-tight">{label}</span>
      </Link>
    </li>
  );
}

function TabItemDesktop({ href, icon: Icon, label, isActive }: {
  href: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 ${isActive
            ? 'text-white bg-white/10'
            : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
      >
        <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
        <span className="text-sm font-bold uppercase tracking-tight">{label}</span>
      </Link>
    </li>
  );
}
