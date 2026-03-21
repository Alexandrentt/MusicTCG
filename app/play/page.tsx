'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useMusicPlayer, Track } from '@/store/useMusicPlayer';
import Card from '@/components/cards/Card';
import { User, Swords, Shield, Zap, Sparkles, Trophy, Music, Disc3, Settings, LogOut, ChevronRight, Library, Mic2, Skull, Play, Volume2, ShieldAlert, X, VolumeX, Star } from 'lucide-react';
import { useGameEngine, BoardCard, hasKw, TurnPhase } from '@/hooks/useGameEngine';
import { checkCoincidenceBonus, getSharedPlaylist } from '@/lib/engine/sharedPlaylistService';
import { generateCard, CardData } from '@/lib/engine/generator';
import { calculateDeckPower, getDifficultyLevel, generateBotDeck as singleplayerGenerateBotDeck, botPlayTurn, botReplicaResponse, DifficultyLevel, BotAction } from '@/lib/engine/singleplayerBot';
import { generateBotDeck } from '@/lib/engine/botDeckGenerator';
import { BotDifficulty } from '@/types/multiplayer';
import { playSound } from '@/lib/audio';
import { t } from '@/lib/i18n';
import CardBack from '@/components/CardBack';
import { useRanking } from '@/hooks/useRanking';
import { audioEngine } from '@/lib/engine/audioEngine';
import { MasterCardTemplate } from '@/types/types';
import { recordMatchResult, getCurrentUserId } from '@/lib/database/supabaseSync';
import { toast } from 'sonner';
import { generateRandomChest } from '@/lib/monetization/chestSystem';


function mapMasterCardToCardData(c: MasterCardTemplate): CardData {
  return {
    ...c,
    stats: { atk: c.atk, def: c.def },
  };
}

// ── Sub-Components ──

function SettingsModal({ isOpen, onClose, onConcede, volume, setVolume, language }: {
  isOpen: boolean;
  onClose: () => void;
  onConcede: () => void;
  volume: number;
  setVolume: (v: number) => void;
  language: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md bg-[#121212] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-zinc-900 to-black">
          <h2 className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-400" />
            {t(language, 'profile', 'settings')}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 space-y-8">
          {/* Volume Control */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Volumen Maestro</label>
              <span className="text-sm font-mono text-white">{Math.round(volume * 100)}%</span>
            </div>
            <div className="flex items-center gap-4">
              <VolumeX className="w-4 h-4 text-gray-500" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVolume(parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
              />
              <Volume2 className="w-4 h-4 text-gray-500" />
            </div>
          </div>

          {/* Game Info */}
          <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Modo de Juego</span>
              <span className="text-white font-bold">Duelo Estándar</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Servidor</span>
              <span className="text-green-400 font-bold">Conectado (Local)</span>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-4 pt-4">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-colors"
            >
              Continuar
            </button>
            <button
              onClick={onConcede}
              className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Rendirse
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function BackstageSlot({ card, onClick, energy, disabled }: { card: BoardCard; onClick?: () => void; energy: number; disabled: boolean }) {
  const isEvent = card.type === 'EVENT';
  const cost = isEvent ? card.cost : 2;
  const canAfford = energy >= cost;

  return (
    <motion.div
      layout
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      onClick={() => !disabled && canAfford && onClick?.()}
      className={`w-12 h-16 sm:w-16 sm:h-24 rounded-lg border flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group ${isEvent ? 'border-purple-500/50 bg-purple-900/20' : 'border-blue-500/50 bg-blue-900/20'
        } ${!canAfford || disabled ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
    >
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />

      {/* Miniature representation */}
      <div className="w-8 h-10 sm:w-10 sm:h-14 rounded-sm overflow-hidden mb-0.5 sm:mb-1 shadow-2xl opacity-80 group-hover:opacity-100 transition-opacity">
        <Card data={card} className="origin-top-left transform scale-[0.12] sm:scale-[0.16] pointer-events-none" />
      </div>

      <div className="flex flex-col items-center z-10">
        <div className={`text-[6px] sm:text-[8px] font-black px-1 rounded-full mb-0.5 ${canAfford ? 'bg-white text-black' : 'bg-red-500 text-white'}`}>
          {cost}⚡
        </div>
      </div>
    </motion.div>
  );
}

// ─── BoardCard visual component ──────────────────────────────────────────────

function BoardCardSlot({
  card,
  isSelected,
  canTarget,
  onClick,
  onPointerDown,
  onPointerUp,
  onHoverStart,
  onHoverEnd,
  owner,
}: {
  card: BoardCard;
  isSelected?: boolean;
  canTarget?: boolean;
  onClick?: (e?: React.MouseEvent) => void;
  onPointerDown?: () => void;
  onPointerUp?: () => void;
  onHoverStart?: (card: BoardCard, rect: DOMRect) => void;
  onHoverEnd?: () => void;
  owner: 'player' | 'bot';
}) {
  const hasTaunt = hasKw(card, 'taunt');

  const [isRetiring, setIsRetiring] = useState(false);

  return (
    <motion.div
      layout
      initial={{ scale: 0, opacity: 0, y: owner === 'bot' ? -40 : 40 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0, opacity: 0 }}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onMouseEnter={(e) => {
        if (owner === 'player') setIsRetiring(true);
        if (onHoverStart) {
          const rect = e.currentTarget.getBoundingClientRect();
          onHoverStart(card, rect);
        }
      }}
      onMouseLeave={() => {
        setIsRetiring(false);
        if (onHoverEnd) onHoverEnd();
      }}
      className={[
        'relative w-16 h-24 sm:w-24 sm:h-32 rounded-lg sm:rounded-xl border flex items-center justify-center cursor-pointer transition-all duration-200 select-none group shrink-0',
        card.isTapped ? 'opacity-60' : '',
        isSelected ? 'border-green-400 ring-4 ring-green-400/30 shadow-[0_0_24px_rgba(34,197,94,0.6)] scale-110 z-30' : '',
        canTarget ? 'border-red-500/60 hover:border-red-400 hover:scale-105 cursor-crosshair' : '',
        !isSelected && !canTarget ? 'border-white/15 hover:border-white/40' : '',
        card.stageFright ? 'grayscale-[0.3]' : '',
        hasTaunt ? 'ring-2 ring-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : '',
      ].join(' ') + (card.isTapped ? (owner === 'bot' ? ' -rotate-6' : ' rotate-6') : '')}
    >
      <div className="absolute inset-0 rounded-[6px] sm:rounded-[10px] bg-zinc-900 overflow-hidden pointer-events-none">
        {card.artworkUrl ? (
          <img src={card.artworkUrl} alt={card.name} className="absolute inset-0 w-full h-full object-cover opacity-80" />
        ) : (
          <div className="w-full h-full flex justify-center items-center"><Music className="w-8 h-8 opacity-20" /></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />

        {/* Name and Stats overlay for better visibility on board */}
        <div className="absolute bottom-1 left-1 right-1 flex flex-col gap-0.5">
          <span className="text-[6px] sm:text-[8px] font-black text-white leading-tight line-clamp-1 overflow-hidden drop-shadow-md">{card.name}</span>
          {!card.type || card.type === 'CREATURE' ? (
            <div className="flex justify-between items-center text-[8px] sm:text-[10px] font-black w-full drop-shadow-md">
              <span className="text-red-400 flex items-center"><Shield className="w-2 sm:w-3 h-2 sm:h-3 mr-0.5" />{card.atk}</span>
              <span className="text-cyan-400 flex items-center"><Shield className="w-2 sm:w-3 h-2 sm:h-3 mr-0.5" />{card.def}</span>
            </div>
          ) : (
            <div className="text-[7px] sm:text-[9px] text-purple-400 font-bold drop-shadow-md uppercase text-center w-full">Event</div>
          )}
        </div>
      </div>

      {/* Retire action overlay */}
      {owner === 'player' && isRetiring && !card.isTapped && (
        <button
          onClick={(e) => { e.stopPropagation(); onClick?.(e); }}
          className="absolute inset-0 z-40 bg-purple-900/60 backdrop-blur-[2px] rounded-[6px] sm:rounded-[10px] flex flex-col items-center justify-center gap-1 group-hover:opacity-100 opacity-0 transition-opacity"
        >
          <div className="bg-white text-black text-[6px] sm:text-[8px] font-black px-2 py-0.5 rounded-full mb-1">1⚡</div>
          <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-tighter">Retirar</span>
        </button>
      )}

      {/* Stat overlay */}
      <div className="absolute bottom-0.5 left-0.5 right-0.5 flex justify-between z-10 pointer-events-none">
        <span className="text-[8px] sm:text-[10px] font-black text-red-100 bg-red-600/90 px-1 rounded-sm shadow-sm">
          {card.currentAtk}
        </span>
        <span className="text-[8px] sm:text-[10px] font-black text-blue-100 bg-blue-600/90 px-1 rounded-sm shadow-sm">
          {card.currentDef}
        </span>
      </div>

      {/* Keyword badges */}
      <div className="absolute -top-1.5 left-0 right-0 flex justify-center gap-0.5 z-20 pointer-events-none">
        {hasTaunt && (
          <div className="text-[6px] sm:text-[7px] font-black bg-yellow-500 text-black px-1 rounded-full whitespace-nowrap shadow-md">
            PROV
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PlayPageWrapper() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-[#050505] text-white flex items-center justify-center font-black tracking-widest text-2xl animate-pulse">CARGANDO ESCENARIO...</div>}>
      <PlayPage />
    </Suspense>
  );
}

function PlayPage() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get('roomId');
  const mode = searchParams.get('mode');
  const [inspectingBoardCard, setInspectingBoardCard] = useState<{ card: BoardCard, rect: DOMRect } | null>(null);

  // Custom difficulty config
  const qsDifficulty = searchParams.get('difficulty') as string as DifficultyLevel;

  const qsDeckId = searchParams.get('deckId');

  const { decks, inventory, setIsInBattle, language, addChest } = usePlayerStore();
  const { setQueue, playNext, setVolume, volume, currentTrack } = useMusicPlayer();

  const {
    player, bot, turn, turnCount, phase, gameOver, pendingAttack,
    startGame, playCard, promoteCard, declareAttack, resolvePendingAttack, skipReplica, intercept, activateBackstage, retireCard, endTurn, doMulligan,
    playerRef, botRef, turnRef, phaseRef, gameOverRef, nextDraws,
  } = useGameEngine();

  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [matchStarted, setMatchStarted] = useState(false);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [selectedHandIndex, setSelectedHandIndex] = useState<number | null>(null);
  const [selectedAttackerIndex, setSelectedAttackerIndex] = useState<number | null>(null);
  const [inspectedCard, setInspectedCard] = useState<CardData | null>(null);
  const [showTurnIndicator, setShowTurnIndicator] = useState(false);
  const [isScratching, setIsScratching] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('novato');
  const inspectTimer = useRef<NodeJS.Timeout | null>(null);

  const { awardWin, awardLoss, grantXP } = useRanking();
  const hasAwardedRewards = useRef(false);

  // Bot AI action queue — executes actions one at a time with delays
  const botActionQueue = useRef<BotAction[]>([]);
  const botProcessing = useRef(false);

  // ── Long-press to inspect ──
  const handlePointerDown = (card: CardData) => {
    inspectTimer.current = setTimeout(() => setInspectedCard(card), 400);
  };
  const handlePointerUp = () => {
    if (inspectTimer.current) clearTimeout(inspectTimer.current);
    setInspectedCard(null);
  };

  // Reset selections on turn change
  useEffect(() => {
    if (matchStarted && !gameOver) {
      setSelectedHandIndex(null);
      setSelectedAttackerIndex(null);
      setShowTurnIndicator(true);

      // LIMPIAR COLA DEL BOT AL CAMBIAR DE TURNO
      if (turn === 'player') {
        botActionQueue.current = [];
        botProcessing.current = false;
      }

      const timer = setTimeout(() => setShowTurnIndicator(false), 1800);
      return () => clearTimeout(timer);
    }
  }, [turn, matchStarted, gameOver]);

  // Sync TabBar visibility across the app to only hide during match
  useEffect(() => {
    setIsInBattle(matchStarted);
    return () => setIsInBattle(false);
  }, [matchStarted, setIsInBattle]);

  // Derived gameState for potential engine compatibility or debug
  const gameState = useMemo(() => ({
    player,
    bot,
    turn,
    turnCount,
    phase,
    gameOver,
    pendingAttack,
    activePlayer: turn === 'player' ? 'PLAYER' : 'BOT'
  }), [player, bot, turn, turnCount, phase, gameOver, pendingAttack]);

  const matchStartTime = useRef<Date>(new Date());

  // ── Handle Game Over Rewards ──
  useEffect(() => {
    if (gameOver && !hasAwardedRewards.current) {
      hasAwardedRewards.current = true;
      const didWin = gameOver === 'player';

      if (didWin) {
        awardWin();
        grantXP('FIRST_WIN_OF_DAY');

        // NUEVO: Otorgar Cofre de Victoria
        const chest = generateRandomChest();
        const added = addChest(chest);
        if (added) {
          toast.success(`¡Cofre ${chest.type} obtenido! 📦`, {
            description: 'Ve a la pantalla principal para empezar a desbloquearlo.'
          });
        }
      } else {
        awardLoss();
        grantXP('CASUAL_LOSS');
      }

      // Persistir en Supabase de forma asíncrona (no bloquea UI)
      getCurrentUserId().then((userId) => {
        if (userId) {
          recordMatchResult({
            userId,
            mode: mode === 'VS_BOT' ? 'VS_BOT' : 'LOCAL_PVP',
            didWin,
            difficulty,
            turnCount,
            startedAt: matchStartTime.current,
            finishedAt: new Date(),
          }).catch(console.error);
        }
      }).catch(console.error);
    }
  }, [gameOver, awardWin, awardLoss, grantXP, mode, difficulty, turnCount]);

  // ── Player Replica Timer ──
  const [replicaTimeLeft, setReplicaTimeLeft] = useState(5);
  useEffect(() => {
    if (phase === TurnPhase.REPLICA && turn === 'bot') {
      setReplicaTimeLeft(5);
      const interval = setInterval(() => {
        setReplicaTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            skipReplica();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [phase, turn, skipReplica]);

  // ── Bot AI for Replica ──
  useEffect(() => {
    if (phase === TurnPhase.REPLICA && turn === 'player' && pendingAttack) {
      const timer = setTimeout(() => {
        const b = botRef.current;
        const p = playerRef.current;

        const attackerIdx = pendingAttack.attackerIdx;
        const attackerCard = p.board[attackerIdx] || null;
        const isDirectAttack = pendingAttack.defenderIdx === null;

        const response = botReplicaResponse(b, attackerCard, isDirectAttack, difficulty);

        if (response.action === 'backstage' && response.backstageIdx !== undefined) {
          activateBackstage('bot', response.backstageIdx!);
        } else if (response.action === 'intercept' && response.interceptorIdx !== undefined) {
          intercept(response.interceptorIdx!);
        } else {
          skipReplica();
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [phase, turn, pendingAttack, intercept, activateBackstage, skipReplica, botRef, playerRef, difficulty]);

  const simulateScratch = useCallback(() => {
    setIsScratching(true);
    const v = volume;
    setVolume(0.1);
    setTimeout(() => { setVolume(v); setIsScratching(false); }, 800);
  }, [volume, setVolume]);

  const prevPhase = useRef(phase);
  useEffect(() => {
    if (prevPhase.current === TurnPhase.REPLICA && phase === TurnPhase.MAIN) {
      simulateScratch();
    }
    prevPhase.current = phase;
  }, [phase, simulateScratch]);

  // ── Play a card from hand ──
  const handlePlayCard = (cardIdx: number) => {
    const card = player.hand[cardIdx];
    if (!card) return;

    if (player.energy < card.cost) {
      alert(`No tienes suficiente energía (${player.energy}/${card.cost})`);
      return;
    }

    if (phase !== TurnPhase.MAIN) {
      alert('Solo puedes jugar cartas en tu Fase Principal');
      return;
    }

    playCard('player', cardIdx);
    setSelectedHandIndex(null);
  };

  // ── Click on bot card (attack) ──
  const handleBotCardClick = (i: number) => {
    if (turn !== 'player' || phase !== TurnPhase.MAIN || gameOver || selectedAttackerIndex === null) return;
    playSound('attack');
    declareAttack(selectedAttackerIndex, i);
    setSelectedAttackerIndex(null);
  };

  // ── Click on player board card ──
  const handlePlayerBoardCardClick = (i: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (gameOver) return;

    if (phase === TurnPhase.REPLICA && turn === 'bot') {
      const card = player.board[i];
      if (!card || card.isTapped || player.energy < 1) return;
      playSound('play');
      intercept(i);
      return;
    }

    if (turn !== 'player' || phase !== TurnPhase.MAIN) return;
    const card = player.board[i];
    if (!card) return;

    // Handle "Retire" to backstage
    if (!card.isTapped && player.energy >= 1 && !card.stageFright) {
      playSound('play');
      retireCard('player', i);
      return;
    }

    if (card.isTapped || card.stageFright) return;
    playSound('play');
    setSelectedAttackerIndex(i === selectedAttackerIndex ? null : i);
    setSelectedHandIndex(null);
  };

  // ── Direct attack on bot player zone ──
  const handleDirectAttack = () => {
    if (turn !== 'player' || phase !== TurnPhase.MAIN || gameOver || selectedAttackerIndex === null) return;
    playSound('attack');
    declareAttack(selectedAttackerIndex, null);
    setSelectedAttackerIndex(null);
  };

  // ── Auto pass turn ──
  useEffect(() => {
    if (turn !== 'player' || phase !== TurnPhase.MAIN || gameOver || !matchStarted || selectedAttackerIndex !== null) return;

    const canPlayHand = player.hand.some(c => c.cost <= player.energy);
    const canActivateBackstage = player.backstage.some(c => c.cost <= player.energy);
    const canPromoteCard = player.canPromote && player.maxEnergy < 10 && player.hand.length > 0;
    const canAttack = player.board.some(c => !c.isTapped && !c.stageFright);

    if (!canPlayHand && !canActivateBackstage && !canPromoteCard && !canAttack) {
      const timer = setTimeout(() => {
        endTurn();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [turn, phase, gameOver, matchStarted, player.hand, player.energy, player.backstage, player.canPromote, player.maxEnergy, player.board, endTurn, selectedAttackerIndex]);

  // ── Bot AI behavior ──
  const processNextBotAction = useCallback(() => {
    // 1. Verificaciones cruciales de estado
    if (gameOverRef.current || turnRef.current !== 'bot' || phaseRef.current !== TurnPhase.MAIN) {
      botActionQueue.current = [];
      botProcessing.current = false;
      return;
    }

    if (botActionQueue.current.length === 0) {
      botProcessing.current = false;
      return;
    }

    const action = botActionQueue.current.shift()!;
    const delay = action.type === 'ATTACK' ? 1200 : action.type === 'END_TURN' ? 600 : 800;

    setTimeout(() => {
      // Re-verificar tras el delay
      if (gameOverRef.current || turnRef.current !== 'bot') {
        botProcessing.current = false;
        return;
      }

      switch (action.type) {
        case 'PROMOTE':
          if (botRef.current.hand[action.cardIndex]) promoteCard('bot', action.cardIndex);
          break;
        case 'PLAY_CARD':
          if (botRef.current.hand[action.cardIndex]) playCard('bot', action.cardIndex);
          break;
        case 'ACTIVATE_BACKSTAGE':
          if (botRef.current.backstage[action.backstageIndex]) activateBackstage('bot', action.backstageIndex);
          break;
        case 'ATTACK':
          const attacker = botRef.current.board[action.attackerIndex];
          if (attacker && !attacker.isTapped && !attacker.stageFright) {
            declareAttack(action.attackerIndex, action.targetIndex);
            // El bot se detiene aquí hasta que la REPLICA resuelva o el MAIN vuelva.
            botProcessing.current = false;
            return;
          }
          break;
        case 'END_TURN':
          endTurn();
          botProcessing.current = false;
          return;
      }
      processNextBotAction();
    }, delay);
  }, [promoteCard, playCard, activateBackstage, declareAttack, endTurn]);

  useEffect(() => {
    if (turn === 'bot' && phase === TurnPhase.MAIN && botActionQueue.current.length > 0 && !botProcessing.current) {
      botProcessing.current = true;
      processNextBotAction();
    }
  }, [turn, phase, processNextBotAction]);

  useEffect(() => {
    if (turn !== 'bot' || !matchStarted || gameOver || phase !== TurnPhase.MAIN) return;
    if (botProcessing.current || botActionQueue.current.length > 0) return;

    const startTimer = setTimeout(() => {
      const actions = botPlayTurn({ botState: botRef.current, playerState: playerRef.current, turnCount }, difficulty);
      botActionQueue.current = actions;
      botProcessing.current = true;
      processNextBotAction();
    }, 1500);

    return () => clearTimeout(startTimer);
  }, [turn, matchStarted, gameOver, phase, turnCount, difficulty, botRef, playerRef, processNextBotAction]);

  // ── Start Match ──
  const startMatch = async (deckId: string, customDifficulty?: DifficultyLevel) => {
    setSelectedDeckId(deckId);
    setLoadingMatch(true);
    const deck = decks[deckId];
    if (!deck) { setLoadingMatch(false); return; }

    const playerDeckArr: CardData[] = [];
    const tracks: Track[] = [];
    Object.entries(deck.cards).forEach(([cardId, count]) => {
      const cardData = inventory[cardId]?.card;
      if (cardData) {
        for (let i = 0; i < count; i++) playerDeckArr.push(cardData);
        const t: any = { id: cardData.id, url: cardData.previewUrl, title: cardData.name, artist: cardData.artist, artworkUrl: cardData.artworkUrl || '' };
        tracks.push(t as Track);
      }
    });

    const power = calculateDeckPower(playerDeckArr);

    let botDeckArr: CardData[];
    if (mode === 'VS_BOT' && customDifficulty) {
      const config = await generateBotDeck(power, customDifficulty as string as BotDifficulty);
      botDeckArr = config.deckCards.map(mapMasterCardToCardData);
    } else {
      botDeckArr = singleplayerGenerateBotDeck(power);
    }

    setDifficulty(customDifficulty || getDifficultyLevel(power));
    hasAwardedRewards.current = false;

    // EL HOOK YA SE ENCARGA DE RELLENAR HASTA 20 SI ES NECESARIO
    startGame(playerDeckArr, botDeckArr);

    if (tracks.length > 0) {
      setQueue([...tracks]);
      playNext();
      audioEngine.setVolume('music', 50);
    }

    setMatchStarted(true);
    setLoadingMatch(false);
  };

  // Auto-start game if URL parameters say so
  useEffect(() => {
    if (mode === 'VS_BOT' && qsDeckId && decks[qsDeckId] && !matchStarted && !loadingMatch) {
      startMatch(qsDeckId, qsDifficulty);
      window.history.replaceState(null, '', '/play'); // Clear params to prevent re-triggering
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, qsDeckId, qsDifficulty, matchStarted, loadingMatch]);

  const decksList = Object.values(usePlayerStore.getState().decks);

  const handlePromote = () => {
    if (turn !== 'player' || phase !== TurnPhase.MAIN || gameOver || selectedHandIndex === null) return;
    if (!player.canPromote || player.maxEnergy >= 10) return;
    playSound('play');
    promoteCard('player', selectedHandIndex);
    setSelectedHandIndex(null);
  };

  if (!matchStarted) {
    return (
      <div className="flex flex-col gap-10 min-h-[85vh] p-8 max-w-6xl mx-auto items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-6xl font-black uppercase tracking-[0.25em] text-white italic drop-shadow-[0_0_15px_rgba(34,197,94,0.3)]">
            El Escenario
          </h1>
          <p className="text-gray-400 text-xl font-medium max-w-2xl">
            Tu Playlist cobra vida. Selecciona el Sello Discográfico que definirá tu destino en el duelo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full mt-8">
          {decksList.map(deck => {
            const cardCount = Object.values(deck.cards).reduce((a, b) => a + b, 0);
            const isValid = cardCount >= 20;

            return (
              <motion.div
                key={deck.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={isValid ? { scale: 1.02, y: -8 } : {}}
                onClick={() => isValid && !loadingMatch && startMatch(deck.id)}
                className={`group relative bg-zinc-900/40 backdrop-blur-sm border-2 rounded-[2.5rem] p-8 overflow-hidden transition-all duration-500 flex flex-col items-center text-center ${isValid ? 'cursor-pointer border-white/5 hover:border-green-500/40 shadow-2xl hover:shadow-green-500/10' : 'opacity-60 cursor-not-allowed border-red-900/30 bg-red-950/5'}`}
              >
                {deck.coverArt && (
                  <div className="absolute inset-0 z-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={deck.coverArt} alt="" className="w-full h-full object-cover opacity-10 group-hover:opacity-20 transition-opacity" crossOrigin="anonymous" />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/80" />
                  </div>
                )}

                <div className="relative z-10 w-full flex flex-col items-center">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border-2 transition-transform duration-500 group-hover:rotate-12 ${isValid ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                    <Library className={`w-8 h-8 ${isValid ? 'text-green-500' : 'text-red-500'}`} />
                  </div>

                  <h3 className="text-3xl font-black uppercase tracking-tight mb-2 group-hover:text-green-400 transition-colors">{deck.name}</h3>
                  <div className="flex flex-col gap-1 items-center mb-8">
                    <span className={`text-sm font-black tracking-widest uppercase ${isValid ? 'text-green-400' : 'text-red-400'}`}>
                      {cardCount} / 20 CARDS
                    </span>
                    {!isValid && <span className="text-[10px] text-gray-500 uppercase font-black tracking-tighter italic">Se requieren 20 cartas</span>}
                  </div>

                  {isValid ? (
                    <button className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest text-xs group-hover:bg-green-500 transition-colors shadow-lg">
                      Lanzar Concierto
                    </button>
                  ) : (
                    <div className="w-full bg-white/5 text-gray-600 py-4 rounded-2xl font-black uppercase tracking-widest text-xs border border-white/5">
                      Playlist Incompleta
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#050505] text-white select-none overflow-hidden font-sans">
      {/* ── Arena Background Design ── */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="stageGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
              <stop offset="0%" stopColor="#1a1a2e" stopOpacity="1" />
              <stop offset="100%" stopColor="#000000" stopOpacity="1" />
            </radialGradient>
            <pattern id="gridPattern" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M 100 0 L 0 0 0 100" fill="none" stroke="white" strokeWidth="0.1" strokeOpacity="0.2" />
            </pattern>
          </defs>
          <rect width="1000" height="1000" fill="url(#stageGlow)" />
          <g stroke="white" strokeWidth="0.5" strokeOpacity="0.1">
            {[0, 250, 500, 750, 1000].map(x => (
              <React.Fragment key={x}>
                <line x1="500" y1="500" x2={x} y2="1000" />
                <line x1="500" y1="500" x2={x} y2="0" />
              </React.Fragment>
            ))}
          </g>
          <circle cx="500" cy="500" r="300" fill="none" stroke="white" strokeWidth="1" strokeOpacity="0.05" />
          <rect width="1000" height="1000" fill="url(#gridPattern)" />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col h-full">
        {/* Header/Opponent Status */}
        <div className="flex items-center justify-between p-4 bg-black/60 backdrop-blur-xl border-b border-white/5">
          <div>
            <h1 className="text-lg font-black tracking-widest uppercase flex items-center gap-2">
              <Mic2 className="w-5 h-5 text-green-500" />
              CONCIERTO EN VIVO
            </h1>
            <p className="text-[10px] text-gray-500 font-mono">
              TURNO {turnCount} — {turn === 'player' ? '>>> TU ACTUACIÓN' : '>>> RIVAL ACTUANDO'}
            </p>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors border border-white/10"
          >
            <Settings className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Replica Phase Overlay */}
        <AnimatePresence>
          {phase === TurnPhase.REPLICA && pendingAttack && turn === 'bot' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none"
            >
              <div className="bg-zinc-900 border-2 border-cyan-500/50 p-8 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.2)] flex flex-col items-center gap-6 pointer-events-auto max-w-sm text-center">
                <div className="w-20 h-20 rounded-full border-4 border-cyan-500/20 flex items-center justify-center relative">
                  <div className="absolute inset-0 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                  <Swords className="w-10 h-10 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter text-white mb-2 italic">Fase de Réplica</h2>
                  <p className="text-gray-400 text-xs">¡Escenario en peligro! El oponente ha declarado un ataque. ¿Interfieres con tu Reserva o dejas que resuelva?</p>
                </div>
                <div className="flex flex-col w-full gap-2">
                  <button
                    onClick={() => skipReplica()}
                    className="w-full py-3 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:bg-cyan-500 hover:text-white transition-all shadow-xl active:scale-95 text-xs"
                  >
                    Entregar Escenario (Omitir)
                  </button>
                  <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mt-2 animate-pulse italic">Decidiendo intervención...</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Soundtrack Info */}
        {currentTrack && (
          <div className="bg-gradient-to-r from-cyan-950 via-cyan-900 to-cyan-950 border-y border-cyan-500/20 py-1 text-center overflow-hidden">
            <motion.div
              animate={{ x: [0, -100, 0] }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.4em] whitespace-nowrap"
            >
              SONANDO: {currentTrack.title} - {currentTrack.artist}
            </motion.div>
          </div>
        )}

        {/* Battlefield Area */}
        <div className="flex-1 flex flex-col overflow-y-auto px-4 sm:px-6 relative gap-1">
          {/* Bot Side */}
          <div className="flex flex-col gap-2 pt-2">

            {/* Bot Hand Indicator */}
            <div className="flex justify-center -mb-2">
              <div className="flex sm:gap-1 scale-75 origin-top opacity-80 h-10 overflow-hidden px-4">
                {bot.hand.map((_, i) => (
                  <div key={`bothand-${i}`} className="w-12 h-16 shrink-0 transition-transform hover:-translate-y-2">
                    <CardBack className="w-full h-full" />
                  </div>
                ))}
                {bot.hand.length === 0 && <span className="text-[10px] text-gray-500 mt-2 uppercase">Mano Vacía</span>}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div
                className="w-12 h-16 sm:w-16 sm:h-24 bg-red-950/20 border border-red-500/20 rounded-lg flex items-center justify-center relative shadow-inner shrink-0 cursor-pointer"
                onClick={handleDirectAttack}
              >
                <div className="absolute inset-0 bg-red-500/5 animate-pulse rounded-lg" />
                <span className="text-xs font-black text-red-500 z-10">{bot.health} HP</span>
              </div>
              <div className="flex-1 flex gap-2 overflow-x-auto pb-2 scrollbar-none min-h-[7rem] sm:min-h-[9rem] items-center">
                <AnimatePresence>
                  {bot.board.map((card, i) => (
                    <BoardCardSlot
                      key={card.instanceId}
                      card={card}
                      owner="bot"
                      canTarget={selectedAttackerIndex !== null}
                      onClick={() => handleBotCardClick(i)}
                      onHoverStart={(c, rect) => setInspectingBoardCard({ card: c, rect })}
                      onHoverEnd={() => setInspectingBoardCard(null)}
                    />
                  ))}
                </AnimatePresence>
              </div>
              <div className="w-10 sm:w-16 flex flex-col gap-1 items-center shrink-0">
                <div className="w-full aspect-[2/3] bg-purple-950/20 border border-purple-500/20 rounded flex flex-wrap gap-0.5 p-0.5">
                  {bot.backstage.map(c => <div key={c.instanceId} className="w-1.5 h-2 bg-purple-400/40 rounded-[1px]" />)}
                </div>
                <span className="text-[6px] font-bold text-gray-600 uppercase text-center">Backstage</span>
              </div>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent w-full opacity-50 shrink-0" />

          {/* Player Side */}
          <div className="flex flex-col gap-2 pb-2">
            <div className="flex items-center gap-4">
              <div className="w-12 h-16 sm:w-16 sm:h-24 bg-green-950/20 border border-green-500/20 rounded-lg flex items-center justify-center relative shadow-inner shrink-0">
                <span className="text-xs font-black text-green-500 z-10">{player.health} HP</span>
              </div>
              <div
                className="flex-1 flex gap-2 overflow-x-auto pb-2 min-h-[7rem] sm:min-h-[9rem] items-center border border-white/5 bg-white/[0.01] rounded-xl p-2"
                onClick={() => selectedHandIndex !== null && handlePlayCard(selectedHandIndex)}
              >
                <AnimatePresence mode="popLayout">
                  {player.board.map((card, i) => (
                    <BoardCardSlot
                      key={card.instanceId}
                      card={card}
                      owner="player"
                      isSelected={selectedAttackerIndex === i}
                      onClick={(e) => handlePlayerBoardCardClick(i, e!)}
                      onHoverStart={(c, rect) => setInspectingBoardCard({ card: c, rect })}
                      onHoverEnd={() => setInspectingBoardCard(null)}
                    />
                  ))}
                </AnimatePresence>
                {player.board.length === 0 && (
                  <span className="m-auto text-[10px] font-black text-white/10 uppercase tracking-[0.2em]">Escenario Vacío</span>
                )}
              </div>
              <div className="w-10 sm:w-16 flex flex-col gap-1 items-center shrink-0">
                <div className="w-full flex flex-wrap gap-1 justify-center">
                  {player.backstage.slice(0, 4).map((c, i) => (
                    <BackstageSlot
                      key={c.instanceId}
                      card={c}
                      energy={player.energy}
                      disabled={(turn === 'player' && phase === TurnPhase.MAIN) || (turn === 'bot' && phase === TurnPhase.REPLICA) ? false : true}
                      onClick={() => {
                        if (phase === TurnPhase.REPLICA) {
                          intercept(i);
                        } else {
                          activateBackstage('player', i);
                        }
                      }}
                    />
                  ))}
                  {player.backstage.length > 4 && (
                    <span className="text-[8px] text-gray-500">+{player.backstage.length - 4}</span>
                  )}
                </div>
                <span className="text-[6px] font-bold text-gray-600 uppercase text-center leading-tight">Reserva</span>
              </div>
            </div>
          </div>

          {/* Quick Info & Main Action */}
          <div className="mt-auto pb-4 flex flex-wrap items-center justify-center gap-3 sm:gap-6">
            <div className="flex flex-col items-center">
              <span className="text-[8px] text-blue-400 font-black uppercase">Energía</span>
              <div className="flex items-center gap-1 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                <Zap className="w-3 h-3 text-blue-400" />
                <span className="text-sm font-black italic">{player.energy}/{player.maxEnergy}</span>
              </div>
            </div>

            {player.hype > 0 && (
              <div className="flex flex-col items-center">
                <span className="text-[8px] text-yellow-500 font-black uppercase">Hype</span>
                <div className="flex items-center gap-1 bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20">
                  <Star className="w-3 h-3 text-yellow-500" />
                  <span className="text-sm font-black italic text-yellow-500">{player.hype}/20</span>
                </div>
              </div>
            )}

            <button
              onClick={endTurn}
              disabled={turn !== 'player' || phase !== TurnPhase.MAIN || !!gameOver}
              className="px-8 py-3 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:bg-green-500 hover:text-white transition-all disabled:opacity-20 shadow-xl active:scale-95 text-xs"
            >
              PASAR TURNO
            </button>
          </div>
        </div>

        {/* Hand Area */}
        <div className="h-40 sm:h-48 bg-black/80 backdrop-blur-3xl border-t border-white/10 flex items-center justify-between px-4 sm:px-8 relative shadow-[0_-10px_40px_rgba(0,0,0,0.8)] shrink-0 overflow-hidden">
          {/* Deck Status */}
          <div className="flex flex-col items-center gap-1 group shrink-0">
            <div className="relative w-12 h-16 sm:w-16 sm:h-24 bg-white/5 border border-white/20 rounded-lg flex items-center justify-center transition-all group-hover:border-cyan-500/50">
              <Disc3 className="w-5 sm:w-8 h-5 sm:h-8 text-white/10 group-hover:text-cyan-500/30 group-hover:rotate-180 transition-all duration-1000" />
              <span className="absolute bottom-1 right-1 text-[8px] sm:text-[10px] font-black text-white/40">{player.deck.length}</span>
            </div>
            <span className="text-[6px] font-black text-white/20 uppercase tracking-widest">DECK</span>
          </div>

          {/* Hand Cards */}
          <div className="flex-1 flex items-end justify-center gap-1 sm:gap-2 overflow-x-auto px-4 scrollbar-none">
            <div
              onClick={handlePromote}
              className={`w-12 h-16 sm:w-16 sm:h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all cursor-pointer shrink-0 ${player.canPromote && selectedHandIndex !== null ? 'border-yellow-500 bg-yellow-500/20 scale-105' : 'border-white/5 opacity-10'}`}
            >
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className="text-[6px] font-black text-center uppercase">PROMO</span>
            </div>

            <AnimatePresence>
              {player.hand.map((card, i) => (
                <motion.div
                  key={card.instanceId}
                  layoutId={card.instanceId}
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: selectedHandIndex === i ? -15 : 0, opacity: 1, scale: selectedHandIndex === i ? 1.1 : 1 }}
                  onClick={() => setSelectedHandIndex(selectedHandIndex === i ? null : i)}
                  className={`relative cursor-pointer shrink-0 ${selectedHandIndex === i ? 'z-50' : 'z-10'}`}
                >
                  <div className={`w-16 h-24 sm:w-20 sm:h-30 overflow-hidden rounded-lg border flex items-center justify-center ${selectedHandIndex === i ? 'border-white shadow-[0_0_20px_rgba(255,255,255,0.3)]' : 'border-white/10'}`}>
                    <Card
                      data={card}
                      onDoubleClick={() => handlePlayCard(i)}
                      className="origin-top-left scale-[0.25] sm:scale-[0.31] w-64 h-[22rem]"
                    />
                  </div>
                  {player.energy < card.cost && (
                    <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center">
                      <Zap className="w-6 h-6 text-blue-500/50" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Global Overlays */}
        <AnimatePresence>
          {isScratching && (
            <div className="fixed inset-0 bg-red-500/10 z-[200] pointer-events-none animate-pulse flex items-center justify-center">
              <h2 className="text-8xl font-black text-red-600 opacity-20 rotate-[-15deg]">SCRATCH!</h2>
            </div>
          )}

          {phase === TurnPhase.REPLICA && (
            <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 pointer-events-none">
              <div className="bg-zinc-900 border border-red-500/50 p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center pointer-events-auto">
                <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-2">¡LA RÉPLICA!</h2>
                {turn === 'bot' ? (
                  <>
                    <p className="text-gray-400 mb-6">El rival lanza un ataque. ¿Cómo respondes? ({replicaTimeLeft}s)</p>
                    <div className="flex flex-col gap-3">
                      <button onClick={skipReplica} className="w-full py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all uppercase tracking-widest">Dejar Pasar</button>
                      <p className="text-[10px] text-gray-500 uppercase mt-2 font-bold tracking-widest">O selecciona una carta en tu tablero para interceptar</p>
                    </div>
                  </>
                ) : (
                  <p className="text-white animate-pulse uppercase font-black tracking-widest">Esperando al Rival...</p>
                )}
              </div>
            </div>
          )}

          {showTurnIndicator && (
            <motion.div initial={{ opacity: 0, scale: 2 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} className="fixed inset-0 z-[180] flex items-center justify-center pointer-events-none">
              <div className="bg-white text-black px-16 py-6 skew-x-[-12deg] shadow-[20px_20px_0_rgba(255,255,255,0.1)]">
                <h2 className="text-7xl font-black italic uppercase tracking-tighter">{turn === 'player' ? 'TU TURNO' : 'RIVAL'}</h2>
              </div>
            </motion.div>
          )}

          {/* Inspect Hover Overlay */}
          {inspectingBoardCard && (
            <div
              className="fixed z-[300] pointer-events-none drop-shadow-2xl"
              style={{
                top: inspectingBoardCard.rect.top - (280 - inspectingBoardCard.rect.height) / 2,
                left: inspectingBoardCard.rect.left - (190 - inspectingBoardCard.rect.width) / 2,
              }}
            >
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="w-56 h-80 origin-center bg-black rounded-3xl overflow-hidden border">
                <Card data={inspectingBoardCard.card} className="w-full h-full shadow-2xl" />
              </motion.div>
            </div>
          )}

          {gameOver && (
            <div className="fixed inset-0 z-[300] bg-black/95 flex flex-col items-center justify-center p-8 backdrop-blur-xl">
              {gameOver === 'player' ? <Trophy className="w-24 h-24 text-yellow-500 mb-6 drop-shadow-[0_0_30px_rgba(234,179,8,0.5)]" /> : <Skull className="w-24 h-24 text-red-600 mb-6" />}
              <h2 className="text-7xl font-black italic uppercase tracking-tighter mb-8">{gameOver === 'player' ? '¡VICTORIA!' : gameOver === 'bot' ? 'DERROTA' : 'EMPATE'}</h2>
              <button onClick={() => { setMatchStarted(false); setQueue([]); }} className="px-12 py-4 bg-white text-black font-black uppercase tracking-widest rounded-full hover:bg-green-500 hover:text-white transition-all">TERMINAR SHOW</button>
            </div>
          )}

          {inspectedCard && (
            <div className="fixed inset-0 z-[400] bg-black/90 backdrop-blur-md flex items-center justify-center p-8" onClick={() => setInspectedCard(null)}>
              <div className="relative max-w-sm w-full"><Card data={inspectedCard} className="w-full scale-110" /></div>
            </div>
          )}
        </AnimatePresence>

        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          onConcede={() => { setShowSettings(false); setMatchStarted(false); setQueue([]); }}
          volume={volume}
          setVolume={setVolume}
          language={language}
        />
      </div >
    </div >
  );
}
