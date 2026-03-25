/**
 * locales.js
 * 
 * Locale configurations for PEMDAS/BODMAS/PAPOMUDAS/BEDMAS variants.
 */

const LOCALES = {
  US: {
    flag: '🇺🇸',
    acronym: 'PEMDAS',
    lang: 'en',
    title: 'PEMDAS',
    subtitle: 'Master the Order of Operations.\nSimplify expressions before they hit the ground!',
    play: 'PLAY',
    playAgain: 'PLAY AGAIN',
    gameOver: 'GAME OVER',
    score: 'SCORE',
    level: 'LEVEL',
    buttons: [
      { key: 'P', label: '()', symbol: '( )', name: 'Parentheses', color: '#8b5cf6', smallLabel: true },
      { key: 'E', label: 'aⁿ', symbol: 'aⁿ', name: 'Exponents', color: '#ec4899', smallLabel: true },
      { key: 'M', label: '×', symbol: '×', name: 'Multiply', color: '#3b82f6' },
      { key: 'D', label: '÷', symbol: '÷', name: 'Divide', color: '#f59e0b' },
      { key: 'A', label: '+', symbol: '+', name: 'Add', color: '#10b981' },
      { key: 'S', label: '−', symbol: '−', name: 'Subtract', color: '#06b6d4' },
    ],
    letters: ['P', 'E', 'M', 'D', 'A', 'S'],
  },

  UK: {
    flag: '🇬🇧',
    acronym: 'BODMAS',
    lang: 'en',
    title: 'BODMAS',
    subtitle: 'Master the Order of Operations.\nSimplify expressions before they hit the ground!',
    play: 'PLAY',
    playAgain: 'PLAY AGAIN',
    gameOver: 'GAME OVER',
    score: 'SCORE',
    level: 'LEVEL',
    buttons: [
      { key: 'B', label: '()', symbol: '( )', name: 'Brackets', color: '#8b5cf6', smallLabel: true },
      { key: 'O', label: 'aⁿ', symbol: 'aⁿ', name: 'Orders', color: '#ec4899', smallLabel: true },
      { key: 'D', label: '÷', symbol: '÷', name: 'Division', color: '#f59e0b' },
      { key: 'M', label: '×', symbol: '×', name: 'Multiplication', color: '#3b82f6' },
      { key: 'A', label: '+', symbol: '+', name: 'Addition', color: '#10b981' },
      { key: 'S', label: '−', symbol: '−', name: 'Subtraction', color: '#06b6d4' },
    ],
    letters: ['B', 'O', 'D', 'M', 'A', 'S'],
  },

  ES: {
    flag: '🇪🇸',
    acronym: 'PAPOMUDAS',
    lang: 'es',
    title: 'PAPOMUDAS',
    subtitle: 'Domina el Orden de las Operaciones.\n¡Simplifica las expresiones antes de que lleguen al fondo!',
    play: 'JUGAR',
    playAgain: 'JUGAR DE NUEVO',
    gameOver: 'FIN DEL JUEGO',
    score: 'PUNTOS',
    level: 'NIVEL',
    buttons: [
      { key: 'P', label: '()', symbol: '( )', name: 'Paréntesis', color: '#8b5cf6', smallLabel: true, displayKey: 'Pa' },
      { key: 'O', label: 'aⁿ', symbol: 'aⁿ', name: 'Potencias', color: '#ec4899', smallLabel: true, displayKey: 'Po' },
      { key: 'M', label: '×', symbol: '×', name: 'Multiplicación', color: '#3b82f6', displayKey: 'Mu' },
      { key: 'D', label: '÷', symbol: '÷', name: 'División', color: '#f59e0b' },
      { key: 'A', label: '+', symbol: '+', name: 'Adición', color: '#10b981' },
      { key: 'S', label: '−', symbol: '−', name: 'Sustracción', color: '#06b6d4' },
    ],
    letters: ['Pa', 'Po', 'Mu', 'D', 'A', 'S'],
  },

  CA: {
    flag: '🇨🇦',
    acronym: 'BEDMAS',
    lang: 'fr',
    title: 'BEDMAS',
    subtitle: "Maîtrise l'ordre des opérations.\nSimplifie les expressions avant qu'elles n'atteignent le bas!",
    play: 'JOUER',
    playAgain: 'REJOUER',
    gameOver: 'FIN DE PARTIE',
    score: 'SCORE',
    level: 'NIVEAU',
    buttons: [
      { key: 'B', label: '()', symbol: '( )', name: 'Parenthèses', color: '#8b5cf6', smallLabel: true },
      { key: 'E', label: 'aⁿ', symbol: 'aⁿ', name: 'Exposants', color: '#ec4899', smallLabel: true },
      { key: 'D', label: '÷', symbol: '÷', name: 'Division', color: '#f59e0b' },
      { key: 'M', label: '×', symbol: '×', name: 'Multiplication', color: '#3b82f6' },
      { key: 'A', label: '+', symbol: '+', name: 'Addition', color: '#10b981' },
      { key: 'S', label: '−', symbol: '−', name: 'Soustraction', color: '#06b6d4' },
    ],
    letters: ['B', 'E', 'D', 'M', 'A', 'S'],
  },
};

const LOCALE_ORDER = ['US', 'UK', 'ES', 'CA'];

// Map locale-specific keys to PEMDAS operation keys for the engine
const KEY_TO_OPERATION = {
  // Parentheses
  'P': 'P', 'B': 'P',
  // Exponents
  'E': 'E', 'O': 'E',
  // Multiplication
  'M': 'M',
  // Division
  'D': 'D',
  // Addition
  'A': 'A',
  // Subtraction
  'S': 'S',
};

export { LOCALES, LOCALE_ORDER, KEY_TO_OPERATION };
