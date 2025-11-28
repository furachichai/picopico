import React from 'react';
import './LessonMenu.css';

const MOCK_LESSONS = [
    { id: '1', title: 'Algebra Basics', author: 'MathWhiz', color: '#ffadad' },
    { id: '2', title: 'Geometry Shapes', author: 'GeoMaster', color: '#ffd6a5' },
    { id: '3', title: 'Fractions Fun', author: 'FractionFan', color: '#fdffb6' },
    { id: '4', title: 'Multiplication', author: 'TimesTable', color: '#caffbf' },
    { id: '5', title: 'Division', author: 'Divider', color: '#9bf6ff' },
];

const LessonMenu = ({ onSelectLesson, onBack }) => {
    return (
        <div className="lesson-menu">
            <div className="menu-header">
                <h2>Explore Lessons</h2>
                <button className="close-menu-btn" onClick={onBack}>&times;</button>
            </div>
            <div className="lessons-list">
                <div className="lesson-card current-draft" onClick={() => onSelectLesson('draft')}>
                    <h3>Current Draft</h3>
                    <p>Your work in progress</p>
                </div>
                {MOCK_LESSONS.map(lesson => (
                    <div
                        key={lesson.id}
                        className="lesson-card"
                        style={{ borderLeft: `6px solid ${lesson.color}` }}
                        onClick={() => onSelectLesson(lesson.id)}
                    >
                        <h3>{lesson.title}</h3>
                        <p>by {lesson.author}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LessonMenu;
