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
        textPreset: null, // { text: {fontFamily, fontSize, color}, quizAnswers: {...}, balloon: {...}, mathOperatorColor: '#ff4b4b' }
    },
    currentSlideId: 'slide-1',
    selectedElementId: null,
    selectedElementIds: [],

    isDirty: false,
    view: 'dashboard', // 'dashboard', 'editor', 'player', 'slides'
    readOnly: false, // Default to false, will be set on mount
    translationMode: null, // null | { lang: 'en' | 'pt', draft: { [slideId]: { [elementId]: { content } }, lessonTitle: '', lessonDescription: '' } }
    showGuides: true, // Grid guides in editor
    past: [], // History stack for undoing operations
};

const pushToPast = (state) => {
    const snapshot = {
        lesson: JSON.parse(JSON.stringify(state.lesson)),
        selectedElementId: state.selectedElementId,
        selectedElementIds: [...(state.selectedElementIds || [])],
        currentSlideId: state.currentSlideId
    };
    const newPast = [...(state.past || [])];
    if (newPast.length >= 50) {
        newPast.shift();
    }
    newPast.push(snapshot);
    return newPast;
};

const clampPopupSticker = (el) => {
    if (el.type !== 'popup') return el;
    
    let scale = el.scale ?? 1;
    let width = el.width ?? 30;
    
    // Clamp scale so the sticker width fits within the 70% safe zone (15% to 85%)
    const maxVisualWidth = 70;
    if (width * scale > maxVisualWidth) {
        scale = maxVisualWidth / width;
    }
    
    // Clamp x position
    const halfWidth = (width * scale) / 2;
    const minX = 15 + halfWidth;
    const maxX = 85 - halfWidth;
    
    let x = el.x ?? 50;
    x = Math.max(minX, Math.min(maxX, x));
    
    return {
        ...el,
        x,
        scale
    };
};

const editorReducer = (state, action) => {
    switch (action.type) {
        case 'SAVE_HISTORY':
            return {
                ...state,
                past: pushToPast(state)
            };
        case 'TOGGLE_GUIDES':
            return { ...state, showGuides: !state.showGuides };
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

            const newPast = pushToPast(state);

            const baseElement = {
                id: `el-${Date.now()}`,
                type: action.payload.type,
                content: action.payload.content,
                x: 50, // Center
                y: action.payload.type === 'quiz'
                    ? (action.payload.metadata?.quizType === 'field' ? 30 : (action.payload.metadata?.quizType === 'tf' ? 85 : 75))
                    : 50,
                width: action.payload.metadata?.width || 20,
                height: action.payload.metadata?.height || 10,
                rotation: 0,
                scale: 1,
            };

            // Build metadata based on element type
            let elementMetadata = action.payload.metadata || {};

            if (elementMetadata.isSymbol) {
                // Inherit size from the last added symbol on this slide
                const symbols = currentSlide.elements.filter(el => el.metadata?.isSymbol);
                if (symbols.length > 0) {
                    const lastSymbol = symbols[symbols.length - 1];
                    baseElement.width = lastSymbol.width;
                    baseElement.height = lastSymbol.height;
                    baseElement.scale = lastSymbol.scale;
                }
            }
            if (action.payload.type === 'balloon') {
                elementMetadata = {
                    ...elementMetadata,
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    fontFamily: '"Noto Sans"',
                    fontSize: 16,
                    tailPos: { x: 20, y: 50 }
                };
                baseElement.width = 40;
                baseElement.height = 20;
            }

            if (action.payload.type === 'isticker') {
                baseElement.width = 80;
                baseElement.height = 15;
                baseElement.y = 50;
            }

            if (action.payload.type === 'text') {
                baseElement.width = action.payload.metadata?.width || 10;
                baseElement.height = action.payload.metadata?.height || 5;
                elementMetadata = {
                    textAlign: 'center',
                    ...elementMetadata
                };
            }

            if (action.payload.type === 'popup') {
                baseElement.width = action.payload.metadata?.width || 30;
                baseElement.height = action.payload.metadata?.height || 17.38125;
                baseElement.y = 50;
                elementMetadata = {
                    popupText: 'Hello from the popup!',
                    ...elementMetadata
                };
            }

            const newElement = clampPopupSticker({
                ...baseElement,
                metadata: elementMetadata
            });

            return {
                ...state,
                past: newPast,
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
                selectedElementIds: [newElement.id],
            };
        }

        case 'PASTE_ELEMENT': {
            const currentSlide = state.lesson.slides.find(s => s.id === state.currentSlideId);
            if (!currentSlide) return state;

            const newPast = pushToPast(state);

            const source = action.payload;
            const pastedElement = clampPopupSticker({
                ...source,
                id: `el-${Date.now()}`,
                x: Math.min((source.x || 50) + 2, 95),
                y: Math.min((source.y || 50) + 2, 95),
                metadata: { ...source.metadata },
            });

            return {
                ...state,
                past: newPast,
                isDirty: true,
                lesson: {
                    ...state.lesson,
                    slides: state.lesson.slides.map((slide) =>
                        slide.id === state.currentSlideId
                            ? { ...slide, elements: [...slide.elements, pastedElement] }
                            : slide
                    ),
                },
                selectedElementId: pastedElement.id,
                selectedElementIds: [pastedElement.id],
            };
        }

        case 'PASTE_ELEMENTS': {
            const currentSlide = state.lesson.slides.find(s => s.id === state.currentSlideId);
            if (!currentSlide) return state;

            const newPast = pushToPast(state);

            const sources = action.payload;
            const pastedElements = sources.map(source => clampPopupSticker({
                ...source,
                id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                x: Math.min((source.x || 50) + 2, 95),
                y: Math.min((source.y || 50) + 2, 95),
                metadata: { ...source.metadata },
            }));

            const pastedIds = pastedElements.map(el => el.id);

            return {
                ...state,
                past: newPast,
                isDirty: true,
                lesson: {
                    ...state.lesson,
                    slides: state.lesson.slides.map((slide) =>
                        slide.id === state.currentSlideId
                            ? { ...slide, elements: [...slide.elements, ...pastedElements] }
                            : slide
                    ),
                },
                selectedElementId: pastedIds[pastedIds.length - 1],
                selectedElementIds: pastedIds,
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
            const { id, updates } = action.payload;
            return {
                ...state,
                isDirty: true,
                lesson: {
                    ...state.lesson,
                    slides: state.lesson.slides.map((slide) => {
                        if (slide.id !== state.currentSlideId) return slide;

                        const oldElement = slide.elements.find(el => el.id === id);
                        let newElements = slide.elements.map((el) =>
                            el.id === id ? clampPopupSticker({ ...el, ...updates, metadata: { ...el.metadata, ...updates.metadata } }) : el
                        );

                        // If element was just locked, move it to the beginning of the array (lowest z-sort)
                        const wasLocked = oldElement?.metadata?.locked;
                        const isNowLocked = updates.metadata?.locked;
                        
                        if (!wasLocked && isNowLocked) {
                            const updatedElement = newElements.find(el => el.id === id);
                            newElements = newElements.filter(el => el.id !== id);
                            newElements.unshift(updatedElement);
                        }

                        return { ...slide, elements: newElements };
                    }),
                },
            };
        }

        case 'REORDER_ELEMENT': {
            const { elementId, direction } = action.payload;
            const currentSlideForReorder = state.lesson.slides.find(s => s.id === state.currentSlideId);
            if (!currentSlideForReorder) return state;

            const reorderElements = [...currentSlideForReorder.elements];
            const reorderIndex = reorderElements.findIndex(el => el.id === elementId);
            if (reorderIndex === -1) return state;

            const newReorderIndex = direction === 'forward' ? reorderIndex + 1 : reorderIndex - 1;
            if (newReorderIndex < 0 || newReorderIndex >= reorderElements.length) return state;

            const [movedElement] = reorderElements.splice(reorderIndex, 1);
            reorderElements.splice(newReorderIndex, 0, movedElement);

            return {
                ...state,
                isDirty: true,
                lesson: {
                    ...state.lesson,
                    slides: state.lesson.slides.map(slide =>
                        slide.id === state.currentSlideId
                            ? { ...slide, elements: reorderElements }
                            : slide
                    ),
                },
            };
        }

        case 'REORDER_ELEMENT_TO': {
            const { elementId, toIndex } = action.payload;
            const currentSlideForMove = state.lesson.slides.find(s => s.id === state.currentSlideId);
            if (!currentSlideForMove) return state;

            const moveElements = [...currentSlideForMove.elements];
            const fromIndex = moveElements.findIndex(el => el.id === elementId);
            if (fromIndex === -1) return state;

            const clampedTo = Math.max(0, Math.min(toIndex, moveElements.length - 1));
            if (fromIndex === clampedTo) return state;

            const newPast = pushToPast(state);
            const [moved] = moveElements.splice(fromIndex, 1);
            moveElements.splice(clampedTo, 0, moved);

            return {
                ...state,
                past: newPast,
                isDirty: true,
                lesson: {
                    ...state.lesson,
                    slides: state.lesson.slides.map(slide =>
                        slide.id === state.currentSlideId
                            ? { ...slide, elements: moveElements }
                            : slide
                    ),
                },
            };
        }

        case 'DELETE_SLIDE': {
            if (state.lesson.slides.length <= 1) return state; // Prevent deleting last slide
            const newSlides = state.lesson.slides.filter(s => s.id !== action.payload);
            if (newSlides.length === 0) return state; // Safety: should never happen

            // If we deleted the current slide, switch to the first remaining slide
            // Also validate that currentSlideId still exists in the remaining slides
            const currentStillExists = newSlides.some(s => s.id === state.currentSlideId);
            const newCurrentId = (state.currentSlideId === action.payload || !currentStillExists)
                ? newSlides[0].id
                : state.currentSlideId;

            return {
                ...state,
                isDirty: true,
                lesson: { ...state.lesson, slides: newSlides },
                currentSlideId: newCurrentId,
                selectedElementId: null, // Clear selection to prevent stale references
                selectedElementIds: [],
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

        case 'DUPLICATE_SLIDE': {
            const slideToDuplicate = state.lesson.slides.find(s => s.id === action.payload);
            if (!slideToDuplicate) return state;

            const newSlide = {
                ...slideToDuplicate,
                id: `slide-${Date.now()}`,
                elements: slideToDuplicate.elements.map(el => ({
                    ...el,
                    id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                })),
                cartridge: slideToDuplicate.cartridge ? { ...slideToDuplicate.cartridge } : null,
                order: state.lesson.slides.map(s => s.order).length, // Append to end or insert after?
                // Let's insert after the original
            };

            const index = state.lesson.slides.findIndex(s => s.id === action.payload);
            const newSlides = [...state.lesson.slides];
            newSlides.splice(index + 1, 0, newSlide);

            // Re-index order
            newSlides.forEach((s, i) => s.order = i);

            return {
                ...state,
                isDirty: true,
                lesson: {
                    ...state.lesson,
                    slides: newSlides
                },
                // Optionally switch to the new slide
                // currentSlideId: newSlide.id 
            };
        }

        case 'PASTE_SLIDE': {
            const pastedSlideData = action.payload;
            if (!pastedSlideData || typeof pastedSlideData !== 'object') return state;

            // Generate new IDs to prevent clashing
            const newSlideId = `slide-${Date.now()}`;
            const newSlide = {
                ...pastedSlideData,
                id: newSlideId,
                elements: (pastedSlideData.elements || []).map(el => ({
                    ...el,
                    id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                })),
                cartridge: pastedSlideData.cartridge ? { ...pastedSlideData.cartridge } : null,
            };

            // Insert after the current slide if one exists, otherwise append to end
            const currentIndex = state.lesson.slides.findIndex(s => s.id === state.currentSlideId);
            const newSlides = [...state.lesson.slides];
            if (currentIndex !== -1) {
                newSlides.splice(currentIndex + 1, 0, newSlide);
            } else {
                newSlides.push(newSlide);
            }

            // Re-index order
            newSlides.forEach((s, i) => s.order = i);

            return {
                ...state,
                isDirty: true,
                lesson: {
                    ...state.lesson,
                    slides: newSlides
                },
                currentSlideId: newSlideId
            };
        }

        case 'SELECT_ELEMENTS': {
            const ids = action.payload; // Array of IDs
            const currentSlideIndex = state.lesson.slides.findIndex(s => s.id === state.currentSlideId);
            if (currentSlideIndex === -1) return state;

            const currentSlide = state.lesson.slides[currentSlideIndex];
            const currentSlideElementIds = currentSlide.elements.map(el => el.id);
            const validIds = ids.filter(id => currentSlideElementIds.includes(id));

            return {
                ...state,
                selectedElementId: validIds.length > 0 ? validIds[validIds.length - 1] : null,
                selectedElementIds: validIds
            };
        }

        case 'SELECT_ELEMENT': {
            let selectedId;
            let isShift = false;

            if (action.payload && typeof action.payload === 'object') {
                selectedId = action.payload.id;
                isShift = action.payload.isShift;
            } else {
                selectedId = action.payload;
            }

            // If deselecting or selecting cartridge, just update ID
            if (!selectedId || selectedId === 'cartridge') {
                return {
                    ...state,
                    selectedElementId: selectedId,
                    selectedElementIds: selectedId ? [selectedId] : []
                };
            }

            // Find current slide
            const currentSlideIndex = state.lesson.slides.findIndex(s => s.id === state.currentSlideId);
            if (currentSlideIndex === -1) {
                return {
                    ...state,
                    selectedElementId: selectedId,
                    selectedElementIds: [selectedId]
                };
            }

            const currentSlide = state.lesson.slides[currentSlideIndex];
            const elementIndex = currentSlide.elements.findIndex(el => el.id === selectedId);
            const elementToSelect = currentSlide.elements[elementIndex];

            if (elementIndex === -1) {
                return {
                    ...state,
                    selectedElementId: selectedId,
                    selectedElementIds: [selectedId]
                };
            }

            // Let's compute the new selectedElementIds
            let newSelectedIds = [...(state.selectedElementIds || [])];
            
            // Clean up any stale IDs not on this slide
            const currentSlideElementIds = currentSlide.elements.map(el => el.id);
            newSelectedIds = newSelectedIds.filter(id => currentSlideElementIds.includes(id));

            if (isShift) {
                if (newSelectedIds.includes(selectedId)) {
                    // Deselect
                    newSelectedIds = newSelectedIds.filter(id => id !== selectedId);
                } else {
                    // Select
                    newSelectedIds.push(selectedId);
                }
            } else {
                // Select only this one
                newSelectedIds = [selectedId];
            }

            const primarySelectedId = newSelectedIds.length > 0 ? newSelectedIds[newSelectedIds.length - 1] : null;

            // If deselecting, or if selecting a locked element, we don't need to reorder elements
            if (!newSelectedIds.includes(selectedId) || elementToSelect.metadata?.locked) {
                return {
                    ...state,
                    selectedElementId: primarySelectedId,
                    selectedElementIds: newSelectedIds
                };
            }

            // If element is already last (visually on top), just select
            if (elementIndex === currentSlide.elements.length - 1) {
                const snapshot = { element: JSON.parse(JSON.stringify(elementToSelect)), originalIndex: elementIndex };
                return {
                    ...state,
                    selectedElementId: primarySelectedId,
                    selectedElementIds: newSelectedIds,
                    undoSnapshot: snapshot
                };
            }

            const snapshot = { element: JSON.parse(JSON.stringify(elementToSelect)), originalIndex: elementIndex };

            // Move element to end of array (top of stack)
            const newElements = [...currentSlide.elements];
            const [movedElement] = newElements.splice(elementIndex, 1);
            newElements.push(movedElement);

            const newSlides = [...state.lesson.slides];
            newSlides[currentSlideIndex] = {
                ...currentSlide,
                elements: newElements
            };

            return {
                ...state,
                isDirty: true,
                lesson: {
                    ...state.lesson,
                    slides: newSlides
                },
                selectedElementId: primarySelectedId,
                selectedElementIds: newSelectedIds,
                undoSnapshot: snapshot
            };
        }

        case 'UNDO_ELEMENT': {
            if (!state.past || state.past.length === 0) return state;
            const newPast = [...state.past];
            const previousState = newPast.pop();
            return {
                ...state,
                lesson: previousState.lesson,
                selectedElementId: previousState.selectedElementId,
                selectedElementIds: previousState.selectedElementIds,
                currentSlideId: previousState.currentSlideId,
                past: newPast,
                isDirty: true
            };
        }

        case 'DELETE_ELEMENT': {
            const newPast = pushToPast(state);
            const remainingIds = (state.selectedElementIds || []).filter(id => id !== action.payload);
            return {
                ...state,
                past: newPast,
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
                selectedElementId: remainingIds.length > 0 ? remainingIds[remainingIds.length - 1] : null,
                selectedElementIds: remainingIds,
            };
        }

        case 'MOVE_ELEMENTS': {
            const { ids, dx, dy } = action.payload;
            return {
                ...state,
                isDirty: true,
                lesson: {
                    ...state.lesson,
                    slides: state.lesson.slides.map((slide) => {
                        if (slide.id !== state.currentSlideId) return slide;
                        return {
                            ...slide,
                            elements: slide.elements.map((el) => {
                                if (ids.includes(el.id)) {
                                    if (el.type === 'quiz') {
                                        return { ...el, y: el.y + dy };
                                    }
                                    return clampPopupSticker({ ...el, x: el.x + dx, y: el.y + dy });
                                }
                                return el;
                            })
                        };
                    })
                }
            };
        }

        case 'DUPLICATE_ELEMENT': {
            const currentSlide = state.lesson.slides.find(s => s.id === state.currentSlideId);
            if (!currentSlide) return state;

            const elementToDuplicate = currentSlide.elements.find(el => el.id === action.payload);
            if (!elementToDuplicate) return state;

            const newPast = pushToPast(state);

            const newElement = clampPopupSticker({
                ...elementToDuplicate,
                id: `el-${Date.now()}`,
                x: elementToDuplicate.x + 5,
                y: elementToDuplicate.y + 5,
            });

            return {
                ...state,
                past: newPast,
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
                selectedElementIds: [newElement.id],
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

        case 'SET_TEXT_PRESET':
            return {
                ...state,
                isDirty: true,
                lesson: {
                    ...state.lesson,
                    textPreset: { ...state.lesson.textPreset, ...action.payload }
                }
            };

        case 'APPLY_TEXT_PRESET': {
            const preset = state.lesson.textPreset;
            if (!preset) return state;

            const MATH_OPS = ['+', '-', '×', '÷', '=', '(', ')'];

            // Helper: wrap math operators in colored spans within HTML content
            const colorMathOps = (html, opColor) => {
                if (!opColor || !html) return html;
                // First strip existing operator spans to avoid nesting
                let clean = html.replace(/<span[^>]*class="math-op"[^>]*>(.*?)<\/span>/gi, '$1');
                // Now wrap each operator character
                let result = '';
                let inTag = false;
                for (let i = 0; i < clean.length; i++) {
                    const ch = clean[i];
                    if (ch === '<') inTag = true;
                    if (inTag) {
                        result += ch;
                        if (ch === '>') inTag = false;
                        continue;
                    }
                    if (MATH_OPS.includes(ch)) {
                        result += `<span class="math-op" style="color:${opColor}">${ch}</span>`;
                    } else {
                        result += ch;
                    }
                }
                return result;
            };

            // Helper: apply plain-text color (strip existing color spans, re-wrap whole text)
            const applyTextColor = (html, color) => {
                if (!color || !html) return html;
                // Strip all font color tags added by execCommand
                let clean = html.replace(/<font[^>]*color="[^"]*"[^>]*>(.*?)<\/font>/gi, '$1');
                clean = clean.replace(/<span[^>]*style="[^"]*color:[^"]*"[^>]*>(.*?)<\/span>/gi, '$1');
                // Wrap entire text in color
                return `<span style="color:${color}">${clean}</span>`;
            };

            const newSlides = state.lesson.slides.map(slide => ({
                ...slide,
                elements: slide.elements.map(el => {
                    if (el.type === 'text' && preset.text) {
                        let content = el.content || '';
                        if (preset.mathOperatorColor) content = colorMathOps(content, preset.mathOperatorColor);
                        return {
                            ...el,
                            content,
                            metadata: {
                                ...el.metadata,
                                ...(preset.text.fontFamily && { fontFamily: preset.text.fontFamily }),
                                ...(preset.text.fontSize && { fontSize: preset.text.fontSize }),
                                ...(preset.text.color && { color: preset.text.color }),
                            }
                        };
                    }
                    if (el.type === 'balloon' && preset.balloon) {
                        let content = el.content || '';
                        if (preset.mathOperatorColor) content = colorMathOps(content, preset.mathOperatorColor);
                        return {
                            ...el,
                            content,
                            metadata: {
                                ...el.metadata,
                                ...(preset.balloon.fontFamily && { fontFamily: preset.balloon.fontFamily }),
                                ...(preset.balloon.fontSize && { fontSize: preset.balloon.fontSize }),
                                ...(preset.balloon.color && { color: preset.balloon.color }),
                            }
                        };
                    }
                    if (el.type === 'quiz' && preset.quizAnswers) {
                        const newOptions = (el.metadata?.options || []).map(opt => {
                            let processed = opt;
                            if (preset.mathOperatorColor) processed = colorMathOps(processed, preset.mathOperatorColor);
                            return processed;
                        });
                        return {
                            ...el,
                            metadata: {
                                ...el.metadata,
                                options: newOptions,
                                ...(preset.quizAnswers.fontFamily && { answerFontFamily: preset.quizAnswers.fontFamily }),
                                ...(preset.quizAnswers.fontSize && { answerFontSize: preset.quizAnswers.fontSize }),
                                ...(preset.quizAnswers.color && { answerColor: preset.quizAnswers.color }),
                            }
                        };
                    }
                    return el;
                })
            }));

            return {
                ...state,
                isDirty: true,
                lesson: { ...state.lesson, slides: newSlides }
            };
        }

        case 'LOAD_LESSON':
            return {
                ...state,
                lesson: action.payload,
                currentSlideId: action.payload.slides[0]?.id || 'slide-1',
                selectedElementId: null,
                selectedElementIds: [],
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

        // ─── Translation Mode Actions ───
        case 'START_TRANSLATION': {
            const lang = action.payload; // 'en' | 'pt'
            // Build a draft from existing translations for every slide/element
            const draft = {};
            state.lesson.slides.forEach(slide => {
                draft[slide.id] = {};
                slide.elements.forEach(el => {
                    if (el.type === 'text' || el.type === 'balloon') {
                        draft[slide.id][el.id] = {
                            content: el.translations?.[lang]?.content || el.content
                        };
                    } else if (el.type === 'quiz') {
                        draft[slide.id][el.id] = {
                            options: el.metadata?.translations?.[lang]?.options || [...(el.metadata?.options || [])],
                            matchAnswers: el.metadata?.translations?.[lang]?.matchAnswers || [...(el.metadata?.matchAnswers || [])],
                            chatNodes: el.metadata?.translations?.[lang]?.chatNodes || (el.metadata?.chatNodes ? el.metadata.chatNodes.map(n => ({...n})) : [])
                        };
                    }
                });
            });
            return {
                ...state,
                translationMode: {
                    lang,
                    draft,
                    lessonTitle: state.lesson.translations?.[lang]?.title || state.lesson.title,
                    lessonDescription: state.lesson.translations?.[lang]?.description || (state.lesson.description || ''),
                },
                selectedElementId: null, // Deselect on entering translation mode
                selectedElementIds: [],
            };
        }

        case 'UPDATE_TRANSLATION': {
            if (!state.translationMode) return state;
            const { slideId, elementId, field, value } = action.payload;
            if (field === 'lessonTitle') {
                return {
                    ...state,
                    translationMode: { ...state.translationMode, lessonTitle: value }
                };
            }
            if (field === 'lessonDescription') {
                return {
                    ...state,
                    translationMode: { ...state.translationMode, lessonDescription: value }
                };
            }
            const newDraft = { ...state.translationMode.draft };
            newDraft[slideId] = { ...newDraft[slideId] };
            newDraft[slideId][elementId] = { ...newDraft[slideId][elementId], ...value };
            return {
                ...state,
                translationMode: { ...state.translationMode, draft: newDraft }
            };
        }

        case 'SAVE_TRANSLATION': {
            if (!state.translationMode) return state;
            const { lang, draft, lessonTitle, lessonDescription } = state.translationMode;
            const newSlides = state.lesson.slides.map(slide => ({
                ...slide,
                elements: slide.elements.map(el => {
                    const draftEntry = draft[slide.id]?.[el.id];
                    if (!draftEntry) return el;
                    if (el.type === 'text' || el.type === 'balloon') {
                        return {
                            ...el,
                            translations: {
                                ...el.translations,
                                [lang]: { content: draftEntry.content }
                            }
                        };
                    }
                    if (el.type === 'quiz') {
                        const translationValue = {};
                        if (draftEntry.options) translationValue.options = draftEntry.options;
                        if (draftEntry.matchAnswers) translationValue.matchAnswers = draftEntry.matchAnswers;
                        if (draftEntry.chatNodes) translationValue.chatNodes = draftEntry.chatNodes;
                        return {
                            ...el,
                            metadata: {
                                ...el.metadata,
                                translations: {
                                    ...el.metadata?.translations,
                                    [lang]: {
                                        ...el.metadata?.translations?.[lang],
                                        ...translationValue
                                    }
                                }
                            }
                        };
                    }
                    return el;
                })
            }));
            return {
                ...state,
                isDirty: true,
                translationMode: null,
                selectedElementId: null, // Deselect so contentEditable DOM resets to base language
                selectedElementIds: [],
                lesson: {
                    ...state.lesson,
                    slides: newSlides,
                    translations: {
                        ...state.lesson.translations,
                        [lang]: {
                            title: lessonTitle,
                            description: lessonDescription,
                        }
                    }
                }
            };
        }

        case 'DISCARD_TRANSLATION':
            return { ...state, translationMode: null, selectedElementId: null, selectedElementIds: [] };

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
