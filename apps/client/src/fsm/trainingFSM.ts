// ============================================
// Training Mode FSM
// ============================================

import { TrainingState, CONFIG, getRandomDrawDelay } from '@duels/shared';

export type TrainingAction =
    | { type: 'START' }
    | { type: 'READY' }
    | { type: 'COUNTDOWN_TICK'; value: number }
    | { type: 'COUNTDOWN_COMPLETE' }
    | { type: 'WAIT_COMPLETE' }
    | { type: 'SHOT'; reactionTime: number }
    | { type: 'EARLY_SHOT' }
    | { type: 'RESET' };

export interface TrainingContext {
    state: TrainingState;
    countdown: number;
    countdownValue: number;
    drawDelay: number;
    reactionTime: number | null;
    bestTime: number | null;
    isEarlyShot: boolean;
    drawTimestamp: number | null;
}

export function createTrainingContext(): TrainingContext {
    return {
        state: TrainingState.IDLE,
        countdown: CONFIG.COUNTDOWN_DURATION,
        countdownValue: 3,
        drawDelay: getRandomDrawDelay(),
        reactionTime: null,
        bestTime: null,
        isEarlyShot: false,
        drawTimestamp: null,
    };
}

// State transition table
const transitions: Record<TrainingState, Partial<Record<TrainingAction['type'], TrainingState>>> = {
    [TrainingState.IDLE]: {
        START: TrainingState.READY,
    },
    [TrainingState.READY]: {
        READY: TrainingState.COUNTDOWN,
        RESET: TrainingState.IDLE,
    },
    [TrainingState.COUNTDOWN]: {
        COUNTDOWN_COMPLETE: TrainingState.WAIT_DRAW,
        RESET: TrainingState.IDLE,
    },
    [TrainingState.WAIT_DRAW]: {
        WAIT_COMPLETE: TrainingState.DRAW,
        EARLY_SHOT: TrainingState.RESULT,
        RESET: TrainingState.IDLE,
    },
    [TrainingState.DRAW]: {
        SHOT: TrainingState.RESULT,
        RESET: TrainingState.IDLE,
    },
    [TrainingState.RESULT]: {
        RESET: TrainingState.IDLE,
        START: TrainingState.READY,
    },
};

export function trainingReducer(
    context: TrainingContext,
    action: TrainingAction
): TrainingContext {
    // Handle COUNTDOWN_TICK specially - it doesn't change state, just updates value
    if (action.type === 'COUNTDOWN_TICK' && 'value' in action) {
        return {
            ...context,
            countdownValue: action.value,
        };
    }

    const currentState = context.state;
    const nextState = transitions[currentState]?.[action.type];

    // If no valid transition, return unchanged context
    if (!nextState) {
        console.warn(`Invalid transition: ${currentState} + ${action.type}`);
        return context;
    }

    // Create new context with state update
    let newContext: TrainingContext = {
        ...context,
        state: nextState,
    };

    // Handle action-specific updates
    switch (action.type) {
        case 'START':
            newContext = {
                ...newContext,
                countdown: CONFIG.COUNTDOWN_DURATION,
                countdownValue: 3,
                drawDelay: getRandomDrawDelay(),
                reactionTime: null,
                isEarlyShot: false,
                drawTimestamp: null,
            };
            break;

        case 'COUNTDOWN_COMPLETE':
            // Transition to waiting for draw
            break;

        case 'WAIT_COMPLETE':
            // DRAW! Record the timestamp
            newContext.drawTimestamp = performance.now();
            break;

        case 'SHOT':
            if ('reactionTime' in action) {
                newContext.reactionTime = action.reactionTime;
                // Update best time if this is a valid shot
                if (context.bestTime === null || action.reactionTime < context.bestTime) {
                    newContext.bestTime = action.reactionTime;
                }
            }
            break;

        case 'EARLY_SHOT':
            newContext.isEarlyShot = true;
            newContext.reactionTime = null;
            break;

        case 'RESET':
            newContext = createTrainingContext();
            if (context.bestTime !== null) {
                newContext.bestTime = context.bestTime;
            }
            break;
    }

    console.log(`FSM: ${currentState} -> ${nextState} (${action.type})`);
    return newContext;
}
