// ============================================
// Camera Module
// ============================================

export interface CameraConfig {
    facingMode: 'user' | 'environment';
    width: number;
    height: number;
    mirrored: boolean;
}

export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
    facingMode: 'user',  // Front camera for selfie mode
    width: 640,
    height: 480,
    mirrored: true,      // Mirror for selfie (feels natural)
};

export class CameraManager {
    private stream: MediaStream | null = null;
    private videoElement: HTMLVideoElement | null = null;
    private config: CameraConfig;

    constructor(config: Partial<CameraConfig> = {}) {
        this.config = { ...DEFAULT_CAMERA_CONFIG, ...config };
    }

    async start(videoElement: HTMLVideoElement): Promise<void> {
        this.videoElement = videoElement;

        try {
            const constraints: MediaStreamConstraints = {
                video: {
                    facingMode: this.config.facingMode,
                    width: { ideal: this.config.width },
                    height: { ideal: this.config.height },
                },
                audio: false,
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);

            videoElement.srcObject = this.stream;
            videoElement.setAttribute('playsinline', 'true'); // Required for iOS

            // Apply mirroring via CSS transform
            if (this.config.mirrored) {
                videoElement.style.transform = 'scaleX(-1)';
            }

            await videoElement.play();

            console.log('Camera started successfully');
        } catch (error) {
            console.error('Failed to start camera:', error);
            throw new CameraError('CAMERA_ACCESS_DENIED', 'Could not access camera');
        }
    }

    stop(): void {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.videoElement) {
            this.videoElement.srcObject = null;
        }
        console.log('Camera stopped');
    }

    getStream(): MediaStream | null {
        return this.stream;
    }

    getVideoElement(): HTMLVideoElement | null {
        return this.videoElement;
    }

    isActive(): boolean {
        return this.stream !== null && this.stream.active;
    }

    // Switch between front and back camera
    async switchCamera(): Promise<void> {
        this.config.facingMode = this.config.facingMode === 'user' ? 'environment' : 'user';

        if (this.videoElement) {
            this.stop();
            await this.start(this.videoElement);
        }
    }

    // Check if camera is available
    static async isAvailable(): Promise<boolean> {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.some(device => device.kind === 'videoinput');
        } catch {
            return false;
        }
    }
}

// Custom error class for camera errors
export class CameraError extends Error {
    constructor(
        public code: string,
        message: string
    ) {
        super(message);
        this.name = 'CameraError';
    }
}
