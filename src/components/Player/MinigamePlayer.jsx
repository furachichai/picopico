import React, { useState, useEffect } from 'react';
import './MinigamePlayer.css';

const MinigamePlayer = ({ data }) => {
    const [score, setScore] = useState(0);
    const [targetPos, setTargetPos] = useState({ top: '50%', left: '50%' });
    const [gameOver, setGameOver] = useState(false);

    const moveTarget = () => {
        const top = Math.random() * 80 + 10 + '%';
        const left = Math.random() * 80 + 10 + '%';
        setTargetPos({ top, left });
    };

    const handleClick = (e) => {
        e.stopPropagation(); // Prevent slide navigation swipe
        if (gameOver) return;

        const newScore = score + 1;
        setScore(newScore);

        if (newScore >= 5) {
            setGameOver(true);
        } else {
            moveTarget();
        }
    };

    const resetGame = (e) => {
        e.stopPropagation();
        setScore(0);
        setGameOver(false);
        moveTarget();
    };

    return (
        <div className="minigame-container">
            <div className="game-header">
                <span>Cartridge: Target Practice</span>
                <span>Score: {score}/5</span>
            </div>

            <div className="game-area">
                {!gameOver ? (
                    <button
                        className="game-target"
                        style={{ top: targetPos.top, left: targetPos.left }}
                        onClick={handleClick}
                    >
                        🎯
                    </button>
                ) : (
                    <div className="game-over">
                        <h3>You Win! 🏆</h3>
                        <button onClick={resetGame}>Play Again</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MinigamePlayer;
