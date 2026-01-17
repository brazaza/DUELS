// ============================================
// FSM States
// ============================================

// Training Mode States
export enum TrainingState {
    IDLE = 'TRAIN_IDLE',
    READY = 'TRAIN_READY',
    COUNTDOWN = 'TRAIN_COUNTDOWN',
    WAIT_DRAW = 'TRAIN_WAIT_DRAW',
    DRAW = 'TRAIN_DRAW',
    RESULT = 'TRAIN_RESULT',
}

// Duel Mode States
export enum DuelState {
    IDLE = 'DUEL_IDLE',
    LOBBY = 'DUEL_LOBBY',
    READY = 'DUEL_READY',              // Both players clicked ready button
    HANDS_READY = 'DUEL_HANDS_READY',  // NEW: Both players show open palm
    COUNTDOWN = 'DUEL_COUNTDOWN',
    WAIT_DRAW = 'DUEL_WAIT_DRAW',
    DRAW = 'DUEL_DRAW',
    RESOLVE = 'DUEL_RESOLVE',
    RESULT = 'DUEL_RESULT',
}

// ============================================
// Player & Room Types
// ============================================

export interface Player {
    id: string;
    name: string;
    isReady: boolean;
    handReady: boolean;        // NEW: Player shows open palm
    shotTimestamp?: number;    // When player shot (ms since draw)
}

export interface Room {
    code: string;
    hostId: string;
    players: Player[];
    state: DuelState;
    drawTime?: number;         // Server timestamp when DRAW was triggered
    createdAt: number;
}

// ============================================
// Game Events
// ============================================

export interface ShotEvent {
    playerId: string;
    timestamp: number;         // Client timestamp of shot
    reactionTime: number;      // Time since DRAW signal (ms)
}

export interface DrawEvent {
    drawTime: number;          // Server timestamp for DRAW
}

export interface GameResult {
    winnerId: string | null;   // null = draw
    player1: {
        id: string;
        reactionTime: number | null;  // null = didn't shoot
    };
    player2: {
        id: string;
        reactionTime: number | null;
    };
}

// ============================================
// Gesture Types
// ============================================

export enum GestureType {
    NONE = 'NONE',
    PALM_OPEN = 'PALM_OPEN',   // Open palm ready state
    FIST = 'FIST',             // Fist detected (display only)
    SHOT = 'SHOT',             // Shot action (palm→fist transition)
}

export interface HandLandmarks {
    landmarks: Array<{ x: number; y: number; z: number }>;
    handedness: 'Left' | 'Right';
}

export interface GestureResult {
    gesture: GestureType;
    confidence: number;
    landmarks?: HandLandmarks;
}
