
const LOCAL_LESSONS_KEY = 'picopico_local_lessons';

/**
 * structure of stored data:
 * [
 *   {
 *     id: 'uuid-timestamp',
 *     path: 'local://uuid-timestamp', 
 *     title: 'My Lesson',
 *     updatedAt: '...',
 *     slides: [...],
 *     // other lesson props
 *   }
 * ]
 */

export const getLocalLessons = () => {
    try {
        const data = localStorage.getItem(LOCAL_LESSONS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Failed to load local lessons', e);
        return [];
    }
};

export const saveLocalLesson = (lesson) => {
    try {
        const lessons = getLocalLessons();

        // Ensure lesson has a unique ID/Path if not present or if it's not a local path yet
        let localPath = lesson.path;
        if (!localPath || !localPath.startsWith('local://')) {
            localPath = `local://${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }

        const lessonToSave = {
            ...lesson,
            path: localPath,
            updatedAt: new Date().toISOString()
        };

        const existingIndex = lessons.findIndex(l => l.path === localPath);
        if (existingIndex >= 0) {
            lessons[existingIndex] = lessonToSave;
        } else {
            lessons.push(lessonToSave);
        }

        localStorage.setItem(LOCAL_LESSONS_KEY, JSON.stringify(lessons));
        return lessonToSave;
    } catch (e) {
        console.error('Failed to save local lesson', e);
        throw e;
    }
};

export const deleteLocalLesson = (path) => {
    try {
        const lessons = getLocalLessons();
        const filtered = lessons.filter(l => l.path !== path);
        localStorage.setItem(LOCAL_LESSONS_KEY, JSON.stringify(filtered));
    } catch (e) {
        console.error('Failed to delete local lesson', e);
    }
};

export const getLocalLesson = (path) => {
    const lessons = getLocalLessons();
    return lessons.find(l => l.path === path) || null;
};
