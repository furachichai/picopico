import { useNavigate } from 'react-router-dom';
import { Edit, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const CoursesView = () => {
    const { lessons, addLesson } = useApp();
    const navigate = useNavigate();

    const handlePlay = (lessonId) => {
        navigate(`/lesson/${lessonId}`);
    };

    const handleEdit = (lessonId) => {
        navigate(`/editor/${lessonId}`);
    };

    const handleCreateLesson = () => {
        const newLesson = {
            id: `lesson-${Date.now()}`,
            title: 'New Lesson',
            description: 'Tap to edit this lesson',
            color: '#E5E7EB',
            completed: false,
            locked: false,
            slides: [
                {
                    id: `slide-${Date.now()}`,
                    background: '#FFFFFF',
                    elements: [],
                    order: 0,
                }
            ],
            author: 'You',
            createdAt: new Date().toISOString(),
        };
        addLesson(newLesson);
        navigate(`/editor/${newLesson.id}`);
    };

    return (
        <div className="p-4 max-w-md mx-auto h-full flex flex-col">
            {/* Top Bar */}
            <div className="flex flex-row justify-between items-center mb-8 px-2 border-b-4 border-black pb-4 bg-white sticky top-0 z-10 w-full">
                <div className="flex items-center gap-2">
                    <span className="text-3xl">🏆</span>
                    <span className="font-black text-lg whitespace-nowrap">Grade 2</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-3xl">🔥</span>
                    <span className="font-black text-lg">3</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-3xl">❤️</span>
                    <span className="font-black text-lg">5</span>
                </div>
            </div>

            {/* Chapter Header */}
            <div className="bg-[#FFD700] p-4 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_#000000] mb-10">
                <h2 className="text-xl font-black text-black uppercase tracking-wide">Chapter 2 - Fraction division</h2>
            </div>

            {/* Lesson List */}
            <div className="flex flex-col gap-8 w-full px-2 pb-32">
                {lessons.map((lesson, index) => {
                    // Vibrant Colors
                    const colors = [
                        'bg-[#0099FF]', // Blue
                        'bg-[#58CC02]', // Green
                        'bg-[#FF9600]', // Orange
                        'bg-[#CE82FF]'  // Purple
                    ];
                    const colorClass = colors[index % colors.length];

                    return (
                        <div
                            key={lesson.id}
                            className="flex items-center gap-4 w-full"
                        >
                            {/* Main Lesson Button */}
                            <button
                                className={`flex-1 flex items-center justify-start gap-4 ${colorClass} text-white border-4 border-black rounded-2xl shadow-[4px_4px_0px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_#000000] transition-all h-24 px-4 overflow-hidden`}
                                onClick={() => handlePlay(lesson.id)}
                            >
                                {/* Number Circle */}
                                <div className="w-12 h-12 bg-black/20 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-black/10">
                                    <span className="font-black text-2xl text-white">{index + 1}</span>
                                </div>

                                {/* Title */}
                                <span className="font-black text-xl text-left leading-tight uppercase drop-shadow-md">{lesson.title}</span>
                            </button>

                            {/* Edit Button (Small & Compact) */}
                            <button
                                onClick={(e) => { e.stopPropagation(); handleEdit(lesson.id); }}
                                className="w-12 h-12 bg-white hover:bg-gray-100 text-black border-4 border-black rounded-xl shadow-[4px_4px_0px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_#000000] transition-all flex items-center justify-center flex-shrink-0"
                            >
                                <Edit size={20} strokeWidth={3} />
                            </button>
                        </div>
                    );
                })}

                {/* Create New Lesson Button */}
                <button
                    className="w-full mt-4 bg-[#E5E7EB] hover:bg-gray-300 text-gray-500 border-4 border-black border-dashed rounded-2xl h-20 flex items-center justify-center gap-3 shadow-none active:scale-95 transition-transform"
                    onClick={handleCreateLesson}
                >
                    <Plus size={32} strokeWidth={4} />
                    <span className="font-black text-xl uppercase">Add New Lesson</span>
                </button>
            </div>
        </div>
    );
};

export default CoursesView;
