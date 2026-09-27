import React from 'react';
import { BookOpen, Compass, Layers, Gamepad2 } from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { useLanguage } from '../../context/LanguageContext';
import './BottomNav.css';

const SECTORS = [
  {
    id: 'lessons',
    view: 'dashboard',
    labelEn: 'LESSONS',
    labelEs: 'LECCIONES',
    icon: BookOpen,
    color: '#FF8C00', // Primary orange
    rgb: '255, 140, 0',
  },
  {
    id: 'feed',
    view: 'discover',
    labelEn: 'FEED',
    labelEs: 'FEED',
    icon: Compass,
    color: '#EC4899', // Pink
    rgb: '236, 72, 153',
  },
  {
    id: 'cards',
    view: 'cards',
    labelEn: 'CARDS',
    labelEs: 'CARDS',
    icon: Layers,
    color: '#8B5CF6', // Violet
    rgb: '139, 92, 246',
  },
  {
    id: 'game',
    view: 'game',
    labelEn: 'GAMES',
    labelEs: 'JUEGOS',
    icon: Gamepad2,
    color: '#F59E0B', // Amber
    rgb: '245, 158, 11',
  },
];

const BottomNav = ({ activeSector, theme = 'light' }) => {
  const { state, dispatch } = useEditor();
  const { language } = useLanguage ? useLanguage() : { language: 'en' };

  // Detect which sector is active if not explicitly provided
  const currentSector = activeSector || (() => {
    switch (state.view) {
      case 'discover': return 'feed';
      case 'cards': return 'cards';
      case 'game': return 'game';
      default: return 'lessons';
    }
  })();

  const isDark = theme === 'dark';

  const handleNavClick = (sector) => {
    if (state.view !== sector.view) {
      dispatch({ type: 'SET_VIEW', payload: sector.view });
    } else {
      // If already on the view, smoothly scroll the active container to top
      const scrollable = document.querySelector('.scroll-area, .cards-scroll-area');
      if (scrollable) {
        scrollable.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  return (
    <nav
      className={`pico-bottom-nav theme-${isDark ? 'dark' : 'light'}`}
      role="navigation"
      aria-label="Main Navigation"
    >
      {SECTORS.map((sector) => {
        const isActive = currentSector === sector.id;
        const IconComponent = sector.icon;
        const label = language === 'es' ? sector.labelEs : sector.labelEn;

        // Subtle indicator styling
        const activeBg = isDark
          ? `rgba(${sector.rgb}, 0.20)`
          : `rgba(${sector.rgb}, 0.11)`;
        const inactiveColor = isDark
          ? 'rgba(255, 255, 255, 0.45)'
          : '#94A3B8';

        const itemColor = isActive ? sector.color : inactiveColor;
        const itemBg = isActive ? activeBg : 'transparent';

        return (
          <button
            key={sector.id}
            type="button"
            className={`pico-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => handleNavClick(sector)}
            style={{
              backgroundColor: itemBg,
              color: itemColor,
            }}
            aria-current={isActive ? 'page' : undefined}
            title={label}
          >
            <IconComponent
              size={23}
              strokeWidth={isActive ? 2.4 : 1.9}
              style={{
                color: itemColor,
                transition: 'color 0.2s ease, stroke-width 0.2s ease',
              }}
            />
            <span
              className="pico-nav-label"
              style={{
                color: itemColor,
                fontWeight: isActive ? 800 : 700,
              }}
            >
              {label}
            </span>
            {/* Subtle active indicator pill bar */}
            <div
              className="pico-nav-indicator"
              style={{
                backgroundColor: isActive ? sector.color : 'transparent',
                opacity: isActive ? 1 : 0,
              }}
            />
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
