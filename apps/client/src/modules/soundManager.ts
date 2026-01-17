// ============================================
// Sound Manager Module
// ============================================

export enum SoundType {
    COUNTDOWN_TICK = 'countdown_tick',
    DRAW = 'draw',
    SHOT = 'shot',
    WIN = 'win',
    LOSE = 'lose',
    HIT = 'hit',
}

export interface SoundConfig {
    [SoundType.COUNTDOWN_TICK]: string;
    [SoundType.DRAW]: string;
    [SoundType.SHOT]: string;
    [SoundType.WIN]: string;
    [SoundType.LOSE]: string;
    [SoundType.HIT]: string;
}

// Default placeholder sounds (to be replaced with real assets)
export const DEFAULT_SOUND_CONFIG: SoundConfig = {
    [SoundType.COUNTDOWN_TICK]: '/assets/sounds/tick.mp3',
    [SoundType.DRAW]: '/assets/sounds/draw.mp3',
    [SoundType.SHOT]: '/assets/sounds/shot.mp3',
    [SoundType.WIN]: '/assets/sounds/win.mp3',
    [SoundType.LOSE]: '/assets/sounds/lose.mp3',
    [SoundType.HIT]: '/assets/sounds/hit.mp3',
};

export class SoundManager {
    private audioContext: AudioContext | null = null;
    private sounds: Map<SoundType, AudioBuffer> = new Map();
    private isInitialized = false;
    private isMuted = false;
    private volume = 1.0;
    private config: SoundConfig;

    constructor(config: Partial<SoundConfig> = {}) {
        this.config = { ...DEFAULT_SOUND_CONFIG, ...config };
    }

    // Must be called after user interaction (click, tap, etc.)
    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

            // Preload all sounds
            await Promise.all(
                Object.entries(this.config).map(([type, path]) =>
                    this.loadSound(type as SoundType, path)
                )
            );

            this.isInitialized = true;
            console.log('SoundManager initialized');
        } catch (error) {
            console.warn('SoundManager initialization failed:', error);
            // Don't throw - sound is optional
        }
    }

    private async loadSound(type: SoundType, path: string): Promise<void> {
        if (!this.audioContext) return;

        try {
            const response = await fetch(path);
            if (!response.ok) {
                console.warn(`Sound not found: ${path}`);
                return;
            }

            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.sounds.set(type, audioBuffer);
        } catch (error) {
            console.warn(`Failed to load sound ${type}:`, error);
            // Continue without this sound
        }
    }

    play(type: SoundType): void {
        if (!this.isInitialized || !this.audioContext || this.isMuted) return;

        const buffer = this.sounds.get(type);
        if (!buffer) {
            // Generate placeholder beep if sound not loaded
            this.playBeep(type);
            return;
        }

        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();

        source.buffer = buffer;
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        gainNode.gain.value = this.volume;

        source.start(0);
    }

    // Fallback: generate simple beep sounds
    private playBeep(type: SoundType): void {
        if (!this.audioContext || this.isMuted) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        // Different frequencies for different sounds
        const frequencies: Record<SoundType, number> = {
            [SoundType.COUNTDOWN_TICK]: 440,   // A4
            [SoundType.DRAW]: 880,              // A5 (higher, attention)
            [SoundType.SHOT]: 220,              // A3 (lower, impact)
            [SoundType.WIN]: 523,               // C5
            [SoundType.LOSE]: 262,              // C4
            [SoundType.HIT]: 330,               // E4
        };

        const durations: Record<SoundType, number> = {
            [SoundType.COUNTDOWN_TICK]: 0.1,
            [SoundType.DRAW]: 0.3,
            [SoundType.SHOT]: 0.15,
            [SoundType.WIN]: 0.5,
            [SoundType.LOSE]: 0.4,
            [SoundType.HIT]: 0.2,
        };

        oscillator.frequency.value = frequencies[type];
        oscillator.type = type === SoundType.SHOT ? 'sawtooth' : 'sine';

        gainNode.gain.value = this.volume * 0.3; // Lower volume for beeps
        gainNode.gain.exponentialRampToValueAtTime(
            0.01,
            this.audioContext.currentTime + durations[type]
        );

        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + durations[type]);
    }

    // Convenience methods
    playCountdown(): void {
        this.play(SoundType.COUNTDOWN_TICK);
    }

    playDraw(): void {
        this.play(SoundType.DRAW);
    }

    playShot(): void {
        this.play(SoundType.SHOT);
    }

    playWin(): void {
        this.play(SoundType.WIN);
    }

    playLose(): void {
        this.play(SoundType.LOSE);
    }

    // Volume control
    setVolume(volume: number): void {
        this.volume = Math.max(0, Math.min(1, volume));
    }

    getVolume(): number {
        return this.volume;
    }

    // Mute control
    mute(): void {
        this.isMuted = true;
    }

    unmute(): void {
        this.isMuted = false;
    }

    toggleMute(): boolean {
        this.isMuted = !this.isMuted;
        return this.isMuted;
    }

    getIsMuted(): boolean {
        return this.isMuted;
    }

    // Resume audio context (required after page visibility change)
    async resume(): Promise<void> {
        if (this.audioContext?.state === 'suspended') {
            await this.audioContext.resume();
        }
    }
}

// Singleton instance
let soundManagerInstance: SoundManager | null = null;

export function getSoundManager(): SoundManager {
    if (!soundManagerInstance) {
        soundManagerInstance = new SoundManager();
    }
    return soundManagerInstance;
}
