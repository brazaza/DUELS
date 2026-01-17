// ============================================
// Pixel Art Cowboy Component
// ============================================

import { useEffect, useState } from 'react';
import './PixelCowboy.css';

export type CowboyAnimState = 'idle' | 'ready' | 'aim' | 'shoot' | 'win' | 'dead';

interface PixelCowboyProps {
    state: CowboyAnimState;
    mirrored?: boolean;
    color?: 'blue' | 'red' | 'green';
    className?: string;
}

export function PixelCowboy({ state, mirrored = false, color = 'blue', className = '' }: PixelCowboyProps) {
    const [frame, setFrame] = useState(0);

    // Idle animation - subtle breathing
    useEffect(() => {
        if (state === 'idle' || state === 'ready') {
            const interval = setInterval(() => {
                setFrame(f => (f + 1) % 2);
            }, 500);
            return () => clearInterval(interval);
        }
    }, [state]);

    // Shoot animation
    useEffect(() => {
        if (state === 'shoot') {
            setFrame(0);
            const timer = setTimeout(() => setFrame(1), 100);
            return () => clearTimeout(timer);
        }
    }, [state]);

    // Dead animation
    useEffect(() => {
        if (state === 'dead') {
            setFrame(0);
            const timer = setTimeout(() => setFrame(1), 200);
            return () => clearTimeout(timer);
        }
    }, [state]);

    const getColorPalette = () => {
        switch (color) {
            case 'red':
                return { shirt: '#C25450', shirtDark: '#8B3A37', pants: '#4A4A6A' };
            case 'green':
                return { shirt: '#4A7C59', shirtDark: '#355C42', pants: '#6B5B4F' };
            default:
                return { shirt: '#6B8CAE', shirtDark: '#4A6B8A', pants: '#5C4A3D' };
        }
    };

    const palette = getColorPalette();

    return (
        <div className={`pixel-cowboy pixel-cowboy--${state} ${mirrored ? 'pixel-cowboy--mirrored' : ''} ${className}`}>
            <svg 
                viewBox="0 0 32 48" 
                className="pixel-cowboy__sprite"
                style={{ imageRendering: 'pixelated' }}
            >
                {/* Hat */}
                <rect x="6" y="0" width="20" height="3" fill="#2C2416" />
                <rect x="4" y="3" width="24" height="2" fill="#2C2416" />
                <rect x="8" y="5" width="16" height="1" fill="#3D3426" />
                
                {/* Head */}
                <rect x="10" y="6" width="12" height="10" fill="#E8C9A0" />
                <rect x="10" y="6" width="12" height="2" fill="#D4B48C" />
                
                {/* Face */}
                <rect x="12" y="9" width="2" height="2" fill="#2C2416" />
                <rect x="18" y="9" width="2" height="2" fill="#2C2416" />
                <rect x="11" y="13" width="10" height="1" fill="#8B6B4F" />
                <rect x="13" y="14" width="6" height="1" fill="#8B6B4F" />
                
                {/* Body/Shirt */}
                <rect x="8" y="16" width="16" height="12" fill={palette.shirt} />
                <rect x="10" y="16" width="12" height="2" fill={palette.shirtDark} />
                
                {/* Bandana */}
                <rect x="12" y="16" width="8" height="3" fill="#C25450" />
                
                {/* Arms */}
                {state === 'idle' && (
                    <>
                        <rect x="4" y="18" width="4" height="8" fill={palette.shirt} />
                        <rect x="24" y="18" width="4" height="8" fill={palette.shirt} />
                        <rect x="4" y="26" width="4" height="2" fill="#E8C9A0" />
                        <rect x="24" y="26" width="4" height="2" fill="#E8C9A0" />
                    </>
                )}
                
                {state === 'ready' && (
                    <>
                        <rect x="4" y="18" width="4" height="8" fill={palette.shirt} />
                        <rect x="24" y="16" width="4" height="6" fill={palette.shirt} />
                        <rect x="4" y="26" width="4" height="2" fill="#E8C9A0" />
                        <rect x="24" y="22" width="4" height="2" fill="#E8C9A0" />
                        <rect x="26" y="22" width="4" height="2" fill="#4A4A4A" />
                    </>
                )}
                
                {(state === 'aim' || state === 'shoot') && (
                    <>
                        <rect x="4" y="18" width="4" height="8" fill={palette.shirt} />
                        <rect x="24" y="14" width="8" height="4" fill={palette.shirt} />
                        <rect x="4" y="26" width="4" height="2" fill="#E8C9A0" />
                        <rect x="28" y="14" width="4" height="4" fill="#E8C9A0" />
                        {/* Gun */}
                        <rect x="30" y="15" width="6" height="3" fill="#4A4A4A" />
                        <rect x="34" y="16" width="4" height="2" fill="#4A4A4A" />
                        {/* Muzzle flash */}
                        {state === 'shoot' && frame === 0 && (
                            <>
                                <rect x="38" y="14" width="4" height="5" fill="#FFD700" opacity="0.9" />
                                <rect x="40" y="15" width="3" height="3" fill="#FF6B00" />
                            </>
                        )}
                    </>
                )}
                
                {state === 'win' && (
                    <>
                        <rect x="2" y="12" width="4" height="8" fill={palette.shirt} />
                        <rect x="26" y="12" width="4" height="8" fill={palette.shirt} />
                        <rect x="2" y="10" width="4" height="4" fill="#E8C9A0" />
                        <rect x="26" y="10" width="4" height="4" fill="#E8C9A0" />
                    </>
                )}
                
                {state === 'dead' && frame === 1 && (
                    <>
                        {/* Fallen pose - rotate the whole thing would be complex, simplified */}
                    </>
                )}
                
                {/* Belt */}
                <rect x="8" y="28" width="16" height="2" fill="#5C4A3D" />
                <rect x="14" y="28" width="4" height="2" fill="#C9A227" />
                
                {/* Pants */}
                <rect x="8" y="30" width="7" height="12" fill={palette.pants} />
                <rect x="17" y="30" width="7" height="12" fill={palette.pants} />
                
                {/* Boots */}
                <rect x="6" y="42" width="9" height="6" fill="#3D2B1F" />
                <rect x="17" y="42" width="9" height="6" fill="#3D2B1F" />
                <rect x="4" y="46" width="4" height="2" fill="#3D2B1F" />
                <rect x="24" y="46" width="4" height="2" fill="#3D2B1F" />
                
                {/* Dead X eyes */}
                {state === 'dead' && (
                    <>
                        <rect x="12" y="9" width="2" height="2" fill="#C25450" />
                        <rect x="18" y="9" width="2" height="2" fill="#C25450" />
                        <rect x="11" y="8" width="1" height="1" fill="#C25450" />
                        <rect x="14" y="11" width="1" height="1" fill="#C25450" />
                        <rect x="17" y="8" width="1" height="1" fill="#C25450" />
                        <rect x="20" y="11" width="1" height="1" fill="#C25450" />
                    </>
                )}
            </svg>
        </div>
    );
}

// Target for training mode
export function PixelTarget({ hit = false }: { hit?: boolean }) {
    return (
        <div className={`pixel-target ${hit ? 'pixel-target--hit' : ''}`}>
            <svg viewBox="0 0 32 48" className="pixel-target__sprite" style={{ imageRendering: 'pixelated' }}>
                {/* Post */}
                <rect x="14" y="32" width="4" height="16" fill="#6B4423" />
                
                {/* Target board */}
                <rect x="4" y="8" width="24" height="24" fill="#D4A574" />
                <rect x="6" y="10" width="20" height="20" fill="#F5E6D3" />
                
                {/* Rings */}
                <rect x="8" y="12" width="16" height="16" fill="none" stroke="#C25450" strokeWidth="2" />
                <rect x="12" y="16" width="8" height="8" fill="none" stroke="#C25450" strokeWidth="2" />
                
                {/* Bullseye */}
                <rect x="14" y="18" width="4" height="4" fill="#C25450" />
                
                {/* Hit mark */}
                {hit && (
                    <>
                        <rect x="14" y="18" width="4" height="4" fill="#2C2416" />
                        <rect x="12" y="16" width="2" height="2" fill="#4A4A4A" />
                        <rect x="18" y="22" width="2" height="2" fill="#4A4A4A" />
                    </>
                )}
            </svg>
        </div>
    );
}
