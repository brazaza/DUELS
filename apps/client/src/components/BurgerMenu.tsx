// ============================================
// Burger Menu Component for Mobile
// ============================================

import { useState, useRef, useEffect } from 'react';
import './BurgerMenu.css';

interface MenuItem {
    label: string;
    icon?: string;
    onClick: () => void;
    danger?: boolean;
}

interface BurgerMenuProps {
    items: MenuItem[];
    className?: string;
}

export function BurgerMenu({ items, className = '' }: BurgerMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    // Close menu on escape
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    return (
        <div className={`burger-menu ${className}`} ref={menuRef}>
            <button 
                className={`burger-menu__trigger ${isOpen ? 'burger-menu__trigger--open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Menu"
                aria-expanded={isOpen}
            >
                <span className="burger-menu__line" />
                <span className="burger-menu__line" />
                <span className="burger-menu__line" />
            </button>

            {isOpen && (
                <div className="burger-menu__dropdown">
                    {items.map((item, index) => (
                        <button
                            key={index}
                            className={`burger-menu__item ${item.danger ? 'burger-menu__item--danger' : ''}`}
                            onClick={() => {
                                item.onClick();
                                setIsOpen(false);
                            }}
                        >
                            {item.icon && <span className="burger-menu__item-icon">{item.icon}</span>}
                            <span className="burger-menu__item-label">{item.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// Simple icon button for header actions
interface IconButtonProps {
    icon: string;
    label: string;
    onClick: () => void;
    variant?: 'default' | 'danger';
    className?: string;
}

export function IconButton({ icon, label, onClick, variant = 'default', className = '' }: IconButtonProps) {
    return (
        <button 
            className={`icon-button icon-button--${variant} ${className}`}
            onClick={onClick}
            aria-label={label}
            title={label}
        >
            {icon}
        </button>
    );
}
