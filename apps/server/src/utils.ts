// ============================================
// Utility Functions
// ============================================

// Simple ID generator
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function nanoid(length: number = 6): string {
    let result = '';
    for (let i = 0; i < length; i++) {
        result += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
    return result;
}
