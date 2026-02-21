import { useEffect, useRef, useCallback } from 'react';
import { GameEngine } from '../game/GameEngine.js';
import { GAME_STATE } from '../game/constants.js';

export default function Game() {
    const canvasRef = useRef(null);
    const engineRef = useRef(null);
    const rafRef = useRef(null);

    const gameLoop = useCallback((timestamp) => {
        if (engineRef.current) {
            engineRef.current.step(timestamp);
        }
        rafRef.current = requestAnimationFrame(gameLoop);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const engine = new GameEngine();
        engineRef.current = engine;

        // Click handler for title screen → gameplay transition
        const handleClick = (e) => {
            if (engine.state === GAME_STATE.TITLE) {
                const rect = canvas.getBoundingClientRect();
                const scaleX = 640 / rect.width; // SCREEN_W
                const scaleY = 480 / rect.height; // SCREEN_H
                const x = (e.clientX - rect.left) * scaleX;
                const y = (e.clientY - rect.top) * scaleY;
                engine.handleTitleClick(x, y);
            }
        };
        canvas.addEventListener('click', handleClick);

        // Initialize
        engine.init(canvas).then(() => {
            // Start game loop
            rafRef.current = requestAnimationFrame(gameLoop);
        });

        return () => {
            canvas.removeEventListener('click', handleClick);
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
            if (engineRef.current) {
                engineRef.current.destroy();
            }
        };
    }, [gameLoop]);

    return (
        <div className="game-container">
            <canvas
                ref={canvasRef}
                className="game-canvas"
            />
        </div>
    );
}
