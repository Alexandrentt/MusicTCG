/**
 * audioEngine.ts
 *
 * Motor de audio para MusicTCG. Gestiona:
 *  - Preview de la canción actual en batalla (30s de iTunes)
 *  - SFX de combate (ataque, defensa, habilidades, victoria/derrota)
 *  - Transiciones suaves con fade-in/fade-out
 *
 * POR QUÉ CLASE Y NO HOOK:
 *  El motor de audio vive más tiempo que los componentes React.
 *  Se exporta una instancia singleton (`audioEngine`) que los
 *  hooks y páginas pueden importar directamente.
 *
 * USO:
 *  import { audioEngine } from '@/lib/engine/audioEngine';
 *  audioEngine.playPreview(card.previewUrl);
 *  audioEngine.playSFX('VICTORY');
 */

// ═══════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════

export interface AudioConfig {
    masterVolume: number;   // 0–100
    musicVolume: number;    // 0–100
    sfxVolume: number;      // 0–100
    enabled: boolean;
}

export type SFXType =
    | 'ATTACK_LIGHT'
    | 'ATTACK_HEAVY'
    | 'DEFENSE'
    | 'CARD_PLAY'
    | 'CARD_DESTROY'
    | 'ABILITY_TRIGGER'
    | 'ABILITY_DROP'
    | 'SHUFFLE'
    | 'VICTORY'
    | 'DEFEAT'
    | 'LEVEL_UP'
    | 'RANK_UP'
    | 'TIER_UP'
    | 'PACK_OPEN'
    | 'CARD_FLIP'
    | 'HYPE_GAIN'
    | 'HYPE_LOSS';

// ═══════════════════════════════════════════
// FALLBACK SFX (generados con Web Audio API)
// No depende de archivos .mp3 que no existen todavía
// ═══════════════════════════════════════════

type AudioContextType = typeof AudioContext;

function createWebAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
        const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as AudioContextType | undefined;
        return Ctx ? new Ctx() : null;
    } catch {
        return null;
    }
}

/**
 * Genera un SFX simple con la Web Audio API.
 * No requiere archivos de audio externos.
 */
function playTone(
    ctx: AudioContext,
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume: number = 0.3,
    attack: number = 0.01,
    decay: number = 0.1,
): void {
    try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(frequency, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(
            Math.max(frequency * 0.5, 20),
            ctx.currentTime + duration
        );

        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + attack);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration - decay);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
    } catch {
        // Silently ignore if audio context is in bad state
    }
}

function playNoise(ctx: AudioContext, duration: number, volume: number = 0.1): void {
    try {
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const source = ctx.createBufferSource();
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        source.buffer = buffer;
        source.connect(gain);
        gain.connect(ctx.destination);
        source.start();
    } catch {
        // Silently ignore
    }
}

// ═══════════════════════════════════════════
// CLASE PRINCIPAL
// ═══════════════════════════════════════════

export class AudioEngine {
    private config: AudioConfig;
    private previewAudio: HTMLAudioElement | null = null;
    private webAudioCtx: AudioContext | null = null;
    private fadeInterval: ReturnType<typeof setInterval> | null = null;

    constructor(config: Partial<AudioConfig> = {}) {
        this.config = {
            masterVolume: 80,
            musicVolume: 70,
            sfxVolume: 65,
            enabled: true,
            ...config,
        };
    }

    // ─── Lazy init del Web Audio Context ─────
    private getCtx(): AudioContext | null {
        if (!this.webAudioCtx) {
            this.webAudioCtx = createWebAudioContext();
        }
        // Resume si estaba suspendido (política del navegador)
        if (this.webAudioCtx?.state === 'suspended') {
            this.webAudioCtx.resume().catch(() => { });
        }
        return this.webAudioCtx;
    }

    private get effectiveMusic(): number {
        return (this.config.masterVolume * this.config.musicVolume) / 10000;
    }

    private get effectiveSFX(): number {
        return (this.config.masterVolume * this.config.sfxVolume) / 10000;
    }

    // ═══════════════════════════════════════
    // PREVIEW DE CANCIÓN (iTunes 30s)
    // ═══════════════════════════════════════

    playPreview(previewUrl: string | undefined | null, fadeIn: boolean = true): void {
        if (!this.config.enabled || !previewUrl) return;

        this.stopPreview(false);

        const audio = new Audio();
        // iTunes sirve https, pero por si acaso
        audio.src = previewUrl.replace('http://', 'https://');
        audio.crossOrigin = 'anonymous';
        audio.loop = false;

        if (fadeIn) {
            audio.volume = 0;
            audio.oncanplay = () => {
                audio.play().catch(() => { });
                this.fadeTo(audio, this.effectiveMusic, 800);
            };
        } else {
            audio.volume = this.effectiveMusic;
            audio.play().catch(() => { });
        }

        audio.onerror = () => {
            console.warn('[AudioEngine] Preview not available:', previewUrl);
        };

        this.previewAudio = audio;
    }

    stopPreview(fadeOut: boolean = true): void {
        if (!this.previewAudio) return;
        const audio = this.previewAudio;

        if (fadeOut) {
            this.fadeTo(audio, 0, 500, () => {
                audio.pause();
                audio.src = '';
            });
        } else {
            audio.pause();
            audio.src = '';
        }
        this.previewAudio = null;
    }

    private fadeTo(
        audio: HTMLAudioElement,
        targetVolume: number,
        durationMs: number,
        onDone?: () => void,
    ): void {
        if (this.fadeInterval) clearInterval(this.fadeInterval);
        const steps = 20;
        const stepMs = durationMs / steps;
        const delta = (targetVolume - audio.volume) / steps;
        let step = 0;

        this.fadeInterval = setInterval(() => {
            step++;
            audio.volume = Math.max(0, Math.min(1, audio.volume + delta));
            if (step >= steps) {
                clearInterval(this.fadeInterval!);
                this.fadeInterval = null;
                onDone?.();
            }
        }, stepMs);
    }

    // ═══════════════════════════════════════
    // SFX (Web Audio API — sin archivos)
    // ═══════════════════════════════════════

    playSFX(type: SFXType): void {
        if (!this.config.enabled) return;
        const ctx = this.getCtx();
        if (!ctx) return;
        const v = this.effectiveSFX;

        switch (type) {
            case 'ATTACK_LIGHT':
                playTone(ctx, 220, 0.15, 'sawtooth', v * 0.8);
                break;
            case 'ATTACK_HEAVY':
                playTone(ctx, 150, 0.3, 'sawtooth', v, 0.005, 0.05);
                playNoise(ctx, 0.2, v * 0.3);
                break;
            case 'DEFENSE':
                playTone(ctx, 440, 0.2, 'square', v * 0.6);
                playTone(ctx, 660, 0.15, 'sine', v * 0.4, 0.02, 0.05);
                break;
            case 'CARD_PLAY':
                playTone(ctx, 600, 0.1, 'sine', v * 0.5);
                break;
            case 'CARD_FLIP':
                playNoise(ctx, 0.08, v * 0.4);
                playTone(ctx, 800, 0.1, 'sine', v * 0.3, 0.005, 0.05);
                break;
            case 'CARD_DESTROY':
                playNoise(ctx, 0.4, v * 0.6);
                playTone(ctx, 80, 0.3, 'sawtooth', v * 0.7, 0.01, 0.1);
                break;
            case 'ABILITY_TRIGGER':
                playTone(ctx, 880, 0.12, 'sine', v * 0.6);
                playTone(ctx, 1100, 0.1, 'sine', v * 0.4, 0.03, 0.04);
                break;
            case 'ABILITY_DROP':
                // El "drop" del beat
                playTone(ctx, 60, 0.4, 'sine', v * 0.9, 0.001, 0.05);
                playTone(ctx, 120, 0.35, 'sine', v * 0.6, 0.02, 0.08);
                playNoise(ctx, 0.15, v * 0.3);
                break;
            case 'SHUFFLE':
                // Vinyl scratch
                for (let i = 0; i < 3; i++) {
                    setTimeout(() => playNoise(ctx, 0.06, v * 0.3), i * 60);
                }
                break;
            case 'VICTORY':
                [523, 659, 784, 1047].forEach((freq, i) => {
                    setTimeout(() => playTone(ctx, freq, 0.4, 'sine', v * 0.7), i * 120);
                });
                break;
            case 'DEFEAT':
                [392, 349, 330, 294].forEach((freq, i) => {
                    setTimeout(() => playTone(ctx, freq, 0.5, 'triangle', v * 0.5), i * 150);
                });
                break;
            case 'LEVEL_UP':
                [523, 659, 784, 1047, 1319].forEach((freq, i) => {
                    setTimeout(() => playTone(ctx, freq, 0.25, 'sine', v * 0.6), i * 80);
                });
                break;
            case 'RANK_UP':
                playTone(ctx, 880, 0.3, 'sine', v * 0.8);
                setTimeout(() => playTone(ctx, 1100, 0.4, 'sine', v * 0.9), 150);
                break;
            case 'TIER_UP':
                // Fanfare épico
                [659, 784, 988, 1319].forEach((freq, i) => {
                    setTimeout(() => {
                        playTone(ctx, freq, 0.5, 'sine', v * 0.8);
                        playTone(ctx, freq * 1.25, 0.4, 'sine', v * 0.4);
                    }, i * 130);
                });
                break;
            case 'PACK_OPEN':
                playNoise(ctx, 0.1, v * 0.4);
                setTimeout(() => {
                    playTone(ctx, 800, 0.15, 'sine', v * 0.6);
                    playTone(ctx, 1200, 0.2, 'sine', v * 0.4, 0.02, 0.08);
                }, 80);
                break;
            case 'HYPE_GAIN':
                playTone(ctx, 660, 0.15, 'sine', v * 0.5);
                break;
            case 'HYPE_LOSS':
                playTone(ctx, 220, 0.2, 'triangle', v * 0.4);
                break;
        }
    }

    // ═══════════════════════════════════════
    // HELPERS DE COMBATE
    // ═══════════════════════════════════════

    /** Ataque: sonido escalado según ATK */
    playAttack(atk: number): void {
        this.playSFX(atk >= 7 ? 'ATTACK_HEAVY' : 'ATTACK_LIGHT');
    }

    /** Defensa: sonido de escudo */
    playDefense(_def: number): void {
        this.playSFX('DEFENSE');
    }

    /** Habilidad disparada: keyword específico */
    playAbility(keyword: string): void {
        if (keyword === 'Drop' || keyword === 'Bass Boost') {
            this.playSFX('ABILITY_DROP');
        } else {
            this.playSFX('ABILITY_TRIGGER');
        }
    }

    // ═══════════════════════════════════════
    // CONFIGURACIÓN
    // ═══════════════════════════════════════

    setVolume(type: 'master' | 'music' | 'sfx', value: number): void {
        const key = `${type}Volume` as keyof AudioConfig;
        (this.config as any)[key] = Math.max(0, Math.min(100, value));
        // Actualizar el preview en vivo si está reproduciendo
        if (this.previewAudio && type !== 'sfx') {
            this.previewAudio.volume = this.effectiveMusic;
        }
    }

    setEnabled(val: boolean): void {
        this.config.enabled = val;
        if (!val) this.stopPreview(false);
    }

    getConfig(): Readonly<AudioConfig> {
        return { ...this.config };
    }

    /** Limpieza al desmontar (si fuera necesario) */
    destroy(): void {
        this.stopPreview(false);
        if (this.fadeInterval) clearInterval(this.fadeInterval);
        this.webAudioCtx?.close().catch(() => { });
        this.webAudioCtx = null;
    }
}

// ═══════════════════════════════════════
// SINGLETON GLOBAL
// ═══════════════════════════════════════

/** 
 * Instancia singleton del motor de audio.
 * Import en cualquier componente o hook sin instanciar de nuevo.
 */
export const audioEngine = new AudioEngine();
