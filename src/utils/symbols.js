export const getSymbolSvg = (type, value, color = '#8B5CF6', options = {}) => {
    let svg = '';

    if (type === 'number') {
        svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <circle cx="50" cy="50" r="50" fill="${color}" />
  <text x="50" y="55" dominant-baseline="middle" text-anchor="middle" fill="#FFFFFF" font-family="Outfit, Inter, sans-serif" font-size="60" font-weight="900">${value}</text>
</svg>`;
    } else if (type === 'arrow-thin') {
        const rotation = getRotation(value);
        svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <g transform="rotate(${rotation} 50 50)">
    <path d="M50 15 L50 85 M25 40 L50 15 L75 40" stroke="${color}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </g>
</svg>`;
    } else if (type === 'arrow-thick') {
        const rotation = getRotation(value);
        svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <g transform="rotate(${rotation} 50 50)">
    <path d="M50 10 L85 45 L65 45 L65 90 L35 90 L35 45 L15 45 Z" fill="${color}" stroke-linejoin="round"/>
  </g>
</svg>`;
    } else if (type === 'shape-circle') {
        svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="none">
  <circle cx="50" cy="50" r="50" fill="${color}" />
</svg>`;
    } else if (type === 'shape-square') {
        const radius = options.roundCorners ? '10' : '0';
        svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="none">
  <rect x="0" y="0" width="100" height="100" rx="${radius}" ry="${radius}" fill="${color}" />
</svg>`;
    } else if (type === 'shape-rectangle') {
        svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="none">
  <rect x="0" y="0" width="100" height="100" fill="${color}" />
</svg>`;
    } else if (type === 'shape-rounded-rectangle') {
        svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="none">
  <rect x="0" y="0" width="100" height="100" rx="15" ry="15" fill="${color}" />
</svg>`;
    }

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

function getRotation(direction) {
    switch(direction) {
        case 'up': return 0;
        case 'right': return 90;
        case 'down': return 180;
        case 'left': return 270;
        default: return 0;
    }
}
