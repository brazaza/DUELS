// ============================================
// useWebSocket Hook
// ============================================

import { useState, useCallback, useRef, useEffect } from 'react';
import {
    ClientMessage,
    ServerMessage,
    MessageType,
    RoomCreatedMessage,
    RoomJoinedMessage,
    Player,
} from '@duels/shared';

export interface UseWebSocketResult {
    isConnected: boolean;
    roomCode: string | null;
    playerId: string | null;
    players: Player[];
    error: string | null;
    connect: () => void;
    disconnect: () => void;
    send: (message: ClientMessage) => void;
    createRoom: (playerName: string) => void;
    joinRoom: (roomCode: string, playerName: string) => void;
    setReady: () => void;
    sendShot: (reactionTime: number) => void;
    leaveRoom: () => void;
    onMessage: (handler: (message: ServerMessage) => void) => void;
}

// Dynamic WS URL - use same hostname as the page (for LAN access)
// Note: We always use ws:// because our server doesn't have SSL
// Mixed content (HTTPS page + WS) works in most browsers for localhost/LAN
const getWsUrl = (): string => {
    if (import.meta.env.VITE_WS_URL) {
        return import.meta.env.VITE_WS_URL;
    }
    const host = window.location.hostname || 'localhost';
    return `ws://${host}:3001`;
};

export function useWebSocket(): UseWebSocketResult {
    const [isConnected, setIsConnected] = useState(false);
    const [roomCode, setRoomCode] = useState<string | null>(null);
    const [playerId, setPlayerId] = useState<string | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [error, setError] = useState<string | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const messageHandlerRef = useRef<((message: ServerMessage) => void) | null>(null);
    const reconnectTimeoutRef = useRef<number | null>(null);

    const handleMessage = useCallback((event: MessageEvent) => {
        try {
            const message: ServerMessage = JSON.parse(event.data);
            console.log('WS received:', message.type);

            switch (message.type) {
                case MessageType.ROOM_CREATED: {
                    const msg = message as RoomCreatedMessage;
                    setRoomCode(msg.roomCode);
                    setPlayerId(msg.playerId);
                    break;
                }

                case MessageType.ROOM_JOINED: {
                    const msg = message as RoomJoinedMessage;
                    setRoomCode(msg.roomCode);
                    setPlayerId(msg.playerId);
                    setPlayers(msg.players);
                    break;
                }

                case MessageType.PLAYER_JOINED: {
                    setPlayers(prev => [...prev, message.player]);
                    break;
                }

                case MessageType.PLAYER_LEFT: {
                    setPlayers(prev => prev.filter(p => p.id !== message.playerId));
                    break;
                }

                case MessageType.ERROR: {
                    setError(message.message);
                    break;
                }
            }

            // Forward to custom handler
            if (messageHandlerRef.current) {
                messageHandlerRef.current(message);
            }
        } catch (e) {
            console.error('Failed to parse message:', e);
        }
    }, []);

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        try {
            const ws = new WebSocket(getWsUrl());

            ws.onopen = () => {
                console.log('WebSocket connected');
                setIsConnected(true);
                setError(null);
            };

            ws.onclose = () => {
                console.log('WebSocket disconnected');
                setIsConnected(false);

                // Auto-reconnect after 3 seconds
                if (!reconnectTimeoutRef.current) {
                    reconnectTimeoutRef.current = window.setTimeout(() => {
                        reconnectTimeoutRef.current = null;
                        connect();
                    }, 3000);
                }
            };

            ws.onerror = () => {
                setError('Connection error');
            };

            ws.onmessage = handleMessage;

            wsRef.current = ws;
        } catch (e) {
            setError('Failed to connect');
        }
    }, [handleMessage]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        wsRef.current?.close();
        wsRef.current = null;
        setIsConnected(false);
        setRoomCode(null);
        setPlayerId(null);
        setPlayers([]);
    }, []);

    const send = useCallback((message: ClientMessage) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
        }
    }, []);

    const createRoom = useCallback((playerName: string) => {
        send({ type: MessageType.CREATE_ROOM, playerName });
    }, [send]);

    const joinRoom = useCallback((code: string, playerName: string) => {
        send({ type: MessageType.JOIN_ROOM, roomCode: code, playerName });
    }, [send]);

    const setReady = useCallback(() => {
        if (roomCode) {
            send({ type: MessageType.PLAYER_READY, roomCode });
        }
    }, [send, roomCode]);

    const sendShot = useCallback((reactionTime: number) => {
        if (roomCode) {
            send({ type: MessageType.PLAYER_SHOT, roomCode, reactionTime });
        }
    }, [send, roomCode]);

    const leaveRoom = useCallback(() => {
        if (roomCode) {
            send({ type: MessageType.LEAVE_ROOM, roomCode });
            setRoomCode(null);
            setPlayers([]);
        }
    }, [send, roomCode]);

    const onMessage = useCallback((handler: (message: ServerMessage) => void) => {
        messageHandlerRef.current = handler;
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            disconnect();
        };
    }, [disconnect]);

    return {
        isConnected,
        roomCode,
        playerId,
        players,
        error,
        connect,
        disconnect,
        send,
        createRoom,
        joinRoom,
        setReady,
        sendShot,
        leaveRoom,
        onMessage,
    };
}
