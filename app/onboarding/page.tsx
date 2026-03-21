'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getOnboardingState, markPhaseComplete, OnboardingState } from '@/lib/onboarding/onboardingState';
import WelcomeScreen from '@/components/onboarding/WelcomeScreen';
import BoosterAnimation from '@/components/onboarding/BoosterAnimation';
import SaveToCloudModal from '@/components/onboarding/SaveToCloudModal';
import BattleTutorial from '@/components/onboarding/BattleTutorial';
import { AnimatePresence, motion } from 'motion/react';

function OnboardingContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [state, setState] = useState<OnboardingState | null>(null);

    useEffect(() => {
        const init = async () => {
            const currentState = getOnboardingState();
            if (currentState.completed) {
                router.push('/home');
                return;
            }
            setState(currentState);
        };
        init();
    }, [router]);

    const handleNextPhase = (current: OnboardingState['currentPhase']) => {
        markPhaseComplete(current);
        const newState = getOnboardingState();
        setState(newState);
        if (newState.completed) {
            router.push('/home');
        }
    };

    if (!state) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Sincronizando...</div>;

    const renderPhase = () => {
        switch (state.currentPhase) {
            case 'welcome':
                return <WelcomeScreen onComplete={() => handleNextPhase('welcome')} />;
            case 'booster_1':
                return <BoosterAnimation stageNumber={1} onComplete={() => handleNextPhase('booster_1')} />;
            case 'battle':
                return <BattleTutorial onComplete={() => handleNextPhase('battle')} />;
            case 'booster_2':
                return <BoosterAnimation stageNumber={2} onComplete={() => handleNextPhase('booster_2')} />;
            case 'save_cloud':
                return <SaveToCloudModal onComplete={() => handleNextPhase('save_cloud')} onSkip={() => handleNextPhase('save_cloud')} />;
            // Las fases de 'battle', 'grinding', etc. se pueden implementar como mini-tutoriales o vistas específicas
            default:
                return (
                    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-10 text-center">
                        <h2 className="text-4xl font-black mb-4 uppercase tracking-tighter italic">Proximamente: {state.currentPhase}</h2>
                        <p className="text-white/50 mb-8">Esta fase está en desarrollo. ¡Continuemos!</p>
                        <button
                            onClick={() => handleNextPhase(state.currentPhase)}
                            className="px-10 py-4 bg-white text-black font-black uppercase text-sm tracking-widest hover:bg-cyan-400 hover:text-white transition-all transform hover:scale-110"
                        >
                            Simular Fase
                        </button>
                    </div>
                );
        }
    };

    return (
        <main className="min-h-screen bg-black overflow-hidden relative selection:bg-cyan-500 selection:text-white">
            <AnimatePresence mode="wait">
                <motion.div
                    key={state.currentPhase}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.5, ease: "anticipate" }}
                    className="h-full w-full"
                >
                    {renderPhase()}
                </motion.div>
            </AnimatePresence>

            {/* Background Ambience */}
            <div className="fixed inset-0 pointer-events-none -z-10">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_30%,rgba(34,211,238,0.1),transparent_50%)]" />
                <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_70%,rgba(236,72,153,0.1),transparent_50%)]" />
            </div>
        </main>
    );
}

export default function OnboardingPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <OnboardingContent />
        </Suspense>
    );
}
