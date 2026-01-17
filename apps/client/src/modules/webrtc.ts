// ============================================
// WebRTC Module
// ============================================

export interface WebRTCConfig {
    iceServers: RTCIceServer[];
}

export const DEFAULT_WEBRTC_CONFIG: WebRTCConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

export type SignalingCallback = (type: 'offer' | 'answer' | 'ice', data: unknown) => void;

export class WebRTCManager {
    private peerConnection: RTCPeerConnection | null = null;
    private localStream: MediaStream | null = null;
    private remoteStream: MediaStream | null = null;
    private signalingCallback: SignalingCallback | null = null;
    private config: WebRTCConfig;

    constructor(config: Partial<WebRTCConfig> = {}) {
        this.config = { ...DEFAULT_WEBRTC_CONFIG, ...config };
    }

    async initialize(localStream: MediaStream, onRemoteStream: (stream: MediaStream) => void): Promise<void> {
        this.localStream = localStream;
        this.remoteStream = new MediaStream();

        this.peerConnection = new RTCPeerConnection({
            iceServers: this.config.iceServers,
        });

        // Add local tracks
        localStream.getTracks().forEach(track => {
            this.peerConnection!.addTrack(track, localStream);
        });

        // Handle incoming tracks
        this.peerConnection.ontrack = (event) => {
            event.streams[0].getTracks().forEach(track => {
                this.remoteStream!.addTrack(track);
            });
            onRemoteStream(this.remoteStream!);
        };

        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate && this.signalingCallback) {
                this.signalingCallback('ice', event.candidate.toJSON());
            }
        };

        // Connection state logging
        this.peerConnection.onconnectionstatechange = () => {
            console.log('WebRTC connection state:', this.peerConnection?.connectionState);
        };

        console.log('WebRTC initialized');
    }

    setSignalingCallback(callback: SignalingCallback): void {
        this.signalingCallback = callback;
    }

    async createOffer(): Promise<RTCSessionDescriptionInit> {
        if (!this.peerConnection) {
            throw new Error('WebRTC not initialized');
        }

        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);

        if (this.signalingCallback) {
            this.signalingCallback('offer', offer);
        }

        return offer;
    }

    async handleOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
        if (!this.peerConnection) {
            throw new Error('WebRTC not initialized');
        }

        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        if (this.signalingCallback) {
            this.signalingCallback('answer', answer);
        }

        return answer;
    }

    async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
        if (!this.peerConnection) {
            throw new Error('WebRTC not initialized');
        }

        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }

    async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
        if (!this.peerConnection) {
            throw new Error('WebRTC not initialized');
        }

        try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
            console.warn('Failed to add ICE candidate:', e);
        }
    }

    getRemoteStream(): MediaStream | null {
        return this.remoteStream;
    }

    close(): void {
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        this.localStream = null;
        this.remoteStream = null;
        this.signalingCallback = null;
        console.log('WebRTC closed');
    }
}
