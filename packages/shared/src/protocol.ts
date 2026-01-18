// ============================================
// WebSocket Protocol Messages
// ============================================

import type { DuelState, GameResult, Player } from './types';

// Message types enum
export enum MessageType {
    // Client -> Server
    CREATE_ROOM = 'CREATE_ROOM',
    JOIN_ROOM = 'JOIN_ROOM',
    PLAYER_READY = 'PLAYER_READY',
    HAND_READY = 'HAND_READY',     // NEW: Player shows open palm
    PLAYER_SHOT = 'PLAYER_SHOT',
    LEAVE_ROOM = 'LEAVE_ROOM',

    // Server -> Client
    ROOM_CREATED = 'ROOM_CREATED',
    ROOM_JOINED = 'ROOM_JOINED',
    PLAYER_JOINED = 'PLAYER_JOINED',
    PLAYER_LEFT = 'PLAYER_LEFT',
    PLAYER_READY_CHANGED = 'PLAYER_READY_CHANGED',  // Notify about player ready state toggle
    PLAYER_HAND_READY = 'PLAYER_HAND_READY',  // NEW: Notify about player hand state
    GAME_STATE_UPDATE = 'GAME_STATE_UPDATE',
    COUNTDOWN_START = 'COUNTDOWN_START',
    DRAW_SIGNAL = 'DRAW_SIGNAL',
    GAME_RESULT = 'GAME_RESULT',
    ERROR = 'ERROR',

    // WebRTC Signaling
    RTC_OFFER = 'RTC_OFFER',
    RTC_ANSWER = 'RTC_ANSWER',
    RTC_ICE_CANDIDATE = 'RTC_ICE_CANDIDATE',
}

// ============================================
// Client -> Server Messages
// ============================================

export interface CreateRoomMessage {
    type: MessageType.CREATE_ROOM;
    playerName: string;
}

export interface JoinRoomMessage {
    type: MessageType.JOIN_ROOM;
    roomCode: string;
    playerName: string;
}

export interface PlayerReadyMessage {
    type: MessageType.PLAYER_READY;
    roomCode: string;
}

export interface HandReadyMessage {
    type: MessageType.HAND_READY;
    roomCode: string;
    isReady: boolean;  // true = palm open, false = not showing palm
}

export interface PlayerShotMessage {
    type: MessageType.PLAYER_SHOT;
    roomCode: string;
    reactionTime: number;  // Time since DRAW signal in ms
}

export interface LeaveRoomMessage {
    type: MessageType.LEAVE_ROOM;
    roomCode: string;
}

// WebRTC Signaling (Client -> Server)
export interface RTCOfferMessage {
    type: MessageType.RTC_OFFER;
    roomCode: string;
    targetPlayerId: string;
    offer: RTCSessionDescriptionInit;
}

export interface RTCAnswerMessage {
    type: MessageType.RTC_ANSWER;
    roomCode: string;
    targetPlayerId: string;
    answer: RTCSessionDescriptionInit;
}

export interface RTCIceCandidateMessage {
    type: MessageType.RTC_ICE_CANDIDATE;
    roomCode: string;
    targetPlayerId: string;
    candidate: RTCIceCandidateInit;
}

// ============================================
// Server -> Client Messages
// ============================================

export interface RoomCreatedMessage {
    type: MessageType.ROOM_CREATED;
    roomCode: string;
    playerId: string;
}

export interface RoomJoinedMessage {
    type: MessageType.ROOM_JOINED;
    roomCode: string;
    playerId: string;
    players: Player[];
}

export interface PlayerJoinedMessage {
    type: MessageType.PLAYER_JOINED;
    player: Player;
}

export interface PlayerLeftMessage {
    type: MessageType.PLAYER_LEFT;
    playerId: string;
}

export interface PlayerReadyChangedMessage {
    type: MessageType.PLAYER_READY_CHANGED;
    playerId: string;
    isReady: boolean;
}

export interface PlayerHandReadyMessage {
    type: MessageType.PLAYER_HAND_READY;
    playerId: string;
    isReady: boolean;
}

export interface GameStateUpdateMessage {
    type: MessageType.GAME_STATE_UPDATE;
    state: DuelState;
}

export interface CountdownStartMessage {
    type: MessageType.COUNTDOWN_START;
    duration: number;  // in ms
}

export interface DrawSignalMessage {
    type: MessageType.DRAW_SIGNAL;
    drawTime: number;  // Server timestamp
}

export interface GameResultMessage {
    type: MessageType.GAME_RESULT;
    result: GameResult;
}

export interface ErrorMessage {
    type: MessageType.ERROR;
    code: string;
    message: string;
}

// ============================================
// Union Types
// ============================================

export type ClientMessage =
    | CreateRoomMessage
    | JoinRoomMessage
    | PlayerReadyMessage
    | HandReadyMessage
    | PlayerShotMessage
    | LeaveRoomMessage
    | RTCOfferMessage
    | RTCAnswerMessage
    | RTCIceCandidateMessage;

export type ServerMessage =
    | RoomCreatedMessage
    | RoomJoinedMessage
    | PlayerJoinedMessage
    | PlayerLeftMessage
    | PlayerReadyChangedMessage
    | PlayerHandReadyMessage
    | GameStateUpdateMessage
    | CountdownStartMessage
    | DrawSignalMessage
    | GameResultMessage
    | ErrorMessage
    | RTCOfferMessage
    | RTCAnswerMessage
    | RTCIceCandidateMessage;
