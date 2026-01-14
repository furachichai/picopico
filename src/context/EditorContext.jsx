import { createContext, useContext, useReducer } from 'react';
import { ELEMENT_TYPES } from '../types';

const EditorContext = createContext();

const initialState = {
    lesson: {
        id: 'draft-1',
        title: 'Untitled Lesson',
        slides: [
            {
                id: 'slide-1',
                background: '#E1F5FE',
                elements: [],
                order: 0,
            },
        ],
        author: 'User',
        createdAt: new Date(),
        updatedAt: null,
        path: null, // Local file path
    },
    currentSlideId: 'slide-1',
    selectedElementId: null,
    currentSlideId: 'slide-1',
    selectedElementId: null,
    isDirty: false,
    view: 'dashboard', // 'dashboard', 'editor', 'player', 'slides'
    readOnly: false, // Default to false, will be set on mount
};

const editorReducer = (state, action) => {
    switch (action.type) {
        case 'SET_VIEW':
            return { ...state, view: action.payload };

        case 'SET_READ_ONLY':
            return { ...state, readOnly: action.payload };

        case 'TOGGLE_PREVIEW':
            return { ...state, view: state.view === 'editor' ? 'player' : 'editor' };

        case 'SET_CURRENT_SLIDE':
            return { ...state, currentSlideId: action.payload };

        case 'ADD_SLIDE': {
            const newSlide = {
                id: `slide-${Date.now()}`,
                background: '#E1F5FE',
                elements: [],
                order: state.lesson.slides.length,
            };
            return {
                ...state,
                isDirty: true,
                lesson: {
                    ...state.lesson,
                    slides: [...state.lesson.slides, newSlide],
                },
                currentSlideId: newSlide.id,
            };
        }

        case 'INSERT_SLIDE': {
            const currentIndex = state.lesson.slides.findIndex(s => s.id === state.currentSlideId);
            if (currentIndex === -1) return state;

            const insertIndex = action.payload === 'before' ? currentIndex : currentIndex + 1;
            const newSlide = {
                id: `slide-${Date.now()}`,
                background: '#E1F5FE',
                elements: [],
                order: insertIndex,
            };

            const newSlides = [...state.lesson.slides];
            newSlides.splice(insertIndex, 0, newSlide);
            // Update order for all slides
            newSlides.forEach((s, i) => s.order = i);

            return {
                ...state,
                isDirty: true,
                lesson: {
                    ...state.lesson,
                    slides: newSlides,
                },
                currentSlideId: newSlide.id,
            };
        }

        case 'UPDATE_SLIDE_BACKGROUND': {
            return {
                ...state,
                isDirty: true,
                lesson: {
                    ...state.lesson,
                    slides: state.lesson.slides.map((slide) =>
                        slide.id === state.currentSlideId
                            ? { ...slide, background: action.payload }
                            : slide
                    ),
                },
            };
        }

        case 'ADD_ELEMENT': {
            const currentSlide = state.lesson.slides.find(s => s.id === state.currentSlideId);
            if (!currentSlide) return state;

            const baseElement = {
                id: `el-${Date.now()}`,
                type: action.payload.type,
                content: action.payload.content,
                x: 50, // Center
                y: action.payload.type === 'quiz'
                    ? (action.payload.metadata?.quizType === 'tf' ? 85 : 75)
                    : 50,
                width: action.payload.metadata?.width || 20,
                height: action.payload.metadata?.height || 10,
                rotation: 0,
                scale: 1,
            };

            // Build metadata based on element type
            let elementMetadata = action.payload.metadata || {};

            if (action.payload.type === 'balloon') {
                elementMetadata = {
                    ...elementMetadata,
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    fontFamily: 'Comic Sans MS, Comic Sans, cursive',
                    fontSize: 16,
                    tailPos: { x: 20, y: 50 }
                };
                baseElement.width = 40;
                baseElement.height = 20;
            }

            const newElement = {
                ...baseElement,
                metadata: elementMetadata
            };

            return {
                ...state,
                isDirty: true,
                lesson: {
                    ...state.lesson,
                    slides: state.lesson.slides.map((slide) =>
                        slide.id === state.currentSlideId
                            ? { ...slide, elements: [...slide.elements, newElement] }
                            : slide
                    ),
                },
                selectedElementId: newElement.id,
            };
        }

        case 'UPDATE_SLIDE': {
            return {
                ...state,
                isDirty: true,
                lesson: {
                    ...state.lesson,
                    slides: state.lesson.slides.map((slide) =>
                        slide.id === state.currentSlideId
                            ? { ...slide, ...action.payload }
                            : slide
                    ),
                },
            };
        }

        case 'UPDATE_ELEMENT': {
            return {
                ...state,
                isDirty: true,
                lesson: {
                    ...state.lesson,
                    slides: state.lesson.slides.map((slide) =>
                        slide.id === state.currentSlideId
                            ? {
                                ...slide,
                                elements: slide.elements.map((el) =>
                                    el.id === action.payload.id ? { ...el, ...action.payload.updates } : el
                                ),
                            }
                            : slide
                    ),
                },
            };
        }

        case 'DELETE_SLIDE': {
            if (state.lesson.slides.length <= 1) return state; // Prevent deleting last slide
            const newSlides = state.lesson.slides.filter(s => s.id !== action.payload);
            const newCurrentId = state.currentSlideId === action.payload
                ? newSlides[0].id
                : state.currentSlideId;

            return {
                ...state,
                isDirty: true,
                lesson: { ...state.lesson, slides: newSlides },
                currentSlideId: newCurrentId,
            };
        }

        case 'MOVE_SLIDE': {
            const { slideId, direction } = action.payload;
            const index = state.lesson.slides.findIndex(s => s.id === slideId);
            if (index === -1) return state;

            const newIndex = direction === 'left' ? index - 1 : index + 1;
            if (newIndex < 0 || newIndex >= state.lesson.slides.length) return state;

            const newSlides = [...state.lesson.slides];
            const [movedSlide] = newSlides.splice(index, 1);
            newSlides.splice(newIndex, 0, movedSlide);

            // Update order property if needed, or just rely on array order
            newSlides.forEach((s, i) => s.order = i);

            return {
                ...state,
                isDirty: true,
                lesson: { ...state.lesson, slides: newSlides },
            };
        }

        case 'SELECT_ELEMENT':
            return { ...state, selectedElementId: action.payload };

        case 'DELETE_ELEMENT':
            return {
                ...state,
                isDirty: true,
                lesson: {
                    ...state.lesson,
                    slides: state.lesson.slides.map((slide) =>
                        slide.id === state.currentSlideId
                            ? {
                                ...slide,
                                elements: slide.elements.filter((el) => el.id !== action.payload),
                            }
                            : slide
                    ),
                },
                selectedElementId: null,
            };

        case 'DUPLICATE_ELEMENT': {
            const currentSlide = state.lesson.slides.find(s => s.id === state.currentSlideId);
            if (!currentSlide) return state;

            const elementToDuplicate = currentSlide.elements.find(el => el.id === action.payload);
            if (!elementToDuplicate) return state;

            const newElement = {
                ...elementToDuplicate,
                id: `el-${Date.now()}`,
                x: elementToDuplicate.x + 5,
                y: elementToDuplicate.y + 5,
            };

            return {
                ...state,
                isDirty: true,
                lesson: {
                    ...state.lesson,
                    slides: state.lesson.slides.map((slide) =>
                        slide.id === state.currentSlideId
                            ? { ...slide, elements: [...slide.elements, newElement] }
                            : slide
                    ),
                },
                selectedElementId: newElement.id,
            };
        }

        case 'UPDATE_LESSON_METADATA':
            // If we are updating 'updatedAt', it means we are saving
            const isSaving = !!action.payload.updatedAt;
            return {
                ...state,
                isDirty: isSaving ? false : state.isDirty, // Reset dirty if saving, else keep it (or set true if title changes?)
                // Actually if title changes, it's a modification. But usually we save immediately after title change in first save.
                // Let's assume UPDATE_LESSON_METADATA with updatedAt is the "Save" action.
                lesson: {
                    ...state.lesson,
                    ...action.payload,
                },
            };

        case 'LOAD_LESSON':
            return {
                ...state,
                lesson: action.payload,
                currentSlideId: action.payload.slides[0]?.id || 'slide-1',
                selectedElementId: null,
                isDirty: false,
            };

        case 'NEW_LESSON':
            return {
                ...initialState,
                view: 'editor', // Switch to editor view
                lesson: {
                    ...initialState.lesson,
                    id: `draft-${Date.now()}`,
                    createdAt: new Date(),
                    ...action.payload, // Merge any initial data (subject, topic, etc.)
                },
                isDirty: false,
            };

        default:
            return state;
    }
};

export const EditorProvider = ({ children }) => {
    const [state, dispatch] = useReducer(editorReducer, initialState);

    return (
        <EditorContext.Provider value={{ state, dispatch }}>
            {children}
        </EditorContext.Provider>
    );
};

export const useEditor = () => {
    const context = useContext(EditorContext);
    if (!context) {
        throw new Error('useEditor must be used within an EditorProvider');
    }
    return context;
};
