import React, { useState } from 'react';
import './AssetLibrary.css';
import { useEditor } from '../../context/EditorContext';
import { ELEMENT_TYPES } from '../../types';

const ASSETS = {
    emojis: [
        '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', 'cow', 'pig', 'frog', 'monkey', 'chicken', 'penguin', 'bird', 'duck', 'eagle', 'owl', 'bat', 'wolf', 'boar', 'horse', 'unicorn',
    ],
    backgrounds: [
        '#ffffff', '#f0f0f0', '#ffcccc', '#ccffcc', '#ccccff', '#ffffcc', '#ffccff', '#ccffff', '#e5e5e5', '#333333', '#000000',
        'linear-gradient(45deg, #ff9a9e 0%, #fad0c4 99%, #fad0c4 100%)',
        'linear-gradient(to top, #a18cd1 0%, #fbc2eb 100%)',
        'url("https://images.unsplash.com/photo-1557683316-973673baf926?w=400&q=80")', // Gradient
        'url("https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&q=80")', // Texture
        'url("https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=400&q=80")', // Abstract
        'url("https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=400&q=80")', // Paint
        'url("https://images.unsplash.com/photo-1508614999368-9260051292e5?w=400&q=80")', // Light
        'url("https://images.unsplash.com/photo-1550147760-44c9966d6bc7?w=400&q=80")', // Water
        'url("https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?w=400&q=80")', // Space
        'url("https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=400&q=80")', // Nature
        'url("https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=400&q=80")', // Mountain
        'url("https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=400&q=80")', // City
        'url("https://images.unsplash.com/photo-1534239143101-1b1c627395c5?w=400&q=80")', // Texture 2
    ],
    gifs: [
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbXp1Z2J6a3Z6a3Z6a3Z6a3Z6a3Z6a3Z6a3Z6a3Z6a3Z6/3o7TKSjRrfIPjeiVyM/giphy.gif', // Cat
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbXp1Z2J6a3Z6a3Z6a3Z6a3Z6a3Z6a3Z6a3Z6a3Z6a3Z6/l0HlHFRbmaZtBRhXG/giphy.gif', // Dog
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbXp1Z2J6a3Z6a3Z6a3Z6a3Z6a3Z6a3Z6a3Z6a3Z6a3Z6/3o7TKMt1VVNkHVyPaE/giphy.gif', // Dance
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbXp1Z2J6a3Z6a3Z6a3Z6a3Z6a3Z6a3Z6a3Z6a3Z6a3Z6/l0HlO3BJ8LALPW4sE/giphy.gif', // Party
    ]
};

// Load custom characters from src/assets/characters
const customCharacters = import.meta.glob('../../assets/characters/*.{png,jpg,jpeg,svg,webp}', { eager: true });
const customCharacterList = Object.values(customCharacters).map(mod => mod.default);

// Load custom backgrounds from src/assets/backgrounds
const customBackgrounds = import.meta.glob('../../assets/backgrounds/*.{png,jpg,jpeg,svg,webp}', { eager: true });
const customBackgroundList = Object.values(customBackgrounds).map(mod => mod.default);

const AssetLibrary = ({ onClose }) => {
    const { dispatch } = useEditor();
    const [activeTab, setActiveTab] = useState('custom');

    const handleSelect = (item) => {
        if (activeTab === 'backgrounds' || activeTab === 'custom-bg') {
            // Check if it's a URL (custom bg) or a color/gradient
            const payload = item.startsWith('http') || item.startsWith('data:') || item.startsWith('/') ? `url("${item}")` : item;
            // If it's already a url() string (from ASSETS.backgrounds), use it as is
            const finalPayload = item.includes('url(') || item.startsWith('#') || item.startsWith('linear-gradient') ? item : `url("${item}")`;

            dispatch({ type: 'UPDATE_SLIDE_BACKGROUND', payload: finalPayload });
            onClose();
        } else if (activeTab === 'gifs' || activeTab === 'custom') {
            // Pre-load image to get dimensions
            const img = new Image();
            img.onload = () => {
                const aspectRatio = img.naturalWidth / img.naturalHeight;
                // Target width: 40% of screen width (360px)
                const targetWidthPercent = 40;
                const targetWidthPx = 360 * (targetWidthPercent / 100);
                const targetHeightPx = targetWidthPx / aspectRatio;
                const targetHeightPercent = (targetHeightPx / 640) * 100;

                dispatch({
                    type: 'ADD_ELEMENT',
                    payload: {
                        type: ELEMENT_TYPES.IMAGE,
                        content: item,
                        metadata: {
                            width: targetWidthPercent,
                            height: targetHeightPercent
                        }
                    }
                });
                onClose();
            };
            img.src = item;
        } else {
            // Emojis
            dispatch({
                type: 'ADD_ELEMENT',
                payload: { type: ELEMENT_TYPES.TEXT, content: item, metadata: { fontSize: '4rem' } }
            });
            onClose();
        }
    };

    return (
        <div className="asset-library">
            <div className="library-header">
                <h3>Library</h3>
                <button className="close-btn" onClick={onClose}>×</button>
            </div>

            <div className="library-tabs">
                <button
                    className={activeTab === 'custom' ? 'active' : ''}
                    onClick={() => setActiveTab('custom')}
                >
                    IMGs
                </button>
                <button
                    className={activeTab === 'custom-bg' ? 'active' : ''}
                    onClick={() => setActiveTab('custom-bg')}
                >
                    BKGs
                </button>
                <button
                    className={activeTab === 'emojis' ? 'active' : ''}
                    onClick={() => setActiveTab('emojis')}
                >
                    EMOJIS
                </button>
                <button
                    className={activeTab === 'backgrounds' ? 'active' : ''}
                    onClick={() => setActiveTab('backgrounds')}
                >
                    COLORS
                </button>
                <button
                    className={activeTab === 'gifs' ? 'active' : ''}
                    onClick={() => setActiveTab('gifs')}
                >
                    GIFS
                </button>
            </div>

            <div className="library-content">
                <div className="assets-grid">
                    {activeTab === 'custom' && (
                        customCharacterList.length > 0 ? (
                            customCharacterList.map((src, index) => (
                                <div
                                    key={index}
                                    className="asset-item custom"
                                    onClick={() => handleSelect(src)}
                                >
                                    <img src={src} alt="character" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                </div>
                            ))
                        ) : (
                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px', color: '#666' }}>
                                No characters found. <br />
                                Add images to <code>src/assets/characters</code>
                            </div>
                        )
                    )}

                    {activeTab === 'custom-bg' && (
                        customBackgroundList.length > 0 ? (
                            customBackgroundList.map((src, index) => (
                                <div
                                    key={index}
                                    className="asset-item custom-bg"
                                    onClick={() => handleSelect(src)}
                                >
                                    <img src={src} alt="background" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                                </div>
                            ))
                        ) : (
                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px', color: '#666' }}>
                                No backgrounds found. <br />
                                Add images to <code>src/assets/backgrounds</code>
                            </div>
                        )
                    )}

                    {activeTab === 'emojis' && ASSETS.emojis.map((item, index) => (
                        <div
                            key={index}
                            className="asset-item emojis"
                            onClick={() => handleSelect(item)}
                        >
                            {item}
                        </div>
                    ))}

                    {activeTab === 'backgrounds' && ASSETS.backgrounds.map((item, index) => (
                        <div
                            key={index}
                            className="asset-item backgrounds"
                            onClick={() => handleSelect(item)}
                            style={{ background: item }}
                        />
                    ))}

                    {activeTab === 'gifs' && ASSETS.gifs.map((item, index) => (
                        <div
                            key={index}
                            className="asset-item gifs"
                            onClick={() => handleSelect(item)}
                        >
                            <img src={item} alt="gif" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AssetLibrary;
