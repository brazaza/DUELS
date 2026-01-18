// ============================================
// useDuelGame Hook
// ============================================

import { useReducer, useEffect, useCallback, useRef } from 'react';
import {
    DuelState,
    GestureType,
    MessageType,
    ServerMessage,
    RoomCreatedMessage,
    PlayerHandReadyMessage,
    GameStateUpdateMessage,
    CountdownStartMessage,
    DrawSignalMessage,
    GameResultMessage,
} from '@duels/shared';
import { duelReducer, createDuelContext, DuelAction } from '../fsm/duelFSM';
import { useWebSocket } from './useWebSocket';

export function useDuelGame(ws: ReturnType<typeof useWebSocket>) {
    const [context, dispatch] = useReducer(duelReducer, createDuelContext());
    const audioContextRef = useRef<AudioContext | null>(null);

    // Initialize audio
    useEffect(() => {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        return () => {
            audioContextRef.current?.close();
        };
    }, []);

    const playSound = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine') => {
        if (!audioContextRef.current) return;

        const osc = audioContextRef.current.createOscillator();
        const gain = audioContextRef.current.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime);

        gain.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration);

        osc.connect(gain);
        gain.connect(audioContextRef.current.destination);

        osc.start();
        osc.stop(audioContextRef.current.currentTime + duration);
    }, []);

    // Handle WebSocket messages
    useEffect(() => {
        // Sync initial state if we missed the message
        if (ws.roomCode && !context.roomCode && ws.playerId) {
            dispatch({
                type: 'ROOM_INFO',
                roomCode: ws.roomCode,
                playerId: ws.playerId,
                players: ws.players
            });
        }

        ws.onMessage((message: ServerMessage) => {
            switch (message.type) {
                case MessageType.ROOM_CREATED:
                    // Host created room
                    dispatch({
                        type: 'ROOM_INFO',
                        roomCode: message.roomCode,
                        playerId: message.playerId,
                        players: [{ id: message.playerId, name: 'You', isReady: false, handReady: false }]
                    });
                    break;

                case MessageType.ROOM_JOINED:
                    dispatch({
                        type: 'ROOM_INFO',
                        roomCode: message.roomCode,
                        playerId: message.playerId,
                        players: message.players
                    });
                    break;

                case MessageType.PLAYER_JOINED:
                    dispatch({ type: 'PLAYER_JOINED', player: message.player });
                    break;

                case MessageType.PLAYER_LEFT:
                    dispatch({ type: 'PLAYER_LEFT', playerId: message.playerId });
                    break;

                case MessageType.GAME_STATE_UPDATE: {
                    const msg = message as GameStateUpdateMessage;
                    // Sync state from server
                    // We might need a more robust sync here, but for now trusting server state
                    if (msg.state === DuelState.READY) {
                        dispatch({ type: 'BOTH_READY' });
                    } else if (msg.state === DuelState.HANDS_READY) {
                        dispatch({ type: 'BOTH_HANDS_READY' });
                    }
                    break;
                }

                case MessageType.PLAYER_HAND_READY: {
                    const msg = message as PlayerHandReadyMessage;
                    dispatch({
                        type: 'HAND_READY',
                        playerId: msg.playerId,
                        isReady: msg.isReady
                    });
                    break;
                }

                case MessageType.COUNTDOWN_START: {
                    const msg = message as CountdownStartMessage;
                    dispatch({ type: 'BOTH_HANDS_READY' }); // Ensure we are in correct state

                    // Play countdown sounds
                    let count = 3;
                    const interval = setInterval(() => {
                        if (count > 0) {
                            playSound(440, 0.1); // Beep
                            count--;
                        } else {
                            clearInterval(interval);
                        }
                    }, msg.duration / 3);

                    // Dispatch completion after duration
                    setTimeout(() => {
                        dispatch({ type: 'COUNTDOWN_COMPLETE' });
                    }, msg.duration);
                    break;
                }

                case MessageType.DRAW_SIGNAL: {
                    const msg = message as DrawSignalMessage;
                    playSound(880, 0.3, 'square'); // DRAW sound!
                    dispatch({ type: 'WAIT_COMPLETE', drawTime: msg.drawTime });
                    break;
                }

                case MessageType.GAME_RESULT: {
                    const msg = message as GameResultMessage;
                    dispatch({ type: 'RESULT', result: msg.result });
                    break;
                }
            }
        });
    }, [ws, playSound, context.roomCode]);

    // Handle local gestures
    const handleGesture = useCallback((gesture: GestureType) => {
        if (!context.playerId || !context.roomCode) return;

        // Handle Hand Ready (Palm Open)
        if (context.state === DuelState.READY || context.state === DuelState.HANDS_READY) {
            const isHandReady = gesture === GestureType.PALM_OPEN;

            // Only send if state changed
            if (isHandReady !== context.myHandReady) {
                ws.send({
                    type: MessageType.HAND_READY,
                    roomCode: context.roomCode,
                    isReady: isHandReady
                });
                // Optimistic update
                dispatch({
                    type: 'HAND_READY',
                    playerId: context.playerId,
                    isReady: isHandReady
                });
            }
        }

        // Handle Shot
        if (gesture === GestureType.SHOT && context.state === DuelState.DRAW) {
            if (context.drawTimestamp) {
                const reactionTime = Date.now() - context.drawTimestamp; // Approximate, server will validate
                ws.sendShot(reactionTime);
                dispatch({
                    type: 'PLAYER_SHOT',
                    playerId: context.playerId,
                    reactionTime
                });
                playSound(150, 0.1, 'sawtooth'); // Shot sound
            }
        }

        // Handle Early Shot
        if (gesture === GestureType.SHOT && context.state === DuelState.WAIT_DRAW) {
            ws.sendShot(-1); // Send early shot
            dispatch({ type: 'EARLY_SHOT' });
        }
    }, [context.state, context.playerId, context.roomCode, context.myHandReady, context.drawTimestamp, ws, playSound]);

    const reset = useCallback(() => {
        dispatch({ type: 'RESET' });
    }, []);

    return {
        context,
        dispatch,
        handleGesture,
        reset,
    };
}
