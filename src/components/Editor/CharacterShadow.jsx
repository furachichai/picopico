import React, { useState, useEffect } from 'react';
import { isCharacterElement, getCachedShadowMetrics, analyzeCharacterImage } from '../../utils/characterShadow';
import { resolveAssetUrl } from '../../utils/assetUrl';

/**
 * Renders an oblong semi-transparent shadow at the feet of a character.
 * Appears in the immediate previous layer (zIndex: 0) directly behind the character's body.
 * Width matches the character's lower body / stance width.
 */
const CharacterShadow = ({ element }) => {
    if (!isCharacterElement(element) || element.metadata?.hasShadow === false) {
        return null;
    }

    const resolvedUrl = resolveAssetUrl(element.content);
    const [metrics, setMetrics] = useState(() => getCachedShadowMetrics(resolvedUrl));

    useEffect(() => {
        analyzeCharacterImage(resolvedUrl, (newMetrics) => {
            setMetrics(newMetrics);
        });
    }, [resolvedUrl]);

    const m = metrics || {
        widthPercent: 70,
        heightPercent: 12,
        centerXPercent: 50,
        bottomPercent: 99
    };

    const centerX = element.metadata?.flipX ? (100 - m.centerXPercent) : m.centerXPercent;

    return (
        <div
            className="character-shadow"
            style={{
                position: 'absolute',
                left: `${centerX}%`,
                top: `${m.bottomPercent}%`,
                transform: 'translate(-50%, -50%)',
                width: `${m.widthPercent}%`,
                height: `${m.heightPercent}%`,
                borderRadius: '50%',
                background: 'radial-gradient(ellipse at center, rgba(20, 20, 25, 0.28) 0%, rgba(20, 20, 25, 0.20) 65%, rgba(20, 20, 25, 0) 100%)',
                pointerEvents: 'none',
                zIndex: 0,
            }}
        />
    );
};

export default CharacterShadow;
