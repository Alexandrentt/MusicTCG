'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useMusicPlayer, Track } from '@/store/useMusicPlayer';
import Card from '@/components/cards/Card';
import CardBack from '@/components/cards/CardBack';
import { Play, Volume2, Swords, Trophy, Skull, Zap, Star, ShieldAlert, Mic2, Settings, X, LogOut, VolumeX } from 'lucide-react';
import { useGameEngine, BoardCard, hasKw } from '@/hooks/useGameEngine';
import { generateCard, CardData } from '@/lib/engine/generator';
import { calculateDeckPower, getDifficultyLevel, generateBotDeck, botPlayTurn, botReplicaResponse, DifficultyLevel, BotAction } from '@/lib/engine/botAI';
import { playSound } from '@/lib/audio';
import { t } from '@/lib/i18n';

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

function BackstageSlot({ card, onClick }: { card: BoardCard; onClick?: () => void }) {
  return (
    <motion.div
      layout
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      onClick={onClick}
      className="w-16 h-24 rounded-lg border border-purple-500/50 bg-purple-900/20 flex items-center justify-center cursor-pointer hover:border-purple-400 hover:bg-purple-800/40 transition-colors relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
      <span className="text-purple-300/50 font-black text-xs rotate-[-45deg] tracking-widest">EVENT</span>
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
      className={[
        'relative w-20 h-28 rounded-xl border-2 flex items-center justify-center cursor-pointer transition-all duration-200 select-none',
        card.isTapped ? 'opacity-60' : '',
        isSelected ? 'border-green-400 shadow-[0_0_18px_rgba(34,197,94,0.5)] scale-110 z-30' : '',
        canTarget ? 'border-red-500/60 hover:border-red-400 hover:scale-105 cursor-crosshair' : '',
        !isSelected && !canTarget ? 'border-white/15 hover:border-white/40' : '',
        card.stageFright ? 'grayscale-[0.3]' : '',
        hasTaunt ? 'ring-2 ring-yellow-500/50' : '',
      ].join(' ') + (card.isTapped ? (owner === 'bot' ? ' -rotate-6' : ' rotate-6') : '')}
    >
      <div className="absolute inset-0 rounded-[10px] overflow-hidden">
        <Card data={card} className="origin-top-left transform scale-[0.3125] pointer-events-none" />
      </div>

      {/* Stat overlay */}
      <div className="absolute bottom-1 left-1 right-1 flex justify-between z-10 pointer-events-none">
        <span className="text-[9px] font-black text-red-400 bg-black/70 px-1 rounded">
          {card.currentAtk}
        </span>
        <span className="text-[9px] font-black text-blue-400 bg-black/70 px-1 rounded">
          {card.currentDef}
        </span>
      </div>

      {/* Keyword badges */}
      <div className="absolute -top-2 left-0 right-0 flex justify-center gap-0.5 z-20 pointer-events-none">
        {hasTaunt && (
          <div className="text-[7px] font-black bg-yellow-500 text-black px-1 rounded-full whitespace-nowrap">
            PROV
          </div>
        )}
        {hasFrenzy && !card.stageFright && (
          <div className="text-[7px] font-black bg-orange-500 text-black px-1 rounded-full">
            ⚡
          </div>
        )}
        {hasDistortion && (
          <div className="text-[7px] font-black bg-red-700 text-white px-1 rounded-full">
            ↯
          </div>
        )}
      </div>

      {/* Stage Fright indicator */}
      {card.stageFright && !card.isTapped && (
        <div className="absolute inset-0 rounded-[10px] bg-gray-900/40 pointer-events-none flex items-center justify-center z-20">
          <span className="text-[9px] text-gray-300 font-bold bg-black/60 px-1 rounded">😨</span>
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
    startGame, playCard, promoteCard, declareAttack, resolvePendingAttack, skipReplica, intercept, activateBackstage, endTurn, doMulligan,
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

  // ── Reset selections on turn change ──
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
  }, [matchStarted, setIsInBattle]);

  // ── Player Replica Timer ──
  const [replicaTimeLeft, setReplicaTimeLeft] = useState(5);
  useEffect(() => {
    if (phase === 'replica' && turn === 'bot') {
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
    if (phase === 'replica' && turn === 'player' && pendingAttack) {
      const timer = setTimeout(() => {
        const b = botRef.current;
        const p = playerRef.current;

        // Use the AI engine for replica response
        const attackerIdx = pendingAttack.attackerIdx;
        const attackerCard = p.board[attackerIdx] || null;
        const isDirectAttack = pendingAttack.defenderIdx === null;

        const response = botReplicaResponse(b, attackerCard, isDirectAttack, difficulty);

        if (response.action === 'backstage') {
          activateBackstage('bot', response.backstageIdx);
        } else if (response.action === 'intercept') {
          intercept(response.interceptorIdx);
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
    if (prevPhase.current === 'replica' && phase === 'main') {
      simulateScratch();
    }
    prevPhase.current = phase;
  }, [phase, simulateScratch]);

  // ── Play a card from hand ──
  const handlePlayCard = (index: number) => {
    if (turn !== 'player' || phase !== 'main' || gameOver || player.energy < player.hand[index]?.cost) return;
    playSound('play');
    playCard('player', index);
    setSelectedHandIndex(null);
  };

  // ── Click on bot card (attack) ──
  const handleBotCardClick = (i: number) => {
    if (turn !== 'player' || phase !== 'main' || gameOver || selectedAttackerIndex === null) return;
    playSound('attack');
    declareAttack(selectedAttackerIndex, i);
    setSelectedAttackerIndex(null);
  };

  // ── Click on player board card ──
  const handlePlayerBoardCardClick = (i: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (gameOver) return;

    if (phase === 'replica' && turn === 'bot') {
      const card = player.board[i];
      if (!card || card.isTapped || player.energy < 1) return;
      playSound('play');
      intercept(i);
      return;
    }

    if (turn !== 'player' || phase !== 'main') return;
    const card = player.board[i];
    if (!card || card.isTapped || card.stageFright) return;
    playSound('play');
    setSelectedAttackerIndex(i === selectedAttackerIndex ? null : i);
    setSelectedHandIndex(null);
  };

  // ── Direct attack on bot player zone ──
  const handleDirectAttack = () => {
    if (turn !== 'player' || phase !== 'main' || gameOver || selectedAttackerIndex === null) return;
    playSound('attack');
    declareAttack(selectedAttackerIndex, null);
    setSelectedAttackerIndex(null);
  };

  // ── Auto pass turn ──
  useEffect(() => {
    if (turn !== 'player' || phase !== 'main' || gameOver || !matchStarted || selectedAttackerIndex !== null) return;

    const canPlayHand = player.hand.some(c => c.cost <= player.energy);
    const canActivateBackstage = player.backstage.some(c => c.cost <= player.energy);
    const canPromoteCard = player.canPromote && player.maxEnergy < 10 && player.hand.length > 0;
    const canAttack = player.board.some(c => !c.isTapped && !c.stageFright);

    if (!canPlayHand && !canActivateBackstage && !canPromoteCard && !canAttack) {
      const timer = setTimeout(() => {
        endTurn();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [turn, phase, gameOver, matchStarted, player.hand, player.energy, player.backstage, player.canPromote, player.maxEnergy, player.board, endTurn, selectedAttackerIndex]);

  // ── Bot AI (DDA-powered) ──
  // Process bot action queue one action at a time
  const processNextBotAction = useCallback(() => {
    if (botActionQueue.current.length === 0 || gameOver) {
      botProcessing.current = false;
      return;
    }

    const action = botActionQueue.current.shift()!;
    const delay = action.type === 'ATTACK' ? 800 : action.type === 'END_TURN' ? 400 : 600;

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
          // Attack involves replica phase — wait for it to resolve before continuing
          // The replica resolution will trigger a re-run of the bot effect
          return;
        case 'END_TURN':
          endTurn();
          botProcessing.current = false;
          return;
      }

      // Continue processing next action
      processNextBotAction();
    }, delay);
  }, [gameOver, promoteCard, playCard, activateBackstage, declareAttack, endTurn]);

  // Main bot AI trigger — fires when it's bot's turn in main phase
  useEffect(() => {
    if (turn !== 'bot' || !matchStarted || gameOver || phase !== 'main') {
      return;
    }

    // If we're still processing a queue (e.g., after a replica resolved), continue
    if (botProcessing.current && botActionQueue.current.length > 0) {
      const resumeTimer = setTimeout(() => processNextBotAction(), 600);
      return () => clearTimeout(resumeTimer);
    }

    // Prevent double-triggering
    if (botProcessing.current) return;

    // Initial delay before bot starts its turn
    const startTimer = setTimeout(() => {
      const b = botRef.current;
      const p = playerRef.current;

      // Generate the full turn plan using the AI engine
      const actions = botPlayTurn(
        { botState: b, playerState: p, turnCount },
        difficulty,
      );

      botActionQueue.current = actions;
      botProcessing.current = true;
      processNextBotAction();
    }, 1200);

    return () => clearTimeout(startTimer);
  }, [turn, matchStarted, gameOver, phase, botRef, playerRef, turnCount, difficulty, processNextBotAction]);

  // ── Start match with DDA ──
  const startMatch = async (deckId: string) => {
    setSelectedDeckId(deckId);
    setLoadingMatch(true);

    const deck = decks[deckId];
    if (!deck) { setLoadingMatch(false); return; }

    // Build player deck from inventory
    const playerDeck: CardData[] = [];
    const tracks: Track[] = [];
    Object.entries(deck.cards).forEach(([cardId, count]) => {
      const cardData = inventory[cardId]?.card;
      if (cardData) {
        for (let i = 0; i < count; i++) playerDeck.push(cardData);
        if (cardData.previewUrl) {
          tracks.push({
            id: cardData.id,
            url: cardData.previewUrl,
            title: cardData.name,
            artist: cardData.artist,
            artUrl: cardData.artUrl || '',
          });
        }
      }
    });

    // Pad deck to 40 if short
    while (playerDeck.length < 40) {
      playerDeck.push(
        playerDeck[0] || generateCard({
          trackId: 'filler_' + playerDeck.length,
          trackName: 'Filler Track',
          artistName: 'Unknown',
          collectionName: 'Filler',
          primaryGenreName: 'Pop',
          artworkUrl100: '',
        })
      );
    }

    // ── DDA: Calculate power and generate matching bot deck ──
    const deckPower = calculateDeckPower(playerDeck);
    const diffLevel = getDifficultyLevel(deckPower);
    setDifficulty(diffLevel);

    const botDeck = generateBotDeck(deckPower);
    startGame(playerDeck.slice(0, 40), botDeck);

    // Setup music queue
    if (tracks.length > 0) {
      setQueue([...tracks, ...tracks.slice().reverse()]);
      playNext();
      setVolume(0.5);
    }

    setMatchStarted(true);
    setIsInBattle(true);
    setLoadingMatch(false);

    // Reset bot action state
    botActionQueue.current = [];
    botProcessing.current = false;
  };

  useEffect(() => () => { setIsInBattle(false); }, [setIsInBattle]);

  const decksList = Object.values(decks);

  const handlePromote = () => {
    if (turn !== 'player' || phase !== 'main' || gameOver || selectedHandIndex === null) return;
    if (!player.canPromote || player.maxEnergy >= 10) return;
    playSound('play');
    promoteCard('player', selectedHandIndex);
    setSelectedHandIndex(null);
  };

  // ════════════════════════════════════════════════════════════════════════════
  // Deck selection screen
  // ════════════════════════════════════════════════════════════════════════════

  if (!matchStarted) {
    return (
      <div className="flex flex-col gap-6 min-h-[70vh]">
        <h1 className="text-3xl font-bold">El Escenario</h1>
        <p className="text-gray-400">Selecciona un mazo para enfrentar a El Algoritmo.</p>
        {decksList.length === 0 ? (
          <div className="text-center py-12 bg-[#121212] rounded-xl border border-white/10">
            <p className="text-gray-400">No tienes mazos creados.</p>
            <p className="text-sm mt-2">Ve al Estudio para crear uno.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {decksList.map(deck => {
              const cardCount = Object.values(deck.cards).reduce((a, b) => a + b, 0);
              const isValid = cardCount >= 40;
              return (
                <div
                  key={deck.id}
                  onClick={() => isValid && !loadingMatch && startMatch(deck.id)}
                  className={`bg-[#121212] border border-white/10 rounded-xl p-6 flex flex-col items-center justify-center transition-colors group relative overflow-hidden ${isValid ? 'cursor-pointer hover:bg-[#1a1a1a]' : 'opacity-50 cursor-not-allowed'}`}
                >
                  {deck.coverArt && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={deck.coverArt} alt={deck.name} className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-50 transition-opacity" crossOrigin="anonymous" />
                  )}
                  <div className="relative z-10 flex flex-col items-center">
                    <Swords className="w-12 h-12 mb-4 text-gray-400 group-hover:text-white transition-colors" />
                    <h3 className="text-xl font-bold">{deck.name}</h3>
                    <p className={`text-sm ${isValid ? 'text-green-400' : 'text-red-400'}`}>{cardCount} cartas {!isValid && '(min. 40)'}</p>
                    {loadingMatch && selectedDeckId === deck.id && <p className="text-xs text-yellow-400 mt-2 animate-pulse">Conectando...</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Battle screen
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">

      {/* Header */}
      <div className="flex justify-between items-center p-3 shrink-0 bg-[#121212] border-b border-white/10">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Swords className="w-4 h-4 text-red-500" />
            Tú vs El Algoritmo
          </h1>
          <p className="text-xs text-gray-400">
            Turno {turnCount} — {turn === 'player' ? '⚡ Tu Turno' : '🤖 Rival'} — <span className={
              difficulty === 'experto' ? 'text-red-400' : difficulty === 'intermedio' ? 'text-yellow-400' : 'text-green-400'
            }>{difficulty.toUpperCase()}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 bg-[#242424] rounded-full text-gray-400 hover:text-white hover:bg-[#333] transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={() => { setMatchStarted(false); setQueue([]); }}
            className="px-3 py-1.5 bg-[#242424] rounded-full text-xs font-bold hover:bg-[#333]"
          >
            Salir
          </button>
        </div>
      </div>

      {/* Battlefield */}
      <div
        className="flex-1 flex flex-col justify-between relative overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: 'url(/board-bg.png)' }}
      >
        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-0" />

        {/* ── Bot zone ── */}
        <div className="relative z-10 flex flex-col gap-2 pt-3 px-3">
          {/* Bot stats */}
          <div
            onClick={handleDirectAttack}
            className={[
              'flex items-center gap-3 bg-black/60 p-2 rounded-xl border transition-colors w-fit',
              selectedAttackerIndex !== null
                ? 'border-red-500 cursor-crosshair hover:bg-red-900/20'
                : 'border-white/10',
            ].join(' ')}
          >
            <div>
              <p className="text-[10px] text-gray-400">El Algoritmo</p>
              <p className="text-base font-black text-red-400">{bot.hp} ❤️</p>
            </div>
            <div className="flex items-center gap-1 text-blue-400">
              <Zap className="w-3 h-3" />
              <span className="text-xs font-mono">{bot.energy}/{bot.maxEnergy}</span>
            </div>
            {bot.hype > 0 && (
              <div className="flex items-center gap-1 text-yellow-400">
                <Star className="w-3 h-3" />
                <span className="text-xs font-mono">{bot.hype}/20</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{bot.hand.length} en mano</span>
              <div className="relative w-8 h-12">
                <CardBack className="w-full h-full scale-50 origin-top-left" />
                <div className="absolute -bottom-1 -right-1 bg-black/80 text-[8px] px-1 rounded border border-white/10 font-mono">{bot.deck.length}</div>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            {/* Bot Backstage */}
            <div className="flex flex-col gap-1 w-16 shrink-0">
              <span className="text-[8px] text-gray-500 uppercase text-center">Backstage</span>
              <div className="flex flex-wrap gap-1">
                {bot.backstage.map(c => <BackstageSlot key={c.instanceId} card={c} />)}
              </div>
            </div>

            {/* Bot board */}
            <div className="flex flex-wrap gap-2 min-h-[7rem] items-start flex-1">
              <AnimatePresence>
                {bot.board.map((card, i) => (
                  <BoardCardSlot
                    key={card.instanceId}
                    card={card}
                    owner="bot"
                    canTarget={selectedAttackerIndex !== null}
                    onClick={() => handleBotCardClick(i)}
                    onPointerDown={() => handlePointerDown(card)}
                    onPointerUp={handlePointerUp}
                  />
                ))}
              </AnimatePresence>
              {bot.board.length === 0 && (
                <p className="text-white/10 text-xs uppercase tracking-widest self-center">Escenario del Rival Vacío</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Centre divider ── */}
        <div className="relative z-10 flex items-center justify-center my-1 pointer-events-none">
          <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent w-full absolute" />
          {currentTrack && (
            <div className="bg-black/70 px-3 py-1 rounded-full border border-white/10 flex items-center gap-2 z-10">
              <Volume2 className="w-3 h-3 text-green-400" />
              <span className="text-[10px] font-mono text-green-400 truncate max-w-[130px]">{currentTrack.title}</span>
            </div>
          )}
        </div>

        {/* ── Player zone ── */}
        <div className="relative z-10 flex flex-col gap-2 pb-3 px-3">
          <div className="flex gap-4 items-end">
            {/* Player Backstage */}
            <div className="flex flex-col gap-1 w-16 shrink-0">
              <div className="flex flex-wrap gap-1">
                {player.backstage.map((c, i) => (
                  <BackstageSlot
                    key={c.instanceId}
                    card={c}
                    onClick={() => {
                      if (player.energy >= c.cost && (phase === 'main' || phase === 'replica')) {
                        activateBackstage('player', i);
                      }
                    }}
                  />
                ))}
              </div>
              <span className="text-[8px] text-gray-500 uppercase text-center">Backstage</span>
            </div>

            {/* Player board */}
            <div
              className={[
                'flex flex-wrap gap-2 min-h-[7rem] items-end rounded-xl border-2 border-dashed transition-colors p-1 flex-1',
                selectedHandIndex !== null ? 'border-blue-500/50 bg-blue-500/5 cursor-pointer' : 'border-transparent',
              ].join(' ')}
              onClick={() => {
                if (selectedHandIndex !== null) {
                  handlePlayCard(selectedHandIndex);
                }
              }}
            >
              <AnimatePresence>
                {player.board.map((card, i) => (
                  <BoardCardSlot
                    key={card.instanceId}
                    card={card}
                    owner="player"
                    isSelected={selectedAttackerIndex === i}
                    onClick={(e: React.MouseEvent | undefined) => { if (e) handlePlayerBoardCardClick(i, e); }}
                    onPointerDown={() => handlePointerDown(card)}
                    onPointerUp={handlePointerUp}
                  />
                ))}
              </AnimatePresence>
              {player.board.length === 0 && (
                <p className="text-white/15 text-xs uppercase tracking-widest self-center pointer-events-none">
                  {selectedHandIndex !== null ? '▶ Toca aquí para jugar' : 'Tu Escenario'}
                </p>
              )}
            </div>
          </div>

          {/* Player stats */}
          <div className="flex items-center gap-3 bg-black/60 p-2 rounded-xl border border-white/10 w-fit">
            <div>
              <p className="text-[10px] text-gray-400">Tú</p>
              <p className="text-base font-black text-green-400">{player.hp} ❤️</p>
            </div>
            <div className="flex items-center gap-1 text-blue-400">
              <Zap className="w-3 h-3" />
              <span className="text-xs font-mono">{player.energy}/{player.maxEnergy}</span>
            </div>
            {player.hype > 0 && (
              <div className="flex items-center gap-1 text-yellow-400">
                <Star className="w-3 h-3" />
                <span className="text-xs font-mono">{player.hype}/20</span>
              </div>
            )}
            <div className="flex items-center gap-2 ml-2">
              <div className="relative w-8 h-12">
                <CardBack className="w-full h-full scale-50 origin-top-left" />
                <div className="absolute -bottom-1 -right-1 bg-black/80 text-[8px] px-1 rounded border border-white/10 font-mono">{player.deck.length}</div>
              </div>
              <span className="text-[10px] text-gray-500 uppercase tracking-tighter">Deck</span>
            </div>
            <button
              onClick={endTurn}
              disabled={turn !== 'player' || !!gameOver || phase !== 'main'}
              className="ml-2 px-3 py-1 bg-white text-black text-xs font-black rounded-full disabled:opacity-40 hover:bg-gray-200 transition-colors"
            >
              Pasar Turno
            </button>
          </div>
        </div>

        {/* ── Scratch overlay ── */}
        {isScratching && (
          <div className="absolute inset-0 bg-red-500/10 pointer-events-none animate-pulse z-50 flex items-center justify-center">
            <p className="text-red-500 font-black text-3xl -rotate-6 drop-shadow-lg">¡GOLPE!</p>
          </div>
        )}

        {/* ── Start of Turn / Mulligan Overlay ── */}
        {matchStarted && turnCount === 1 && turn === 'player' && !player.hasMulliganed && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 z-[150] flex items-center justify-center pointer-events-none"
            >
              <div className="bg-black/90 backdrop-blur-md border border-white/20 p-8 rounded-3xl shadow-2xl flex flex-col items-center pointer-events-auto">
                <h2 className="text-3xl font-black mb-4 uppercase tracking-wider text-white">¿Roba Nueva Mano? (Mulligan)</h2>
                <p className="text-gray-400 mb-8 max-w-sm text-center">
                  Tienes 1 oportunidad de volver a mezclar tu mano inicial y robar 5 cartas nuevas.
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => doMulligan('player')}
                    className="px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full font-bold uppercase tracking-wider transition-all"
                  >
                    Mulligan
                  </button>
                  <button
                    onClick={() => doMulligan('player')}
                    className="px-8 py-3 bg-white text-black hover:bg-gray-200 rounded-full font-black uppercase tracking-wider transition-all"
                  >
                    Mantener
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* ── Game over overlay ── */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/85 pointer-events-none z-50 flex flex-col items-center justify-center backdrop-blur-sm">
            {gameOver === 'player' ? (
              <>
                <Trophy className="w-20 h-20 text-yellow-400 mb-4 drop-shadow-[0_0_20px_rgba(250,204,21,0.8)]" />
                <div className="text-yellow-400 font-black text-5xl drop-shadow-lg uppercase">¡Victoria!</div>
                {player.hype >= 20 && <p className="text-yellow-300 mt-2 text-sm">¡Disco de Platino! 20 Hype alcanzado.</p>}
              </>
            ) : gameOver === 'draw' ? (
              <>
                <div className="text-white font-black text-5xl drop-shadow-lg uppercase">¡Empate!</div>
                <p className="text-gray-300 mt-2 text-sm">Double KO — No hay Regalías ganadas.</p>
              </>
            ) : (
              <>
                <Skull className="w-20 h-20 text-red-500 mb-4 drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]" />
                <div className="text-red-500 font-black text-5xl drop-shadow-lg uppercase">Derrota</div>
              </>
            )}
            <button
              onClick={() => { setMatchStarted(false); setQueue([]); }}
              className="mt-8 px-8 py-3 bg-white text-black font-bold rounded-full pointer-events-auto hover:bg-gray-200"
            >
              Volver al Escenario
            </button>
          </div>
        )}

        {/* ── Replica Overlay ── */}
        <AnimatePresence>
          {phase === 'replica' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-none bg-black/40 backdrop-blur-[2px]"
            >
              <div className="bg-black/90 border border-red-500/50 p-6 rounded-2xl text-center pointer-events-auto shadow-[0_0_40px_rgba(239,68,68,0.4)]">
                <h2 className="text-3xl font-black text-red-500 uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
                  <ShieldAlert className="w-8 h-8" />
                  ¡La Réplica!
                </h2>
                {turn === 'bot' ? (
                  <>
                    <p className="text-white mb-4">El rival declara un ataque. Tienes {replicaTimeLeft}s para reaccionar.</p>
                    <div className="flex flex-col gap-3 items-center">
                      <button
                        onClick={skipReplica}
                        className="px-8 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold transition-colors w-full"
                      >
                        Dejar pasar
                      </button>
                      <div className="text-xs text-gray-400 bg-white/5 p-2 rounded-lg border border-white/10">
                        <span className="text-yellow-400 font-bold">INTERCEPTAR:</span> Toca una de tus cartas enderezadas en el tablero (Coste: 1 ⚡)
                      </div>
                      <div className="text-xs text-gray-400 bg-white/5 p-2 rounded-lg border border-white/10">
                        <span className="text-purple-400 font-bold">BACKSTAGE:</span> Toca una carta en tu Backstage para activarla.
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-white animate-pulse">Esperando respuesta del rival...</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Turn indicator ── */}
        <AnimatePresence>
          {showTurnIndicator && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.5 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-40"
            >
              <div className={`text-5xl font-black uppercase tracking-widest drop-shadow-[0_0_30px_rgba(0,0,0,1)] ${turn === 'player' ? 'text-green-400' : 'text-red-500'}`}>
                {turn === 'player' ? 'Tu Turno' : 'Turno del Rival'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Hand ── */}
      <div className="h-44 shrink-0 bg-[#0a0a0a] border-t border-white/10 px-4 py-2 overflow-x-auto overflow-y-hidden flex items-end justify-center relative z-20">
        <div className="flex flex-row justify-center items-end gap-3 px-8 min-w-max mb-1">
          {/* Promotion Zone */}
          <div
            onClick={handlePromote}
            className={[
              "w-20 h-28 mb-3 rounded-xl border-4 border-dashed flex flex-col items-center justify-center gap-1 transition-all cursor-pointer shrink-0",
              player.canPromote && selectedHandIndex !== null && player.maxEnergy < 10
                ? "border-yellow-500/60 bg-yellow-500/10 scale-105 shadow-[0_0_15px_rgba(234,179,8,0.3)]"
                : "border-white/10 bg-white/5 opacity-40 grayscale pointer-events-none"
            ].join(' ')}
          >
            <Zap className="w-8 h-8 text-yellow-500" />
            <span className="text-[10px] font-black text-yellow-500 uppercase tracking-tighter text-center">PROMOCIONAR</span>
          </div>

          <div className="flex flex-row justify-center items-end gap-2 px-2">
            <AnimatePresence>
              {player.hand.map((card, i) => {
                const canPlay = player.energy >= card.cost && turn === 'player' && !gameOver;
                const isSelected = selectedHandIndex === i;
                return (
                  <motion.div
                    key={`${card.id}-hand-${i}`}
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: isSelected ? -24 : 0, opacity: 1, rotate: 0 }}
                    exit={{ y: -100, opacity: 0, scale: 0.5 }}
                    whileHover={{ y: -28, scale: 1.08, zIndex: 50 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                    onClick={() => {
                      if (!canPlay) return;
                      setSelectedHandIndex(isSelected ? null : i);
                      setSelectedAttackerIndex(null);
                    }}
                    onPointerDown={() => handlePointerDown(card)}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    className={[
                      'cursor-pointer relative group',
                      isSelected ? 'z-40' : 'z-10 hover:z-30',
                      !canPlay ? 'opacity-40 grayscale-[0.6]' : '',
                    ].join(' ')}
                  >
                    <div className="relative w-28 h-40 sm:w-36 sm:h-[200px] rounded-xl overflow-hidden shadow-lg transition-shadow">
                      <Card
                        data={card}
                        onDoubleClick={() => handlePlayCard(i)}
                        className={[
                          'origin-top-left transform scale-[0.4375] sm:scale-[0.5625] w-64',
                          isSelected ? 'shadow-[0_0_20px_rgba(59,130,246,0.7)]' : '',
                          canPlay && !isSelected ? 'group-hover:shadow-[0_0_15px_rgba(34,197,94,0.4)]' : '',
                        ].join(' ')}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          onConcede={() => {
            setShowSettings(false);
            setMatchStarted(false);
            setQueue([]);
          }}
          volume={volume}
          setVolume={setVolume}
          language={language}
        />
      </div>

      {/* ── Card inspect modal ── */}
      <AnimatePresence>
        {inspectedCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
            onClick={handlePointerUp}
          >
            <motion.div
              initial={{ scale: 0.8, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 40 }}
              className="relative max-w-sm w-full"
            >
              <Card data={inspectedCard} className="w-full shadow-[0_0_50px_rgba(255,255,255,0.15)]" />
              <div className="mt-4 bg-black/50 p-4 rounded-xl border border-white/10 text-center">
                <h3 className="text-xl font-bold mb-1">{inspectedCard.name}</h3>
                <p className="text-gray-400 text-sm mb-3">{inspectedCard.artist}</p>
                <div className="flex justify-center gap-3 text-sm">
                  <div className="bg-blue-900/40 px-3 py-2 rounded-lg border border-blue-500/30">
                    <span className="block text-blue-400 font-bold text-[10px]">ENERGÍA</span>
                    <span className="text-xl">{inspectedCard.cost}</span>
                  </div>
                  <div className="bg-red-900/40 px-3 py-2 rounded-lg border border-red-500/30">
                    <span className="block text-red-400 font-bold text-[10px]">ATK</span>
                    <span className="text-xl">{inspectedCard.stats.atk}</span>
                  </div>
                  <div className="bg-teal-900/40 px-3 py-2 rounded-lg border border-teal-500/30">
                    <span className="block text-teal-400 font-bold text-[10px]">DEF</span>
                    <span className="text-xl">{inspectedCard.stats.def}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
