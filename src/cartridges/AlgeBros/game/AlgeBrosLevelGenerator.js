/**
 * AlgeBrosLevelGenerator.js
 * 
 * Generates 10 levels of combining-like-terms algebra puzzles.
 */
import { makeTerm, calculateMinPresses } from './AlgeBrosEngine';

const LEVEL_TEMPLATES = [
  // Level 1: 3 terms, e.g. "3x + 5 + 4x"
  {
    vars: ['x'],
    pattern: ['var', 'const', 'var'],
  },
  // Level 2: 3 terms, e.g. "8 - 2x - 5"
  {
    vars: ['x'],
    pattern: ['const', 'var', 'const'],
  },
  // Level 3: 4 terms, e.g. "6y - 3 + 2y - 4"
  {
    vars: ['y'],
    pattern: ['var', 'const', 'var', 'const'],
  },
  // Level 4: 4 terms, e.g. "-4a + 7b + 9a - 2b"
  {
    vars: ['a', 'b'],
    pattern: ['var0', 'var1', 'var0', 'var1'],
  },
  // Level 5: 5 terms, e.g. "12 - 5x + 3x - 10 + 2x"
  {
    vars: ['x'],
    pattern: ['const', 'var', 'var', 'const', 'var'],
  },
  // Level 6: 4 terms, e.g. "4x^2 + 5x - 2x^2 + 3x"
  {
    vars: ['x^2', 'x'],
    pattern: ['var0', 'var1', 'var0', 'var1'],
  },
  // Level 7: 5 terms, e.g. "2x^2 - 3x + 5 - x^2 + 7x"
  {
    vars: ['x^2', 'x'],
    pattern: ['var0', 'var1', 'const', 'var0', 'var1'],
  },
  // Level 8: 5 terms, e.g. "3y^2 + 4y - y^2 - 8y - 5"
  {
    vars: ['y^2', 'y'],
    pattern: ['var0', 'var1', 'var0', 'var1', 'const'],
  },
  // Level 9: 6 terms, e.g. "-2x^2 + 7y - 5 + 4x^2 - 3y + 12"
  {
    vars: ['x^2', 'y'],
    pattern: ['var0', 'var1', 'const', 'var0', 'var1', 'const'],
  },
  // Level 10: 7 terms, e.g. "5x^2 - 3x + 8 - 2x^2 - 4x - 6 - x^2"
  {
    vars: ['x^2', 'x'],
    pattern: ['var0', 'var1', 'const', 'var0', 'var1', 'const', 'var0'],
  }
];

function getRandomCoeff(min = 2, max = 12) {
  const val = Math.floor(Math.random() * (max - min + 1)) + min;
  return Math.random() < 0.5 ? -val : val;
}

export function generateLevels() {
  return LEVEL_TEMPLATES.map((tpl, index) => {
    const levelNum = index + 1;
    
    let var0 = 'x';
    let var1 = 'y';
    let constVar = null; // null means plain number constant
    
    if (levelNum === 1) {
      var0 = 'x';
    } else if (levelNum === 2) {
      var0 = 'x';
    } else if (levelNum === 3) {
      var0 = 'y';
    } else if (levelNum === 4) {
      var0 = 'ax';
      var1 = 'by';
    } else if (levelNum === 5) {
      var0 = 'x';
      constVar = 'a';
    } else if (levelNum === 6) {
      var0 = 'ax^2';
      var1 = 'bx';
    } else if (levelNum === 7) {
      var0 = 'ax^2';
      var1 = 'ax';
      constVar = 'b';
    } else if (levelNum === 8) {
      var0 = 'by^2';
      var1 = 'cy';
      constVar = 'a';
    } else if (levelNum === 9) {
      var0 = 'ax^2';
      var1 = 'by';
      constVar = 'c';
    } else if (levelNum === 10) {
      var0 = 'ax^2';
      var1 = 'bx';
      constVar = 'c';
    }

    let terms = [];
    let attempts = 0;
    let maxTerms = tpl.pattern.length;
    
    do {
      terms = [];
      if (attempts > 5 && maxTerms > 3) {
        maxTerms--;
        attempts = 0;
      }
      
      const patternToUse = tpl.pattern.slice(0, maxTerms);
      patternToUse.forEach((type) => {
        const coeff = getRandomCoeff();
        let variable = null;

        if (type === 'const') {
          variable = constVar;
        } else if (type === 'var') {
          variable = var0;
        } else if (type === 'var0') {
          variable = var0;
        } else if (type === 'var1') {
          variable = var1;
        }

        terms.push(makeTerm(coeff, variable));
      });
      attempts++;
    } while (attempts < 20 && (hasZeroSumGroups(terms) || !doesExpressionFit(terms)));

    return {
      levelNum,
      initialTerms: terms,
      minPresses: calculateMinPresses(terms),
    };
  });
}

function hasZeroSumGroups(terms) {
  const sums = {};
  for (const t of terms) {
    sums[t.variable] = (sums[t.variable] || 0) + t.coeff;
  }
  for (const v in sums) {
    if (sums[v] === 0) return true; // sum of this category is 0
  }
  return false;
}

function getTermWidth(term) {
  if (!term) return 0;
  const absCoeff = Math.abs(term.coeff);
  const isOne = absCoeff === 1;
  const hasVar = !!term.variable;
  let chars = 0;
  if (term.coeff === 0) {
    chars = 1;
  } else {
    if (!hasVar) {
      chars = absCoeff.toString().length;
    } else {
      chars = (isOne ? 0 : absCoeff.toString().length) + term.variable.length;
    }
  }
  return 14 + chars * 8.5;
}

function doesExpressionFit(terms) {
  const totalBaseWidth = terms.reduce((acc, term, idx) => {
    const cardW = getTermWidth(term);
    const opW = idx > 0 ? 32 : 0;
    const staticSignW = (idx === 0 && term.coeff < 0) ? 12 : 0;
    return acc + cardW + opW + staticSignW;
  }, 0);
  
  const targetWidth = 288; // 80% of 360px
  const calculatedScale = totalBaseWidth > 0 ? targetWidth / totalBaseWidth : 1;
  
  return calculatedScale >= 0.70;
}
