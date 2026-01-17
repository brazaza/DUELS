// ============================================
// Main Menu Component
// ============================================

import { useTranslation } from '../hooks/useTranslation';
import './MainMenu.css';

interface MainMenuProps {
    onTraining: () => void;
    onDuel: () => void;
}

export function MainMenu({ onTraining, onDuel }: MainMenuProps) {
    const { t, lang, setLang } = useTranslation();

    return (
        <div className="main-menu">
            <header className="main-menu__header">
                <div className="lang-switcher">
                    <button
                        className={lang === 'ru' ? 'active' : ''}
                        onClick={() => setLang('ru')}
                    >
                        RU
                    </button>
                    <button
                        className={lang === 'en' ? 'active' : ''}
                        onClick={() => setLang('en')}
                    >
                        EN
                    </button>
                </div>
            </header>

            <main className="main-menu__content">
                <div className="main-menu__logo">
                    <h1 className="main-menu__title">{t('app.title')}</h1>
                    <div className="main-menu__subtitle">🤠 vs 🤠</div>
                </div>

                <div className="main-menu__buttons">
                    <button
                        className="btn btn-primary btn-large"
                        onClick={onTraining}
                    >
                        {t('menu.training')}
                    </button>

                    <button
                        className="btn btn-secondary btn-large"
                        onClick={onDuel}
                    >
                        {t('menu.duel')}
                    </button>
                </div>

                <div className="main-menu__instructions">
                    <p>✋ → ✊ = 💥</p>
                </div>
            </main>

            <footer className="main-menu__footer">
                <p>v0.1.0</p>
            </footer>
        </div>
    );
}
