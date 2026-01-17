// ============================================
// Room Manager
// ============================================

import { Room, Player, DuelState, CONFIG } from '@duels/shared';
import { nanoid } from './utils.js';

export class RoomManager {
    private rooms: Map<string, Room> = new Map();
    private playerToRoom: Map<string, string> = new Map();

    createRoom(hostId: string, hostName: string): Room {
        const code = this.generateRoomCode();

        const host: Player = {
            id: hostId,
            name: hostName,
            isReady: false,
            handReady: false,
        };

        const room: Room = {
            code,
            hostId,
            players: [host],
            state: DuelState.LOBBY,
            createdAt: Date.now(),
        };

        this.rooms.set(code, room);
        this.playerToRoom.set(hostId, code);

        console.log(`Room created: ${code} by ${hostName}`);
        return room;
    }

    joinRoom(code: string, playerId: string, playerName: string): Room | null {
        const room = this.rooms.get(code);
        if (!room) {
            console.log(`Room not found: ${code}`);
            return null;
        }

        if (room.players.length >= 2) {
            console.log(`Room is full: ${code}`);
            return null;
        }

        const player: Player = {
            id: playerId,
            name: playerName,
            isReady: false,
            handReady: false,
        };

        room.players.push(player);
        this.playerToRoom.set(playerId, code);

        console.log(`${playerName} joined room: ${code}`);
        return room;
    }

    leaveRoom(playerId: string): { room: Room; wasHost: boolean } | null {
        const code = this.playerToRoom.get(playerId);
        if (!code) return null;

        const room = this.rooms.get(code);
        if (!room) return null;

        const wasHost = room.hostId === playerId;
        room.players = room.players.filter(p => p.id !== playerId);
        this.playerToRoom.delete(playerId);

        console.log(`Player ${playerId} left room: ${code}`);

        // Delete room if empty
        if (room.players.length === 0) {
            this.rooms.delete(code);
            console.log(`Room deleted: ${code}`);
            return { room, wasHost };
        }

        // Transfer host if needed
        if (wasHost && room.players.length > 0) {
            room.hostId = room.players[0].id;
        }

        // Reset room state if someone left mid-game
        if (room.state !== DuelState.LOBBY && room.state !== DuelState.IDLE) {
            room.state = DuelState.LOBBY;
        }

        return { room, wasHost };
    }

    getRoom(code: string): Room | undefined {
        return this.rooms.get(code);
    }

    getRoomByPlayer(playerId: string): Room | undefined {
        const code = this.playerToRoom.get(playerId);
        return code ? this.rooms.get(code) : undefined;
    }

    setPlayerReady(playerId: string, isReady: boolean): Room | null {
        const room = this.getRoomByPlayer(playerId);
        if (!room) return null;

        const player = room.players.find(p => p.id === playerId);
        if (player) {
            player.isReady = isReady;
        }

        return room;
    }

    // NEW: Set player hand ready state (showing palm)
    setPlayerHandReady(playerId: string, handReady: boolean): Room | null {
        const room = this.getRoomByPlayer(playerId);
        if (!room) return null;

        const player = room.players.find(p => p.id === playerId);
        if (player) {
            player.handReady = handReady;
        }

        return room;
    }

    updateRoomState(code: string, state: DuelState): Room | null {
        const room = this.rooms.get(code);
        if (!room) return null;

        room.state = state;
        return room;
    }

    setDrawTime(code: string, drawTime: number): Room | null {
        const room = this.rooms.get(code);
        if (!room) return null;

        room.drawTime = drawTime;
        return room;
    }

    recordShot(playerId: string, reactionTime: number): Room | null {
        const room = this.getRoomByPlayer(playerId);
        if (!room) return null;

        const player = room.players.find(p => p.id === playerId);
        if (player) {
            player.shotTimestamp = reactionTime;
        }

        return room;
    }

    areBothPlayersReady(room: Room): boolean {
        return room.players.length === 2 && room.players.every(p => p.isReady);
    }

    // NEW: Check if both players show open palm
    areBothHandsReady(room: Room): boolean {
        return room.players.length === 2 && room.players.every(p => p.handReady);
    }

    haveBothPlayersShot(room: Room): boolean {
        return room.players.length === 2 && room.players.every(p => p.shotTimestamp !== undefined);
    }

    // Reset hand ready states for new round
    resetHandStates(code: string): void {
        const room = this.rooms.get(code);
        if (!room) return;

        for (const player of room.players) {
            player.handReady = false;
            player.shotTimestamp = undefined;
        }
    }

    private generateRoomCode(): string {
        let code: string;
        do {
            code = nanoid(CONFIG.ROOM_CODE_LENGTH).toUpperCase();
        } while (this.rooms.has(code));
        return code;
    }

    // Cleanup old rooms (call periodically)
    cleanup(maxAge: number = 3600000): void {
        const now = Date.now();
        for (const [code, room] of this.rooms) {
            if (now - room.createdAt > maxAge) {
                for (const player of room.players) {
                    this.playerToRoom.delete(player.id);
                }
                this.rooms.delete(code);
                console.log(`Room expired: ${code}`);
            }
        }
    }
}
