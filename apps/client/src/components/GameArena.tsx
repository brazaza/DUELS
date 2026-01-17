// ============================================
// Game Arena Component - Western Scene
// ============================================

import { ReactNode } from 'react';
import './GameArena.css';

interface GameArenaProps {
    children: ReactNode;
    variant?: 'training' | 'duel';
    className?: string;
}

export function GameArena({ children, variant = 'training', className = '' }: GameArenaProps) {
    return (
        <div className={`game-arena game-arena--${variant} ${className}`}>
            {/* Sky gradient is in CSS */}
            
            {/* Sun */}
            <div className="game-arena__sun" />
            
            {/* Mountains background */}
            <div className="game-arena__mountains">
                <svg viewBox="0 0 400 100" preserveAspectRatio="none" className="game-arena__mountains-svg">
                    {/* Far mountains */}
                    <polygon points="0,100 50,40 100,70 150,30 200,60 250,25 300,55 350,35 400,100" fill="#8B7355" opacity="0.5" />
                    {/* Near mountains */}
                    <polygon points="0,100 30,60 80,80 130,50 180,75 230,45 280,70 330,55 380,65 400,100" fill="#6B5344" opacity="0.7" />
                </svg>
            </div>
            
            {/* Cacti decorations */}
            <div className="game-arena__decorations">
                <Cactus style={{ left: '5%' }} />
                <Cactus style={{ right: '8%' }} variant="small" />
                <Tumbleweed style={{ left: '15%' }} />
            </div>
            
            {/* Ground */}
            <div className="game-arena__ground">
                <div className="game-arena__ground-texture" />
            </div>
            
            {/* Game content */}
            <div className="game-arena__content">
                {children}
            </div>
        </div>
    );
}

// Pixel art cactus
function Cactus({ style, variant = 'normal' }: { style?: React.CSSProperties; variant?: 'normal' | 'small' }) {
    const size = variant === 'small' ? { width: 16, height: 24 } : { width: 24, height: 40 };
    
    return (
        <svg 
            viewBox="0 0 24 40" 
            style={{ ...style, position: 'absolute', bottom: '15%', ...size }}
            className="game-arena__cactus"
        >
            {/* Main body */}
            <rect x="9" y="8" width="6" height="32" fill="#4A7C59" />
            <rect x="10" y="8" width="4" height="32" fill="#5A9C69" />
            
            {/* Left arm */}
            <rect x="3" y="16" width="6" height="4" fill="#4A7C59" />
            <rect x="3" y="12" width="4" height="8" fill="#4A7C59" />
            <rect x="4" y="12" width="2" height="8" fill="#5A9C69" />
            
            {/* Right arm */}
            <rect x="15" y="20" width="6" height="4" fill="#4A7C59" />
            <rect x="17" y="16" width="4" height="8" fill="#4A7C59" />
            <rect x="18" y="16" width="2" height="8" fill="#5A9C69" />
        </svg>
    );
}

// Tumbleweed decoration
function Tumbleweed({ style }: { style?: React.CSSProperties }) {
    return (
        <svg 
            viewBox="0 0 16 16" 
            style={{ ...style, position: 'absolute', bottom: '12%', width: 20, height: 20 }}
            className="game-arena__tumbleweed"
        >
            <circle cx="8" cy="8" r="6" fill="none" stroke="#8B7355" strokeWidth="2" />
            <circle cx="8" cy="8" r="3" fill="none" stroke="#8B7355" strokeWidth="1" />
            <line x1="2" y1="8" x2="14" y2="8" stroke="#8B7355" strokeWidth="1" />
            <line x1="8" y1="2" x2="8" y2="14" stroke="#8B7355" strokeWidth="1" />
        </svg>
    );
}

// Timer display component
interface TimerDisplayProps {
    time: number | null;
    label?: string;
    variant?: 'default' | 'success' | 'danger';
}

export function TimerDisplay({ time, label, variant = 'default' }: TimerDisplayProps) {
    return (
        <div className={`timer-display timer-display--${variant}`}>
            {label && <span className="timer-display__label">{label}</span>}
            <span className="timer-display__time">
                {time !== null ? `${time}ms` : '---'}
            </span>
        </div>
    );
}

// Game status banner
interface GameBannerProps {
    text: string;
    variant?: 'default' | 'draw' | 'win' | 'lose' | 'early' | 'countdown' | 'bang' | 'wait';
    animate?: boolean;
}

export function GameBanner({ text, variant = 'default', animate = false }: GameBannerProps) {
    return (
        <div className={`game-banner game-banner--${variant} ${animate ? 'game-banner--animate' : ''}`}>
            {text}
        </div>
    );
}
