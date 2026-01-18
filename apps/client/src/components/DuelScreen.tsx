// ============================================
// Duel Screen Component - New Layout
// ============================================

import { useEffect, useRef } from 'react';
import { DuelState, GestureType } from '@duels/shared';
import { useTranslation } from '../hooks/useTranslation';
import { useCamera } from '../hooks/useCamera';
import { useHandTracking } from '../hooks/useHandTracking';
import { useWebSocket } from '../hooks/useWebSocket';
import { useWebRTC } from '../hooks/useWebRTC';
import { useDuelGame } from '../hooks/useDuelGame';
import { PixelCowboy, CowboyAnimState } from './PixelCowboy';
import { GameArena, GameBanner } from './GameArena';
import { BurgerMenu, IconButton } from './BurgerMenu';
import './TrainingScreen.css';
import './PixelCowboy.css';
import './GameArena.css';
import './BurgerMenu.css';
import './DuelScreen.css';

interface DuelScreenProps {
    ws: ReturnType<typeof useWebSocket>;
    onBack: () => void;
}

export function DuelScreen({ ws, onBack }: DuelScreenProps) {
    const { t } = useTranslation();
    const camera = useCamera();
    const handTracking = useHandTracking();
    const game = useDuelGame(ws);
    const webrtc = useWebRTC(ws, ws.roomCode);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

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
            camera.clearError();
        }
    }, [camera.isActive, handTracking.isInitialized]);

    const opponent = game.context.players.find(p => p.id !== game.context.playerId);

    // Get cowboy animation state based on game state
    const getCowboyState = (isMe: boolean): CowboyAnimState => {
        const { state, result, isEarlyShot } = game.context;

        switch (state) {
            case DuelState.IDLE:
            case DuelState.LOBBY:
                return 'idle';
            case DuelState.READY:
            case DuelState.HANDS_READY:
            case DuelState.COUNTDOWN:
                return 'ready';
            case DuelState.WAIT_DRAW:
                // Show aim if player has palm open
                if (isMe && handTracking.gesture.gesture === GestureType.PALM_OPEN) return 'aim';
                return 'ready';
            case DuelState.DRAW:
                return 'aim';
            case DuelState.RESOLVE:
            case DuelState.RESULT:
                if (isEarlyShot && isMe) return 'dead';
                if (result) {
                    const isWinner = result.winnerId === game.context.playerId;
                    if (isMe) return isWinner ? 'win' : 'dead';
                    return isWinner ? 'dead' : 'win';
                }
                return 'shoot';
            default:
                return 'idle';
        }
    };

    const roomCode = ws.roomCode || game.context.roomCode;

    // Initiate WebRTC when both players are in lobby
    useEffect(() => {
        // Host initiates WebRTC connection when opponent joins
        if (camera.stream && opponent && game.context.playerId && !webrtc.isConnected) {
            // Only host (first player) initiates
            const isHost = game.context.players[0]?.id === game.context.playerId;
            if (isHost) {
                webrtc.initiate(camera.stream, opponent.id);
            }
        }
    }, [camera.stream, opponent, game.context.playerId, game.context.players, webrtc]);

    // Attach remote stream to video element
    useEffect(() => {
        if (remoteVideoRef.current && webrtc.remoteStream) {
            remoteVideoRef.current.srcObject = webrtc.remoteStream;
        }
    }, [webrtc.remoteStream]);

    // Cleanup WebRTC on leave
    const handleLeave = () => {
        webrtc.close();
        ws.leaveRoom();
        onBack();
    };

    // Copy share link to clipboard
    const handleShare = async () => {
        if (!roomCode) return;
        const shareUrl = `${window.location.origin}/room/${roomCode}`;
        try {
            await navigator.clipboard.writeText(shareUrl);
            alert('Link copied to clipboard!');
        } catch {
            // Fallback for older browsers
            prompt('Share this link:', shareUrl);
        }
    };

    // Menu items for burger menu
    const menuItems = [
        { label: 'Share Link', icon: '🔗', onClick: handleShare },
        { label: t('duel.leave'), icon: '←', onClick: handleLeave, danger: true },
    ];

    // Handle gesture changes - don't reset, let the hook's timeout handle emoji display
    useEffect(() => {
        if (handTracking.gesture.gesture !== GestureType.NONE) {
            game.handleGesture(handTracking.gesture.gesture);
        }
    }, [handTracking.gesture, game]);

    const handleReady = () => {
        ws.setReady();
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

    // Check if player is ready
    const me = game.context.players.find(p => p.id === game.context.playerId);
    const isMyReady = me?.isReady || false;

    // Show ready button in LOBBY when both players present, or in READY state if not yet ready
    const showReadyButton = (
        (game.context.state === DuelState.LOBBY && game.context.players.length === 2 && !isMyReady) ||
        (game.context.state === DuelState.READY && !isMyReady)
    );

    return (
        <div className="game-screen game-screen--duel">
            {/* Header */}
            <header className="game-screen__header">
                <div className="game-screen__header-left">
                    <IconButton
                        icon="←"
                        label={t('duel.leave')}
                        onClick={handleLeave}
                        variant="danger"
                    />
                </div>
                <div className="game-screen__header-center">
                    <h1 className="game-screen__title">{t('duel.title')}</h1>
                    {roomCode && (
                        <button
                            className="game-screen__room-code game-screen__room-code--clickable"
                            onClick={handleShare}
                            title="Click to copy invite link"
                        >
                            🔗 <strong>{roomCode}</strong>
                        </button>
                    )}
                </div>
                <div className="game-screen__header-right">
                    <IconButton icon="🔗" label="Share" onClick={handleShare} className="desktop-only" />
                    <BurgerMenu items={menuItems} className="burger-menu--mobile-only" />
                </div>
            </header>

            {/* Main Content Area - different structure for mobile vs desktop */}
            <div className="game-screen__main">
                {/* My Camera */}
                <section className="game-screen__camera game-screen__camera--me">
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
                        {isMyReady && <span className="ready-badge ready-badge--me">READY</span>}
                    </div>
                </section>

                {/* Game Arena */}
                <section className="game-screen__arena">
                    <GameArena variant="duel">
                        {/* My Cowboy */}
                        <PixelCowboy state={getCowboyState(true)} color="blue" />

                        {/* Opponent Cowboy */}
                        <PixelCowboy state={getCowboyState(false)} color="red" mirrored />

                        {/* Game Banners */}
                        {game.context.state === DuelState.LOBBY && game.context.players.length < 2 && (
                            <GameBanner
                                text={`${t('duel.waiting')} (${game.context.players.length}/2)`}
                                variant="default"
                            />
                        )}
                        {game.context.state === DuelState.LOBBY && game.context.players.length === 2 && !isMyReady && (
                            <GameBanner text={t('duel.pressReady')} variant="default" />
                        )}
                        {game.context.state === DuelState.READY && (
                            <GameBanner text={t('duel.waitingReady')} variant="default" />
                        )}
                        {game.context.state === DuelState.DRAW && (
                            <GameBanner text="BANG!" variant="bang" animate />
                        )}
                        {game.context.state === DuelState.RESULT && game.context.isEarlyShot && (
                            <GameBanner text={t('training.tooEarly')} variant="early" animate />
                        )}
                        {game.context.state === DuelState.RESULT && !game.context.isEarlyShot && game.context.result && (
                            <GameBanner
                                text={game.context.result.winnerId === game.context.playerId ? t('duel.win') : t('duel.lose')}
                                variant={game.context.result.winnerId === game.context.playerId ? 'win' : 'lose'}
                                animate
                            />
                        )}
                        {game.context.state === DuelState.COUNTDOWN && (
                            <GameBanner text="3" variant="countdown" animate />
                        )}
                        {game.context.state === DuelState.WAIT_DRAW && (
                            <GameBanner text="..." variant="wait" />
                        )}
                    </GameArena>
                </section>

                {/* Opponent Camera */}
                <section className="game-screen__camera game-screen__camera--opponent">
                    <div className="video-container">
                        {webrtc.remoteStream ? (
                            <video
                                ref={remoteVideoRef}
                                autoPlay
                                playsInline
                                className="opponent-video"
                            />
                        ) : (
                            <div className="opponent-placeholder">
                                <div className={`status-dot ${opponent ? 'status-dot--online' : 'status-dot--offline'}`} />
                                <span>{opponent?.name || t('duel.waiting')}</span>
                            </div>
                        )}
                        <div className="opponent-status">
                            {opponent?.isReady && <span className="ready-badge">READY</span>}
                            {game.context.opponentHandReady && <span className="hand-indicator">✋</span>}
                        </div>
                    </div>
                </section>
            </div>

            {/* Controls Section */}
            <section className="game-screen__controls">
                {showReadyButton && (
                    <button
                        className="btn btn-primary btn-large"
                        onClick={handleReady}
                    >
                        {t('duel.ready')}
                    </button>
                )}

                {game.context.state === DuelState.RESULT && (
                    <button
                        className="btn btn-primary btn-large"
                        onClick={() => {
                            game.reset();
                            handleReady();
                        }}
                    >
                        {t('duel.playAgain')}
                    </button>
                )}
            </section>
        </div>
    );
}
