import React, { useRef, useEffect } from 'react';

function catmullRomToBezier(points) {
    if (!points || points.length === 0) return '';
    let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)} `;
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = i === 0 ? points[0] : points[i - 1];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = i + 2 < points.length ? points[i + 2] : p2;

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        d += `C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ` +
            `${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ` +
            `${p2.x.toFixed(2)} ${p2.y.toFixed(2)} `;
    }
    return d;
}

/**
 * Calculates geometry, dimensions, origin, and tip coordinates for a speech balloon.
 * Shared between Balloon.jsx (for SVG path generation) and Sticker.jsx (for drag handles).
 */
export function getBalloonTailGeometry(element) {
    const parentW = 360;
    const parentH = 640;

    // Default to ~200x100 if undefined (legacy fallback)
    const w = element.width ? (element.width / 100) * parentW : 200;
    const h = element.height ? (element.height / 100) * parentH : 100;

    const cx = w / 2;
    const cy = h / 2;

    const skin = element.metadata?.skin;
    const isThought = skin === 'thought' || skin === 'cloud';
    const isOctoRect = skin === 'octo_rect' || skin === 'octo-rect' || skin === 'octopus_rect' || skin === 'octopus-rect';
    const isOctoOval = skin === 'octo' || skin === 'octopus' || skin === 'octo_oval';
    const isOcto = isOctoOval || isOctoRect;
    const isOval = skin === 'oval' || skin === 'round';

    // Tail tip position relative to center (safe defaults)
    const tailX = typeof element.metadata?.tailPos?.x === 'number'
        ? element.metadata.tailPos.x
        : (isThought ? -45 : (isOcto ? 65 : (isOval ? 35 : 20)));
    const tailY = typeof element.metadata?.tailPos?.y === 'number'
        ? element.metadata.tailPos.y
        : (isThought ? 65 : (isOcto ? 55 : 60));

    // Tail tip position (absolute in viewBox)
    const tx = cx + tailX;
    const ty = cy + tailY;

    const padding = 10; // Less padding to maximize space
    const r = 20; // Corner radius

    // Safety bounds
    const left = padding;
    const right = w - padding;
    const top = padding;
    const bottom = h - padding;

    if (isThought) {
        const thoughtPad = 16;
        const rx = Math.max(20, (w - 2 * thoughtPad) / 2);
        const ry = Math.max(20, (h - 2 * thoughtPad) / 2);

        let theta = element.metadata?.tailOrigin?.angle;

        if (typeof theta !== 'number') {
            const edge = element.metadata?.tailOrigin?.edge;
            const offset = typeof element.metadata?.tailOrigin?.offset === 'number'
                ? Math.max(0, Math.min(1, element.metadata.tailOrigin.offset))
                : 0.5;

            if (edge === 'bottom') {
                const rawX = left + offset * (right - left);
                theta = Math.atan2(ry, rawX - cx);
            } else if (edge === 'top') {
                const rawX = left + offset * (right - left);
                theta = Math.atan2(-ry, rawX - cx);
            } else if (edge === 'left') {
                const rawY = top + offset * (bottom - top);
                theta = Math.atan2(rawY - cy, -rx);
            } else if (edge === 'right') {
                const rawY = top + offset * (bottom - top);
                theta = Math.atan2(rawY - cy, rx);
            } else {
                theta = Math.atan2(tailY / ry, tailX / rx);
            }
        }

        // Generate puffy cumulus cloud body
        const numLobes = 9;
        const cusps = [];
        for (let i = 0; i < numLobes; i++) {
            const ang = (i / numLobes) * Math.PI * 2;
            const x = cx + rx * Math.cos(ang);
            const y = cy + ry * Math.sin(ang);
            cusps.push({ x, y, ang });
        }

        let cloudD = `M ${cusps[0].x.toFixed(2)} ${cusps[0].y.toFixed(2)} `;
        for (let i = 0; i < numLobes; i++) {
            const next = cusps[(i + 1) % numLobes];
            const chord = Math.hypot(next.x - cusps[i].x, next.y - cusps[i].y);

            let midAng = (cusps[i].ang + next.ang) / 2;
            if (next.ang < cusps[i].ang) {
                midAng = (cusps[i].ang + next.ang + Math.PI * 2) / 2;
            }

            // Top lobes puff out slightly higher like reference cumulus
            const isTop = Math.sin(midAng) < -0.3;
            const puffFactor = isTop ? 0.72 : 0.65;
            const arcR = chord * puffFactor;

            cloudD += `A ${arcR.toFixed(2)} ${arcR.toFixed(2)} 0 0 1 ${next.x.toFixed(2)} ${next.y.toFixed(2)} `;
        }
        cloudD += 'Z ';

        // Outer cloud boundary at angle theta for trailing bubble origin
        const puffOffset = Math.min(rx, ry) * 0.12;
        const originX = cx + (rx + puffOffset) * Math.cos(theta);
        const originY = cy + (ry + puffOffset) * Math.sin(theta);

        // Vector from origin to tip
        const vtx = tx - originX;
        const vty = ty - originY;
        const dist = Math.hypot(vtx, vty);
        const ux = dist > 0.001 ? vtx / dist : 0;
        const uy = dist > 0.001 ? vty / dist : 1;

        let circlesD = '';
        if (dist > 15) {
            const r1 = Math.min(18, Math.max(6, dist * 0.14));
            const r2 = Math.min(11, Math.max(4, dist * 0.085));

            const c1x = originX + ux * (dist * 0.42);
            const c1y = originY + uy * (dist * 0.42);

            const c2x = originX + ux * (dist * 0.85);
            const c2y = originY + uy * (dist * 0.85);

            const circleSubpath = (x, y, r) =>
                `M ${(x - r).toFixed(2)} ${y.toFixed(2)} ` +
                `A ${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(x + r).toFixed(2)} ${y.toFixed(2)} ` +
                `A ${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(x - r).toFixed(2)} ${y.toFixed(2)} Z `;

            circlesD = circleSubpath(c1x, c1y, r1) + circleSubpath(c2x, c2y, r2);
        }

        return {
            w, h, cx, cy, tx, ty,
            left, right, top, bottom, r,
            originX, originY,
            originRelX: originX - cx,
            originRelY: originY - cy,
            path: cloudD + circlesD,
            detailPath: null,
            dotsPath: null,
            isOval: false,
            isThought: true,
            isOcto: false,
            rx, ry, theta
        };
    }

    if (isOcto) {
        const rx = Math.max(10, (w - 2 * padding) / 2);
        const ry = Math.max(10, (h - 2 * padding) / 2);

        let originX, originY;
        let tangX, tangY;
        let theta;
        let deltaTheta = 0;
        let edge, offset, base, baseHalfWidth;

        // 35% thinner tentacle
        const thicknessFactor = 0.65;
        const baseWidthPx = Math.min(22, Math.max(12, Math.min(rx, ry) * 0.23));

        if (isOctoOval) {
            theta = element.metadata?.tailOrigin?.angle;

            if (typeof theta !== 'number') {
                const rawEdge = element.metadata?.tailOrigin?.edge;
                const rawOffset = typeof element.metadata?.tailOrigin?.offset === 'number'
                    ? Math.max(0, Math.min(1, element.metadata.tailOrigin.offset))
                    : 0.5;

                if (rawEdge === 'bottom') {
                    const rawX = left + rawOffset * (right - left);
                    theta = Math.atan2(ry, rawX - cx);
                } else if (rawEdge === 'top') {
                    const rawX = left + rawOffset * (right - left);
                    theta = Math.atan2(-ry, rawX - cx);
                } else if (rawEdge === 'left') {
                    const rawY = top + rawOffset * (bottom - top);
                    theta = Math.atan2(rawY - cy, -rx);
                } else if (rawEdge === 'right') {
                    const rawY = top + rawOffset * (bottom - top);
                    theta = Math.atan2(rawY - cy, rx);
                } else {
                    theta = Math.atan2(tailY / ry, tailX / rx);
                }
            }

            // Exact pixel speed at angle theta along ellipse perimeter
            const pixelSpeed = Math.hypot(rx * Math.sin(theta), ry * Math.cos(theta)) || 1;
            deltaTheta = Math.min(0.38, Math.max(0.08, baseWidthPx / pixelSpeed));

            originX = cx + rx * Math.cos(theta);
            originY = cy + ry * Math.sin(theta);

            // Tangent along perimeter (clockwise in SVG y-down coords)
            tangX = -Math.sin(theta);
            tangY = Math.cos(theta);
        } else {
            edge = element.metadata?.tailOrigin?.edge;
            offset = element.metadata?.tailOrigin?.offset;

            if (!edge) {
                const angle = (typeof element.metadata?.tailOrigin?.angle === 'number')
                    ? element.metadata.tailOrigin.angle * (180 / Math.PI)
                    : Math.atan2(tailY, tailX) * (180 / Math.PI);
                if (angle >= -45 && angle < 45) {
                    edge = 'right';
                } else if (angle >= 45 && angle < 135) {
                    edge = 'bottom';
                } else if (angle >= -135 && angle < -45) {
                    edge = 'top';
                } else {
                    edge = 'left';
                }
            }
            if (typeof offset !== 'number') {
                offset = 0.5;
            }
            offset = Math.max(0, Math.min(1, offset));

            const maxBaseSpan = (edge === 'left' || edge === 'right')
                ? Math.max(0, (bottom - r) - (top + r))
                : Math.max(0, (right - r) - (left + r));

            baseHalfWidth = Math.min(baseWidthPx / 2, Math.max(6, (maxBaseSpan - 4) / 2));

            let minBase, maxBase, rawBase;
            if (edge === 'bottom' || edge === 'top') {
                minBase = left + r + baseHalfWidth;
                maxBase = right - r - baseHalfWidth;
                rawBase = left + offset * (right - left);
            } else {
                minBase = top + r + baseHalfWidth;
                maxBase = bottom - r - baseHalfWidth;
                rawBase = top + offset * (bottom - top);
            }

            if (minBase > maxBase) {
                base = (edge === 'bottom' || edge === 'top') ? cx : cy;
            } else {
                base = Math.max(minBase, Math.min(maxBase, rawBase));
            }

            if (edge === 'bottom') {
                originX = base;
                originY = bottom;
                tangX = -1;
                tangY = 0;
            } else if (edge === 'top') {
                originX = base;
                originY = top;
                tangX = 1;
                tangY = 0;
            } else if (edge === 'left') {
                originX = left;
                originY = base;
                tangX = 0;
                tangY = -1;
            } else {
                originX = right;
                originY = base;
                tangX = 0;
                tangY = 1;
            }
        }

        const vx = tx - originX;
        const vy = ty - originY;
        const L = Math.hypot(vx, vy) || 1;
        const ux = vx / L;
        const uy = vy / L;

        // Lateral projection of tip vector along perimeter tangent
        const vt = vx * tangX + vy * tangY;
        const isMirrored = vt >= 0;

        let p1, p2;
        if (isOctoOval) {
            const theta1 = isMirrored ? (theta + deltaTheta / 2) : (theta - deltaTheta / 2);
            const theta2 = isMirrored ? (theta - deltaTheta / 2) : (theta + deltaTheta / 2);
            p1 = { x: cx + rx * Math.cos(theta1), y: cy + ry * Math.sin(theta1) };
            p2 = { x: cx + rx * Math.cos(theta2), y: cy + ry * Math.sin(theta2) };
        } else {
            p1 = {
                x: originX + (isMirrored ? baseHalfWidth : -baseHalfWidth) * tangX,
                y: originY + (isMirrored ? baseHalfWidth : -baseHalfWidth) * tangY
            };
            p2 = {
                x: originX + (isMirrored ? -baseHalfWidth : baseHalfWidth) * tangX,
                y: originY + (isMirrored ? -baseHalfWidth : baseHalfWidth) * tangY
            };
        }

        const flipSign = isMirrored ? -1 : 1;
        const nx = -uy * flipSign;
        const ny = ux * flipSign;

        // Taper & width scale based on tail length (reduced 35%)
        const vScale = Math.min(1.15, Math.max(0.65, 80 / Math.max(45, L))) * thicknessFactor;

        const fromUV = (u, v) => ({
            x: originX + u * L * ux + v * L * nx * vScale,
            y: originY + u * L * uy + v * L * ny * vScale
        });

        // Smooth spine along upper edge
        const upperUV = [
            { u: 0.260, v: -0.139 },
            { u: 0.596, v: -0.219 },
            { u: 0.777, v: -0.217 },
            { u: 0.921, v: -0.142 },
            { u: 0.989, v: -0.057 },
            { u: 1.000, v: 0 }
        ];

        // Sucker bumps along lower edge (opposite side)
        const lowerUV = [
            { u: 0.979, v: 0.060 },
            { u: 0.938, v: 0.080 },
            { u: 0.750, v: 0.033 },
            { u: 0.676, v: 0.076 },
            { u: 0.636, v: 0.076 },
            { u: 0.571, v: 0.143 },
            { u: 0.474, v: 0.154 },
            { u: 0.400, v: 0.217 },
            { u: 0.263, v: 0.207 }
        ];

        const allTentacle = [
            p1,
            ...upperUV.map(pt => fromUV(pt.u, pt.v)),
            ...lowerUV.map(pt => fromUV(pt.u, pt.v)),
            p2
        ];

        const tentacleD = catmullRomToBezier(allTentacle);
        let path;
        if (isOctoOval) {
            const sweepFlag = isMirrored ? 0 : 1;
            path = tentacleD + `A ${rx.toFixed(2)} ${ry.toFixed(2)} 0 1 ${sweepFlag} ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} Z`;
        } else {
            let bodyD = '';
            if (edge === 'bottom') {
                if (p2.x < p1.x) {
                    bodyD = `
                        L ${left + r} ${bottom}
                        Q ${left} ${bottom} ${left} ${bottom - r}
                        L ${left} ${top + r}
                        Q ${left} ${top} ${left + r} ${top}
                        L ${right - r} ${top}
                        Q ${right} ${top} ${right} ${top + r}
                        L ${right} ${bottom - r}
                        Q ${right} ${bottom} ${right - r} ${bottom}
                        L ${p1.x.toFixed(2)} ${bottom}
                    `;
                } else {
                    bodyD = `
                        L ${right - r} ${bottom}
                        Q ${right} ${bottom} ${right} ${bottom - r}
                        L ${right} ${top + r}
                        Q ${right} ${top} ${right - r} ${top}
                        L ${left + r} ${top}
                        Q ${left} ${top} ${left} ${top + r}
                        L ${left} ${bottom - r}
                        Q ${left} ${bottom} ${left + r} ${bottom}
                        L ${p1.x.toFixed(2)} ${bottom}
                    `;
                }
            } else if (edge === 'top') {
                if (p2.x < p1.x) {
                    bodyD = `
                        L ${left + r} ${top}
                        Q ${left} ${top} ${left} ${top + r}
                        L ${left} ${bottom - r}
                        Q ${left} ${bottom} ${left + r} ${bottom}
                        L ${right - r} ${bottom}
                        Q ${right} ${bottom} ${right} ${bottom - r}
                        L ${right} ${top + r}
                        Q ${right} ${top} ${right - r} ${top}
                        L ${p1.x.toFixed(2)} ${top}
                    `;
                } else {
                    bodyD = `
                        L ${right - r} ${top}
                        Q ${right} ${top} ${right} ${top + r}
                        L ${right} ${bottom - r}
                        Q ${right} ${bottom} ${right - r} ${bottom}
                        L ${left + r} ${bottom}
                        Q ${left} ${bottom} ${left} ${bottom - r}
                        L ${left} ${top + r}
                        Q ${left} ${top} ${left + r} ${top}
                        L ${p1.x.toFixed(2)} ${top}
                    `;
                }
            } else if (edge === 'right') {
                if (p2.y < p1.y) {
                    bodyD = `
                        L ${right} ${top + r}
                        Q ${right} ${top} ${right - r} ${top}
                        L ${left + r} ${top}
                        Q ${left} ${top} ${left} ${top + r}
                        L ${left} ${bottom - r}
                        Q ${left} ${bottom} ${left + r} ${bottom}
                        L ${right - r} ${bottom}
                        Q ${right} ${bottom} ${right} ${bottom - r}
                        L ${right} ${p1.y.toFixed(2)}
                    `;
                } else {
                    bodyD = `
                        L ${right} ${bottom - r}
                        Q ${right} ${bottom} ${right - r} ${bottom}
                        L ${left + r} ${bottom}
                        Q ${left} ${bottom} ${left} ${bottom - r}
                        L ${left} ${top + r}
                        Q ${left} ${top} ${left + r} ${top}
                        L ${right - r} ${top}
                        Q ${right} ${top} ${right} ${top + r}
                        L ${right} ${p1.y.toFixed(2)}
                    `;
                }
            } else {
                // edge === 'left'
                if (p2.y < p1.y) {
                    bodyD = `
                        L ${left} ${top + r}
                        Q ${left} ${top} ${left + r} ${top}
                        L ${right - r} ${top}
                        Q ${right} ${top} ${right} ${top + r}
                        L ${right} ${bottom - r}
                        Q ${right} ${bottom} ${right - r} ${bottom}
                        L ${left + r} ${bottom}
                        Q ${left} ${bottom} ${left} ${bottom - r}
                        L ${left} ${p1.y.toFixed(2)}
                    `;
                } else {
                    bodyD = `
                        L ${left} ${bottom - r}
                        Q ${left} ${bottom} ${left + r} ${bottom}
                        L ${right - r} ${bottom}
                        Q ${right} ${bottom} ${right} ${bottom - r}
                        L ${right} ${top + r}
                        Q ${right} ${top} ${right - r} ${top}
                        L ${left + r} ${top}
                        Q ${left} ${top} ${left} ${top + r}
                        L ${left} ${p1.y.toFixed(2)}
                    `;
                }
            }
            path = tentacleD + bodyD + ' Z';
        }

        // Suction cups placed on the opposite side of the tentacle (positive v)
        const allCups = [
            { u: 0.26, v: 0.11, r: 0.098, dotR: 0.030, minL: 0 },
            { u: 0.40, v: 0.10, r: 0.083, dotR: 0.027, minL: 20 },
            { u: 0.56, v: 0.07, r: 0.068, dotR: 0.023, minL: 35 },
            { u: 0.70, v: 0.04, r: 0.053, dotR: 0.018, minL: 42 },
            { u: 0.84, v: 0.02, r: 0.038, dotR: 0.014, minL: 60 }
        ];

        const cupsUV = allCups.filter(c => L >= c.minL);

        let cupsD = '';
        let dotsD = '';
        for (const c of cupsUV) {
            const center = fromUV(c.u, c.v);
            const rCup = Math.max(2.0, c.r * L * vScale);
            const dotR = Math.max(0.75, c.dotR * L * vScale);
            cupsD += `M ${(center.x - rCup).toFixed(2)} ${center.y.toFixed(2)} ` +
                `A ${rCup.toFixed(2)} ${rCup.toFixed(2)} 0 1 0 ${(center.x + rCup).toFixed(2)} ${center.y.toFixed(2)} ` +
                `A ${rCup.toFixed(2)} ${rCup.toFixed(2)} 0 1 0 ${(center.x - rCup).toFixed(2)} ${center.y.toFixed(2)} Z `;
            dotsD += `M ${(center.x - dotR).toFixed(2)} ${center.y.toFixed(2)} ` +
                `A ${dotR.toFixed(2)} ${dotR.toFixed(2)} 0 1 0 ${(center.x + dotR).toFixed(2)} ${center.y.toFixed(2)} ` +
                `A ${dotR.toFixed(2)} ${dotR.toFixed(2)} 0 1 0 ${(center.x - dotR).toFixed(2)} ${center.y.toFixed(2)} Z `;
        }

        // Crease at base
        let creaseD = '';
        if (L >= 40) {
            const creaseUV = [
                { u: 0.16, v: -0.02 },
                { u: 0.28, v: 0.00 },
                { u: 0.44, v: -0.02 }
            ];
            creaseD = catmullRomToBezier(creaseUV.map(pt => fromUV(pt.u, pt.v)));
        }

        return {
            w, h, cx, cy, tx, ty,
            left, right, top, bottom, r,
            originX, originY,
            originRelX: originX - cx,
            originRelY: originY - cy,
            path,
            detailPath: cupsD + creaseD,
            dotsPath: dotsD,
            isOval: isOctoOval,
            isThought: false,
            isOcto: true,
            isOctoRect,
            isOctoOval,
            rx, ry,
            theta: isOctoOval ? theta : undefined,
            edge: isOctoRect ? edge : undefined,
            offset: isOctoRect ? offset : undefined,
            base: isOctoRect ? base : undefined,
            tailWidth: isOctoRect ? baseHalfWidth : undefined
        };
    }

    if (isOval) {
        const rx = Math.max(10, (w - 2 * padding) / 2);
        const ry = Math.max(10, (h - 2 * padding) / 2);

        let theta = element.metadata?.tailOrigin?.angle;

        // If angle is not explicitly stored, derive it from edge/offset if present, or from tip position
        if (typeof theta !== 'number') {
            const edge = element.metadata?.tailOrigin?.edge;
            const offset = typeof element.metadata?.tailOrigin?.offset === 'number'
                ? Math.max(0, Math.min(1, element.metadata.tailOrigin.offset))
                : 0.5;

            if (edge === 'bottom') {
                const rawX = left + offset * (right - left);
                theta = Math.atan2(ry, rawX - cx);
            } else if (edge === 'top') {
                const rawX = left + offset * (right - left);
                theta = Math.atan2(-ry, rawX - cx);
            } else if (edge === 'left') {
                const rawY = top + offset * (bottom - top);
                theta = Math.atan2(rawY - cy, -rx);
            } else if (edge === 'right') {
                const rawY = top + offset * (bottom - top);
                theta = Math.atan2(rawY - cy, rx);
            } else {
                // Default: point origin toward tail tip
                theta = Math.atan2(tailY / ry, tailX / rx);
            }
        }

        // Tail origin on ellipse boundary
        const originX = cx + rx * Math.cos(theta);
        const originY = cy + ry * Math.sin(theta);

        // Base width in pixels along the perimeter
        const baseWidthPx = Math.min(36, Math.max(16, Math.min(rx, ry) * 0.35));
        const localR = Math.hypot(rx * Math.cos(theta), ry * Math.sin(theta)) || 1;
        const deltaTheta = Math.min(0.55, Math.max(0.12, baseWidthPx / localR));

        const theta1 = theta - deltaTheta / 2;
        const theta2 = theta + deltaTheta / 2;

        const p1x = cx + rx * Math.cos(theta1);
        const p1y = cy + ry * Math.sin(theta1);
        const p2x = cx + rx * Math.cos(theta2);
        const p2y = cy + ry * Math.sin(theta2);

        // Vector from origin to tip
        const vtx = tx - originX;
        const vty = ty - originY;
        const L = Math.hypot(vtx, vty);

        // Tangent along perimeter (clockwise in SVG y-down coords)
        const tangX = -Math.sin(theta);
        const tangY = Math.cos(theta);

        // Lateral projection of tip vector along perimeter tangent
        const vt = vtx * tangX + vty * tangY;
        const lateralNorm = Math.max(-1, Math.min(1, vt / (L || 1)));

        // Midpoints of segments connecting base points to tip
        const m1x = (p1x + tx) / 2;
        const m1y = (p1y + ty) / 2;
        const m2x = (p2x + tx) / 2;
        const m2y = (p2y + ty) / 2;

        // Normal vectors perpendicular to segments, pointing outward
        const seg1x = tx - p1x;
        const seg1y = ty - p1y;
        const seg1Len = Math.hypot(seg1x, seg1y) || 1;
        const out1x = -seg1y / seg1Len;
        const out1y = seg1x / seg1Len;

        const seg2x = p2x - tx;
        const seg2y = p2y - ty;
        const seg2Len = Math.hypot(seg2x, seg2y) || 1;
        const in2x = seg2y / seg2Len;
        const in2y = -seg2x / seg2Len;

        let cp1x, cp1y, cp2x, cp2y;

        if (lateralNorm >= 0) {
            // Leaning clockwise (like reference image)
            // Outer curve P1 -> T
            cp1x = m1x + out1x * (seg1Len * 0.08);
            cp1y = m1y + out1y * (seg1Len * 0.08);

            // Inner scooped curve T -> P2
            const scoop = 0.12 + lateralNorm * 0.22;
            cp2x = m2x + in2x * (seg2Len * scoop);
            cp2y = m2y + in2y * (seg2Len * scoop);
        } else {
            // Leaning counter-clockwise
            const scoop = 0.12 + Math.abs(lateralNorm) * 0.22;
            cp1x = m1x - out1x * (seg1Len * scoop);
            cp1y = m1y - out1y * (seg1Len * scoop);

            // Outer curve T -> P2
            cp2x = m2x - in2x * (seg2Len * 0.08);
            cp2y = m2y - in2y * (seg2Len * 0.08);
        }

        const path = `M ${p1x.toFixed(2)} ${p1y.toFixed(2)} ` +
            `Q ${cp1x.toFixed(2)} ${cp1y.toFixed(2)} ${tx.toFixed(2)} ${ty.toFixed(2)} ` +
            `Q ${cp2x.toFixed(2)} ${cp2y.toFixed(2)} ${p2x.toFixed(2)} ${p2y.toFixed(2)} ` +
            `A ${rx.toFixed(2)} ${ry.toFixed(2)} 0 1 1 ${p1x.toFixed(2)} ${p1y.toFixed(2)} Z`;

        return {
            w, h, cx, cy, tx, ty,
            left, right, top, bottom, r,
            originX, originY,
            originRelX: originX - cx,
            originRelY: originY - cy,
            path,
            detailPath: null,
            dotsPath: null,
            isOval: true,
            isThought: false,
            isOcto: false,
            rx, ry, theta
        };
    }

    let edge = element.metadata?.tailOrigin?.edge;
    let offset = element.metadata?.tailOrigin?.offset;

    // Fallback if tailOrigin is not explicitly set: determine edge by tip angle
    if (!edge) {
        const angle = Math.atan2(tailY, tailX) * (180 / Math.PI);
        if (angle >= -45 && angle < 45) {
            edge = 'right';
        } else if (angle >= 45 && angle < 135) {
            edge = 'bottom';
        } else if (angle >= -135 && angle < -45) {
            edge = 'top';
        } else {
            edge = 'left';
        }
    }
    if (typeof offset !== 'number') {
        offset = 0.5;
    }
    offset = Math.max(0, Math.min(1, offset));

    // Tail base half-width constrained to available straight edge
    const maxBaseSpan = (edge === 'left' || edge === 'right')
        ? Math.max(0, (bottom - r) - (top + r))
        : Math.max(0, (right - r) - (left + r));

    const tailWidth = Math.min(20, Math.max(8, (maxBaseSpan - 4) / 2));

    let minBase, maxBase, rawBase;
    if (edge === 'bottom' || edge === 'top') {
        minBase = left + r + tailWidth;
        maxBase = right - r - tailWidth;
        rawBase = left + offset * (right - left);
    } else {
        minBase = top + r + tailWidth;
        maxBase = bottom - r - tailWidth;
        rawBase = top + offset * (bottom - top);
    }

    let base;
    if (minBase > maxBase) {
        base = (edge === 'bottom' || edge === 'top') ? cx : cy;
    } else {
        base = Math.max(minBase, Math.min(maxBase, rawBase));
    }

    let originX, originY;
    if (edge === 'bottom') {
        originX = base;
        originY = bottom;
    } else if (edge === 'top') {
        originX = base;
        originY = top;
    } else if (edge === 'left') {
        originX = left;
        originY = base;
    } else {
        originX = right;
        originY = base;
    }

    let path;
    if (edge === 'bottom') {
        path = `
            M ${left + r} ${top}
            L ${right - r} ${top}
            Q ${right} ${top} ${right} ${top + r}
            L ${right} ${bottom - r}
            Q ${right} ${bottom} ${right - r} ${bottom}
            L ${base + tailWidth} ${bottom}
            Q ${base + tailWidth * 0.5} ${bottom + 5} ${tx} ${ty}
            Q ${base - tailWidth * 0.5} ${bottom + 5} ${base - tailWidth} ${bottom}
            L ${left + r} ${bottom}
            Q ${left} ${bottom} ${left} ${bottom - r}
            L ${left} ${top + r}
            Q ${left} ${top} ${left + r} ${top}
            Z
        `;
    } else if (edge === 'top') {
        path = `
            M ${left + r} ${top}
            L ${base - tailWidth} ${top}
            Q ${base - tailWidth * 0.5} ${top - 5} ${tx} ${ty}
            Q ${base + tailWidth * 0.5} ${top - 5} ${base + tailWidth} ${top}
            L ${right - r} ${top}
            Q ${right} ${top} ${right} ${top + r}
            L ${right} ${bottom - r}
            Q ${right} ${bottom} ${right - r} ${bottom}
            L ${left + r} ${bottom}
            Q ${left} ${bottom} ${left} ${bottom - r}
            L ${left} ${top + r}
            Q ${left} ${top} ${left + r} ${top}
            Z
        `;
    } else if (edge === 'right') {
        path = `
            M ${left + r} ${top}
            L ${right - r} ${top}
            Q ${right} ${top} ${right} ${top + r}
            L ${right} ${base - tailWidth}
            Q ${right + 5} ${base - tailWidth * 0.5} ${tx} ${ty}
            Q ${right + 5} ${base + tailWidth * 0.5} ${right} ${base + tailWidth}
            L ${right} ${bottom - r}
            Q ${right} ${bottom} ${right - r} ${bottom}
            L ${left + r} ${bottom}
            Q ${left} ${bottom} ${left} ${bottom - r}
            L ${left} ${top + r}
            Q ${left} ${top} ${left + r} ${top}
            Z
        `;
    } else {
        // edge === 'left'
        path = `
            M ${left + r} ${top}
            L ${right - r} ${top}
            Q ${right} ${top} ${right} ${top + r}
            L ${right} ${bottom - r}
            Q ${right} ${bottom} ${right - r} ${bottom}
            L ${left + r} ${bottom}
            Q ${left} ${bottom} ${left} ${bottom - r}
            L ${left} ${base + tailWidth}
            Q ${left - 5} ${base + tailWidth * 0.5} ${tx} ${ty}
            Q ${left - 5} ${base - tailWidth * 0.5} ${left} ${base - tailWidth}
            L ${left} ${top + r}
            Q ${left} ${top} ${left + r} ${top}
            Z
        `;
    }

    return {
        w, h, cx, cy, tx, ty,
        left, right, top, bottom, r,
        edge, offset, tailWidth, base,
        originX, originY,
        originRelX: originX - cx,
        originRelY: originY - cy,
        path,
        detailPath: null,
        dotsPath: null,
        isOval: false,
        isThought: false,
        isOcto: false
    };
}

const Balloon = ({ element, onChange, isSelected, readOnly = false }) => {
    const textRef = useRef(null);
    const lastElementId = useRef(null);

    // Sync content when element changes or from external updates, but never while actively typing
    useEffect(() => {
        if (textRef.current && (readOnly || element.id !== lastElementId.current || document.activeElement !== textRef.current)) {
            textRef.current.innerHTML = element.content || '';
            lastElementId.current = element.id;
        }
    }, [element.id, element.content, readOnly]);

    // Sync content changes
    const handleInput = (e) => {
        if (readOnly) return;
        onChange(element.id, { content: e.currentTarget.innerHTML });
    };

    // Calculate inverse scale to fix text direction if parent is flipped
    const flipX = element.metadata?.flipX ? -1 : 1;
    const flipY = element.metadata?.flipY ? -1 : 1;

    const { w, h, path, detailPath, dotsPath, isOval, isThought, isOctoOval } = getBalloonTailGeometry(element);

    const backgroundColor = element.metadata?.backgroundColor || '#ffffff';
    const borderColor = element.metadata?.borderColor || '#000000';

    const shadowMode = (() => {
        if (element.metadata?.hasShadow === false || element.metadata?.shadow === 'none') return 'none';
        if (element.metadata?.shadow === 'black') return 'black';
        return 'grey'; // grey (moire) is default
    })();

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <svg
                viewBox={`0 0 ${w} ${h}`}
                preserveAspectRatio="none"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    overflow: 'visible',
                    zIndex: 0,
                    pointerEvents: 'none',
                }}
            >
                <defs>
                    <pattern id={`balloon-moire-${element.id}`} x="0" y="0" width="3.5" height="3.5" patternUnits="userSpaceOnUse">
                        <rect width="3.5" height="3.5" fill="#a8a8a8" />
                        <circle cx="1.75" cy="1.75" r="1.15" fill="#222222" />
                    </pattern>
                </defs>

                {/* Grey (Moire) Halftone Shadow */}
                {shadowMode === 'grey' && (
                    <g transform="translate(3.5, 3.5)">
                        <path
                            d={path}
                            fill={`url(#balloon-moire-${element.id})`}
                            stroke="#222222"
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                        />
                    </g>
                )}

                {/* Solid Black Drop Shadow */}
                {shadowMode === 'black' && (
                    <g transform="translate(5, 5)">
                        <path
                            d={path}
                            fill="#000000"
                            stroke="#000000"
                            strokeWidth="2"
                            strokeLinejoin="round"
                        />
                    </g>
                )}

                {/* Main Balloon Body */}
                <path d={path} fill={backgroundColor} stroke={borderColor} strokeWidth="2" strokeLinejoin="round" />

                {/* Tentacle Detail Lines & Suction Cups */}
                {detailPath && (
                    <path
                        d={detailPath}
                        fill="none"
                        stroke={borderColor}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                )}
                {dotsPath && (
                    <path
                        d={dotsPath}
                        fill={borderColor}
                        stroke="none"
                    />
                )}
            </svg>

            {/* Text Container: Handles centering */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: isThought ? '24px 28px' : ((isOval || isOctoOval) ? '18px 24px' : '20px'),
                    boxSizing: 'border-box',
                    pointerEvents: 'none', // Container shouldn't block, but child will be auto
                }}
            >
                {/* Editable Element: Handles text content */}
                <div
                    ref={textRef}
                    className="pico-balloon-text"
                    contentEditable={isSelected && !readOnly && !element.metadata?.locked}
                    suppressContentEditableWarning
                    onInput={handleInput}
                    onPaste={(e) => {
                        if (readOnly || element.metadata?.locked) return;
                        e.preventDefault();
                        const text = e.clipboardData.getData('text/plain');
                        document.execCommand('insertText', false, text);
                    }}
                    onBlur={() => {
                        if (!readOnly && !element.metadata?.locked && textRef.current) {
                            onChange(element.id, { content: textRef.current.innerHTML });
                        }
                        window.getSelection()?.removeAllRanges();
                    }}
                    style={{
                        fontFamily: element.metadata?.fontFamily || '"HVD Comic Serif Pro", sans-serif',
                        fontSize: element.metadata?.fontSize ? `${element.metadata.fontSize}px` : '19px',
                        fontWeight: element.metadata?.fontWeight || 'normal',
                        fontStyle: element.metadata?.fontStyle || 'normal',
                        textDecoration: element.metadata?.textDecoration || 'none',
                        color: element.metadata?.color || 'black',
                        outline: 'none',
                        cursor: (isSelected && !readOnly && !element.metadata?.locked) ? 'text' : 'default',
                        userSelect: (isSelected && !readOnly && !element.metadata?.locked) ? 'text' : 'none',
                        // Let's stick to that logic for the input itself.
                        pointerEvents: (readOnly || element.metadata?.locked) ? 'none' : (isSelected ? 'auto' : 'none'),
                        whiteSpace: 'pre-wrap',
                        textAlign: element.metadata?.textAlign || 'center',
                        lineHeight: element.metadata?.lineHeight ?? 1,
                        width: '100%',
                        display: 'block', // Important: Layout text as block, not flex items
                        // Counter-flip the text so it stays readable when the container is flipped
                        transform: `scale(${flipX}, ${flipY})`
                    }}
                />
            </div>
        </div>
    );
};

export default Balloon;
