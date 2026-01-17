// ============================================
// Game Handler
// ============================================

import { WebSocket } from 'ws';
import {
    DuelState,
    GameResult,
    CONFIG,
    getRandomDrawDelay,
    MessageType,
    ServerMessage,
    CountdownStartMessage,
    DrawSignalMessage,
    GameResultMessage,
    GameStateUpdateMessage,
    PlayerHandReadyMessage,
} from '@duels/shared';
import { RoomManager } from './roomManager.js';

export class GameHandler {
    private countdownTimers: Map<string, NodeJS.Timeout> = new Map();
    private drawTimers: Map<string, NodeJS.Timeout> = new Map();
    private falseStarters: Map<string, Set<string>> = new Map(); // roomCode -> Set of playerIds who false started

    constructor(
        private roomManager: RoomManager,
        private broadcast: (roomCode: string, message: ServerMessage, excludePlayerId?: string) => void
    ) { }

    handlePlayerReady(roomCode: string, playerId: string): void {
        const room = this.roomManager.setPlayerReady(playerId, true);
        if (!room) return;

        // Notify all players about ready state
        this.broadcast(roomCode, {
            type: MessageType.GAME_STATE_UPDATE,
            state: room.state,
        } as GameStateUpdateMessage);

        // Check if both players clicked ready button
        if (this.roomManager.areBothPlayersReady(room)) {
            // Transition to READY state - waiting for hands
            this.roomManager.updateRoomState(roomCode, DuelState.READY);
            this.broadcast(roomCode, {
                type: MessageType.GAME_STATE_UPDATE,
                state: DuelState.READY,
            } as GameStateUpdateMessage);
        }
    }

    // NEW: Handle player hand ready (showing palm)
    handleHandReady(roomCode: string, playerId: string, isReady: boolean): void {
        const room = this.roomManager.setPlayerHandReady(playerId, isReady);
        if (!room) return;

        // Notify other player about hand state
        this.broadcast(roomCode, {
            type: MessageType.PLAYER_HAND_READY,
            playerId,
            isReady,
        } as PlayerHandReadyMessage);

        // Check if both players show palms
        if (room.state === DuelState.READY && this.roomManager.areBothHandsReady(room)) {
            // Both hands ready - transition to HANDS_READY briefly, then start countdown
            this.roomManager.updateRoomState(roomCode, DuelState.HANDS_READY);
            this.broadcast(roomCode, {
                type: MessageType.GAME_STATE_UPDATE,
                state: DuelState.HANDS_READY,
            } as GameStateUpdateMessage);

            // Small delay before countdown starts (let players see they're both ready)
            setTimeout(() => {
                this.startCountdown(roomCode);
            }, 500);
        }
    }

    private startCountdown(roomCode: string): void {
        const room = this.roomManager.updateRoomState(roomCode, DuelState.COUNTDOWN);
        if (!room) return;

        // Send countdown start
        this.broadcast(roomCode, {
            type: MessageType.COUNTDOWN_START,
            duration: CONFIG.COUNTDOWN_DURATION,
        } as CountdownStartMessage);

        // Start countdown timer
        const timer = setTimeout(() => {
            this.countdownTimers.delete(roomCode);
            this.startWaitDraw(roomCode);
        }, CONFIG.COUNTDOWN_DURATION);

        this.countdownTimers.set(roomCode, timer);
    }

    private startWaitDraw(roomCode: string): void {
        const room = this.roomManager.updateRoomState(roomCode, DuelState.WAIT_DRAW);
        if (!room) return;

        this.broadcast(roomCode, {
            type: MessageType.GAME_STATE_UPDATE,
            state: DuelState.WAIT_DRAW,
        } as GameStateUpdateMessage);

        // Random delay before DRAW
        const delay = getRandomDrawDelay();

        const timer = setTimeout(() => {
            this.drawTimers.delete(roomCode);
            this.triggerDraw(roomCode);
        }, delay);

        this.drawTimers.set(roomCode, timer);
    }

    private triggerDraw(roomCode: string): void {
        const drawTime = Date.now();
        const room = this.roomManager.setDrawTime(roomCode, drawTime);
        if (!room) return;

        this.roomManager.updateRoomState(roomCode, DuelState.DRAW);

        // Send DRAW signal with server timestamp
        this.broadcast(roomCode, {
            type: MessageType.DRAW_SIGNAL,
            drawTime,
        } as DrawSignalMessage);
    }

    handlePlayerShot(roomCode: string, playerId: string, reactionTime: number): void {
        const room = this.roomManager.getRoom(roomCode);
        if (!room) return;

        // Check if this player already false started - ignore their shots
        const falseStarters = this.falseStarters.get(roomCode);
        if (falseStarters?.has(playerId)) {
            return; // Player who false started can't shoot anymore
        }

        // Check if early shot (before DRAW)
        if (room.state === DuelState.WAIT_DRAW) {
            this.handleEarlyShot(roomCode, playerId);
            return;
        }

        // Record the shot
        this.roomManager.recordShot(playerId, reactionTime);

        // If opponent false started, this player wins immediately
        if (falseStarters && falseStarters.size > 0) {
            this.resolveGameWithFalseStart(roomCode);
            return;
        }

        // Check if both players have shot
        const updatedRoom = this.roomManager.getRoom(roomCode);
        if (updatedRoom && this.roomManager.haveBothPlayersShot(updatedRoom)) {
            this.resolveGame(roomCode);
        }
    }

    private handleEarlyShot(roomCode: string, playerId: string): void {
        // Track this player as false starter
        if (!this.falseStarters.has(roomCode)) {
            this.falseStarters.set(roomCode, new Set());
        }
        this.falseStarters.get(roomCode)!.add(playerId);

        const room = this.roomManager.getRoom(roomCode);
        if (!room) return;

        // Notify about false start
        this.broadcast(roomCode, {
            type: MessageType.GAME_STATE_UPDATE,
            state: room.state,
            falseStartPlayerId: playerId,
        } as GameStateUpdateMessage & { falseStartPlayerId: string });

        // Check if BOTH players false started = draw
        const falseStarters = this.falseStarters.get(roomCode)!;
        if (falseStarters.size >= 2) {
            // Cancel draw timer
            const timer = this.drawTimers.get(roomCode);
            if (timer) {
                clearTimeout(timer);
                this.drawTimers.delete(roomCode);
            }

            // Both false started = draw
            const result: GameResult = {
                winnerId: null, // Draw
                player1: {
                    id: room.players[0].id,
                    reactionTime: -1, // -1 indicates early shot
                },
                player2: {
                    id: room.players[1].id,
                    reactionTime: -1,
                },
            };
            this.sendResult(roomCode, result);
        }
        // Otherwise, game continues - opponent can shoot anytime after DRAW to win
    }

    private resolveGameWithFalseStart(roomCode: string): void {
        // Cancel draw timer if still running
        const timer = this.drawTimers.get(roomCode);
        if (timer) {
            clearTimeout(timer);
            this.drawTimers.delete(roomCode);
        }

        const room = this.roomManager.getRoom(roomCode);
        if (!room) return;

        const falseStarters = this.falseStarters.get(roomCode);
        if (!falseStarters) return;

        // Find the winner (player who didn't false start and shot)
        const winner = room.players.find(p => !falseStarters.has(p.id) && p.shotTimestamp !== undefined);
        const loser = room.players.find(p => falseStarters.has(p.id));

        if (!winner) return;

        const result: GameResult = {
            winnerId: winner.id,
            player1: {
                id: room.players[0].id,
                reactionTime: falseStarters.has(room.players[0].id) ? -1 : (room.players[0].shotTimestamp ?? null),
            },
            player2: {
                id: room.players[1].id,
                reactionTime: falseStarters.has(room.players[1].id) ? -1 : (room.players[1].shotTimestamp ?? null),
            },
        };

        this.sendResult(roomCode, result);
    }

    private resolveGame(roomCode: string): void {
        const room = this.roomManager.updateRoomState(roomCode, DuelState.RESOLVE);
        if (!room) return;

        const [p1, p2] = room.players;

        // Determine winner
        let winnerId: string | null = null;

        if (p1.shotTimestamp !== undefined && p2.shotTimestamp !== undefined) {
            // Check for simultaneous shots (within 50ms threshold = draw)
            const timeDiff = Math.abs(p1.shotTimestamp - p2.shotTimestamp);
            if (timeDiff <= 50) {
                winnerId = null; // Draw - simultaneous shots
            } else if (p1.shotTimestamp < p2.shotTimestamp) {
                winnerId = p1.id;
            } else {
                winnerId = p2.id;
            }
        } else if (p1.shotTimestamp !== undefined) {
            winnerId = p1.id;
        } else if (p2.shotTimestamp !== undefined) {
            winnerId = p2.id;
        }

        const result: GameResult = {
            winnerId,
            player1: {
                id: p1.id,
                reactionTime: p1.shotTimestamp ?? null,
            },
            player2: {
                id: p2.id,
                reactionTime: p2.shotTimestamp ?? null,
            },
        };

        this.sendResult(roomCode, result);
    }

    private sendResult(roomCode: string, result: GameResult): void {
        this.roomManager.updateRoomState(roomCode, DuelState.RESULT);

        this.broadcast(roomCode, {
            type: MessageType.GAME_RESULT,
            result,
        } as GameResultMessage);

        // Reset player states for potential rematch
        this.roomManager.resetHandStates(roomCode);
        this.falseStarters.delete(roomCode); // Clear false starters
        const room = this.roomManager.getRoom(roomCode);
        if (room) {
            for (const player of room.players) {
                player.isReady = false;
            }
        }
    }

    // Cancel all timers for a room (when someone leaves)
    cancelRoom(roomCode: string): void {
        const countdownTimer = this.countdownTimers.get(roomCode);
        if (countdownTimer) {
            clearTimeout(countdownTimer);
            this.countdownTimers.delete(roomCode);
        }

        const drawTimer = this.drawTimers.get(roomCode);
        if (drawTimer) {
            clearTimeout(drawTimer);
            this.drawTimers.delete(roomCode);
        }

        this.falseStarters.delete(roomCode);
    }
}
