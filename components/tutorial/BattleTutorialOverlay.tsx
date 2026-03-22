'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, ChevronRight, ChevronLeft, Lightbulb, Target,
  Zap, Shield, Swords, Music, Eye, Hand, Brain,
  Sparkles, AlertCircle, CheckCircle2, HelpCircle,
  Play, Pause, SkipForward, Volume2, VolumeX, Settings,
  RotateCcw, Trophy, Clock, Users, Crown, Star,
  TrendingUp, Heart, Disc3, Mic2, Layers, RefreshCw,
  ArrowRight, ArrowLeft, Plus, Minus, Info, BookOpen,
  MousePointer2, MousePointerClick, Keyboard, Gamepad2,
  Monitor, Smartphone, Tablet, Wifi, WifiOff, Loader2,
  Check, XCircle, AlertTriangle, HelpCircle as HelpIcon
} from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  highlightElement?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: string;
  image?: string;
  video?: string;
  tips?: string[];
  shortcuts?: { key: string; action: string }[];
}

interface BattleTutorialOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  mode?: 'first-time' | 'refresher' | 'specific';
  specificTopic?: string;
}

// Tutorial steps for battle mode
const BATTLE_TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: '¡Bienvenido al Campo de Batalla!',
    description: 'Este es el escenario donde la música cobra vida. En MusicTCG, tus cartas musicales luchan por el dominio del escenario.',
    icon: <Sparkles className="w-8 h-8 text-yellow-400" />,
    position: 'center',
    tips: [
      'Cada carta representa una canción real',
      'Las cartas tienen ataque (ATK), defensa (DEF) y costo de energía',
      'Tu objetivo: reducir la salud del oponente a 0'
    ]
  },
  {
    id: 'energy-system',
    title: 'Sistema de Energía',
    description: 'La energía es tu recurso principal. Empiezas con 1 punto y ganas 1 cada turno. Las cartas cuestan energía para jugar.',
    icon: <Zap className="w-8 h-8 text-blue-400" />,
    highlightElement: 'energy-bar',
    position: 'bottom',
    tips: [
      'Energía máxima aumenta al sacrificar cartas',
      'Una vez por turno puedes sacrificar una carta de tu mano',
      'El sacrificio aumenta tu energía máxima permanentemente'
    ],
    shortcuts: [
      { key: 'S', action: 'Sacrificar carta seleccionada' }
    ]
  },
  {
    id: 'hand-cards',
    title: 'Tu Mano de Cartas',
    description: 'Estas son las cartas disponibles para jugar. Cada carta muestra su costo (esquina superior), ataque (rojo) y defensa (azul).',
    icon: <Hand className="w-8 h-8 text-purple-400" />,
    highlightElement: 'player-hand',
    position: 'bottom',
    tips: [
      'Haz clic en una carta para seleccionarla',
      'Doble clic para jugarla inmediatamente',
      'Mantén presionado para ver detalles'
    ],
    shortcuts: [
      { key: '1-5', action: 'Seleccionar carta de la mano' },
      { key: 'Espacio', action: 'Jugar carta seleccionada' }
    ]
  },
  {
    id: 'board-combat',
    title: 'El Tablero de Combate',
    description: 'Aquí es donde ocurre la acción. Tus cartas en el tablero pueden atacar al oponente o defenderse.',
    icon: <Swords className="w-8 h-8 text-red-400" />,
    highlightElement: 'battle-board',
    position: 'center',
    tips: [
      'Las cartas CREATURE pueden atacar y defender',
      'Las cartas EVENT tienen efectos inmediatos',
      'Una carta que ataca queda "girada" (tapped)'
    ],
    shortcuts: [
      { key: 'A', action: 'Activar modo ataque' },
      { key: 'Esc', action: 'Cancelar acción' }
    ]
  },
  {
    id: 'attacking',
    title: 'Cómo Atacar',
    description: 'Para atacar: 1) Selecciona una carta tuya en el tablero, 2) Haz clic en el objetivo (carta rival o su cara).',
    icon: <Target className="w-8 h-8 text-red-500" />,
    highlightElement: 'attack-controls',
    position: 'top',
    tips: [
      'Puedes atacar directamente al oponente si no tiene defensas',
      'El daño = ATK de tu carta - DEF de la defensora',
      'Si tu carta tiene más ATK que la DEF rival, el excedente daña al oponente'
    ],
    shortcuts: [
      { key: 'Click', action: 'Seleccionar atacante' },
      { key: 'Click', action: 'Seleccionar objetivo' }
    ]
  },
  {
    id: 'defending',
    title: 'Defensa y Réplica',
    description: 'Cuando te atacan, puedes: Interceptar (traer carta del backstage), o dejar que el daño pase a tu salud.',
    icon: <Shield className="w-8 h-8 text-cyan-400" />,
    highlightElement: 'defense-options',
    position: 'top',
    tips: [
      'Interceptar cuesta 1 de energía',
      'El backstage es tu reserva de defensas',
      'Tienes 5 segundos para decidir tu réplica'
    ],
    shortcuts: [
      { key: 'I', action: 'Interceptar con carta del backstage' },
      { key: 'B', action: 'Activar carta del backstage' }
    ]
  },
  {
    id: 'playlist-synergy',
    title: 'Playlist y Sinergia',
    description: 'La playlist compartida afecta el combate. Si tu carta coincide con el género actual, ¡gana bonos masivos!',
    icon: <Music className="w-8 h-8 text-green-400" />,
    highlightElement: 'playlist-display',
    position: 'top',
    tips: [
      'Verás el género actual en la parte superior',
      'Cartas del mismo género: +2 ATK/DEF',
      'Cartas del mismo álbum: ¡Efectos especiales!'
    ]
  },
  {
    id: 'backstage',
    title: 'Zona Backstage',
    description: 'El backstage es tu reserva de cartas. Puedes traerlas al tablero o usarlas para interceptar ataques.',
    icon: <Layers className="w-8 h-8 text-orange-400" />,
    highlightElement: 'backstage-zone',
    position: 'right',
    tips: [
      'Máximo 4 cartas en backstage visible',
      'Activar backstage cuesta 1 energía',
      'Las cartas en backstage no cuentan para tu límite de mano'
    ],
    shortcuts: [
      { key: 'B', action: 'Ver/Toggle backstage' }
    ]
  },
  {
    id: 'sabotage',
    title: 'Sabotajes',
    description: '¡Las cartas con habilidades de sabotaje pueden afectar al oponente! Desde robar energía hasta cambiar el orden de robo.',
    icon: <AlertCircle className="w-8 h-8 text-red-400" />,
    highlightElement: 'sabotage-effects',
    position: 'left',
    tips: [
      'ENCRYPT: El oponente no ve tu siguiente carta',
      'REVERSE DRAW: El oponente roba del fondo de su mazo',
      'MILL: Obliga al oponente a descartar cartas'
    ]
  },
  {
    id: 'retiring',
    title: 'Retirar Cartas',
    description: 'Puedes retirar cartas del tablero pagando 1 de energía. Esto libera espacio para nuevas jugadas.',
    icon: <RotateCcw className="w-8 h-8 text-gray-400" />,
    highlightElement: 'retire-option',
    position: 'top',
    tips: [
      'Retirar cuesta 1 energía',
      'La carta va a tu cementerio',
      'Útil para cambiar tu estrategia'
    ],
    shortcuts: [
      { key: 'R', action: 'Activar modo retirar' },
      { key: 'Click', action: 'Seleccionar carta a retirar' }
    ]
  },
  {
    id: 'turn-phases',
    title: 'Fases del Turno',
    description: 'Cada turno tiene fases: 1) Robar carta, 2) Fase Principal (jugar cartas, atacar), 3) Fase de Réplica (del oponente).',
    icon: <Clock className="w-8 h-8 text-blue-300" />,
    highlightElement: 'turn-indicator',
    position: 'top',
    tips: [
      'Solo puedes jugar cartas en tu Fase Principal',
      'El tiempo de réplica es limitado (5 segundos)',
      'Pasa turno cuando termines tus acciones'
    ],
    shortcuts: [
      { key: 'T', action: 'Terminar turno' },
      { key: 'Enter', action: 'Confirmar acción' }
    ]
  },
  {
    id: 'keyboard-shortcuts',
    title: 'Atajos de Teclado',
    description: '¡Usa atajos para jugar más rápido! Cada acción tiene su tecla correspondiente.',
    icon: <Keyboard className="w-8 h-8 text-white" />,
    position: 'center',
    shortcuts: [
      { key: '1-5', action: 'Seleccionar carta de mano' },
      { key: 'Espacio', action: 'Jugar carta seleccionada' },
      { key: 'A', action: 'Modo ataque' },
      { key: 'I', action: 'Interceptar' },
      { key: 'B', action: 'Activar backstage' },
      { key: 'S', action: 'Sacrificar carta' },
      { key: 'R', action: 'Retirar carta' },
      { key: 'T', action: 'Terminar turno' },
      { key: 'Esc', action: 'Cancelar' },
      { key: 'H', action: 'Mostrar/ocultar ayuda' }
    ]
  },
  {
    id: 'winning',
    title: '¡Victoria!',
    description: 'Ganas cuando la salud del oponente llega a 0. ¡Recuerda: el daño excedente de ataques atraviesa las defensas!',
    icon: <Trophy className="w-8 h-8 text-yellow-400" />,
    position: 'center',
    tips: [
      'Planifica tus ataques considerando las defensas',
      'Usa la sinergia de género a tu favor',
      'El backstage es clave para la defensa'
    ]
  },
  {
    id: 'ready',
    title: '¡Listo para el Concierto!',
    description: 'Ahora conoces los fundamentos. ¡Adelante, demuestra tu dominio musical en el campo de batalla!',
    icon: <CheckCircle2 className="w-8 h-8 text-green-400" />,
    position: 'center',
    action: 'start-battle'
  }
];

export default function BattleTutorialOverlay({
  isOpen,
  onClose,
  onComplete,
  mode = 'first-time',
  specificTopic
}: BattleTutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const { language } = usePlayerStore();

  const steps = specificTopic
    ? BATTLE_TUTORIAL_STEPS.filter(s => s.id === specificTopic || s.id === 'welcome')
    : BATTLE_TUTORIAL_STEPS;

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = useCallback(() => {
    if (isLastStep) {
      if (dontShowAgain) {
        localStorage.setItem('battleTutorialCompleted', 'true');
      }
      onComplete?.();
      onClose();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  }, [isLastStep, dontShowAgain, onComplete, onClose]);

  const handlePrevious = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  }, [isFirstStep]);

  const handleSkip = useCallback(() => {
    if (dontShowAgain) {
      localStorage.setItem('battleTutorialCompleted', 'true');
    }
    onComplete?.();
    onClose();
  }, [dontShowAgain, onComplete, onClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'Enter':
          e.preventDefault();
          handleNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handlePrevious();
          break;
        case 'Escape':
          e.preventDefault();
          handleSkip();
          break;
        case 'h':
        case 'H':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setShowShortcuts(prev => !prev);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrevious, handleSkip]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      >
        {/* Main Tutorial Card */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-2xl bg-gradient-to-br from-zinc-900 to-black border border-white/20 rounded-3xl overflow-hidden shadow-2xl"
        >
          {/* Progress Bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-white/10">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-400 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 rounded-xl">
                <BookOpen className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider">Tutorial de Batalla</h2>
                <p className="text-xs text-white/50">Paso {currentStep + 1} de {steps.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowShortcuts(true)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                title="Ver atajos de teclado"
              >
                <Keyboard className="w-5 h-5 text-white/60" />
              </button>
              <button
                onClick={handleSkip}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                title="Saltar tutorial"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 space-y-6">
            {/* Icon and Title */}
            <div className="flex items-start gap-4">
              <motion.div
                key={currentStepData.id}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 15 }}
                className="p-4 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl border border-white/10 shrink-0"
              >
                {currentStepData.icon || <Lightbulb className="w-8 h-8 text-yellow-400" />}
              </motion.div>
              <div className="space-y-2">
                <motion.h3
                  key={`title-${currentStepData.id}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-2xl font-black text-white italic tracking-tight"
                >
                  {currentStepData.title}
                </motion.h3>
                <motion.p
                  key={`desc-${currentStepData.id}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-base text-white/70 leading-relaxed"
                >
                  {currentStepData.description}
                </motion.p>
              </div>
            </div>

            {/* Tips Section */}
            {currentStepData.tips && currentStepData.tips.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-r from-cyan-500/10 to-transparent border-l-4 border-cyan-400 p-4 rounded-r-xl"
              >
                <h4 className="text-xs font-black text-cyan-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Consejos Pro
                </h4>
                <ul className="space-y-2">
                  {currentStepData.tips.map((tip, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-white/80">
                      <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {/* Shortcuts Section */}
            {currentStepData.shortcuts && currentStepData.shortcuts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white/5 border border-white/10 rounded-xl p-4"
              >
                <h4 className="text-xs font-black text-white/60 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Keyboard className="w-4 h-4" />
                  Atajos de Teclado
                </h4>
                <div className="flex flex-wrap gap-2">
                  {currentStepData.shortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg"
                    >
                      <kbd className="px-2 py-1 bg-black/50 rounded text-xs font-mono font-bold text-cyan-400 border border-white/10">
                        {shortcut.key}
                      </kbd>
                      <span className="text-xs text-white/70">{shortcut.action}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Visual Demo Placeholder */}
            {currentStepData.highlightElement && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-white/5 to-transparent border border-white/10 rounded-2xl p-6 text-center"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="p-4 bg-cyan-500/10 rounded-full border border-cyan-500/30 animate-pulse">
                    <Eye className="w-8 h-8 text-cyan-400" />
                  </div>
                  <p className="text-sm text-white/60">
                    Este elemento se resaltará en la interfaz de batalla
                  </p>
                  <code className="px-3 py-1 bg-black/50 rounded-lg text-xs font-mono text-cyan-400 border border-white/10">
                    #{currentStepData.highlightElement}
                  </code>
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/10 p-6 bg-white/[0.02]">
            <div className="flex items-center justify-between">
              {/* Don't show again checkbox */}
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500/20 focus:ring-2"
                />
                <span className="text-sm text-white/60 group-hover:text-white/80 transition-colors">
                  No mostrar de nuevo
                </span>
              </label>

              {/* Navigation Buttons */}
              <div className="flex items-center gap-3">
                {!isFirstStep && (
                  <button
                    onClick={handlePrevious}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white/80 rounded-xl font-bold text-sm transition-all hover:scale-105"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </button>
                )}

                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-black text-sm rounded-xl transition-all hover:scale-105 shadow-lg shadow-cyan-500/20"
                >
                  {isLastStep ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      ¡Entendido!
                    </>
                  ) : (
                    <>
                      Siguiente
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Keyboard hint */}
            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-white/40">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono">←</kbd>
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono">→</kbd>
                Navegar
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono">Enter</kbd>
                Continuar
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono">Esc</kbd>
                Saltar
              </span>
            </div>
          </div>
        </motion.div>

        {/* Shortcuts Modal */}
        {showShortcuts && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[400] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4"
            onClick={() => setShowShortcuts(false)}
          >
            <div
              className="w-full max-w-lg bg-zinc-900 border border-white/20 rounded-2xl p-6 space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Keyboard className="w-5 h-5 text-cyan-400" />
                  Atajos de Teclado Completos
                </h3>
                <button
                  onClick={() => setShowShortcuts(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: '1-5', action: 'Seleccionar carta de mano' },
                  { key: 'Espacio', action: 'Jugar carta seleccionada' },
                  { key: 'A', action: 'Modo ataque' },
                  { key: 'I', action: 'Interceptar ataque' },
                  { key: 'B', action: 'Activar backstage' },
                  { key: 'S', action: 'Sacrificar carta' },
                  { key: 'R', action: 'Retirar carta del tablero' },
                  { key: 'T', action: 'Terminar turno' },
                  { key: 'Esc', action: 'Cancelar acción' },
                  { key: 'H / Ctrl+H', action: 'Mostrar ayuda' },
                ].map((shortcut, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl">
                    <kbd className="px-2 py-1 bg-black/50 rounded-lg text-sm font-mono font-bold text-cyan-400 border border-white/10 shrink-0 min-w-[3rem] text-center">
                      {shortcut.key}
                    </kbd>
                    <span className="text-sm text-white/70">{shortcut.action}</span>
                  </div>
                ))}
              </div>

              <p className="text-xs text-white/40 text-center pt-2">
                Presiona cualquier tecla o haz clic fuera para cerrar
              </p>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// Hook to manage tutorial state
export function useBattleTutorial() {
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialMode, setTutorialMode] = useState<'first-time' | 'refresher' | 'specific'>('first-time');
  const [specificTopic, setSpecificTopic] = useState<string | undefined>();

  useEffect(() => {
    const hasCompleted = localStorage.getItem('battleTutorialCompleted');
    if (!hasCompleted) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowTutorial(true);
      setTutorialMode('first-time');
    }
  }, []);

  const openTutorial = useCallback((mode: 'first-time' | 'refresher' | 'specific' = 'refresher', topic?: string) => {
    setTutorialMode(mode);
    setSpecificTopic(topic);
    setShowTutorial(true);
  }, []);

  const closeTutorial = useCallback(() => {
    setShowTutorial(false);
  }, []);

  const completeTutorial = useCallback(() => {
    localStorage.setItem('battleTutorialCompleted', 'true');
    setShowTutorial(false);
  }, []);

  return {
    showTutorial,
    tutorialMode,
    specificTopic,
    openTutorial,
    closeTutorial,
    completeTutorial,
    TutorialComponent: BattleTutorialOverlay
  };
}

export { BATTLE_TUTORIAL_STEPS };
