import React, { useState, useEffect } from 'react';
import { Maximize, Minimize } from 'lucide-react';

const FullscreenToggle = ({ className, style }) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showIosTip, setShowIosTip] = useState(false);

    useEffect(() => {
        const handleFullscreenChange = () => {
            const fs = !!document.fullscreenElement || !!document.webkitFullscreenElement || !!document.msFullscreenElement;
            setIsFullscreen(fs);
            if (!fs) {
                document.documentElement.classList.remove('fullscreen-active');
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('msfullscreenchange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('msfullscreenchange', handleFullscreenChange);
        };
    }, []);

    const toggleFullscreen = async () => {
        const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;

        const elem = document.documentElement;
        const requestFs = elem.requestFullscreen || elem.webkitRequestFullscreen || elem.msRequestFullscreen;
        const exitFs = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;

        if (!isFullscreen) {
            let succeeded = false;
            if (requestFs) {
                try {
                    await requestFs.call(elem);
                    succeeded = true;
                    setIsFullscreen(true);
                } catch (err) {
                    console.warn('Native fullscreen request rejected:', err);
                }
            }

            if (!succeeded) {
                // Fallback / iPhone Safari: pseudo-fullscreen mode
                setIsFullscreen(true);
                document.documentElement.classList.add('fullscreen-active');

                // Trigger iOS Safari toolbar minimization
                if (isIos) {
                    window.scrollTo(0, 1);
                    setTimeout(() => window.scrollTo(0, 0), 80);

                    // Show quick Home Screen installation hint if not already standalone
                    if (!isStandalone) {
                        setShowIosTip(true);
                        setTimeout(() => setShowIosTip(false), 4000);
                    }
                }
            }
        } else {
            // Exit Fullscreen
            if (exitFs && (document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement)) {
                try {
                    await exitFs.call(document);
                } catch (err) {
                    console.warn('Exit fullscreen failed:', err);
                }
            }
            setIsFullscreen(false);
            document.documentElement.classList.remove('fullscreen-active');
            setShowIosTip(false);
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={toggleFullscreen}
                className={className}
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                style={{
                    backgroundColor: '#FFFFFF',
                    color: '#1E293B',
                    border: '2px solid #000000',
                    borderRadius: '12px',
                    boxShadow: '2px 2px 0px #000000',
                    width: '36px',
                    height: '36px',
                    padding: 0,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.1s ease',
                    flexShrink: 0,
                    ...style
                }}
            >
                {isFullscreen ? <Minimize size={18} strokeWidth={2.4} /> : <Maximize size={18} strokeWidth={2.4} />}
            </button>

            {/* iOS PWA Standalone Fullscreen Tip */}
            {showIosTip && (
                <div style={{
                    position: 'fixed',
                    bottom: '72px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(15, 23, 42, 0.96)',
                    color: '#FFFFFF',
                    padding: '8px 16px',
                    borderRadius: '14px',
                    border: '1.5px solid rgba(255, 255, 255, 0.25)',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    textAlign: 'center',
                    zIndex: 9999,
                    pointerEvents: 'none',
                    width: 'max-content',
                    maxWidth: '88vw',
                    lineHeight: 1.3
                }}>
                    📲 Tip for borderless fullscreen: tap <b>Share ⎋</b> → <b>Add to Home Screen</b>
                </div>
            )}
        </>
    );
};

export default FullscreenToggle;
