
/**
 * Calculates the distance from a point to a line segment defined by two points.
 * @param {Object} p - The point {x, y}
 * @param {Object} v - The start point of the segment {x, y}
 * @param {Object} w - The end point of the segment {x, y}
 * @returns {number} The distance from p to the segment vw
 */
export const distToSegment = (p, v, w) => {
    function sqr(x) { return x * x }
    function dist2(v, w) { return sqr(v.x - w.x) + sqr(v.y - w.y) }

    const l2 = dist2(v, w);
    if (l2 === 0) return Math.sqrt(dist2(p, v));

    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));

    return Math.sqrt(dist2(p, { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) }));
};

/**
 * Finds the index at which a new point should be inserted into a polygon path
 * to minimize the distance to the click point.
 * @param {Object} clickPoint - The point where the user clicked {x, y} (normalized 0-1)
 * @param {Array} polygonPoints - Array of polygon vertices [{x, y}, ...] (normalized 0-1)
 * @returns {Object} { index: number, distance: number }
 */
export const calculateInsertIndex = (clickPoint, polygonPoints) => {
    if (!polygonPoints || polygonPoints.length < 2) return { index: polygonPoints.length, distance: 0 };

    let minDistance = Infinity;
    let bestIndex = 0;

    for (let i = 0; i < polygonPoints.length; i++) {
        const p1 = polygonPoints[i];
        const p2 = polygonPoints[(i + 1) % polygonPoints.length]; // Wrap around for closed polygon

        const dist = distToSegment(clickPoint, p1, p2);
        if (dist < minDistance) {
            minDistance = dist;
            bestIndex = i + 1;
        }
    }

    return { index: bestIndex, distance: minDistance };
};
