// ============================================
// useHandTracking Hook
// ============================================

import { useState, useCallback, useRef, useEffect } from 'react';
import { HandTracker, GestureCallback } from '../modules/handTracker';
import { GestureType, GestureResult } from '@duels/shared';

export interface UseHandTrackingResult {
    isInitialized: boolean;
    isTracking: boolean;
    gesture: GestureResult;
    error: string | null;
    initialize: () => Promise<void>;
    start: (videoElement: HTMLVideoElement) => void;
    stop: () => void;
    resetGesture: () => void;
}

export function useHandTracking(): UseHandTrackingResult {
    const [isInitialized, setIsInitialized] = useState(false);
    const [isTracking, setIsTracking] = useState(false);
    const [gesture, setGesture] = useState<GestureResult>({
        gesture: GestureType.NONE,
        confidence: 0
    });
    const [error, setError] = useState<string | null>(null);

    const trackerRef = useRef<HandTracker | null>(null);
    const shotDisplayTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        trackerRef.current = new HandTracker();

        return () => {
            trackerRef.current?.stop();
        };
    }, []);

    const initialize = useCallback(async () => {
        if (!trackerRef.current) return;

        try {
            await trackerRef.current.initialize();
            setIsInitialized(true);
        } catch (err) {
            setError('Failed to initialize hand tracking');
            console.error(err);
        }
    }, []);

    const handleGesture: GestureCallback = useCallback((result) => {
        // Clear any pending timeout
        if (shotDisplayTimeoutRef.current) {
            clearTimeout(shotDisplayTimeoutRef.current);
            shotDisplayTimeoutRef.current = null;
        }

        // If SHOT detected, show it and keep it visible for 500ms
        if (result.gesture === GestureType.SHOT) {
            setGesture(result);
            shotDisplayTimeoutRef.current = window.setTimeout(() => {
                setGesture({ gesture: GestureType.NONE, confidence: 0 });
                shotDisplayTimeoutRef.current = null;
            }, 500);
        } else {
            setGesture(result);
        }
    }, []);

    const start = useCallback((videoElement: HTMLVideoElement) => {
        if (!trackerRef.current || !isInitialized) {
            console.warn('HandTracker not initialized');
            return;
        }

        trackerRef.current.start(videoElement, handleGesture);
        setIsTracking(true);
    }, [isInitialized, handleGesture]);

    const stop = useCallback(() => {
        trackerRef.current?.stop();
        setIsTracking(false);
        setGesture({ gesture: GestureType.NONE, confidence: 0 });
    }, []);

    const resetGesture = useCallback(() => {
        trackerRef.current?.resetGestureState();
        setGesture({ gesture: GestureType.NONE, confidence: 0 });
    }, []);

    return {
        isInitialized,
        isTracking,
        gesture,
        error,
        initialize,
        start,
        stop,
        resetGesture,
    };
}
