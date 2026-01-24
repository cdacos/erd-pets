/**
 * Circular layout algorithm.
 * Places nodes evenly distributed on a circle, sorted alphabetically.
 */

/**
 * @typedef {Object} NodePosition
 * @property {string} id
 * @property {number} x
 * @property {number} y
 */

/**
 * Apply circular layout to nodes.
 * Nodes are sorted alphabetically by id and placed evenly on a circle.
 *
 * @param {Array<{id: string, position: {x: number, y: number}}>} nodes
 * @param {Object} [options]
 * @param {number} [options.centerX] - Center X coordinate (default: calculated from bounds)
 * @param {number} [options.centerY] - Center Y coordinate (default: calculated from bounds)
 * @param {number} [options.radius] - Circle radius (default: calculated from node count)
 * @returns {Map<string, {x: number, y: number}>} New positions keyed by node id
 */
export function circularLayout(nodes, options = {}) {
  if (nodes.length === 0) {
    return new Map();
  }

  // Sort nodes alphabetically by id
  const sortedNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));

  // Calculate center from current bounds if not provided
  let centerX = options.centerX;
  let centerY = options.centerY;

  if (centerX === undefined || centerY === undefined) {
    const xs = nodes.map((n) => n.position.x);
    const ys = nodes.map((n) => n.position.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    centerX = centerX ?? (minX + maxX) / 2 + 100; // offset for node width
    centerY = centerY ?? (minY + maxY) / 2 + 100; // offset for node height
  }

  // Calculate radius based on node count if not provided
  // More nodes = larger radius to prevent overlap
  const radius = options.radius ?? Math.max(200, sortedNodes.length * 50);

  // Place nodes evenly on circle
  const positions = new Map();
  const angleStep = (2 * Math.PI) / sortedNodes.length;

  // Start at top (-PI/2) and go clockwise
  const startAngle = -Math.PI / 2;

  for (let i = 0; i < sortedNodes.length; i++) {
    const angle = startAngle + i * angleStep;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    positions.set(sortedNodes[i].id, {
      x: Math.round(x),
      y: Math.round(y),
    });
  }

  return positions;
}
