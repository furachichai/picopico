import React from 'react';

// Helper to find GCD (Greatest Common Divisor) for simplifying
const gcd = (a, b) => {
    return b ? gcd(b, a % b) : a;
};

// Parse a string "1/2" or "3" into a float value
export const parseFraction = (input) => {
    if (typeof input === 'number') return input;
    if (!input) return 0;

    // Handle mixed numbers if needed? For now assume simple "a/b" or "a"
    if (input.includes('/')) {
        const [n, d] = input.split('/').map(s => parseFloat(s.trim()));
        if (!isNaN(n) && !isNaN(d) && d !== 0) {
            return n / d;
        }
    }

    return parseFloat(input) || 0;
};

// Format a value (float or string) into a renderable object { n, d, isFraction }
// If numericTick is provided (the raw float value of a tick step), we try to convert it to a fraction
// if user provided inputs as fractions.
export const formatFraction = (value, useFractions = false) => {
    if (!useFractions) {
        // Return standard number/string
        // If it's a float tick, format nicely
        if (typeof value === 'number' && !Number.isInteger(value)) {
            return { text: value.toFixed(1), isFraction: false };
        }
        return { text: value.toString(), isFraction: false };
    }

    // If existing input string "1/2" was passed directly (e.g. for endpoints)
    if (typeof value === 'string' && value.includes('/')) {
        const [n, d] = value.split('/');
        return { n, d, isFraction: true };
    }

    // If it's a float (calculated intermediate tick)
    // We attempt to decimal-to-fraction, but it can be messy.
    // Simplest approach: "Best guess" or Decimal.
    // For a school app, we often want specific steps (e.g. 0, 0.25, 0.5) -> 0, 1/4, 2/4 (or 1/2).
    // Let's implement a basic decimcal-to-fraction converter with tolerance
    if (typeof value === 'number') {
        if (Number.isInteger(value)) return { text: value.toString(), isFraction: false };

        const tolerance = 1.0E-6;
        let h1 = 1; let h2 = 0;
        let k1 = 0; let k2 = 1;
        let b = value;
        do {
            let a = Math.floor(b);
            let aux = h1; h1 = a * h1 + h2; h2 = aux;
            aux = k1; k1 = a * k1 + k2; k2 = aux;
            b = 1 / (b - a);
        } while (Math.abs(value - h1 / k1) > value * tolerance);

        return { n: h1, d: k1, isFraction: true };
    }

    return { text: value.toString(), isFraction: false };
};

// Component to render vertical fraction
export const FractionComponent = ({ value, useFractions = false, color = '#000' }) => {
    const formatted = formatFraction(value, useFractions);

    if (!formatted.isFraction) {
        return <span style={{ color, fontSize: '1rem', fontWeight: 'bold' }}>{formatted.text}</span>;
    }

    return (
        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1, verticalAlign: 'middle' }}>
            <span style={{ borderBottom: `2px solid ${color}`, paddingBottom: '1px', display: 'block', width: '100%', textAlign: 'center', fontWeight: 'bold', fontSize: '0.85rem' }}>
                {formatted.n}
            </span>
            <span style={{ paddingTop: '1px', display: 'block', width: '100%', textAlign: 'center', fontWeight: 'bold', fontSize: '0.85rem' }}>
                {formatted.d}
            </span>
        </div>
    );
};
