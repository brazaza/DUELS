// ============================================
// Duel Menu Component
// ============================================

import { useState, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { useWebSocket } from '../hooks/useWebSocket';
import './DuelMenu.css';

interface DuelMenuProps {
    ws: ReturnType<typeof useWebSocket>;
    onBack: () => void;
    initialRoomCode?: string | null;
    onRoomCodeUsed?: () => void;
}

export function DuelMenu({ ws, onBack, initialRoomCode, onRoomCodeUsed }: DuelMenuProps) {
    const { t } = useTranslation();
    const [joinCode, setJoinCode] = useState(initialRoomCode || '');
    const [playerName, setPlayerName] = useState(() => {
        return localStorage.getItem('duels_playerName') || 'Player';
    });

    // Auto-join if we have an initial room code from URL
    useEffect(() => {
        if (initialRoomCode && ws.isConnected && !ws.roomCode) {
            ws.joinRoom(initialRoomCode, playerName);
            onRoomCodeUsed?.();
        }
    }, [initialRoomCode, ws.isConnected, ws.roomCode, playerName, onRoomCodeUsed, ws]);

    // Save player name to local storage
    useEffect(() => {
        localStorage.setItem('duels_playerName', playerName);
    }, [playerName]);

    const handleCreate = () => {
        ws.createRoom(playerName);
    };

    const handleJoin = () => {
        if (joinCode.length === 6) {
            ws.joinRoom(joinCode, playerName);
        }
    };

    return (
        <div className="duel-menu">
            <header className="duel-menu__header">
                <button className="btn btn-outline" onClick={onBack}>
                    ← {t('duel.back')}
                </button>
                <h2 className="duel-menu__title">{t('duel.title')}</h2>
                <div style={{ width: 80 }} />
            </header>

            <main className="duel-menu__content">
                <div className="duel-menu__options">
                    <div className="mb-8">
                        <label className="block text-sm opacity-70 mb-2">Your Name</label>
                        <input
                            type="text"
                            className="duel-menu__input"
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                            maxLength={12}
                        />
                    </div>

                    <button
                        className="btn btn-primary btn-large w-full mb-8"
                        onClick={handleCreate}
                        disabled={ws.isConnected === false}
                    >
                        {t('duel.createRoom')}
                    </button>

                    <div className="duel-menu__divider">
                        <span>{t('duel.or')}</span>
                    </div>

                    <div className="duel-menu__join">
                        <input
                            type="text"
                            className="duel-menu__input"
                            placeholder={t('duel.enterCode')}
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                            maxLength={6}
                        />
                        <button
                            className="btn btn-secondary w-full"
                            onClick={handleJoin}
                            disabled={joinCode.length !== 6 || ws.isConnected === false}
                        >
                            {t('duel.join')}
                        </button>
                    </div>

                    {ws.error && (
                        <div className="text-red-500 mt-4 text-center animate-shake">
                            {ws.error}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
