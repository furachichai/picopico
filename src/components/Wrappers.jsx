import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { EditorProvider } from '../context/EditorContext';
import Editor from './Editor/Editor';
import Player from './Player/Player';
import { useEffect } from 'react';

export const EditorWrapper = () => {
    const { lessonId } = useParams();
    const { getLesson, updateLesson, deleteLesson } = useApp();
    const lesson = getLesson(lessonId);
    const navigate = useNavigate();

    if (!lesson) {
        return <div>Lesson not found</div>;
    }

    // We need a way to save changes back to AppContext
    // This component wraps EditorProvider, but EditorProvider manages its own state.
    // We can create a component inside EditorProvider that listens to changes and syncs them?
    // Or we can just pass a save callback to EditorProvider?
    // For now, let's create a SyncComponent inside.

    return (
        <EditorProvider initialLesson={lesson}>
            <EditorWithSync
                onSave={(updatedLesson) => updateLesson(lessonId, updatedLesson)}
                onBack={() => navigate('/')}
                onDelete={() => {
                    if (window.confirm('Are you sure you want to delete this lesson?')) {
                        deleteLesson(lessonId);
                        navigate('/');
                    }
                }}
            />
        </EditorProvider>
    );
};

const EditorWithSync = ({ onSave, onBack, onDelete }) => {
    const { state, dispatch } = useEditor();

    // Auto-save effect
    useEffect(() => {
        const timer = setTimeout(() => {
            onSave(state.lesson);
        }, 1000); // Debounce save
        return () => clearTimeout(timer);
    }, [state.lesson, onSave]);

    if (state.view === 'player') {
        return (
            <div className="h-screen bg-black">
                <Player onFinish={() => dispatch({ type: 'TOGGLE_PREVIEW' })} />
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col">
            {/* Custom Toolbar or Back Button could go here if not inside Editor */}

            <Editor onDelete={onDelete} onBack={onBack} />
        </div>
    );
};
import { useEditor } from '../context/EditorContext'; // Import useEditor

export const PlayerWrapper = () => {
    const { lessonId } = useParams();
    const { getLesson } = useApp();
    const lesson = getLesson(lessonId);
    const navigate = useNavigate();

    if (!lesson) {
        return <div>Lesson not found</div>;
    }

    return (
        <EditorProvider initialLesson={lesson}>
            <PlayerWithExit onExit={() => navigate('/')} />
        </EditorProvider>
    );
};

const PlayerWithExit = ({ onExit }) => {
    // We might need to inject the onExit handler into the Player
    // For now, Player handles its own completion logic, but we need to tell it what to do on finish.
    // Let's pass onExit as a prop to Player if we modify Player to accept it.
    // Or we can just render a close button here.

    return (
        <div className="relative h-screen bg-black">
            <Player onFinish={onExit} />
        </div>
    );
};
