// ============================================
// Duel Mode FSM
// ============================================

import { DuelState, CONFIG, getRandomDrawDelay, Player, GameResult } from '@duels/shared';

export type DuelAction =
    | { type: 'CREATE_ROOM' }
    | { type: 'JOIN_ROOM' }
    | { type: 'ROOM_INFO'; roomCode: string; playerId: string; players: Player[] }
    | { type: 'PLAYER_JOINED'; player: Player }
    | { type: 'PLAYER_LEFT'; playerId: string }
    | { type: 'BOTH_READY' }                              // Both clicked "Ready" button
    | { type: 'HAND_READY'; playerId: string; isReady: boolean }  // NEW: Player hand state
    | { type: 'BOTH_HANDS_READY' }                        // NEW: Both show palms
    | { type: 'COUNTDOWN_COMPLETE' }
    | { type: 'WAIT_COMPLETE'; drawTime: number }
    | { type: 'PLAYER_SHOT'; playerId: string; reactionTime: number }
    | { type: 'EARLY_SHOT' }
    | { type: 'RESULT'; result: GameResult }
    | { type: 'LEAVE' }
    | { type: 'RESET' };

export interface DuelContext {
    state: DuelState;
    roomCode: string | null;
    playerId: string | null;
    players: Player[];
    countdown: number;
    drawDelay: number;
    drawTimestamp: number | null;
    myReactionTime: number | null;
    opponentReactionTime: number | null;
    result: GameResult | null;
    isEarlyShot: boolean;
    myHandReady: boolean;           // NEW: My hand shows palm
    opponentHandReady: boolean;     // NEW: Opponent hand shows palm
}

export function createDuelContext(): DuelContext {
    return {
        state: DuelState.IDLE,
        roomCode: null,
        playerId: null,
        players: [],
        countdown: CONFIG.COUNTDOWN_DURATION,
        drawDelay: getRandomDrawDelay(),
        drawTimestamp: null,
        myReactionTime: null,
        opponentReactionTime: null,
        result: null,
        isEarlyShot: false,
        myHandReady: false,
        opponentHandReady: false,
    };
}

// State transition table
const transitions: Record<DuelState, Partial<Record<DuelAction['type'], DuelState>>> = {
    [DuelState.IDLE]: {
        CREATE_ROOM: DuelState.LOBBY,
        JOIN_ROOM: DuelState.LOBBY,
        ROOM_INFO: DuelState.LOBBY, // Fix: Allow syncing room info from IDLE
    },
    [DuelState.LOBBY]: {
        ROOM_INFO: DuelState.LOBBY,
        PLAYER_JOINED: DuelState.LOBBY,
        BOTH_READY: DuelState.READY,
        LEAVE: DuelState.IDLE,
    },
    [DuelState.READY]: {
        HAND_READY: DuelState.READY,          // Update hand state
        BOTH_HANDS_READY: DuelState.HANDS_READY,  // NEW: Transition when both show palms
        PLAYER_LEFT: DuelState.LOBBY,
        LEAVE: DuelState.IDLE,
    },
    [DuelState.HANDS_READY]: {                // NEW STATE
        HAND_READY: DuelState.HANDS_READY,    // Keep tracking hand states
        BOTH_HANDS_READY: DuelState.COUNTDOWN, // Start countdown when confirmed
        PLAYER_LEFT: DuelState.LOBBY,
        LEAVE: DuelState.IDLE,
    },
    [DuelState.COUNTDOWN]: {
        COUNTDOWN_COMPLETE: DuelState.WAIT_DRAW,
        PLAYER_LEFT: DuelState.LOBBY,
        LEAVE: DuelState.IDLE,
    },
    [DuelState.WAIT_DRAW]: {
        WAIT_COMPLETE: DuelState.DRAW,
        EARLY_SHOT: DuelState.RESOLVE,
        PLAYER_LEFT: DuelState.LOBBY,
        LEAVE: DuelState.IDLE,
    },
    [DuelState.DRAW]: {
        PLAYER_SHOT: DuelState.DRAW,  // Stay in DRAW until both shoot
        RESULT: DuelState.RESOLVE,
        PLAYER_LEFT: DuelState.LOBBY,
        LEAVE: DuelState.IDLE,
    },
    [DuelState.RESOLVE]: {
        RESULT: DuelState.RESULT,
        LEAVE: DuelState.IDLE,
    },
    [DuelState.RESULT]: {
        RESET: DuelState.READY,
        LEAVE: DuelState.IDLE,
    },
};

export function duelReducer(
    context: DuelContext,
    action: DuelAction
): DuelContext {
    const currentState = context.state;

    // Special case: HAND_READY updates hand state without transition
    if (action.type === 'HAND_READY') {
        const isMe = action.playerId === context.playerId;
        return {
            ...context,
            myHandReady: isMe ? action.isReady : context.myHandReady,
            opponentHandReady: !isMe ? action.isReady : context.opponentHandReady,
        };
    }

    // Special case: PLAYER_SHOT can repeat in DRAW state
    if (action.type === 'PLAYER_SHOT' && currentState === DuelState.DRAW) {
        const isMe = action.playerId === context.playerId;
        return {
            ...context,
            myReactionTime: isMe ? action.reactionTime : context.myReactionTime,
            opponentReactionTime: !isMe ? action.reactionTime : context.opponentReactionTime,
        };
    }

    const nextState = transitions[currentState]?.[action.type];

    // If no valid transition, return unchanged context
    if (!nextState) {
        console.warn(`Invalid transition: ${currentState} + ${action.type}`);
        return context;
    }

    // Create new context with state update
    let newContext: DuelContext = {
        ...context,
        state: nextState,
    };

    // Handle action-specific updates
    switch (action.type) {
        case 'CREATE_ROOM':
        case 'JOIN_ROOM':
            // Room code and player ID will be set by server response
            break;

        case 'ROOM_INFO':
            newContext.roomCode = action.roomCode;
            newContext.playerId = action.playerId;
            newContext.players = action.players;
            break;

        case 'PLAYER_JOINED':
            newContext.players = [...context.players, action.player];
            break;

        case 'PLAYER_LEFT':
            newContext.players = context.players.filter(p => p.id !== action.playerId);
            newContext.opponentHandReady = false;
            break;

        case 'BOTH_HANDS_READY':
            // Both players showing palms - ready to start countdown
            break;

        case 'WAIT_COMPLETE':
            newContext.drawTimestamp = action.drawTime;
            break;

        case 'EARLY_SHOT':
            newContext.isEarlyShot = true;
            break;

        case 'RESULT':
            newContext.result = action.result;
            break;

        case 'RESET':
            newContext = {
                ...createDuelContext(),
                roomCode: context.roomCode,
                playerId: context.playerId,
                players: context.players,
                state: DuelState.READY,
            };
            break;

        case 'LEAVE':
            newContext = createDuelContext();
            break;
    }

    console.log(`FSM: ${currentState} -> ${nextState} (${action.type})`);
    return newContext;
}
