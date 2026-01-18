// ============================================
// Hand Tracker Module (MediaPipe Hands)
// ============================================

    async initialize(): Promise < void> {
    // @ts-ignore - Hands is loaded via script tag
    const HandsClass = window.Hands || window.Jv?.Hands;

    if(!HandsClass) {
        throw new Error('MediaPipe Hands library not loaded');
    }

        this.hands = new HandsClass({
        locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        },
    });

    this.hands.setOptions({
        maxNumHands: this.config.maxNumHands,
        modelComplexity: this.config.modelComplexity,
        minDetectionConfidence: this.config.minDetectionConfidence,
        minTrackingConfidence: this.config.minTrackingConfidence,
    });

    this.hands.onResults(this.handleResults.bind(this));

    console.log('HandTracker initialized');
}

start(videoElement: HTMLVideoElement, callback: GestureCallback): void {
    if(!this.hands) {
    throw new Error('HandTracker not initialized. Call initialize() first.');
}

this.videoElement = videoElement;
this.gestureCallback = callback;
this.isRunning = true;
this.palmDetected = false;
this.lastGesture = GestureType.NONE;

this.processFrame();
console.log('HandTracker started');
    }

stop(): void {
    this.isRunning = false;
    if(this.animationFrameId) {
    cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = null;
}
this.gestureCallback = null;
console.log('HandTracker stopped');
    }

    private async processFrame(): Promise < void> {
    if(!this.isRunning || !this.hands || !this.videoElement) return;

    try {
        await this.hands.send({ image: this.videoElement });
    } catch(error) {
        console.warn('Frame processing error:', error);
    }

        this.animationFrameId = requestAnimationFrame(() => this.processFrame());
}

    private handleResults(results: Results): void {
    if(!this.gestureCallback) return;

    if(!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
    // No hand detected
    if (this.lastGesture !== GestureType.NONE) {
        this.lastGesture = GestureType.NONE;
        this.gestureCallback({ gesture: GestureType.NONE, confidence: 0 });
    }
    return;
}

const landmarks = results.multiHandLandmarks[0];
const gesture = this.detectGesture(landmarks);

this.gestureCallback(gesture);
this.lastGesture = gesture.gesture;
    }

    private detectGesture(landmarks: { x: number; y: number; z: number }[]): GestureResult {
    // Hand landmark indices:
    // 0 = wrist
    // 1-4 = thumb (cmc, mcp, ip, tip)
    // 5-8 = index (mcp, pip, dip, tip)
    // 9-12 = middle, 13-16 = ring, 17-20 = pinky

    // Count how many fingers are EXTENDED (open)
    // Finger is extended if tip is ABOVE (lower Y) than PIP joint
    const fingersExtended = [
        // Thumb: check if tip is far from palm center horizontally
        Math.abs(landmarks[4].x - landmarks[0].x) > 0.1,
        // Index: tip above PIP
        landmarks[8].y < landmarks[6].y,
        // Middle: tip above PIP
        landmarks[12].y < landmarks[10].y,
        // Ring: tip above PIP
        landmarks[16].y < landmarks[14].y,
        // Pinky: tip above PIP
        landmarks[20].y < landmarks[18].y,
    ];

    const extendedCount = fingersExtended.filter(Boolean).length;

    // OPEN PALM: 4-5 fingers extended (ready state)
    const isOpenPalm = extendedCount >= 4;

    // FIST: 0-1 fingers extended (shot!)
    const isFist = extendedCount <= 1;

    // OPEN PALM detected - ready position
    if (isOpenPalm) {
        this.palmDetected = true;
        return {
            gesture: GestureType.PALM_OPEN,
            confidence: 0.7 + (extendedCount * 0.05),
        };
    }

    // FIST detected after palm was open - SHOT action!
    if (this.palmDetected && isFist) {
        this.palmDetected = false; // Reset for next shot
        return {
            gesture: GestureType.SHOT,
            confidence: 0.9,
        };
    }

    // FIST detected without prior palm - just display fist emoji
    if (isFist) {
        return {
            gesture: GestureType.FIST,
            confidence: 0.7,
        };
    }

    // Transitional state (partially closed hand)
    if (this.palmDetected) {
        // Still in ready state, waiting for full fist
        return {
            gesture: GestureType.PALM_OPEN,
            confidence: 0.6,
        };
    }

    return {
        gesture: GestureType.NONE,
        confidence: 0,
    };
}

// Reset the gesture detection state (call before each round)
resetGestureState(): void {
    this.palmDetected = false;
    this.lastGesture = GestureType.NONE;
}
}
