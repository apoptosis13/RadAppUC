/**
 * Generates a smooth SVG path from an array of points using Catmull-Rom splines or cubic beziers.
 * 
 * @param {Array<{x: number, y: number}>} points - Array of points with x, y normalized coordinates (0-1).
 * @param {boolean} closed - Whether the path should be closed (loop back to start).
 * @param {number} curvature - Tension/Curvature factor (0 to 1). 0.2 is usually good.
 * @returns {string} SVG Path data string (d attribute).
 */
export const getSmoothPath = (points, closed = true, curvature = 0.25) => {
    if (!points || points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x * 100},${points[0].y * 100}`;
    if (points.length === 2) {
        return `M ${points[0].x * 100},${points[0].y * 100} L ${points[1].x * 100},${points[1].y * 100} ${closed ? 'Z' : ''}`;
    }

    // Convert normalized (0-1) to percentage (0-100) for easier SVG handling
    const p = points.map(pt => ({ x: pt.x * 100, y: pt.y * 100 }));

    if (closed) {
        // Duplicate start/end points to simulate closed loop for the spline algo
        p.push(p[0]);
        p.push(p[1]);
        p.unshift(p[p.length - 3]);
    } else {
        // "Ghost" points for open path
        p.unshift(p[0]);
        p.push(p[p.length - 1]);
    }

    let path = `M ${points[0].x * 100},${points[0].y * 100}`;

    // Loop through points (accounting for ghost points)
    // For closed: start from index 1 (original first point duplicated)
    for (let i = 1; i < p.length - 2; i++) {
        const p0 = p[i - 1]; // Previous
        const p1 = p[i];     // Current (Start)
        const p2 = p[i + 1]; // Next (End)
        const p3 = p[i + 2]; // Next Next

        // Catmull-Rom to Cubic Bezier conversion
        // cp1 = p1 + (p2 - p0) / 6 * tension (we use curvature variable)
        const cp1x = p1.x + (p2.x - p0.x) * curvature;
        const cp1y = p1.y + (p2.y - p0.y) * curvature;

        const cp2x = p2.x - (p3.x - p1.x) * curvature;
        const cp2y = p2.y - (p3.y - p1.y) * curvature;

        path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }

    if (closed) {
        // No need to explicitly close with Z if we loop back to start point perfectly,
        // but Z is safer for fills.
        path += ' Z';
    }

    return path;
};
