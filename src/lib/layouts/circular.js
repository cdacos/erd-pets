/**
 * Circular layout algorithm.
 * Places nodes evenly distributed on a circle, sorted alphabetically.
 * Automatically groups by schema when multiple schemas are present.
 */

/**
 * @typedef {Object} CircularOptions
 * @property {number} [centerX] - Center X coordinate (default: calculated from bounds)
 * @property {number} [centerY] - Center Y coordinate (default: calculated from bounds)
 * @property {number} [radius] - Circle radius (default: calculated from node count)
 * @property {number} [schemaSpacing] - Gap between schema groups (default: 600)
 */

/**
 * Extract schema name from qualified table name.
 * @param {string} qualifiedName - Format: "schema.table"
 * @returns {string} Schema name
 */
function getSchema(qualifiedName) {
  const dotIndex = qualifiedName.indexOf('.');
  return dotIndex >= 0 ? qualifiedName.substring(0, dotIndex) : 'public';
}

/**
 * Apply circular layout to nodes.
 * Nodes are sorted alphabetically by id and placed evenly on a circle.
 * Automatically groups by schema when multiple schemas are detected.
 *
 * @param {Array<{id: string, position: {x: number, y: number}}>} nodes
 * @param {CircularOptions} [options]
 * @returns {Map<string, {x: number, y: number}>} New positions keyed by node id
 */
export function circularLayout(nodes, options = {}) {
  if (nodes.length === 0) {
    return new Map();
  }

  const schemaSpacing = options.schemaSpacing ?? 600;

  // Group nodes by schema
  /** @type {Map<string, Array<{id: string, position: {x: number, y: number}}>>} */
  const schemaGroups = new Map();
  for (const node of nodes) {
    const schema = getSchema(node.id);
    if (!schemaGroups.has(schema)) {
      schemaGroups.set(schema, []);
    }
    schemaGroups.get(schema)?.push(node);
  }

  // If single schema, use simple layout
  if (schemaGroups.size === 1) {
    return layoutSingleCircle(nodes, options.centerX, options.centerY, options.radius);
  }

  // Multiple schemas: layout each as a separate circle, arranged horizontally
  /** @type {Map<string, {x: number, y: number}>} */
  const allPositions = new Map();

  // Sort schemas alphabetically for consistent ordering
  const schemas = [...schemaGroups.keys()].sort((a, b) => a.localeCompare(b));

  let currentX = 0;

  for (const schema of schemas) {
    const schemaNodes = schemaGroups.get(schema) ?? [];

    // Calculate radius for this group
    const radius = Math.max(200, schemaNodes.length * 50);

    // Center of this circle
    const centerX = currentX + radius + 50;
    const centerY = radius + 50;

    // Layout this schema group
    const groupPositions = layoutSingleCircle(schemaNodes, centerX, centerY, radius);

    // Merge positions
    for (const [id, pos] of groupPositions) {
      allPositions.set(id, pos);
    }

    // Move to next circle: diameter + spacing
    currentX = centerX + radius + schemaSpacing;
  }

  return allPositions;
}

/**
 * Layout a single group of nodes in a circle.
 * @param {Array<{id: string, position: {x: number, y: number}}>} nodes
 * @param {number} [centerX] - Center X coordinate
 * @param {number} [centerY] - Center Y coordinate
 * @param {number} [radius] - Circle radius
 * @returns {Map<string, {x: number, y: number}>}
 */
function layoutSingleCircle(nodes, centerX, centerY, radius) {
  if (nodes.length === 0) {
    return new Map();
  }

  // Sort nodes alphabetically by id
  const sortedNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));

  // Calculate center from current bounds if not provided
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
  radius = radius ?? Math.max(200, sortedNodes.length * 50);

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
