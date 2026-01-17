// ============================================
// WebRTC Signaling Handler
// ============================================

import { WebSocket } from 'ws';
import {
    MessageType,
    RTCOfferMessage,
    RTCAnswerMessage,
    RTCIceCandidateMessage,
    ServerMessage,
} from '@duels/shared';

export class SignalingHandler {
    constructor(
        private getPlayerSocket: (playerId: string) => WebSocket | undefined
    ) { }

    handleOffer(senderId: string, message: RTCOfferMessage): void {
        const targetSocket = this.getPlayerSocket(message.targetPlayerId);
        if (!targetSocket) {
            console.log(`Target player not found: ${message.targetPlayerId}`);
            return;
        }

        // Forward offer with sender info
        const forwardMessage: RTCOfferMessage = {
            type: MessageType.RTC_OFFER,
            roomCode: message.roomCode,
            targetPlayerId: senderId, // So receiver knows who sent it
            offer: message.offer,
        };

        this.send(targetSocket, forwardMessage);
    }

    handleAnswer(senderId: string, message: RTCAnswerMessage): void {
        const targetSocket = this.getPlayerSocket(message.targetPlayerId);
        if (!targetSocket) {
            console.log(`Target player not found: ${message.targetPlayerId}`);
            return;
        }

        const forwardMessage: RTCAnswerMessage = {
            type: MessageType.RTC_ANSWER,
            roomCode: message.roomCode,
            targetPlayerId: senderId,
            answer: message.answer,
        };

        this.send(targetSocket, forwardMessage);
    }

    handleIceCandidate(senderId: string, message: RTCIceCandidateMessage): void {
        const targetSocket = this.getPlayerSocket(message.targetPlayerId);
        if (!targetSocket) {
            console.log(`Target player not found: ${message.targetPlayerId}`);
            return;
        }

        const forwardMessage: RTCIceCandidateMessage = {
            type: MessageType.RTC_ICE_CANDIDATE,
            roomCode: message.roomCode,
            targetPlayerId: senderId,
            candidate: message.candidate,
        };

        this.send(targetSocket, forwardMessage);
    }

    private send(socket: WebSocket, message: ServerMessage): void {
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(message));
        }
    }
}
