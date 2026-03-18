'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useMusicPlayer, Track } from '@/store/useMusicPlayer';
import Card from '@/components/cards/Card';
import { User, Swords, Shield, Zap, Sparkles, Trophy, Music, Disc3, Settings, LogOut, ChevronRight, Library, Mic2, Skull, Play, Volume2, ShieldAlert, X, VolumeX } from 'lucide-react';
import { useGameEngine, BoardCard, hasKw } from '@/hooks/useGameEngine';
import { generateCard, CardData } from '@/lib/engine/generator';
import { calculateDeckPower, getDifficultyLevel, generateBotDeck, botPlayTurn, botReplicaResponse, DifficultyLevel, BotAction } from '@/lib/engine/singleplayerBot';
import { playSound } from '@/lib/audio';
import { t } from '@/lib/i18n';
import { TurnPhase } from '@/lib/engine/gameState';
import CardBack from '@/components/CardBack';
import { useRanking } from '@/hooks/useRanking';
import { audioEngine } from '@/lib/engine/audioEngine';

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
      className={`w-16 h-24 rounded-lg border flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group ${isEvent ? 'border-purple-500/50 bg-purple-900/20' : 'border-blue-500/50 bg-blue-900/20'
        } ${!canAfford || disabled ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
    >
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />

      {/* Miniature representation */}
      <div className="w-10 h-14 rounded-sm overflow-hidden mb-1 shadow-2xl opacity-80 group-hover:opacity-100 transition-opacity">
        <Card data={card} className="origin-top-left transform scale-[0.16] pointer-events-none" />
      </div>

      <div className="flex flex-col items-center z-10">
        <div className={`text-[8px] font-black px-1 rounded-full mb-0.5 ${canAfford ? 'bg-white text-black' : 'bg-red-500 text-white'}`}>
          {cost}⚡
        </div>
        <span className={`text-[7px] font-black uppercase tracking-widest text-center ${isEvent ? 'text-purple-300' : 'text-blue-300'}`}>
          {isEvent ? 'EFECTO' : 'ACTIVA'}
        </span>
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
  owner,
}: {
  card: BoardCard;
  isSelected?: boolean;
  canTarget?: boolean;
  onClick?: (e?: React.MouseEvent) => void;
  onPointerDown?: () => void;
  onPointerUp?: () => void;
  owner: 'player' | 'bot';
}) {
  const hasTaunt = hasKw(card, 'taunt');
  const hasFrenzy = hasKw(card, 'frenzy');
  const hasDistortion = hasKw(card, 'distortion');

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
      onPointerLeave={onPointerUp}
      onMouseEnter={() => owner === 'player' && setIsRetiring(true)}
      onMouseLeave={() => setIsRetiring(false)}
      className={[
        'relative w-24 h-32 rounded-xl border-2 flex items-center justify-center cursor-pointer transition-all duration-200 select-none group',
        card.isTapped ? 'opacity-60' : '',
        isSelected ? 'border-green-400 shadow-[0_0_24px_rgba(34,197,94,0.6)] scale-110 z-30' : '',
        canTarget ? 'border-red-500/60 hover:border-red-400 hover:scale-105 cursor-crosshair' : '',
        !isSelected && !canTarget ? 'border-white/15 hover:border-white/40' : '',
        card.stageFright ? 'grayscale-[0.3]' : '',
        hasTaunt ? 'ring-2 ring-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : '',
      ].join(' ') + (card.isTapped ? (owner === 'bot' ? ' -rotate-6' : ' rotate-6') : '')}
    >
      <div className="absolute inset-0 rounded-[10px] overflow-hidden">
        <Card data={card} className="origin-top-left transform scale-[0.375] pointer-events-none" />
      </div>

      {/* Retire action overlay */}
      {owner === 'player' && isRetiring && !card.isTapped && (
        <button
          onClick={(e) => { e.stopPropagation(); onClick?.(e); }}
          className="absolute inset-0 z-40 bg-purple-900/60 backdrop-blur-[2px] rounded-[10px] flex flex-col items-center justify-center gap-1 group-hover:opacity-100 opacity-0 transition-opacity"
        >
          <div className="bg-white text-black text-[8px] font-black px-2 py-0.5 rounded-full mb-1">Coste: 1⚡</div>
          <span className="text-[10px] font-black uppercase tracking-tighter">Retirar</span>
        </button>
      )}

      {/* Stat overlay */}
      <div className="absolute bottom-1 left-1 right-1 flex justify-between z-10 pointer-events-none">
        <span className="text-[10px] font-black text-red-100 bg-red-600/90 px-1.5 rounded-sm shadow-sm">
          {card.currentAtk}
        </span>
        <span className="text-[10px] font-black text-blue-100 bg-blue-600/90 px-1.5 rounded-sm shadow-sm">
          {card.currentDef}
        </span>
      </div>

      {/* Keyword badges */}
      <div className="absolute -top-2 left-0 right-0 flex justify-center gap-0.5 z-20 pointer-events-none">
        {hasTaunt && (
          <div className="text-[7px] font-black bg-yellow-500 text-black px-1 rounded-full whitespace-nowrap shadow-md">
            PROV
          </div>
        )}
        {hasFrenzy && !card.stageFright && (
          <div className="text-[7px] font-black bg-orange-500 text-black px-1 rounded-full shadow-md">
            ⚡
          </div>
        )}
        {hasDistortion && (
          <div className="text-[7px] font-black bg-red-700 text-white px-1 rounded-full shadow-md">
            ↯
          </div>
        )}
      </div>

      {/* Stage Fright indicator */}
      {card.stageFright && !card.isTapped && (
        <div className="absolute inset-0 rounded-[10px] bg-gray-900/40 pointer-events-none flex items-center justify-center z-20">
          <span className="text-xl animate-bounce">😨</span>
        </div>
      )}
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PlayPage() {
  const { decks, inventory, setIsInBattle, language } = usePlayerStore();
  const { setQueue, playNext, setVolume, volume, currentTrack } = useMusicPlayer();

  const {
    player, bot, turn, turnCount, phase, gameOver, pendingAttack,
    startGame, playCard, promoteCard, declareAttack, resolvePendingAttack, skipReplica, intercept, activateBackstage, retireCard, endTurn, doMulligan,
    playerRef, botRef,
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

  // ── Handle Game Over Rewards ──
  useEffect(() => {
    if (gameOver && !hasAwardedRewards.current) {
      hasAwardedRewards.current = true;
      if (gameOver === 'player') {
        awardWin();
        // Constant bonus for finishing a match
        grantXP('FIRST_WIN_OF_DAY');
      } else if (gameOver === 'bot') {
        awardLoss();
        grantXP('CASUAL_LOSS');
      } else {
        grantXP('CASUAL_LOSS');
      }
    }
  }, [gameOver, awardWin, awardLoss, grantXP]);

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
    if (botActionQueue.current.length === 0 || gameOver) {
      botProcessing.current = false;
      return;
    }

    const action = botActionQueue.current.shift()!;
    const delay = action.type === 'ATTACK' ? 1200 : action.type === 'END_TURN' ? 600 : 800;

    setTimeout(() => {
      if (gameOver) { botProcessing.current = false; return; }

      switch (action.type) {
        case 'PROMOTE':
          promoteCard('bot', action.cardIndex);
          break;
        case 'PLAY_CARD':
          playCard('bot', action.cardIndex);
          break;
        case 'ACTIVATE_BACKSTAGE':
          activateBackstage('bot', action.backstageIndex);
          break;
        case 'ATTACK':
          declareAttack(action.attackerIndex, action.targetIndex);
          return;
        case 'END_TURN':
          endTurn();
          botProcessing.current = false;
          return;
      }
      processNextBotAction();
    }, delay);
  }, [gameOver, promoteCard, playCard, activateBackstage, declareAttack, endTurn]);

  useEffect(() => {
    if (turn !== 'bot' || !matchStarted || gameOver || phase !== TurnPhase.MAIN) return;
    if (botProcessing.current) return;

    const startTimer = setTimeout(() => {
      const actions = botPlayTurn({ botState: botRef.current, playerState: playerRef.current, turnCount }, difficulty);
      botActionQueue.current = actions;
      botProcessing.current = true;
      processNextBotAction();
    }, 1500);

    return () => clearTimeout(startTimer);
  }, [turn, matchStarted, gameOver, phase, turnCount, difficulty, botRef, playerRef, processNextBotAction]);

  // ── Start Match ──
  const startMatch = async (deckId: string) => {
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
        if (cardData.previewUrl) {
          tracks.push({ id: cardData.id, url: cardData.previewUrl, title: cardData.name, artist: cardData.artist, artUrl: cardData.artUrl || '' });
        }
      }
    });

    while (playerDeckArr.length < 40) {
      playerDeckArr.push(generateCard({ trackId: 'f_' + playerDeckArr.length, trackName: 'Filler', artistName: '?', collectionName: 'F', primaryGenreName: 'Rock', artworkUrl100: '' }));
    }

    const power = calculateDeckPower(playerDeckArr);
    setDifficulty(getDifficultyLevel(power));
    hasAwardedRewards.current = false;
    startGame(playerDeckArr.slice(0, 40), generateBotDeck(power));

    if (tracks.length > 0) {
      setQueue([...tracks]);
      playNext();
      audioEngine.setVolume('music', 50);
    }

    setMatchStarted(true);
    setLoadingMatch(false);
  };

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
            const isValid = cardCount === 40; // Arena focus: exact 40

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
                      {cardCount} / 40 CARS
                    </span>
                    {!isValid && <span className="text-[10px] text-gray-500 uppercase font-black tracking-tighter italic">Se requieren 40 cartas</span>}
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
        {/* Top bar with Opponent Stats */}
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
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-gray-500 font-bold uppercase">Algoritmo</span>
              <span className="text-xl font-black text-red-500">{bot.health} ❤️</span>
            </div>
            <button onClick={() => setShowSettings(true)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
              <Settings className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Battlefield */}
        <div className="flex-1 flex flex-col justify-between py-4 relative">

          {/* Bot Board */}
          <div className="px-6 flex gap-6 items-start">
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-24 border border-white/10 rounded-lg flex flex-wrap p-1 gap-1 bg-black/40">
                {bot.backstage.map(c => <div key={c.instanceId} className="w-6 h-9 bg-purple-500/20 rounded-sm border border-purple-500/30" />)}
              </div>
              <span className="text-[8px] text-gray-600 font-bold uppercase">Backstage</span>
            </div>

            <div className="flex-1 flex flex-wrap gap-3 items-start min-h-[9rem]">
              <AnimatePresence>
                {bot.board.map((card, i) => (
                  <BoardCardSlot key={card.instanceId} card={card} owner="bot" canTarget={selectedAttackerIndex !== null} onClick={() => handleBotCardClick(i)} onPointerDown={() => handlePointerDown(card)} onPointerUp={handlePointerUp} />
                ))}
              </AnimatePresence>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent w-full my-2" />

          {/* Player Board */}
          <div className="px-6 flex gap-6 items-end">
            <div className="flex-1 flex flex-wrap gap-3 items-end min-h-[9rem] p-2 rounded-2xl border-2 border-dashed border-white/5 bg-white/[0.02]" onClick={() => selectedHandIndex !== null && handlePlayCard(selectedHandIndex)}>
              <AnimatePresence mode="popLayout">
                {player.board.map((card, i) => (
                  <BoardCardSlot key={card.instanceId} card={card} owner="player" isSelected={selectedAttackerIndex === i} onClick={(e) => handlePlayerBoardCardClick(i, e!)} onPointerDown={() => handlePointerDown(card)} onPointerUp={handlePointerUp} />
                ))}
              </AnimatePresence>
            </div>

            <div className="flex flex-col items-center gap-2">
              <div className="flex flex-wrap gap-2 justify-center w-full max-w-[200px]">
                {player.backstage.map((c, i) => (
                  <BackstageSlot
                    key={c.instanceId}
                    card={c}
                    energy={player.energy}
                    disabled={turn !== 'player' || phase !== TurnPhase.MAIN || gameOver !== null}
                    onClick={() => activateBackstage('player', i)}
                  />
                ))}
              </div>
              <span className="text-[8px] text-gray-600 font-bold uppercase">Backstage / Reservas</span>
            </div>
          </div>

          {/* Player UI bar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/80 backdrop-blur-2xl px-6 py-3 rounded-2xl border border-white/10 shadow-2xl z-30">
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 font-bold uppercase">Reputación</span>
              <span className="text-2xl font-black text-green-500">{player.health} ❤️</span>
            </div>
            <div className="h-8 w-px bg-white/10 mx-2" />
            <div className="flex flex-col min-w-[60px]">
              <span className="text-[10px] text-blue-400 font-bold uppercase">Energía</span>
              <div className="flex items-center gap-1">
                <Zap className="w-4 h-4 text-blue-500" />
                <span className="text-xl font-mono">{player.energy}/{player.maxEnergy}</span>
              </div>
            </div>
            {player.hype > 0 && (
              <>
                <div className="h-8 w-px bg-white/10 mx-2" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-yellow-500 font-bold uppercase">Hype</span>
                  <span className="text-xl font-mono text-yellow-500">{player.hype}/20</span>
                </div>
              </>
            )}
            <button onClick={endTurn} disabled={turn !== 'player' || phase !== TurnPhase.MAIN || !!gameOver} className="ml-4 px-6 py-2 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:bg-green-500 hover:text-white transition-all disabled:opacity-30 disabled:grayscale">
              PASAR TURNO
            </button>
          </div>
        </div>

        {/* Hand */}
        <div className="h-44 bg-black/40 border-t border-white/5 flex items-center justify-center gap-4 px-8 overflow-x-auto relative shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
          <div onClick={handlePromote} className={`w-24 h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all cursor-pointer shrink-0 ${player.canPromote && selectedHandIndex !== null ? 'border-yellow-500/50 bg-yellow-500/10 scale-105' : 'border-white/5 opacity-20'}`}>
            <Zap className="w-8 h-8 text-yellow-500" />
            <span className="text-[10px] font-bold text-center uppercase">Promocionar</span>
          </div>

          <div className="flex items-end gap-2 pb-2">
            <AnimatePresence>
              {player.hand.map((card, i) => (
                <motion.div
                  key={card.instanceId}
                  layoutId={card.instanceId}
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: selectedHandIndex === i ? -20 : 0, opacity: 1 }}
                  whileHover={{ y: -30, scale: 1.05 }}
                  onClick={() => setSelectedHandIndex(selectedHandIndex === i ? null : i)}
                  className="relative cursor-pointer"
                >
                  <div className="w-28 h-40 overflow-hidden rounded-xl border-2 border-white/10 shadow-xl">
                    <Card data={card} onDoubleClick={() => handlePlayCard(i)} className="origin-top-left scale-[0.44] w-64" />
                  </div>
                  {player.energy < card.cost && <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] rounded-xl flex items-center justify-center"><Zap className="w-8 h-8 text-blue-500/50" /></div>}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Overlays */}
        <AnimatePresence>
          {isScratching && <div className="fixed inset-0 bg-red-500/10 z-[200] pointer-events-none animate-pulse flex items-center justify-center"><h2 className="text-8xl font-black text-red-600 opacity-20 rotate-[-15deg]">SCRATCH!</h2></div>}

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
                ) : <p className="text-white animate-pulse uppercase font-black tracking-widest">Esperando al Rival...</p>}
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

        <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} onConcede={() => { setShowSettings(false); setMatchStarted(false); setQueue([]); }} volume={volume} setVolume={setVolume} language={language} />
      </div>
    </div>
  );
}
