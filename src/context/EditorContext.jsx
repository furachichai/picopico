import { createContext, useContext, useReducer } from 'react';
import { ELEMENT_TYPES } from '../types';
import { ensureBalloonsAboveImages } from '../utils/layerUtils';
import { getNonOverlappingResultFieldPosition, reindexResultFields } from '../utils/ResultFieldUtils';
import { isPureEmoji } from './LanguageContext';

const EditorContext = createContext();

const getSavedLastBackground = () => {
    try {
        const saved = localStorage.getItem('picopico_last_background');
        return saved ? JSON.parse(saved) : null;
    } catch {
        return null;
    }
};

const saveLastBackground = (bgData) => {
    try {
        if (bgData && bgData.background) {
            localStorage.setItem('picopico_last_background', JSON.stringify(bgData));
        }
    } catch {
        // ignore
    }
};

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
    guideMode: 'both', // 'grid' | 'both' | 'guides' | 'none'
    showGuides: true, // Legacy compatibility (true when guideMode is 'grid' or 'both')
    past: [], // History stack for undoing operations
    lastAppliedBackground: getSavedLastBackground(),
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

const GUIDE_MODES = ['grid', 'both', 'guides', 'none'];

const editorReducer = (state, action) => {
    switch (action.type) {
        case 'SAVE_HISTORY':
            return {
                ...state,
                past: pushToPast(state)
            };
        case 'TOGGLE_GUIDES':
        case 'CYCLE_GUIDE_MODE': {
            const currentMode = state.guideMode || (state.showGuides ? 'grid' : 'none');
            const currentIndex = GUIDE_MODES.indexOf(currentMode);
            const nextMode = GUIDE_MODES[(currentIndex + 1) % GUIDE_MODES.length];
            return {
                ...state,
                guideMode: nextMode,
                showGuides: nextMode === 'grid' || nextMode === 'both'
            };
        }
        case 'SET_GUIDE_MODE': {
            const nextMode = action.payload;
            return {
                ...state,
                guideMode: nextMode,
                showGuides: nextMode === 'grid' || nextMode === 'both'
            };
        }
        case 'ADD_SLIDE_GUIDE': {
            const { axis, position } = action.payload;
            const currentSlide = state.lesson.slides.find(s => s.id === state.currentSlideId);
            if (!currentSlide) return state;

            const existingGuides = currentSlide.guides || { horizontal: [], vertical: [] };
            const axisGuides = [...(existingGuides[axis] || [])];
            const cleanPos = Math.round(position * 10) / 10;

            if (axisGuides.some(p => Math.abs(p - cleanPos) < 0.3)) {
                return state;
            }
            axisGuides.push(cleanPos);
            axisGuides.sort((a, b) => a - b);

            const updatedSlide = {
                ...currentSlide,
                guides: {
                    ...existingGuides,
                    [axis]: axisGuides
                }
            };

            let nextGuideMode = state.guideMode || 'both';
            if (nextGuideMode === 'none') nextGuideMode = 'guides';
            else if (nextGuideMode === 'grid') nextGuideMode = 'both';

            return {
                ...state,
                isDirty: true,
                past: pushToPast(state),
                guideMode: nextGuideMode,
                showGuides: nextGuideMode === 'grid' || nextGuideMode === 'both',
                lesson: {
                    ...state.lesson,
                    slides: state.lesson.slides.map(s => s.id === state.currentSlideId ? updatedSlide : s)
                }
            };
        }
        case 'UPDATE_SLIDE_GUIDE': {
            const { axis, index, position } = action.payload;
            const currentSlide = state.lesson.slides.find(s => s.id === state.currentSlideId);
            if (!currentSlide || !currentSlide.guides || !currentSlide.guides[axis]) return state;

            const axisGuides = [...currentSlide.guides[axis]];
            if (index < 0 || index >= axisGuides.length) return state;

            const cleanPos = Math.round(position * 10) / 10;
            axisGuides[index] = cleanPos;
            axisGuides.sort((a, b) => a - b);

            return {
                ...state,
                isDirty: true,
                lesson: {
                    ...state.lesson,
                    slides: state.lesson.slides.map(s => s.id === state.currentSlideId ? {
                        ...currentSlide,
                        guides: {
                            ...currentSlide.guides,
                            [axis]: axisGuides
                        }
                    } : s)
                }
            };
        }
        case 'REMOVE_SLIDE_GUIDE': {
            const { axis, index } = action.payload;
            const currentSlide = state.lesson.slides.find(s => s.id === state.currentSlideId);
            if (!currentSlide || !currentSlide.guides || !currentSlide.guides[axis]) return state;

            const axisGuides = currentSlide.guides[axis].filter((_, i) => i !== index);

            return {
                ...state,
                isDirty: true,
                past: pushToPast(state),
                lesson: {
                    ...state.lesson,
                    slides: state.lesson.slides.map(s => s.id === state.currentSlideId ? {
                        ...currentSlide,
                        guides: {
                            ...currentSlide.guides,
                            [axis]: axisGuides
                        }
                    } : s)
                }
            };
        }
        case 'CLEAR_SLIDE_GUIDES': {
            const currentSlide = state.lesson.slides.find(s => s.id === state.currentSlideId);
            if (!currentSlide) return state;

            return {
                ...state,
                isDirty: true,
                past: pushToPast(state),
                lesson: {
                    ...state.lesson,
                    slides: state.lesson.slides.map(s => s.id === state.currentSlideId ? {
                        ...currentSlide,
                        guides: { horizontal: [], vertical: [] }
                    } : s)
                }
            };
        }
        case 'SET_VIEW':
            return { ...state, view: action.payload };

        case 'SET_READ_ONLY':
            return { ...state, readOnly: action.payload };

        case 'TOGGLE_PREVIEW':
            return { ...state, view: state.view === 'editor' ? 'player' : 'editor' };

        case 'SET_CURRENT_SLIDE':
            return {
                ...state,
                currentSlideId: action.payload,
                selectedElementId: null,
                selectedElementIds: []
            };

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
                past: pushToPast(state),
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
                past: pushToPast(state),
                lesson: {
                    ...state.lesson,
                    slides: newSlides,
                },
                currentSlideId: newSlide.id,
            };
        }

        case 'UPDATE_SLIDE_BACKGROUND': {
            const currentSlide = state.lesson.slides.find(s => s.id === state.currentSlideId);
            const bgData = {
                background: action.payload,
                backgroundSettings: currentSlide?.backgroundSettings ? { ...currentSlide.backgroundSettings } : {}
            };
            saveLastBackground(bgData);
            return {
                ...state,
                isDirty: true,
                lastAppliedBackground: bgData,
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

            let posX = action.payload.x;
            let posY = action.payload.y;

            if (action.payload.type === ELEMENT_TYPES.RESULT_FIELD) {
                const existingResultFields = currentSlide.elements.filter(el => el.type === ELEMENT_TYPES.RESULT_FIELD);
                const collides = existingResultFields.some(f => Math.abs(f.x - (posX ?? 50)) < 14 && Math.abs(f.y - (posY ?? 35)) < 12);
                if (posX === undefined || posY === undefined || collides) {
                    const nonOverlapPos = getNonOverlappingResultFieldPosition(currentSlide);
                    posX = nonOverlapPos.x;
                    posY = nonOverlapPos.y;
                }
            }

            const baseElement = {
                id: action.payload.id || `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: action.payload.type,
                content: action.payload.content,
                x: posX !== undefined ? posX : 50, // Center
                y: posY !== undefined ? posY : (action.payload.type === 'quiz'
                    ? (action.payload.metadata?.quizType === 'field' ? 30 : (action.payload.metadata?.quizType === 'tf' ? 85 : 78.59375))
                    : (action.payload.type === 'result_field' ? 35 : 50)),
                width: action.payload.width !== undefined ? action.payload.width : (action.payload.metadata?.width || 20),
                height: action.payload.height !== undefined ? action.payload.height : (action.payload.metadata?.height || 10),
                rotation: action.payload.rotation !== undefined ? action.payload.rotation : 0,
                scale: action.payload.scale !== undefined ? action.payload.scale : 1,
            };

            // Build metadata based on element type
            let elementMetadata = action.payload.metadata || {};

            if (elementMetadata.isSymbol && action.payload.type !== 'line' && action.payload.type !== ELEMENT_TYPES.LINE) {
                // Inherit size from the last added symbol of same general kind (not lines)
                const symbols = currentSlide.elements.filter(el => el.metadata?.isSymbol && el.type !== 'line' && el.type !== ELEMENT_TYPES.LINE);
                if (symbols.length > 0) {
                    const lastSymbol = symbols[symbols.length - 1];
                    const isShape = elementMetadata.symbolType?.startsWith('shape-');
                    const lastIsShape = lastSymbol.metadata?.symbolType?.startsWith('shape-');
                    if (!isShape && !lastIsShape) {
                        baseElement.width = lastSymbol.width;
                        baseElement.height = lastSymbol.height;
                        baseElement.scale = lastSymbol.scale;
                    }
                }
            }
            if (action.payload.type === 'balloon') {
                elementMetadata = {
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    fontFamily: '"Noto Sans"',
                    fontSize: 19,
                    tailPos: { x: 20, y: 50 },
                    ...elementMetadata
                };
                baseElement.width = action.payload.width !== undefined ? action.payload.width : (action.payload.metadata?.width || 40);
                baseElement.height = action.payload.height !== undefined ? action.payload.height : (action.payload.metadata?.height || 20);
            }

            if (action.payload.type === 'banner') {
                baseElement.width = action.payload.width !== undefined ? action.payload.width : (action.payload.metadata?.width || 51);
                baseElement.height = action.payload.height !== undefined ? action.payload.height : (action.payload.metadata?.height || 12.5);
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

            if (action.payload.type === 'result_field') {
                elementMetadata = {
                    locked: true,
                    ...elementMetadata
                };
            }

            if (action.payload.type === 'number_line') {
                const isVertical = action.payload.metadata?.orientation === 'vertical';
                baseElement.width = action.payload.metadata?.width || (isVertical ? 15 : 65);
                baseElement.height = action.payload.metadata?.height || (isVertical ? 55 : 12);
                baseElement.x = 50;
                baseElement.y = 50;
                elementMetadata = {
                    orientation: isVertical ? 'vertical' : 'horizontal',
                    startNumber: 0,
                    endNumber: 10,
                    step: 1,
                    showNumbers: true,
                    numberColorMode: 'match',
                    showArrows: true,
                    symbolColor: '#8B5CF6',
                    thickness: 3,
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
                            ? { ...slide, elements: ensureBalloonsAboveImages([...slide.elements, newElement]) }
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
            const pastedMetadata = { ...source.metadata };
            delete pastedMetadata.manualZ;
            delete pastedMetadata.groupId;

            const pastedElement = clampPopupSticker({
                ...source,
                id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                x: Math.min((source.x || 50) + 3, 95),
                y: Math.min((source.y || 50) + 3, 95),
                metadata: pastedMetadata,
            });

            return {
                ...state,
                past: newPast,
                isDirty: true,
                lesson: {
                    ...state.lesson,
                    slides: state.lesson.slides.map((slide) =>
                        slide.id === state.currentSlideId
                            ? { ...slide, elements: ensureBalloonsAboveImages([...slide.elements, pastedElement]) }
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
            // Build unique new group IDs for any groups present in the pasted payload
            const groupMap = {};
            sources.forEach(source => {
                const gid = source?.metadata?.groupId;
                if (gid && !groupMap[gid]) {
                    groupMap[gid] = `group-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
                }
            });

            const pastedElements = sources.map((source, index) => {
                const pastedMeta = { ...source.metadata };
                delete pastedMeta.manualZ;
                if (pastedMeta.groupId && groupMap[pastedMeta.groupId]) {
                    pastedMeta.groupId = groupMap[pastedMeta.groupId];
                }
                return clampPopupSticker({
                    ...source,
                    id: `el-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 6)}`,
                    x: Math.min((source.x || 50) + 3, 95),
                    y: Math.min((source.y || 50) + 3, 95),
                    metadata: pastedMeta,
                });
            });

            const pastedIds = pastedElements.map(el => el.id);

            return {
                ...state,
                past: newPast,
                isDirty: true,
                lesson: {
                    ...state.lesson,
                    slides: state.lesson.slides.map((slide) =>
                        slide.id === state.currentSlideId
                            ? { ...slide, elements: ensureBalloonsAboveImages([...slide.elements, ...pastedElements]) }
                            : slide
                    ),
                },
                selectedElementId: pastedIds[pastedIds.length - 1],
                selectedElementIds: pastedIds,
            };
        }

        case 'APPLY_BACKGROUND_TO_ALL': {
            const backgroundElement = action.payload;
            if (!backgroundElement || backgroundElement.type !== 'background') return state;

            const bgData = {
                background: backgroundElement.background,
                backgroundSettings: backgroundElement.metadata ? { ...backgroundElement.metadata } : {}
            };
            saveLastBackground(bgData);

            const newPast = pushToPast(state);
            
            return {
                ...state,
                past: newPast,
                isDirty: true,
                lastAppliedBackground: bgData,
                lesson: {
                    ...state.lesson,
                    slides: state.lesson.slides.map((slide) => {
                        // Create a new copy of elements without any existing background
                        const otherElements = slide.elements.filter(el => el.type !== 'background');
                        // Clone the background element with a new id
                        const newBgElement = {
                            ...backgroundElement,
                            id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                        };
                        // Background should typically be the first element (lowest z-index)
                        return {
                            ...slide,
                            background: backgroundElement.background,
                            backgroundSettings: backgroundElement.metadata ? { ...backgroundElement.metadata } : slide.backgroundSettings,
                            elements: [newBgElement, ...otherElements]
                        };
                    })
                }
            };
        }

        case 'APPLY_LAST_BACKGROUND': {
            let bgData = action.payload || state.lastAppliedBackground || getSavedLastBackground();
            if (!bgData || !bgData.background) {
                const currentIdx = state.lesson.slides.findIndex(s => s.id === state.currentSlideId);
                for (let i = currentIdx - 1; i >= 0; i--) {
                    const s = state.lesson.slides[i];
                    if (s.background) {
                        bgData = {
                            background: s.background,
                            backgroundSettings: s.backgroundSettings ? { ...s.backgroundSettings } : {}
                        };
                        break;
                    }
                }
                if (!bgData) {
                    for (const s of state.lesson.slides) {
                        if (s.background) {
                            bgData = {
                                background: s.background,
                                backgroundSettings: s.backgroundSettings ? { ...s.backgroundSettings } : {}
                            };
                            break;
                        }
                    }
                }
            }
            if (!bgData || !bgData.background) return state;

            saveLastBackground(bgData);
            const newPast = pushToPast(state);

            return {
                ...state,
                past: newPast,
                isDirty: true,
                lastAppliedBackground: bgData,
                lesson: {
                    ...state.lesson,
                    slides: state.lesson.slides.map((slide) =>
                        slide.id === state.currentSlideId
                            ? {
                                ...slide,
                                background: bgData.background,
                                backgroundSettings: bgData.backgroundSettings ? { ...bgData.backgroundSettings } : {}
                            }
                            : slide
                    ),
                },
            };
        }

        case 'UPDATE_SLIDE': {
            const currentSlide = state.lesson.slides.find(s => s.id === state.currentSlideId);
            let newLastBg = state.lastAppliedBackground;
            if (action.payload && (action.payload.background !== undefined || action.payload.backgroundSettings !== undefined)) {
                const bg = action.payload.background !== undefined ? action.payload.background : currentSlide?.background;
                const settings = action.payload.backgroundSettings !== undefined ? action.payload.backgroundSettings : currentSlide?.backgroundSettings;
                if (bg) {
                    newLastBg = {
                        background: bg,
                        backgroundSettings: settings ? { ...settings } : {}
                    };
                    saveLastBackground(newLastBg);
                }
            }
            const shouldSave = action.saveHistory === true;
            return {
                ...state,
                past: shouldSave ? pushToPast(state) : (state.past || []),
                isDirty: true,
                lastAppliedBackground: newLastBg,
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
            const shouldSave = action.saveHistory === true;
            return {
                ...state,
                past: shouldSave ? pushToPast(state) : (state.past || []),
                isDirty: true,
                lesson: {
                    ...state.lesson,
                    slides: state.lesson.slides.map((slide) => {
                        if (slide.id !== state.currentSlideId) return slide;

                        const oldElement = slide.elements.find(el => el.id === id);
                        let newElements = slide.elements.map((el) => {
                            if (el.id !== id) return el;
                            let updated = clampPopupSticker({ ...el, ...updates, metadata: { ...el.metadata, ...updates.metadata } });
                            if (updates.content !== undefined && isPureEmoji(updates.content) && updated.translations) {
                                const newTranslations = { ...updated.translations };
                                Object.keys(newTranslations).forEach(lang => {
                                    newTranslations[lang] = { ...newTranslations[lang], content: updates.content };
                                });
                                updated.translations = newTranslations;
                            }
                            return updated;
                        });

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

        case 'UPDATE_ELEMENTS': {
            // action.payload: { ids, updates } | { updatesMap: { [id]: updates } } | { [id]: updates } | Array of { id, updates }
            let updatesMap = {};
            if (action.payload?.ids && action.payload?.updates) {
                action.payload.ids.forEach(id => {
                    updatesMap[id] = action.payload.updates;
                });
            } else if (action.payload?.updatesMap) {
                updatesMap = action.payload.updatesMap;
            } else if (Array.isArray(action.payload)) {
                action.payload.forEach(item => {
                    if (item.id) updatesMap[item.id] = item.updates || item;
                });
            } else if (action.payload && typeof action.payload === 'object') {
                updatesMap = action.payload;
            }

            const shouldSave = action.saveHistory === true;
            return {
                ...state,
                past: shouldSave ? pushToPast(state) : (state.past || []),
                isDirty: true,
                lesson: {
                    ...state.lesson,
                    slides: state.lesson.slides.map((slide) => {
                        if (slide.id !== state.currentSlideId) return slide;

                        const newElements = slide.elements.map((el) => {
                            const elUpdates = updatesMap[el.id];
                            if (!elUpdates) return el;
                            return clampPopupSticker({
                                ...el,
                                ...elUpdates,
                                ...(elUpdates.metadata ? { metadata: { ...el.metadata, ...elUpdates.metadata } } : {})
                            });
                        });

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

            const newPast = pushToPast(state);
            const [movedElement] = reorderElements.splice(reorderIndex, 1);
            const updatedMoved = {
                ...movedElement,
                metadata: {
                    ...movedElement.metadata,
                    manualZ: true,
                },
            };
            reorderElements.splice(newReorderIndex, 0, updatedMoved);

            return {
                ...state,
                past: newPast,
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
            const updatedMoved = {
                ...moved,
                metadata: {
                    ...moved.metadata,
                    manualZ: true,
                },
            };
            moveElements.splice(clampedTo, 0, updatedMoved);

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
            const newPast = pushToPast(state);
            const newSlides = state.lesson.slides.filter(s => s.id !== action.payload);
            if (newSlides.length === 0) return state; // Safety: should never happen

            // Re-index order
            newSlides.forEach((s, i) => s.order = i);

            // If we deleted the current slide, switch to the first remaining slide
            // Also validate that currentSlideId still exists in the remaining slides
            const currentStillExists = newSlides.some(s => s.id === state.currentSlideId);
            const newCurrentId = (state.currentSlideId === action.payload || !currentStillExists)
                ? newSlides[0].id
                : state.currentSlideId;

            return {
                ...state,
                isDirty: true,
                past: newPast,
                lesson: { ...state.lesson, slides: newSlides },
                currentSlideId: newCurrentId,
                selectedElementId: null, // Clear selection to prevent stale references
                selectedElementIds: [],
            };
        }

        case 'DELETE_SLIDES': {
            const idsToDelete = Array.isArray(action.payload) ? action.payload : [action.payload];
            if (idsToDelete.length === 0) return state;
            if (state.lesson.slides.length <= idsToDelete.length) {
                // Prevent deleting all slides - must keep at least 1 slide
                return state;
            }

            const newPast = pushToPast(state);
            const newSlides = state.lesson.slides.filter(s => !idsToDelete.includes(s.id));
            if (newSlides.length === 0) return state;

            // Re-index order
            newSlides.forEach((s, i) => s.order = i);

            const currentStillExists = newSlides.some(s => s.id === state.currentSlideId);
            const newCurrentId = currentStillExists ? state.currentSlideId : newSlides[0].id;

            return {
                ...state,
                isDirty: true,
                past: newPast,
                lesson: { ...state.lesson, slides: newSlides },
                currentSlideId: newCurrentId,
                selectedElementId: null,
                selectedElementIds: [],
            };
        }

        case 'MOVE_SLIDES':
        case 'MOVE_SLIDE': {
            const { slideId, slideIds, direction } = action.payload || {};
            const targetIds = slideIds && slideIds.length > 0 ? slideIds : (slideId ? [slideId] : []);
            if (targetIds.length === 0) return state;

            // Get current positions of the target slides in the slides array
            const currentIndices = targetIds
                .map(id => state.lesson.slides.findIndex(s => s.id === id))
                .filter(idx => idx !== -1)
                .sort((a, b) => a - b);

            if (currentIndices.length === 0) return state;

            if (direction === 'left') {
                // Cannot move left if the earliest selected slide is already at index 0
                if (currentIndices[0] <= 0) return state;
            } else if (direction === 'right') {
                // Cannot move right if the latest selected slide is already at the end
                if (currentIndices[currentIndices.length - 1] >= state.lesson.slides.length - 1) return state;
            } else {
                return state;
            }

            const newPast = pushToPast(state);
            const newSlides = [...state.lesson.slides];
            const targetIdSet = new Set(targetIds);

            if (direction === 'left') {
                // Iterate left to right: swap each selected slide with its preceding unselected slide
                for (let i = 0; i < newSlides.length; i++) {
                    if (targetIdSet.has(newSlides[i].id)) {
                        if (i > 0 && !targetIdSet.has(newSlides[i - 1].id)) {
                            const temp = newSlides[i];
                            newSlides[i] = newSlides[i - 1];
                            newSlides[i - 1] = temp;
                        }
                    }
                }
            } else if (direction === 'right') {
                // Iterate right to left: swap each selected slide with its following unselected slide
                for (let i = newSlides.length - 1; i >= 0; i--) {
                    if (targetIdSet.has(newSlides[i].id)) {
                        if (i < newSlides.length - 1 && !targetIdSet.has(newSlides[i + 1].id)) {
                            const temp = newSlides[i];
                            newSlides[i] = newSlides[i + 1];
                            newSlides[i + 1] = temp;
                        }
                    }
                }
            }

            // Update order property across all slides
            newSlides.forEach((s, i) => s.order = i);

            return {
                ...state,
                isDirty: true,
                past: newPast,
                lesson: { ...state.lesson, slides: newSlides },
            };
        }

        case 'DUPLICATE_SLIDE': {
            const slideToDuplicate = state.lesson.slides.find(s => s.id === action.payload);
            if (!slideToDuplicate) return state;

            const newPast = pushToPast(state);
            // Map old groupIds to new groupIds to maintain grouping integrity
            const groupMap = {};
            const newSlide = {
                ...JSON.parse(JSON.stringify(slideToDuplicate)),
                id: `slide-${Date.now()}`,
                elements: (slideToDuplicate.elements || []).map(el => {
                    const newElId = `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    let newGroupId = el.groupId;
                    if (el.groupId) {
                        if (!groupMap[el.groupId]) {
                            groupMap[el.groupId] = `group-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
                        }
                        newGroupId = groupMap[el.groupId];
                    }
                    return {
                        ...JSON.parse(JSON.stringify(el)),
                        id: newElId,
                        ...(newGroupId !== undefined ? { groupId: newGroupId } : {})
                    };
                }),
                cartridge: slideToDuplicate.cartridge ? JSON.parse(JSON.stringify(slideToDuplicate.cartridge)) : null,
            };

            const index = state.lesson.slides.findIndex(s => s.id === action.payload);
            const newSlides = [...state.lesson.slides];
            newSlides.splice(index + 1, 0, newSlide);

            // Re-index order
            newSlides.forEach((s, i) => s.order = i);

            return {
                ...state,
                isDirty: true,
                past: newPast,
                lesson: {
                    ...state.lesson,
                    slides: newSlides
                },
                currentSlideId: newSlide.id 
            };
        }

        case 'PASTE_SLIDES':
        case 'PASTE_SLIDE': {
            const payload = action.payload;
            if (!payload) return state;

            // Handle both { slides, targetSlideId } and direct array or single slide
            let incomingSlides = [];
            let targetSlideId = state.currentSlideId;

            if (Array.isArray(payload)) {
                incomingSlides = payload;
            } else if (payload && Array.isArray(payload.slides)) {
                incomingSlides = payload.slides;
                if (payload.targetSlideId) targetSlideId = payload.targetSlideId;
            } else if (payload && typeof payload === 'object') {
                incomingSlides = [payload];
                if (payload.targetSlideId) targetSlideId = payload.targetSlideId;
            }

            if (incomingSlides.length === 0) return state;

            // Push current state to undo history
            const newPast = pushToPast(state);

            // Deep clone each slide and assign fresh unique IDs for slides and elements
            const newSlidesToAdd = incomingSlides.map((slide, sIdx) => {
                const newSlideId = `slide-${Date.now()}-${sIdx}-${Math.random().toString(36).substr(2, 6)}`;
                
                // Map old groupIds in this slide to new groupIds to preserve grouping
                const groupMap = {};
                const clonedElements = (slide.elements || []).map(el => {
                    const newElId = `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    let newGroupId = el.groupId;
                    if (el.groupId) {
                        if (!groupMap[el.groupId]) {
                            groupMap[el.groupId] = `group-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
                        }
                        newGroupId = groupMap[el.groupId];
                    }
                    return {
                        ...JSON.parse(JSON.stringify(el)),
                        id: newElId,
                        ...(newGroupId !== undefined ? { groupId: newGroupId } : {})
                    };
                });

                return {
                    ...JSON.parse(JSON.stringify(slide)),
                    id: newSlideId,
                    elements: clonedElements,
                    cartridge: slide.cartridge ? JSON.parse(JSON.stringify(slide.cartridge)) : null,
                    backgroundSettings: slide.backgroundSettings ? JSON.parse(JSON.stringify(slide.backgroundSettings)) : {}
                };
            });

            // Find insertion point
            let targetIndex = state.lesson.slides.findIndex(s => s.id === targetSlideId);
            if (targetIndex === -1) {
                targetIndex = state.lesson.slides.length - 1;
            }

            const newSlides = [...state.lesson.slides];
            newSlides.splice(targetIndex + 1, 0, ...newSlidesToAdd);

            // Re-index order
            newSlides.forEach((s, i) => s.order = i);

            return {
                ...state,
                isDirty: true,
                past: newPast,
                lesson: {
                    ...state.lesson,
                    slides: newSlides
                },
                currentSlideId: newSlidesToAdd[0].id
            };
        }

        case 'REPLACE_SLIDES': {
            return {
                ...state,
                isDirty: true,
                lesson: {
                    ...state.lesson,
                    slides: action.payload
                }
            };
        }

        case 'SELECT_ELEMENTS': {
            const ids = action.payload || []; // Array of IDs
            const currentSlideIndex = state.lesson.slides.findIndex(s => s.id === state.currentSlideId);
            if (currentSlideIndex === -1) return state;

            const currentSlide = state.lesson.slides[currentSlideIndex];
            const currentSlideElementIds = currentSlide.elements.map(el => el.id);
            const validIds = ids.filter(id => currentSlideElementIds.includes(id));
            const primarySelectedId = validIds.length > 0 ? validIds[validIds.length - 1] : null;

            const currentIds = state.selectedElementIds || [];
            const isUnchanged = state.selectedElementId === primarySelectedId &&
                currentIds.length === validIds.length &&
                currentIds.every((id, idx) => id === validIds[idx]);

            if (isUnchanged) {
                return state;
            }

            const shouldSave = action.saveHistory !== false && !action.skipHistory;

            return {
                ...state,
                past: shouldSave ? pushToPast(state) : (state.past || []),
                selectedElementId: primarySelectedId,
                selectedElementIds: validIds
            };
        }

        case 'SELECT_ELEMENT': {
            let selectedId;
            let isShift = false;
            let isAlt = false;

            if (action.payload && typeof action.payload === 'object') {
                selectedId = action.payload.id;
                isShift = action.payload.isShift;
                isAlt = action.payload.isAlt;
            } else {
                selectedId = action.payload;
            }

            // If deselecting or selecting cartridge, cartridge parts, or background
            if (!selectedId || selectedId === 'cartridge' || selectedId === 'background' || (typeof selectedId === 'string' && selectedId.startsWith('cartridge:'))) {
                const targetIds = selectedId ? [selectedId] : [];
                const currentIds = state.selectedElementIds || [];
                const isUnchanged = state.selectedElementId === selectedId &&
                    currentIds.length === targetIds.length &&
                    (targetIds.length === 0 || currentIds[0] === selectedId);

                if (isUnchanged) {
                    return state;
                }

                const shouldSave = action.saveHistory !== false && !action.skipHistory;
                return {
                    ...state,
                    past: shouldSave ? pushToPast(state) : (state.past || []),
                    selectedElementId: selectedId,
                    selectedElementIds: targetIds
                };
            }

            // Find current slide
            const currentSlideIndex = state.lesson.slides.findIndex(s => s.id === state.currentSlideId);
            if (currentSlideIndex === -1) {
                const targetIds = [selectedId];
                const currentIds = state.selectedElementIds || [];
                const isUnchanged = state.selectedElementId === selectedId &&
                    currentIds.length === targetIds.length &&
                    currentIds[0] === selectedId;
                if (isUnchanged) return state;

                const shouldSave = action.saveHistory !== false && !action.skipHistory;
                return {
                    ...state,
                    past: shouldSave ? pushToPast(state) : (state.past || []),
                    selectedElementId: selectedId,
                    selectedElementIds: targetIds
                };
            }

            const currentSlide = state.lesson.slides[currentSlideIndex];
            const elementIndex = currentSlide.elements.findIndex(el => el.id === selectedId);
            const elementToSelect = currentSlide.elements[elementIndex];

            if (elementIndex === -1) {
                const targetIds = [selectedId];
                const currentIds = state.selectedElementIds || [];
                const isUnchanged = state.selectedElementId === selectedId &&
                    currentIds.length === targetIds.length &&
                    currentIds[0] === selectedId;
                if (isUnchanged) return state;

                const shouldSave = action.saveHistory !== false && !action.skipHistory;
                return {
                    ...state,
                    past: shouldSave ? pushToPast(state) : (state.past || []),
                    selectedElementId: selectedId,
                    selectedElementIds: targetIds
                };
            }

            // If element has groupId and user is NOT holding Alt/Option, select all elements in the group
            let targetIds = [selectedId];
            const groupId = elementToSelect.metadata?.groupId;
            if (groupId && !isAlt) {
                const groupMembers = currentSlide.elements.filter(el => el.metadata?.groupId === groupId).map(el => el.id);
                if (groupMembers.length > 0) {
                    targetIds = groupMembers;
                }
            }

            // Let's compute the new selectedElementIds
            let newSelectedIds = [...(state.selectedElementIds || [])];
            
            // Clean up any stale IDs not on this slide
            const currentSlideElementIds = currentSlide.elements.map(el => el.id);
            newSelectedIds = newSelectedIds.filter(id => currentSlideElementIds.includes(id));

            if (isShift) {
                const isAlreadySelected = newSelectedIds.includes(selectedId);
                if (isAlreadySelected) {
                    // Deselect the target IDs
                    newSelectedIds = newSelectedIds.filter(id => !targetIds.includes(id));
                } else {
                    // Add all target IDs
                    targetIds.forEach(id => {
                        if (!newSelectedIds.includes(id)) {
                            newSelectedIds.push(id);
                        }
                    });
                }
            } else {
                // Select only target IDs
                newSelectedIds = [...targetIds];
            }

            const primarySelectedId = newSelectedIds.length > 0 ? newSelectedIds[newSelectedIds.length - 1] : null;

            const currentIds = state.selectedElementIds || [];
            const isUnchanged = state.selectedElementId === primarySelectedId &&
                currentIds.length === newSelectedIds.length &&
                currentIds.every((id, idx) => id === newSelectedIds[idx]);

            if (isUnchanged) {
                return state;
            }

            const shouldSave = action.saveHistory !== false && !action.skipHistory;

            return {
                ...state,
                past: shouldSave ? pushToPast(state) : (state.past || []),
                selectedElementId: primarySelectedId,
                selectedElementIds: newSelectedIds
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
                                elements: reindexResultFields(slide.elements.filter((el) => el.id !== action.payload)),
                            }
                            : slide
                    ),
                },
                selectedElementId: remainingIds.length > 0 ? remainingIds[remainingIds.length - 1] : null,
                selectedElementIds: remainingIds,
            };
        }

        case 'DELETE_ELEMENTS': {
            const idsToDelete = action.payload;
            if (!idsToDelete || idsToDelete.length === 0) return state;

            const newPast = pushToPast(state);

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
                                elements: reindexResultFields(slide.elements.filter((el) => !idsToDelete.includes(el.id))),
                            }
                            : slide
                    ),
                },
                selectedElementId: null,
                selectedElementIds: [],
            };
        }

        case 'GROUP_ELEMENTS': {
            const currentSlide = state.lesson.slides.find(s => s.id === state.currentSlideId);
            if (!currentSlide) return state;

            const ids = action.payload || state.selectedElementIds || [];
            const validElements = currentSlide.elements.filter(el => ids.includes(el.id) && el.id !== 'background' && el.id !== 'cartridge');
            if (validElements.length < 2) return state;

            const newPast = pushToPast(state);
            const newGroupId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

            const newElements = currentSlide.elements.map(el => {
                if (ids.includes(el.id) && el.id !== 'background' && el.id !== 'cartridge') {
                    return {
                        ...el,
                        metadata: {
                            ...el.metadata,
                            groupId: newGroupId
                        }
                    };
                }
                return el;
            });

            const groupMemberIds = validElements.map(el => el.id);

            return {
                ...state,
                past: newPast,
                isDirty: true,
                lesson: {
                    ...state.lesson,
                    slides: state.lesson.slides.map(slide =>
                        slide.id === state.currentSlideId
                            ? { ...slide, elements: newElements }
                            : slide
                    )
                },
                selectedElementId: groupMemberIds[groupMemberIds.length - 1],
                selectedElementIds: groupMemberIds
            };
        }

        case 'UNGROUP_ELEMENTS': {
            const currentSlide = state.lesson.slides.find(s => s.id === state.currentSlideId);
            if (!currentSlide) return state;

            const ids = action.payload || state.selectedElementIds || [];
            if (ids.length === 0) return state;

            // Find any groupIds represented by the specified ids
            const targetGroupIds = new Set();
            currentSlide.elements.forEach(el => {
                if (ids.includes(el.id) && el.metadata?.groupId) {
                    targetGroupIds.add(el.metadata.groupId);
                }
            });

            if (targetGroupIds.size === 0) return state;

            const newPast = pushToPast(state);

            const newElements = currentSlide.elements.map(el => {
                if (el.metadata?.groupId && targetGroupIds.has(el.metadata.groupId)) {
                    const newMeta = { ...el.metadata };
                    delete newMeta.groupId;
                    return {
                        ...el,
                        metadata: newMeta
                    };
                }
                return el;
            });

            return {
                ...state,
                past: newPast,
                isDirty: true,
                lesson: {
                    ...state.lesson,
                    slides: state.lesson.slides.map(slide =>
                        slide.id === state.currentSlideId
                            ? { ...slide, elements: newElements }
                            : slide
                    )
                }
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

            const dupMetadata = { ...elementToDuplicate.metadata };
            delete dupMetadata.manualZ;

            let dupX = elementToDuplicate.x + 5;
            let dupY = elementToDuplicate.y + 5;

            if (elementToDuplicate.type === ELEMENT_TYPES.RESULT_FIELD) {
                const nonOverlap = getNonOverlappingResultFieldPosition(currentSlide, elementToDuplicate);
                dupX = nonOverlap.x;
                dupY = nonOverlap.y;
                const count = currentSlide.elements.filter(el => el.type === ELEMENT_TYPES.RESULT_FIELD).length;
                dupMetadata.order = count + 1;
            }

            let dupTranslations = elementToDuplicate.translations ? { ...elementToDuplicate.translations } : undefined;
            if (isPureEmoji(elementToDuplicate.content) && dupTranslations) {
                Object.keys(dupTranslations).forEach(lang => {
                    dupTranslations[lang] = { ...dupTranslations[lang], content: elementToDuplicate.content };
                });
            }

            const newElement = clampPopupSticker({
                ...elementToDuplicate,
                id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                x: dupX,
                y: dupY,
                metadata: dupMetadata,
                ...(dupTranslations ? { translations: dupTranslations } : {})
            });

            const originalIndex = currentSlide.elements.findIndex(el => el.id === action.payload);
            const newElements = [...currentSlide.elements];
            if (originalIndex !== -1) {
                newElements.splice(originalIndex + 1, 0, newElement);
            } else {
                newElements.push(newElement);
            }

            return {
                ...state,
                past: newPast,
                isDirty: true,
                lesson: {
                    ...state.lesson,
                    slides: state.lesson.slides.map((slide) =>
                        slide.id === state.currentSlideId
                            ? { ...slide, elements: ensureBalloonsAboveImages(newElements) }
                            : slide
                    ),
                },
                selectedElementId: newElement.id,
                selectedElementIds: [newElement.id],
            };
        }

        case 'DUPLICATE_ELEMENTS': {
            const currentSlide = state.lesson.slides.find(s => s.id === state.currentSlideId);
            if (!currentSlide) return state;

            const idsToDuplicate = action.payload;
            const elementsToDuplicate = currentSlide.elements.filter(el => idsToDuplicate.includes(el.id) && el.id !== 'background' && el.id !== 'cartridge');
            if (elementsToDuplicate.length === 0) return state;

            const newPast = pushToPast(state);

            // Remap any groupIds to new unique IDs
            const groupMap = {};
            elementsToDuplicate.forEach(el => {
                const gid = el.metadata?.groupId;
                if (gid && !groupMap[gid]) {
                    groupMap[gid] = `group-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
                }
            });

            const duplicatedElements = elementsToDuplicate.map((el, index) => {
                const dupMeta = { ...el.metadata };
                delete dupMeta.manualZ;
                if (dupMeta.groupId && groupMap[dupMeta.groupId]) {
                    dupMeta.groupId = groupMap[dupMeta.groupId];
                }
                let dupTranslations = el.translations ? { ...el.translations } : undefined;
                if (isPureEmoji(el.content) && dupTranslations) {
                    Object.keys(dupTranslations).forEach(lang => {
                        dupTranslations[lang] = { ...dupTranslations[lang], content: el.content };
                    });
                }
                return clampPopupSticker({
                    ...el,
                    id: `el-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 6)}`,
                    x: Math.min((el.x || 50) + 3, 95),
                    y: Math.min((el.y || 50) + 3, 95),
                    metadata: dupMeta,
                    ...(dupTranslations ? { translations: dupTranslations } : {})
                });
            });

            const duplicatedIds = duplicatedElements.map(el => el.id);

            return {
                ...state,
                past: newPast,
                isDirty: true,
                lesson: {
                    ...state.lesson,
                    slides: state.lesson.slides.map((slide) =>
                        slide.id === state.currentSlideId
                            ? { ...slide, elements: ensureBalloonsAboveImages([...slide.elements, ...duplicatedElements]) }
                            : slide
                    ),
                },
                selectedElementId: duplicatedIds[duplicatedIds.length - 1],
                selectedElementIds: duplicatedIds,
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
                    if ((el.type === 'text' || el.type === 'collectible') && preset.text) {
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
                lesson: {
                    ...action.payload,
                    slides: (action.payload.slides || []).map(slide => ({
                        ...slide,
                        elements: ensureBalloonsAboveImages(slide.elements || [])
                    }))
                },
                currentSlideId: action.payload.slides?.[0]?.id || 'slide-1',
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

        case 'IMPORT_SCRIPT': {
            const { slides: newScriptSlides, title: scriptTitle, snapshot } = action.payload;

            // Add snapshot to history (cap at 5)
            const existingSnapshots = state.lesson._snapshots || [];
            const updatedSnapshots = [snapshot, ...existingSnapshots].slice(0, 5);

            return {
                ...state,
                isDirty: true,
                lesson: {
                    ...state.lesson,
                    slides: newScriptSlides.map(slide => ({
                        ...slide,
                        elements: ensureBalloonsAboveImages(slide.elements || [])
                    })),
                    ...(scriptTitle && { title: scriptTitle }),
                    _snapshots: updatedSnapshots,
                },
                currentSlideId: newScriptSlides[0]?.id || 'slide-1',
                selectedElementId: null,
                selectedElementIds: [],
            };
        }

        case 'RESTORE_SNAPSHOT': {
            const snapshotIndex = action.payload ?? 0;
            const snapshots = state.lesson._snapshots || [];
            const target = snapshots[snapshotIndex];
            if (!target || !target.slides) return state;

            return {
                ...state,
                isDirty: true,
                lesson: {
                    ...state.lesson,
                    slides: target.slides,
                },
                currentSlideId: target.slides[0]?.id || 'slide-1',
                selectedElementId: null,
                selectedElementIds: [],
            };
        }

        // ─── Translation Mode Actions ───
        case 'START_TRANSLATION': {
            const lang = action.payload; // 'en' | 'pt'
            // Build a draft from existing translations for every slide/element
            const draft = {};
            state.lesson.slides.forEach(slide => {
                draft[slide.id] = {};
                slide.elements.forEach(el => {
                    if (el.type === 'text' || el.type === 'balloon' || el.type === 'collectible' || el.type === 'banner') {
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
                    if (el.type === 'text' || el.type === 'balloon' || el.type === 'collectible' || el.type === 'banner') {
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

    if (typeof window !== 'undefined') {
        window.__PICO_DISPATCH__ = dispatch;
        window.__PICO_STATE__ = state;
    }

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
