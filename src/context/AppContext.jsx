import { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

const initialLessons = [
    {
        id: 'lesson-1',
        title: 'Welcome to PicoPico',
        description: 'Learn the basics of creating interactive lessons.',
        color: '#58CC02', // Green
        completed: false,
        locked: false,
        slides: [
            {
                id: 'slide-1',
                background: '#E1F5FE',
                elements: [
                    {
                        id: 'el-welcome',
                        type: 'text',
                        content: 'Welcome to PicoPico!',
                        x: 50,
                        y: 40,
                        width: 80,
                        height: 10,
                        rotation: 0,
                        scale: 1,
                        fontSize: 24,
                        textAlign: 'center',
                        color: '#333'
                    },
                    {
                        id: 'el-start',
                        type: 'text',
                        content: 'Tap to start learning.',
                        x: 50,
                        y: 60,
                        width: 80,
                        height: 10,
                        rotation: 0,
                        scale: 1,
                        fontSize: 16,
                        textAlign: 'center',
                        color: '#666'
                    }
                ],
                order: 0,
            }
        ],
        author: 'PicoPico Team',
        createdAt: new Date().toISOString(),
    }
];

export const AppProvider = ({ children }) => {
    const [lessons, setLessons] = useState(() => {
        const saved = localStorage.getItem('picopico_lessons');
        return saved ? JSON.parse(saved) : initialLessons;
    });

    useEffect(() => {
        localStorage.setItem('picopico_lessons', JSON.stringify(lessons));
    }, [lessons]);

    const addLesson = (lesson) => {
        setLessons(prev => [...prev, lesson]);
    };

    const updateLesson = (lessonId, updates) => {
        setLessons(prev => prev.map(l => l.id === lessonId ? { ...l, ...updates } : l));
    };

    const deleteLesson = (lessonId) => {
        setLessons(prev => prev.filter(l => l.id !== lessonId));
    };

    const getLesson = (lessonId) => {
        return lessons.find(l => l.id === lessonId);
    };

    return (
        <AppContext.Provider value={{ lessons, addLesson, updateLesson, deleteLesson, getLesson }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};
