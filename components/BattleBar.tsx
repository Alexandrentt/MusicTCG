import React from 'react';

interface BattleBarProps {
    yourEnergy: { current: number; max: number };
    yourCards: number;
    yourHype: number;
    yourReputation: number;
    currentPhase: string; // 'OPENING' | 'MAIN' | 'COMBAT' | 'CLOSING'
    activePlayer: string; // 'player_A' | 'player_B'
    yourName?: string;
}

export const BattleBar: React.FC<BattleBarProps> = ({
    yourEnergy,
    yourCards,
    yourHype,
    yourReputation,
    currentPhase,
    activePlayer,
    yourName = 'Tú',
}) => {
    const isYourTurn = activePlayer === 'player_A'; // Ajusta según tu lógica

    const getPhaseLabel = (phase: string) => {
        const labels: { [key: string]: string } = {
            OPENING: '🌟 Inicio',
            DRAW: '🎴 Robo',
            MAIN: '🎭 Principal',
            COMBAT: '⚔️  Combate',
            CLOSING: '🏁 Cierre',
        };
        return labels[phase] || phase;
    };

    return (
        <div
            className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent border-t border-amber-500/30 px-6 py-4"
            style={{ zIndex: 40 }}
        >
            {/* Contenedor principal */}
            <div className="max-w-7xl mx-auto">
                {/* Fila superior: Info del jugador + Fase */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                    {/* Lado izquierdo: Tu información */}
                    <div className="flex items-center gap-4">
                        {/* Energía */}
                        <div className="flex items-center gap-2 bg-blue-900/30 rounded-lg px-3 py-2 border border-blue-500/30">
                            <svg
                                className="w-5 h-5 text-blue-400"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                            </svg>
                            <span className="text-sm font-bold text-white">
                                {yourEnergy.current} / {yourEnergy.max}
                            </span>
                        </div>

                        {/* Cartas en mano */}
                        <div className="flex items-center gap-2 bg-purple-900/30 rounded-lg px-3 py-2 border border-purple-500/30">
                            <svg
                                className="w-5 h-5 text-purple-400"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z" />
                            </svg>
                            <span className="text-sm font-bold text-white">{yourCards}</span>
                        </div>

                        {/* Reputación */}
                        <div className="flex items-center gap-2 bg-red-900/30 rounded-lg px-3 py-2 border border-red-500/30">
                            <svg
                                className="w-5 h-5 text-red-400"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                            </svg>
                            <span className="text-sm font-bold text-white">
                                {yourReputation}
                            </span>
                        </div>
                    </div>

                    {/* Centro: Fase actual */}
                    <div className="flex flex-col items-center justify-center gap-2">
                        <div
                            className={`px-4 py-2 rounded-lg font-bold text-sm border ${isYourTurn
                                ? 'bg-green-500/20 border-green-500/50 text-green-400'
                                : 'bg-gray-500/20 border-gray-500/50 text-gray-400'
                                }`}
                        >
                            {getPhaseLabel(currentPhase)}
                        </div>
                        <span className="text-xs text-gray-400">
                            {isYourTurn ? '✓ Tu turno' : '⏳ Esperando...'}
                        </span>
                    </div>

                    {/* Lado derecho: Hype (Objetivo de victoria alternativa) */}
                    <div className="flex items-center justify-end gap-4">
                        {/* Hype */}
                        <div className="flex items-center gap-2 bg-amber-900/30 rounded-lg px-3 py-2 border border-amber-500/30">
                            <svg
                                className="w-5 h-5 text-amber-400"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                            <span className="text-sm font-bold text-white">
                                {yourHype} / 20
                            </span>
                        </div>
                    </div>
                </div>

                {/* Fila inferior: Mensajes de estado */}
                <div className="flex items-center justify-between text-xs text-gray-400 border-t border-amber-500/20 pt-3">
                    <span>
                        {isYourTurn
                            ? '▶ Tú estás jugando'
                            : '⏸ Esperando turno del rival'}
                    </span>
                    <span>
                        {currentPhase === 'MAIN'
                            ? '🎭 Puedes jugar cartas y atacar'
                            : currentPhase === 'COMBAT'
                                ? '⚔️  Declarando ataques'
                                : 'Fase automática en progreso'}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default BattleBar;
