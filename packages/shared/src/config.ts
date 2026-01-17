// ============================================
// Game Configuration
// ============================================

export const CONFIG = {
    // Timing
    COUNTDOWN_DURATION: 3000,      // 3 seconds countdown
    DRAW_DELAY_MIN: 2000,          // Minimum delay before DRAW (2s)
    DRAW_DELAY_MAX: 5000,          // Maximum delay before DRAW (5s)

    // Server
    WS_PORT: 3001,

    // Game
    ROOM_CODE_LENGTH: 6,

    // Gesture detection
    THUMB_BEND_THRESHOLD: 0.15,    // Threshold for detecting thumb bend
    GESTURE_CONFIDENCE_MIN: 0.7,   // Minimum confidence for gesture detection
} as const;

// Helper to get random draw delay
export function getRandomDrawDelay(): number {
    return CONFIG.DRAW_DELAY_MIN +
        Math.random() * (CONFIG.DRAW_DELAY_MAX - CONFIG.DRAW_DELAY_MIN);
}
