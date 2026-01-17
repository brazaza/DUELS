// ============================================
// useTrainingGame Hook
// ============================================

import { useReducer, useCallback, useRef, useEffect } from 'react';
import { TrainingState, GestureType } from '@duels/shared';
import {
    trainingReducer,
    createTrainingContext,
    TrainingContext,
    TrainingAction
} from '../fsm/trainingFSM';
import { getSoundManager, SoundType } from '../modules/soundManager';

export interface UseTrainingGameResult {
    context: TrainingContext;
    start: () => void;
    reset: () => void;
    handleGesture: (gesture: GestureType) => void;
}

export function useTrainingGame(): UseTrainingGameResult {
    const [context, dispatch] = useReducer(trainingReducer, null, createTrainingContext);

    const countdownIntervalRef = useRef<number | null>(null);
    const waitTimeoutRef = useRef<number | null>(null);
    const drawTimestampRef = useRef<number | null>(null);
    const lastStateRef = useRef<TrainingState | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            if (waitTimeoutRef.current) clearTimeout(waitTimeoutRef.current);
        };
    }, []);

    // Handle state changes - only trigger on actual state changes
    useEffect(() => {
        // Skip if state hasn't changed
        if (lastStateRef.current === context.state) return;
        lastStateRef.current = context.state;

        const soundManager = getSoundManager();

        switch (context.state) {
            case TrainingState.READY:
                // Immediately transition to countdown
                dispatch({ type: 'READY' });
                break;

            case TrainingState.COUNTDOWN:
                // Start countdown (3, 2, 1)
                let count = 3;
                dispatch({ type: 'COUNTDOWN_TICK', value: count });
                soundManager.playCountdown();

                countdownIntervalRef.current = window.setInterval(() => {
                    count--;
                    dispatch({ type: 'COUNTDOWN_TICK', value: count });
                    if (count > 0) {
                        soundManager.playCountdown();
                    } else {
                        if (countdownIntervalRef.current) {
                            clearInterval(countdownIntervalRef.current);
                            countdownIntervalRef.current = null;
                        }
                        dispatch({ type: 'COUNTDOWN_COMPLETE' });
                    }
                }, 1000);
                break;

            case TrainingState.WAIT_DRAW:
                // Wait random time before BANG signal
                waitTimeoutRef.current = window.setTimeout(() => {
                    dispatch({ type: 'WAIT_COMPLETE' });
                }, context.drawDelay);
                break;

            case TrainingState.DRAW:
                // BANG! Record timestamp
                drawTimestampRef.current = performance.now();
                soundManager.playDraw();
                break;

            case TrainingState.RESULT:
                // Play result sound
                if (context.isEarlyShot) {
                    soundManager.play(SoundType.LOSE);
                } else if (context.reactionTime !== null) {
                    soundManager.play(SoundType.WIN);
                }
                break;
        }
    }, [context.state, context.drawDelay]);

    const start = useCallback(() => {
        dispatch({ type: 'START' });
    }, []);

    const reset = useCallback(() => {
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }
        if (waitTimeoutRef.current) {
            clearTimeout(waitTimeoutRef.current);
            waitTimeoutRef.current = null;
        }
        dispatch({ type: 'RESET' });
    }, []);

    const handleGesture = useCallback((gesture: GestureType) => {
        if (gesture !== GestureType.SHOT) return;

        const soundManager = getSoundManager();
        soundManager.playShot();

        // Check current state
        if (context.state === TrainingState.WAIT_DRAW) {
            // Early shot!
            if (waitTimeoutRef.current) {
                clearTimeout(waitTimeoutRef.current);
                waitTimeoutRef.current = null;
            }
            dispatch({ type: 'EARLY_SHOT' });
        } else if (context.state === TrainingState.DRAW && drawTimestampRef.current) {
            // Valid shot - calculate reaction time
            const reactionTime = performance.now() - drawTimestampRef.current;
            dispatch({ type: 'SHOT', reactionTime: Math.round(reactionTime) });
        }
    }, [context.state]);

    return {
        context,
        start,
        reset,
        handleGesture,
    };
}
