import { useState, useCallback, useEffect } from 'react';
import { MainMenu } from './components/MainMenu';
import { TrainingScreen } from './components/TrainingScreen';
import { DuelMenu } from './components/DuelMenu';
import { DuelScreen } from './components/DuelScreen';
import { getSoundManager } from './modules/soundManager';
import { useWebSocket } from './hooks/useWebSocket';

type Screen = 'menu' | 'training' | 'duel';

// Parse room code from URL (supports /room/CODE and /join/CODE)
function getRoomCodeFromURL(): string | null {
    const path = window.location.pathname;
    const match = path.match(/^\/(room|join|r)\/([A-Z0-9]{6})$/i);
    return match ? match[2].toUpperCase() : null;
}

// Update URL without page reload
function updateURL(roomCode: string | null) {
    const newPath = roomCode ? `/room/${roomCode}` : '/';
    if (window.location.pathname !== newPath) {
        window.history.pushState({}, '', newPath);
    }
}

function App() {
    const [screen, setScreen] = useState<Screen>('menu');
    const [soundInitialized, setSoundInitialized] = useState(false);
    const [pendingRoomCode, setPendingRoomCode] = useState<string | null>(null);

    // Initialize WebSocket hook at top level to persist connection
    const ws = useWebSocket();

    // Check URL for room code on mount
    useEffect(() => {
        const urlRoomCode = getRoomCodeFromURL();
        if (urlRoomCode) {
            setPendingRoomCode(urlRoomCode);
            setScreen('duel');
        }
    }, []);

    // Initialize sound on first user interaction
    const handleFirstInteraction = useCallback(async () => {
        if (!soundInitialized) {
            await getSoundManager().initialize();
            setSoundInitialized(true);
        }
    }, [soundInitialized]);

    useEffect(() => {
        const handler = () => handleFirstInteraction();
        window.addEventListener('click', handler, { once: true });
        window.addEventListener('touchstart', handler, { once: true });

        // Connect to WebSocket server
        ws.connect();

        // Handle browser back/forward
        const handlePopState = () => {
            const urlRoomCode = getRoomCodeFromURL();
            if (urlRoomCode) {
                setPendingRoomCode(urlRoomCode);
                setScreen('duel');
            } else if (window.location.pathname === '/') {
                setScreen('menu');
            }
        };
        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('click', handler);
            window.removeEventListener('touchstart', handler);
            window.removeEventListener('popstate', handlePopState);
        };
    }, [handleFirstInteraction, ws]);

    // Update URL when room code changes
    useEffect(() => {
        if (screen === 'duel') {
            updateURL(ws.roomCode);
        } else if (screen === 'menu') {
            updateURL(null);
        }
    }, [ws.roomCode, screen]);

    const navigateTo = useCallback((newScreen: Screen) => {
        setScreen(newScreen);
    }, []);

    // Clear pending room code after it's used
    const clearPendingRoom = useCallback(() => {
        setPendingRoomCode(null);
        updateURL(null);
    }, []);

    // Handle leaving duel - clear URL and go back
    const handleLeaveDuel = useCallback(() => {
        ws.leaveRoom();
        clearPendingRoom();
        navigateTo('menu');
    }, [ws, clearPendingRoom, navigateTo]);

    // If we are in duel mode and have a room code, show DuelScreen
    // Otherwise show DuelMenu
    const renderDuelContent = () => {
        if (ws.roomCode) {
            return <DuelScreen ws={ws} onBack={handleLeaveDuel} />;
        }
        return (
            <DuelMenu 
                ws={ws} 
                onBack={() => { clearPendingRoom(); navigateTo('menu'); }}
                initialRoomCode={pendingRoomCode}
                onRoomCodeUsed={() => setPendingRoomCode(null)}
            />
        );
    };

    return (
        <div className="app">
            {screen === 'menu' && (
                <MainMenu
                    onTraining={() => navigateTo('training')}
                    onDuel={() => navigateTo('duel')}
                />
            )}
            {screen === 'training' && (
                <TrainingScreen onBack={() => navigateTo('menu')} />
            )}
            {screen === 'duel' && renderDuelContent()}
        </div>
    );
}

export default App;
