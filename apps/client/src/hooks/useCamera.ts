// ============================================
// useCamera Hook
// ============================================

import { useState, useCallback, useRef, useEffect } from 'react';
import { CameraManager, CameraConfig, CameraError } from '../modules/camera';

export interface UseCameraResult {
    isActive: boolean;
    isLoading: boolean;
    error: string | null;
    stream: MediaStream | null;
    videoRef: React.RefObject<HTMLVideoElement>;
    start: () => Promise<void>;
    stop: () => void;
    switchCamera: () => Promise<void>;
    clearError: () => void;
}

export function useCamera(config?: Partial<CameraConfig>): UseCameraResult {
    const [isActive, setIsActive] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const cameraRef = useRef<CameraManager | null>(null);

    // Initialize camera manager
    useEffect(() => {
        cameraRef.current = new CameraManager(config);

        return () => {
            cameraRef.current?.stop();
        };
    }, []);

    const start = useCallback(async () => {
        if (!cameraRef.current || !videoRef.current) return;

        setIsLoading(true);
        setError(null); // Clear any previous error

        try {
            await cameraRef.current.start(videoRef.current);
            setStream(cameraRef.current.getStream());
            setIsActive(true);
            setError(null); // Ensure error is cleared on success
        } catch (err) {
            const message = err instanceof CameraError
                ? err.message
                : 'Failed to access camera';
            setError(message);
            setIsActive(false);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const stop = useCallback(() => {
        cameraRef.current?.stop();
        setIsActive(false);
        setStream(null);
    }, []);

    const switchCamera = useCallback(async () => {
        if (!cameraRef.current) return;

        setIsLoading(true);
        setError(null);
        try {
            await cameraRef.current.switchCamera();
        } catch (err) {
            setError('Failed to switch camera');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        isActive,
        isLoading,
        error,
        stream,
        videoRef: videoRef as React.RefObject<HTMLVideoElement>,
        start,
        stop,
        switchCamera,
        clearError,
    };
}
