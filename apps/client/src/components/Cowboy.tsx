// ============================================
// Cowboy Component - Animated Sprite
// ============================================

import { useEffect, useState } from 'react';
import './Cowboy.css';

export type CowboyState = 'idle' | 'ready' | 'draw' | 'shoot' | 'win' | 'lose';

interface CowboyProps {
    state: CowboyState;
    mirrored?: boolean;
    size?: 'small' | 'medium' | 'large';
    className?: string;
}

export function Cowboy({ state, mirrored = false, size = 'medium', className = '' }: CowboyProps) {
    const [animating, setAnimating] = useState(false);

    useEffect(() => {
        if (state === 'shoot') {
            setAnimating(true);
            const timer = setTimeout(() => setAnimating(false), 300);
            return () => clearTimeout(timer);
        }
    }, [state]);

    const getEmoji = () => {
        switch (state) {
            case 'idle':
                return '🤠';
            case 'ready':
                return '🤠';
            case 'draw':
                return '😤';
            case 'shoot':
                return '💥';
            case 'win':
                return '🎉';
            case 'lose':
                return '😵';
            default:
                return '🤠';
        }
    };

    const getGunEmoji = () => {
        switch (state) {
            case 'idle':
            case 'ready':
                return '🔫';
            case 'draw':
            case 'shoot':
                return '💨🔫';
            case 'win':
                return '🔫✨';
            case 'lose':
                return '🔫';
            default:
                return '🔫';
        }
    };

    return (
        <div 
            className={`cowboy cowboy--${size} cowboy--${state} ${mirrored ? 'cowboy--mirrored' : ''} ${animating ? 'cowboy--animating' : ''} ${className}`}
        >
            <div className="cowboy__face">{getEmoji()}</div>
            <div className="cowboy__body">
                <div className="cowboy__arm">{getGunEmoji()}</div>
            </div>
        </div>
    );
}

// Simple SVG cowboy silhouette for better visuals
export function CowboySVG({ state, mirrored = false, className = '' }: CowboyProps) {
    const getColor = () => {
        switch (state) {
            case 'win': return '#4A7C59';
            case 'lose': return '#B54B4B';
            case 'shoot': return '#C4553A';
            default: return '#5C4A3D';
        }
    };

    return (
        <svg 
            viewBox="0 0 100 150" 
            className={`cowboy-svg cowboy-svg--${state} ${mirrored ? 'cowboy-svg--mirrored' : ''} ${className}`}
            style={{ transform: mirrored ? 'scaleX(-1)' : undefined }}
        >
            {/* Hat */}
            <ellipse cx="50" cy="20" rx="35" ry="8" fill={getColor()} />
            <rect x="30" y="12" width="40" height="15" rx="3" fill={getColor()} />
            
            {/* Head */}
            <circle cx="50" cy="45" r="18" fill="#E8D5B7" />
            
            {/* Eyes */}
            <circle cx="44" cy="42" r="2" fill="#2C2416" />
            <circle cx="56" cy="42" r="2" fill="#2C2416" />
            
            {/* Mustache */}
            <path d="M42 52 Q50 56 58 52" stroke="#5C4A3D" strokeWidth="2" fill="none" />
            
            {/* Body */}
            <rect x="35" y="63" width="30" height="45" rx="5" fill={getColor()} />
            
            {/* Arm with gun */}
            <g className={`cowboy-svg__arm ${state === 'shoot' ? 'cowboy-svg__arm--shoot' : ''}`}>
                <rect x="65" y="70" width="25" height="8" rx="3" fill="#E8D5B7" />
                {/* Gun */}
                <rect x="85" y="68" width="12" height="12" rx="2" fill="#4A4A4A" />
                <rect x="92" y="72" width="8" height="4" fill="#4A4A4A" />
                {state === 'shoot' && (
                    <circle cx="102" cy="74" r="6" fill="#FFD700" opacity="0.8">
                        <animate attributeName="r" values="6;12;6" dur="0.2s" />
                        <animate attributeName="opacity" values="0.8;0;0" dur="0.3s" />
                    </circle>
                )}
            </g>
            
            {/* Legs */}
            <rect x="38" y="108" width="10" height="35" rx="3" fill={getColor()} />
            <rect x="52" y="108" width="10" height="35" rx="3" fill={getColor()} />
            
            {/* Boots */}
            <rect x="35" y="138" width="16" height="10" rx="2" fill="#3D2B1F" />
            <rect x="49" y="138" width="16" height="10" rx="2" fill="#3D2B1F" />
        </svg>
    );
}
