// components/monetization/CosmeticShopBanner.tsx

'use client';

import { Sparkles, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function CosmeticShopBanner() {
    return (
        <Link href="/store?tab=cosmetics">
            <div className="group relative bg-gradient-to-r from-purple-900/60 to-pink-900/60 border border-purple-500/30 rounded-2xl p-4 mb-4 hover:border-purple-400/60 transition-all duration-300 cursor-pointer overflow-hidden shadow-lg hover:shadow-purple-500/20 active:scale-[0.98]">
                {/* Animated Background Element */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/20 blur-3xl rounded-full group-hover:scale-150 transition-transform duration-700"></div>

                <div className="relative flex items-center justify-between z-10">
                    <div className="flex items-center gap-4">
                        <div className="bg-purple-600/30 p-2.5 rounded-xl border border-purple-400/40 group-hover:rotate-12 transition-transform duration-300">
                            <Sparkles className="w-5 h-5 text-purple-300" />
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-white uppercase tracking-tighter group-hover:text-purple-200 transition-colors">
                                Cosméticos y Skins
                            </h4>
                            <p className="text-[10px] text-purple-200/70 font-medium uppercase tracking-widest mt-0.5">
                                Personaliza tus canciones favoritas
                            </p>
                        </div>
                    </div>

                    <div className="bg-white/10 p-1.5 rounded-full group-hover:bg-white/20 transition-colors">
                        <ChevronRight className="w-4 h-4 text-white" />
                    </div>
                </div>
            </div>
        </Link>
    );
}
