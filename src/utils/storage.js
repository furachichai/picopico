/**
 * Utility for managing local student progress.
 * Uses localStorage to persist data on the client device.
 */

const STORAGE_KEY = 'picopico_student_progress';

/**
 * structure:
 * {
 *   [lessonPath]: {
 *     completed: boolean,
 *     lastSlideIndex: number,
 *     lastPlayed: timestamp,
 *     data: {} // For future use (quiz scores, etc)
 *   }
 * }
 */

export const getProgress = () => {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : {};
    } catch (e) {
        console.error('Failed to load progress', e);
        return {};
    }
};

const saveProgressData = (data) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.error('Failed to save progress', e);
    }
};

export const saveLessonProgress = (lessonPath, update) => {
    const allProgress = getProgress();
    const current = allProgress[lessonPath] || {};

    allProgress[lessonPath] = {
        ...current,
        ...update,
        lastPlayed: Date.now()
    };

    saveProgressData(allProgress);
};

export const getLessonProgress = (lessonPath) => {
    const allProgress = getProgress();
    return allProgress[lessonPath] || null;
};

export const clearProgress = () => {
    localStorage.removeItem(STORAGE_KEY);
};
