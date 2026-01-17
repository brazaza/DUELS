// ============================================
// Training Screen Component - New Layout
// ============================================

import { useEffect, useCallback } from 'react';
import { TrainingState, GestureType } from '@duels/shared';
import { useTranslation } from '../hooks/useTranslation';
import { useCamera } from '../hooks/useCamera';
import { useHandTracking } from '../hooks/useHandTracking';
import { useTrainingGame } from '../hooks/useTrainingGame';
import { PixelCowboy, PixelTarget, CowboyAnimState } from './PixelCowboy';
import { GameArena, GameBanner, TimerDisplay } from './GameArena';
import { BurgerMenu, IconButton } from './BurgerMenu';
import './TrainingScreen.css';
import './PixelCowboy.css';
import './GameArena.css';
import './BurgerMenu.css';

interface TrainingScreenProps {
    onBack: () => void;
}

export function TrainingScreen({ onBack }: TrainingScreenProps) {
    const { t } = useTranslation();
    const camera = useCamera();
    const handTracking = useHandTracking();
    const game = useTrainingGame();

    // Initialize camera and hand tracking
    useEffect(() => {
        const init = async () => {
            await handTracking.initialize();
            await camera.start();
        };
        init();

        return () => {
            camera.stop();
            handTracking.stop();
        };
    }, []);

    // Start hand tracking when camera is active
    useEffect(() => {
        if (camera.isActive && handTracking.isInitialized && camera.videoRef.current) {
            handTracking.start(camera.videoRef.current);
            // Clear any lingering error since camera is working
            camera.clearError();
        }
    }, [camera.isActive, handTracking.isInitialized]);

    // Handle gesture changes - don't reset gesture, let the hook's timeout handle display
    useEffect(() => {
        if (handTracking.gesture.gesture === GestureType.SHOT) {
            game.handleGesture(GestureType.SHOT);
        }
    }, [handTracking.gesture]);

    const handleStart = useCallback(() => {
        handTracking.resetGesture();
        game.start();
    }, [handTracking, game]);

    const handleReset = useCallback(() => {
        handTracking.resetGesture();
        game.reset();
    }, [handTracking, game]);

    const getStateDisplay = () => {
        switch (game.context.state) {
            case TrainingState.IDLE:
                return null;
            case TrainingState.READY:
            case TrainingState.COUNTDOWN:
                return <div className="training__state training__state--countdown">{t('training.ready')}</div>;
            case TrainingState.WAIT_DRAW:
                return <div className="training__state training__state--wait">...</div>;
            case TrainingState.DRAW:
                return <div className="training__state training__state--draw animate-pulse">{t('training.draw')}</div>;
            case TrainingState.RESULT:
                if (game.context.isEarlyShot) {
                    return <div className="training__state training__state--early animate-shake">{t('training.tooEarly')}</div>;
                }
                return (
                    <div className="training__state training__state--result">
                        <div className="training__result-time">
                            {game.context.reactionTime} {t('training.ms')}
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    // Determine gesture indicator - show palm and fist continuously
    const getGestureIndicator = () => {
        switch (handTracking.gesture.gesture) {
            case GestureType.PALM_OPEN:
                return <span className="gesture-indicator gesture-indicator--ready">✋</span>;
            case GestureType.FIST:
                return <span className="gesture-indicator gesture-indicator--fist">✊</span>;
            case GestureType.SHOT:
                return <span className="gesture-indicator gesture-indicator--shot">✊</span>;
            default:
                return null;
        }
    };

    const isPlaying = game.context.state !== TrainingState.IDLE && game.context.state !== TrainingState.RESULT;

    // Only show error if camera is not active
    const showError = camera.error && !camera.isActive;

    // Get cowboy animation state based on game state
    const getCowboyState = (): CowboyAnimState => {
        switch (game.context.state) {
            case TrainingState.IDLE:
                return 'idle';
            case TrainingState.READY:
            case TrainingState.COUNTDOWN:
                return 'ready';
            case TrainingState.WAIT_DRAW:
                return handTracking.gesture.gesture === GestureType.PALM_OPEN ? 'aim' : 'ready';
            case TrainingState.DRAW:
                return 'aim';
            case TrainingState.RESULT:
                return game.context.isEarlyShot ? 'dead' : 'shoot';
            default:
                return 'idle';
        }
    };

    // Menu items for burger menu
    const menuItems = [
        { label: t('training.back'), icon: '←', onClick: onBack },
        { label: 'Reset', icon: '🔄', onClick: handleReset },
    ];

    return (
        <div className="game-screen">
            {/* Header */}
            <header className="game-screen__header">
                <div className="game-screen__header-left">
                    <IconButton 
                        icon="←" 
                        label={t('training.back')} 
                        onClick={onBack} 
                    />
                </div>
                <h1 className="game-screen__title">{t('training.title')}</h1>
                <div className="game-screen__header-right">
                    <BurgerMenu items={menuItems} className="burger-menu--mobile-only" />
                    {game.context.bestTime !== null && (
                        <div className="game-screen__best-time">
                            🏆 {game.context.bestTime}ms
                        </div>
                    )}
                </div>
            </header>

            {/* Camera Section */}
            <section className="game-screen__camera">
                <div className="video-container">
                    <video
                        ref={camera.videoRef}
                        autoPlay
                        playsInline
                        muted
                    />
                    {handTracking.gesture.gesture !== GestureType.NONE && (
                        <div className="video-overlay">
                            {getGestureIndicator()}
                        </div>
                    )}
                    {camera.isLoading && (
                        <div className="video-loading">{t('camera.requesting')}</div>
                    )}
                    {showError && (
                        <div className="video-error">{camera.error}</div>
                    )}
                </div>
            </section>

            {/* Game Arena */}
            <section className="game-screen__arena">
                <GameArena variant="training">
                    {/* Cowboy */}
                    <PixelCowboy state={getCowboyState()} color="blue" />
                    
                    {/* Target */}
                    <PixelTarget hit={game.context.state === TrainingState.RESULT && !game.context.isEarlyShot} />
                    
                    {/* Game Banner */}
                    {game.context.state === TrainingState.DRAW && (
                        <GameBanner text="BANG!" variant="bang" animate />
                    )}
                    {game.context.state === TrainingState.RESULT && game.context.isEarlyShot && (
                        <GameBanner text={t('training.tooEarly')} variant="early" animate />
                    )}
                    {game.context.state === TrainingState.RESULT && !game.context.isEarlyShot && (
                        <GameBanner text={`${game.context.reactionTime}ms`} variant="win" animate />
                    )}
                    {game.context.state === TrainingState.COUNTDOWN && game.context.countdownValue > 0 && (
                        <GameBanner 
                            text={String(game.context.countdownValue)} 
                            variant="countdown" 
                            animate 
                            key={game.context.countdownValue}
                        />
                    )}
                    {game.context.state === TrainingState.WAIT_DRAW && (
                        <GameBanner text="..." variant="wait" />
                    )}
                </GameArena>
            </section>

            {/* Controls Section */}
            <section className="game-screen__controls">
                {game.context.state === TrainingState.IDLE && (
                    <>
                        <p className="game-screen__instructions">{t('training.instructions')}</p>
                        <button
                            className="btn btn-primary btn-large"
                            onClick={handleStart}
                            disabled={!camera.isActive || !handTracking.isInitialized}
                        >
                            {t('training.start')}
                        </button>
                    </>
                )}

                {game.context.state === TrainingState.RESULT && (
                    <button
                        className="btn btn-primary btn-large"
                        onClick={handleStart}
                    >
                        {t('training.tryAgain')}
                    </button>
                )}

                {isPlaying && (
                    <button
                        className="btn btn-outline"
                        onClick={handleReset}
                    >
                        Cancel
                    </button>
                )}
            </section>
        </div>
    );
}
