/**
 * Hierarchical (Sugiyama) layout algorithm.
 * Arranges nodes in layers based on FK relationships, with parent tables on the left.
 */

/**
 * @typedef {Object} Edge
 * @property {string} source - Child table (has the FK)
 * @property {string} target - Parent table (referenced)
 */

/**
 * @typedef {Object} HierarchicalOptions
 * @property {number} [layerSpacing] - Horizontal spacing between layers (default: 350)
 * @property {number} [nodeSpacing] - Vertical spacing between nodes in a layer (default: 150)
 * @property {number} [maxIterations] - Max barycenter iterations (default: 24)
 */

/**
 * Apply hierarchical layout to nodes based on FK edges.
 * Uses Sugiyama framework: cycle removal, layer assignment, crossing minimization.
 *
 * @param {Array<{id: string, position: {x: number, y: number}}>} nodes
 * @param {Edge[]} edges - FK edges where source=child (has FK), target=parent (referenced)
 * @param {HierarchicalOptions} [options]
 * @returns {Map<string, {x: number, y: number}>} New positions keyed by node id
 */
export function hierarchicalLayout(nodes, edges, options = {}) {
  if (nodes.length === 0) {
    return new Map();
  }

  const layerSpacing = options.layerSpacing ?? 675;
  const nodeSpacing = options.nodeSpacing ?? 300;
  const maxIterations = options.maxIterations ?? 24;

  const nodeIds = new Set(nodes.map((n) => n.id));

  // Filter edges to only those where both nodes exist in diagram
  const validEdges = edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));

  // Build adjacency: parent -> children and child -> parents
  // Edge direction: source (child) -> target (parent)
  // For layers: parents should be on left (layer 0), children on right
  /** @type {Map<string, Set<string>>} */
  const parents = new Map(); // node -> set of parent nodes
  /** @type {Map<string, Set<string>>} */
  const children = new Map(); // node -> set of child nodes

  for (const id of nodeIds) {
    parents.set(id, new Set());
    children.set(id, new Set());
  }

  for (const edge of validEdges) {
    parents.get(edge.source)?.add(edge.target);
    children.get(edge.target)?.add(edge.source);
  }

  // Step 1: Cycle removal using DFS - find and mark back edges
  const reversedEdges = removeCycles(nodeIds, parents, children);

  // Step 2: Layer assignment - BFS from roots (nodes with no parents)
  const layers = assignLayers(nodeIds, parents);

  // Step 3: Crossing minimization using barycenter heuristic
  const orderedLayers = minimizeCrossings(layers, parents, children, maxIterations);

  // Step 4: Coordinate assignment
  const positions = assignCoordinates(orderedLayers, layerSpacing, nodeSpacing);

  // Restore reversed edges (not needed for positions, but good practice)
  for (const [source, target] of reversedEdges) {
    parents.get(source)?.add(target);
    parents.get(target)?.delete(source);
    children.get(target)?.add(source);
    children.get(source)?.delete(target);
  }

  return positions;
}

/**
 * Remove cycles by reversing back edges found during DFS.
 * Modifies parents/children maps in place.
 * @param {Set<string>} nodeIds
 * @param {Map<string, Set<string>>} parents
 * @param {Map<string, Set<string>>} children
 * @returns {Array<[string, string]>} List of reversed edges [source, target]
 */
function removeCycles(nodeIds, parents, children) {
  /** @type {Array<[string, string]>} */
  const reversedEdges = [];

  /** @type {Set<string>} */
  const visited = new Set();
  /** @type {Set<string>} */
  const inStack = new Set();

  /**
   * @param {string} node
   */
  function dfs(node) {
    if (inStack.has(node)) {
      return; // Back edge detected, but we handle it when we find the edge
    }
    if (visited.has(node)) {
      return;
    }

    visited.add(node);
    inStack.add(node);

    // Traverse to parents (opposite of edge direction for our purposes)
    const nodeParents = parents.get(node);
    if (nodeParents) {
      for (const parent of [...nodeParents]) {
        if (inStack.has(parent)) {
          // Back edge: node -> parent forms a cycle
          // Reverse it: remove node->parent, add parent->node
          reversedEdges.push([node, parent]);
          nodeParents.delete(parent);
          children.get(parent)?.delete(node);
          parents.get(parent)?.add(node);
          children.get(node)?.add(parent);
        } else {
          dfs(parent);
        }
      }
    }

    inStack.delete(node);
  }

  for (const node of nodeIds) {
    dfs(node);
  }

  return reversedEdges;
}

/**
 * Assign nodes to layers using BFS from roots.
 * Roots (no parents) are layer 0, then children are assigned max(parent layers) + 1.
 * @param {Set<string>} nodeIds
 * @param {Map<string, Set<string>>} parents
 * @returns {string[][]} Array of layers, each layer is array of node ids
 */
function assignLayers(nodeIds, parents) {
  /** @type {Map<string, number>} */
  const layerMap = new Map();

  // Find roots (nodes with no parents)
  const roots = [...nodeIds].filter((id) => {
    const p = parents.get(id);
    return !p || p.size === 0;
  });

  // If no roots (all nodes in cycles), pick node with fewest parents
  if (roots.length === 0 && nodeIds.size > 0) {
    let minParents = Infinity;
    let minNode = [...nodeIds][0];
    for (const id of nodeIds) {
      const p = parents.get(id);
      const count = p?.size ?? 0;
      if (count < minParents) {
        minParents = count;
        minNode = id;
      }
    }
    roots.push(minNode);
  }

  // BFS to assign layers
  /** @type {string[]} */
  const queue = [...roots];
  for (const root of roots) {
    layerMap.set(root, 0);
  }

  while (queue.length > 0) {
    const node = queue.shift();
    if (!node) continue;
    const nodeLayer = layerMap.get(node) ?? 0;

    // Find children and assign them to layer + 1
    for (const id of nodeIds) {
      const nodeParents = parents.get(id);
      if (nodeParents?.has(node)) {
        const currentLayer = layerMap.get(id);
        const newLayer = nodeLayer + 1;
        if (currentLayer === undefined || newLayer > currentLayer) {
          layerMap.set(id, newLayer);
          queue.push(id);
        }
      }
    }
  }

  // Handle disconnected nodes - assign to layer 0
  for (const id of nodeIds) {
    if (!layerMap.has(id)) {
      layerMap.set(id, 0);
    }
  }

  // Convert to array of layers
  const maxLayer = Math.max(...layerMap.values(), 0);
  /** @type {string[][]} */
  const layers = Array.from({ length: maxLayer + 1 }, () => []);

  for (const [id, layer] of layerMap) {
    layers[layer].push(id);
  }

  // Sort each layer alphabetically for initial ordering
  for (const layer of layers) {
    layer.sort((a, b) => a.localeCompare(b));
  }

  return layers;
}

/**
 * Minimize edge crossings using barycenter heuristic.
 * Iterates through layers, repositioning nodes based on average position of neighbors.
 * @param {string[][]} layers
 * @param {Map<string, Set<string>>} parents
 * @param {Map<string, Set<string>>} children
 * @param {number} maxIterations
 * @returns {string[][]} Reordered layers
 */
function minimizeCrossings(layers, parents, children, maxIterations) {
  if (layers.length <= 1) {
    return layers;
  }

  // Create working copy
  const orderedLayers = layers.map((layer) => [...layer]);

  for (let iter = 0; iter < maxIterations; iter++) {
    let changed = false;

    // Forward pass: order each layer based on parents in previous layer
    for (let i = 1; i < orderedLayers.length; i++) {
      const prevLayer = orderedLayers[i - 1];
      const currentLayer = orderedLayers[i];

      /** @type {Map<string, number>} */
      const positions = new Map();
      for (let j = 0; j < prevLayer.length; j++) {
        positions.set(prevLayer[j], j);
      }

      // Calculate barycenter for each node
      /** @type {Array<{id: string, barycenter: number}>} */
      const barycenters = currentLayer.map((id) => {
        const nodeParents = parents.get(id);
        if (!nodeParents || nodeParents.size === 0) {
          // No parents in this diagram, keep relative position
          return { id, barycenter: -1 };
        }
        let sum = 0;
        let count = 0;
        for (const parent of nodeParents) {
          const pos = positions.get(parent);
          if (pos !== undefined) {
            sum += pos;
            count++;
          }
        }
        return {
          id,
          barycenter: count > 0 ? sum / count : -1,
        };
      });

      // Sort by barycenter, keeping nodes without parents at their current relative position
      const withParents = barycenters.filter((b) => b.barycenter >= 0);
      const withoutParents = barycenters.filter((b) => b.barycenter < 0);

      withParents.sort((a, b) => a.barycenter - b.barycenter);

      // Merge: place nodes without parents at the end, sorted alphabetically
      withoutParents.sort((a, b) => a.id.localeCompare(b.id));
      const newOrder = [...withParents.map((b) => b.id), ...withoutParents.map((b) => b.id)];

      if (newOrder.join(',') !== currentLayer.join(',')) {
        changed = true;
        orderedLayers[i] = newOrder;
      }
    }

    // Backward pass: order each layer based on children in next layer
    for (let i = orderedLayers.length - 2; i >= 0; i--) {
      const nextLayer = orderedLayers[i + 1];
      const currentLayer = orderedLayers[i];

      /** @type {Map<string, number>} */
      const positions = new Map();
      for (let j = 0; j < nextLayer.length; j++) {
        positions.set(nextLayer[j], j);
      }

      // Calculate barycenter for each node based on children
      /** @type {Array<{id: string, barycenter: number}>} */
      const barycenters = currentLayer.map((id) => {
        const nodeChildren = children.get(id);
        if (!nodeChildren || nodeChildren.size === 0) {
          return { id, barycenter: -1 };
        }
        let sum = 0;
        let count = 0;
        for (const child of nodeChildren) {
          const pos = positions.get(child);
          if (pos !== undefined) {
            sum += pos;
            count++;
          }
        }
        return {
          id,
          barycenter: count > 0 ? sum / count : -1,
        };
      });

      const withChildren = barycenters.filter((b) => b.barycenter >= 0);
      const withoutChildren = barycenters.filter((b) => b.barycenter < 0);

      withChildren.sort((a, b) => a.barycenter - b.barycenter);
      withoutChildren.sort((a, b) => a.id.localeCompare(b.id));
      const newOrder = [...withChildren.map((b) => b.id), ...withoutChildren.map((b) => b.id)];

      if (newOrder.join(',') !== currentLayer.join(',')) {
        changed = true;
        orderedLayers[i] = newOrder;
      }
    }

    // Early exit if no changes
    if (!changed) {
      break;
    }
  }

  return orderedLayers;
}

/**
 * Assign x,y coordinates to nodes based on layer and position within layer.
 * @param {string[][]} layers
 * @param {number} layerSpacing
 * @param {number} nodeSpacing
 * @returns {Map<string, {x: number, y: number}>}
 */
function assignCoordinates(layers, layerSpacing, nodeSpacing) {
  /** @type {Map<string, {x: number, y: number}>} */
  const positions = new Map();

  // Find max layer size for centering
  const maxLayerSize = Math.max(...layers.map((l) => l.length), 1);

  for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
    const layer = layers[layerIndex];
    const x = layerIndex * layerSpacing + 50; // Start at x=50

    // Center this layer vertically relative to the largest layer
    const layerHeight = (layer.length - 1) * nodeSpacing;
    const maxHeight = (maxLayerSize - 1) * nodeSpacing;
    const yOffset = (maxHeight - layerHeight) / 2 + 50; // Start at y=50

    for (let nodeIndex = 0; nodeIndex < layer.length; nodeIndex++) {
      const id = layer[nodeIndex];
      const y = nodeIndex * nodeSpacing + yOffset;
      positions.set(id, { x: Math.round(x), y: Math.round(y) });
    }
  }

  return positions;
}
