/**
 * @typedef {Object} Element
 * @property {string} id - Unique identifier
 * @property {'text' | 'image' | 'emoji' | 'quiz' | 'game'} type - Type of the element
 * @property {string} content - Text content or image URL
 * @property {number} x - X position in percentage (0-100)
 * @property {number} y - Y position in percentage (0-100)
 * @property {number} width - Width in percentage
 * @property {number} height - Height in percentage
 * @property {number} rotation - Rotation in degrees
 * @property {number} scale - Scale factor
 * @property {Object} [metadata] - Additional data (e.g., quiz options, game config)
 */

/**
 * @typedef {Object} Slide
 * @property {string} id - Unique identifier
 * @property {string} background - Background color or image URL
 * @property {Element[]} elements - List of elements on the slide
 * @property {number} order - Order of the slide
 */

/**
 * @typedef {Object} Lesson
 * @property {string} id - Unique identifier
 * @property {string} title - Title of the microlesson
 * @property {Slide[]} slides - List of slides
 * @property {string} author - Author name
 * @property {Date} createdAt - Creation date
 */

export const ELEMENT_TYPES = {
    TEXT: 'text',
    IMAGE: 'image',
    EMOJI: 'emoji',
    QUIZ: 'quiz',
    GAME: 'game',
    BALLOON: 'balloon',
};
