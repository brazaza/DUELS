// ============================================
// Duels WebSocket Server
// ============================================

import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import {
    CONFIG,
    MessageType,
    ClientMessage,
    ServerMessage,
    RoomCreatedMessage,
    RoomJoinedMessage,
    PlayerJoinedMessage,
    PlayerLeftMessage,
    ErrorMessage,
} from '@duels/shared';
import { RoomManager } from './roomManager.js';
import { GameHandler } from './gameHandler.js';
import { SignalingHandler } from './signalingHandler.js';
import { nanoid } from './utils.js';

// Load environment variables
// Railway uses PORT, fallback to WS_PORT or default
const PORT = Number(process.env.PORT) || Number(process.env.WS_PORT) || CONFIG.WS_PORT;

// Player connection tracking
interface PlayerConnection {
    ws: WebSocket;
    playerId: string;
}

const connections = new Map<WebSocket, PlayerConnection>();
const playerSockets = new Map<string, WebSocket>();

// Managers
const roomManager = new RoomManager();

// Broadcast function
function broadcast(roomCode: string, message: ServerMessage, excludePlayerId?: string): void {
    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    const data = JSON.stringify(message);

    for (const player of room.players) {
        if (excludePlayerId && player.id === excludePlayerId) continue;

        const socket = playerSockets.get(player.id);
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(data);
        }
    }
}

// Handlers
const gameHandler = new GameHandler(roomManager, broadcast);
const signalingHandler = new SignalingHandler((playerId) => playerSockets.get(playerId));

// Send to single client
function send(ws: WebSocket, message: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
    }
}

// Handle incoming messages
function handleMessage(ws: WebSocket, data: string): void {
    const connection = connections.get(ws);
    if (!connection) return;

    let message: ClientMessage;
    try {
        message = JSON.parse(data);
    } catch (e) {
        console.error('Invalid JSON:', data);
        return;
    }

    console.log(`[${connection.playerId}] ${message.type}`);

    switch (message.type) {
        case MessageType.CREATE_ROOM: {
            const room = roomManager.createRoom(connection.playerId, message.playerName);

            send(ws, {
                type: MessageType.ROOM_CREATED,
                roomCode: room.code,
                playerId: connection.playerId,
            } as RoomCreatedMessage);
            break;
        }

        case MessageType.JOIN_ROOM: {
            const room = roomManager.joinRoom(
                message.roomCode.toUpperCase(),
                connection.playerId,
                message.playerName
            );

            if (!room) {
                send(ws, {
                    type: MessageType.ERROR,
                    code: 'ROOM_NOT_FOUND',
                    message: 'Room not found or full',
                } as ErrorMessage);
                return;
            }

            // Send room info to joining player
            send(ws, {
                type: MessageType.ROOM_JOINED,
                roomCode: room.code,
                playerId: connection.playerId,
                players: room.players,
            } as RoomJoinedMessage);

            // Notify other players
            const joiningPlayer = room.players.find(p => p.id === connection.playerId);
            if (joiningPlayer) {
                broadcast(room.code, {
                    type: MessageType.PLAYER_JOINED,
                    player: joiningPlayer,
                } as PlayerJoinedMessage, connection.playerId);
            }
            break;
        }

        case MessageType.PLAYER_READY: {
            gameHandler.handlePlayerReady(message.roomCode, connection.playerId);
            break;
        }

        case MessageType.HAND_READY: {
            gameHandler.handleHandReady(message.roomCode, connection.playerId, message.isReady);
            break;
        }

        case MessageType.PLAYER_SHOT: {
            gameHandler.handlePlayerShot(
                message.roomCode,
                connection.playerId,
                message.reactionTime
            );
            break;
        }

        case MessageType.LEAVE_ROOM: {
            handlePlayerLeave(connection.playerId);
            break;
        }

        // WebRTC signaling
        case MessageType.RTC_OFFER: {
            signalingHandler.handleOffer(connection.playerId, message);
            break;
        }

        case MessageType.RTC_ANSWER: {
            signalingHandler.handleAnswer(connection.playerId, message);
            break;
        }

        case MessageType.RTC_ICE_CANDIDATE: {
            signalingHandler.handleIceCandidate(connection.playerId, message);
            break;
        }

        default:
            console.warn('Unknown message type:', (message as { type: string }).type);
    }
}

function handlePlayerLeave(playerId: string): void {
    const result = roomManager.leaveRoom(playerId);
    if (!result) return;

    const { room } = result;

    // Cancel any running game timers
    gameHandler.cancelRoom(room.code);

    // Notify remaining players
    broadcast(room.code, {
        type: MessageType.PLAYER_LEFT,
        playerId,
    } as PlayerLeftMessage);
}

// Create HTTP server for health checks and WebSocket upgrade
const server = createServer((req, res) => {
    if (req.url === '/health') {
        res.writeHead(200);
        res.end('OK');
        return;
    }
    res.writeHead(404);
    res.end();
});

// Create WebSocket server attached to HTTP server
const wss = new WebSocketServer({ server });

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🤠 Duels WebSocket server running on port ${PORT}`);
});

wss.on('connection', (ws: WebSocket) => {
    const playerId = nanoid(12);

    connections.set(ws, { ws, playerId });
    playerSockets.set(playerId, ws);

    console.log(`Player connected: ${playerId}`);

    ws.on('message', (data: Buffer) => {
        handleMessage(ws, data.toString());
    });

    ws.on('close', () => {
        const connection = connections.get(ws);
        if (connection) {
            handlePlayerLeave(connection.playerId);
            playerSockets.delete(connection.playerId);
            connections.delete(ws);
            console.log(`Player disconnected: ${connection.playerId}`);
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

// Periodic cleanup
setInterval(() => {
    roomManager.cleanup(3600000); // Clean rooms older than 1 hour
}, 60000);


