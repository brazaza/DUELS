// ============================================
// useWebRTC Hook
// ============================================

import { useState, useCallback, useRef, useEffect } from 'react';
import { WebRTCManager } from '../modules/webrtc';
import { MessageType, ServerMessage } from '@duels/shared';
import { useWebSocket } from './useWebSocket';

export interface UseWebRTCResult {
    isConnected: boolean;
    remoteStream: MediaStream | null;
    initiate: (localStream: MediaStream, targetPlayerId: string) => Promise<void>;
    setLocalStream: (stream: MediaStream) => void;
    close: () => void;
}

export function useWebRTC(
    ws: ReturnType<typeof useWebSocket>,
    roomCode: string | null
): UseWebRTCResult {
    const [isConnected, setIsConnected] = useState(false);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

    const managerRef = useRef<WebRTCManager | null>(null);
    const targetPlayerIdRef = useRef<string | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);

    // Handle incoming WebRTC signaling messages
    useEffect(() => {
        if (!ws.isConnected || !roomCode) return;

        const handleMessage = async (message: ServerMessage) => {
            if (!managerRef.current && message.type !== MessageType.RTC_OFFER) return;

            switch (message.type) {
                case MessageType.RTC_OFFER: {
                    // Received offer - we need to initialize and respond
                    if (!localStreamRef.current) {
                        console.warn('Cannot handle RTC offer: no local stream');
                        return;
                    }

                    // Initialize manager if not already done
                    if (!managerRef.current) {
                        managerRef.current = new WebRTCManager();
                        await managerRef.current.initialize(localStreamRef.current, (stream) => {
                            setRemoteStream(stream);
                            setIsConnected(true);
                        });

                        // Set up signaling callback
                        managerRef.current.setSignalingCallback((type, data) => {
                            if (!roomCode || !message.targetPlayerId) return;

                            if (type === 'answer') {
                                ws.send({
                                    type: MessageType.RTC_ANSWER,
                                    roomCode,
                                    targetPlayerId: message.targetPlayerId,
                                    answer: data as RTCSessionDescriptionInit,
                                });
                            } else if (type === 'ice') {
                                ws.send({
                                    type: MessageType.RTC_ICE_CANDIDATE,
                                    roomCode,
                                    targetPlayerId: message.targetPlayerId,
                                    candidate: data as RTCIceCandidateInit,
                                });
                            }
                        });
                    }

                    targetPlayerIdRef.current = message.targetPlayerId;
                    await managerRef.current.handleOffer(message.offer);
                    break;
                }

                case MessageType.RTC_ANSWER: {
                    if (managerRef.current) {
                        await managerRef.current.handleAnswer(message.answer);
                    }
                    break;
                }

                case MessageType.RTC_ICE_CANDIDATE: {
                    if (managerRef.current) {
                        await managerRef.current.handleIceCandidate(message.candidate);
                    }
                    break;
                }
            }
        };

        ws.onMessage(handleMessage);
    }, [ws, roomCode]);

    // Initiate WebRTC connection (caller side)
    const initiate = useCallback(async (localStream: MediaStream, targetPlayerId: string) => {
        if (!roomCode) {
            console.warn('Cannot initiate WebRTC: no room code');
            return;
        }

        localStreamRef.current = localStream;
        targetPlayerIdRef.current = targetPlayerId;

        // Create new manager
        managerRef.current = new WebRTCManager();
        await managerRef.current.initialize(localStream, (stream) => {
            setRemoteStream(stream);
            setIsConnected(true);
        });

        // Set up signaling callback
        managerRef.current.setSignalingCallback((type, data) => {
            if (!roomCode || !targetPlayerId) return;

            if (type === 'offer') {
                ws.send({
                    type: MessageType.RTC_OFFER,
                    roomCode,
                    targetPlayerId,
                    offer: data as RTCSessionDescriptionInit,
                });
            } else if (type === 'ice') {
                ws.send({
                    type: MessageType.RTC_ICE_CANDIDATE,
                    roomCode,
                    targetPlayerId,
                    candidate: data as RTCIceCandidateInit,
                });
            }
        });

        // Create and send offer
        await managerRef.current.createOffer();
    }, [ws, roomCode]);

    // Close connection
    const close = useCallback(() => {
        if (managerRef.current) {
            managerRef.current.close();
            managerRef.current = null;
        }
        setRemoteStream(null);
        setIsConnected(false);
        targetPlayerIdRef.current = null;
        localStreamRef.current = null;
    }, []);

    // Store local stream reference for incoming offers
    const setLocalStream = useCallback((stream: MediaStream) => {
        localStreamRef.current = stream;
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            close();
        };
    }, [close]);

    return {
        isConnected,
        remoteStream,
        initiate,
        setLocalStream,
        close,
    };
}
