/**
 * @typedef {import('./types.js').DiagramEntry} DiagramEntry
 * @typedef {import('./types.js').Diagram} Diagram
 * @typedef {import('./types.js').ErdPetsBlock} ErdPetsBlock
 * @typedef {import('./types.js').ParseError} ParseError
 * @typedef {import('./types.js').ResolvedPosition} ResolvedPosition
 * @typedef {import('./types.js').Table} Table
 */

/**
 * Extract the /* @erd-pets ... *\/ block from SQL.
 * Returns null if none found; warns if multiple (uses first).
 * @param {string} sql
 * @returns {{ content: string, startOffset: number, endOffset: number, errors: ParseError[] } | null}
 */
export function extractErdPetsBlock(sql) {
  const errors = [];
  const blockRegex = /\/\*\s*@erd-pets\b([\s\S]*?)\*\//g;
  const matches = [];

  let match;
  while ((match = blockRegex.exec(sql)) !== null) {
    matches.push({
      content: match[1],
      startOffset: match.index,
      endOffset: match.index + match[0].length,
    });
  }

  if (matches.length === 0) {
    return null;
  }

  if (matches.length > 1) {
    const line = sql.substring(0, matches[1].startOffset).split('\n').length;
    errors.push({
      message: 'Multiple @erd-pets blocks found; using the first one',
      line,
    });
  }

  return {
    content: matches[0].content,
    startOffset: matches[0].startOffset,
    endOffset: matches[0].endOffset,
    errors,
  };
}

/**
 * Parse block content into diagrams.
 * @param {string} content - The content inside the @erd-pets block (without the comment markers)
 * @param {number} startLine - The line number where the block starts in the original file
 * @returns {{ diagrams: Diagram[], errors: ParseError[] }}
 */
export function parseErdPetsContent(content, startLine = 1) {
  /** @type {Diagram[]} */
  const diagrams = [];
  /** @type {ParseError[]} */
  const errors = [];
  /** @type {Diagram | null} */
  let currentDiagram = null;
  /** @type {Map<string, number>} */
  const entriesInCurrentDiagram = new Map();

  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const lineNum = startLine + i;
    const line = lines[i].trim();

    // Skip empty lines
    if (line === '') continue;

    // Check for diagram header [name]
    const headerMatch = line.match(/^\[([^\]]+)\]$/);
    if (headerMatch) {
      const name = headerMatch[1].trim();
      currentDiagram = { name, entries: [] };
      diagrams.push(currentDiagram);
      entriesInCurrentDiagram.clear();
      continue;
    }

    // Parse entry line: schema.table x y | schema.table | schema.*
    const parts = line.split(/\s+/);
    if (parts.length === 0) continue;

    const pattern = parts[0];

    // Validate pattern format
    if (!pattern.includes('.')) {
      errors.push({
        message: `Invalid pattern "${pattern}": must be schema.table or schema.*`,
        line: lineNum,
      });
      continue;
    }

    if (!currentDiagram) {
      errors.push({
        message: `Entry "${pattern}" appears before any [diagram] header`,
        line: lineNum,
      });
      continue;
    }

    // Check for duplicate entry
    if (entriesInCurrentDiagram.has(pattern)) {
      errors.push({
        message: `Duplicate entry "${pattern}" in diagram [${currentDiagram.name}]; using last occurrence`,
        line: lineNum,
      });
      // Remove the previous entry
      currentDiagram.entries = currentDiagram.entries.filter(
        (e) => e.pattern !== pattern
      );
    }
    entriesInCurrentDiagram.set(pattern, lineNum);

    // Determine entry kind
    const isWildcard = pattern.endsWith('.*');

    if (parts.length >= 3) {
      // Explicit position: schema.table x y
      const x = parseFloat(parts[1]);
      const y = parseFloat(parts[2]);

      if (isNaN(x) || isNaN(y)) {
        errors.push({
          message: `Invalid coordinates for "${pattern}": expected numbers`,
          line: lineNum,
        });
        continue;
      }

      /** @type {DiagramEntry} */
      const entry = {
        kind: 'explicit',
        pattern,
        x,
        y,
        line: lineNum,
      };
      currentDiagram.entries.push(entry);
    } else if (isWildcard) {
      // Wildcard: schema.*
      /** @type {DiagramEntry} */
      const entry = {
        kind: 'wildcard',
        pattern,
        line: lineNum,
      };
      currentDiagram.entries.push(entry);
    } else {
      // No position: schema.table (will get random placement)
      /** @type {DiagramEntry} */
      const entry = {
        kind: 'no-position',
        pattern,
        line: lineNum,
      };
      currentDiagram.entries.push(entry);
    }
  }

  return { diagrams, errors };
}

/**
 * Main entry: extract + parse @erd-pets block from SQL.
 * @param {string} sql
 * @returns {ErdPetsBlock | null}
 */
export function parseErdPets(sql) {
  const extracted = extractErdPetsBlock(sql);
  if (!extracted) {
    return null;
  }

  // Calculate the starting line of the block content
  const startLine = sql.substring(0, extracted.startOffset).split('\n').length;

  const { diagrams, errors: parseErrors } = parseErdPetsContent(
    extracted.content,
    startLine
  );

  return {
    diagrams,
    errors: [...extracted.errors, ...parseErrors],
    startOffset: extracted.startOffset,
    endOffset: extracted.endOffset,
  };
}

/**
 * Expand diagram entries against actual tables.
 * - Wildcards match schema.*
 * - Explicit overrides wildcard
 * - No-position gets random coords
 * - existingPositions used on refresh to preserve moved tables
 * @param {Diagram} diagram
 * @param {Table[]} tables
 * @param {Map<string, {x: number, y: number}>} [existingPositions]
 * @returns {{ resolved: ResolvedPosition[], errors: ParseError[] }}
 */
export function resolveDiagram(diagram, tables, existingPositions) {
  /** @type {ResolvedPosition[]} */
  const resolved = [];
  /** @type {ParseError[]} */
  const errors = [];

  // Build a map of table qualified names for quick lookup
  const tableMap = new Map(tables.map((t) => [t.qualifiedName, t]));

  // Build a map of schema -> tables for wildcard expansion
  /** @type {Map<string, string[]>} */
  const schemaTablesMap = new Map();
  for (const table of tables) {
    const existing = schemaTablesMap.get(table.schema) || [];
    existing.push(table.qualifiedName);
    schemaTablesMap.set(table.schema, existing);
  }

  // Track which tables have explicit positions (to override wildcards)
  const explicitTables = new Set(
    diagram.entries
      .filter((e) => e.kind === 'explicit' || e.kind === 'no-position')
      .map((e) => e.pattern)
  );

  // Track which tables we've added (to avoid duplicates)
  const addedTables = new Set();

  // Process entries in order
  for (const entry of diagram.entries) {
    if (entry.kind === 'wildcard') {
      // Expand wildcard
      const schema = entry.pattern.slice(0, -2); // Remove ".*"
      const schemaTables = schemaTablesMap.get(schema) || [];

      if (schemaTables.length === 0) {
        errors.push({
          message: `No tables found for schema "${schema}"`,
          line: entry.line,
        });
        continue;
      }

      for (const qualifiedName of schemaTables) {
        // Skip if already added or if there's an explicit entry for this table
        if (addedTables.has(qualifiedName) || explicitTables.has(qualifiedName)) {
          continue;
        }

        addedTables.add(qualifiedName);

        // Use existing position if available, otherwise generate random
        const existing = existingPositions?.get(qualifiedName);
        if (existing) {
          resolved.push({ qualifiedName, x: existing.x, y: existing.y });
        } else {
          resolved.push({
            qualifiedName,
            x: Math.random() * 800 + 50,
            y: Math.random() * 600 + 50,
          });
        }
      }
    } else {
      // Explicit or no-position
      const { pattern } = entry;

      if (!tableMap.has(pattern)) {
        errors.push({
          message: `Table "${pattern}" not found in SQL`,
          line: entry.line,
        });
        continue;
      }

      if (addedTables.has(pattern)) {
        continue; // Already added (shouldn't happen due to duplicate check in parsing)
      }

      addedTables.add(pattern);

      if (entry.kind === 'explicit') {
        // Use existing position if available (for refresh), otherwise use saved position
        const existing = existingPositions?.get(pattern);
        if (existing) {
          resolved.push({ qualifiedName: pattern, x: existing.x, y: existing.y });
        } else {
          resolved.push({
            qualifiedName: pattern,
            x: /** @type {number} */ (entry.x),
            y: /** @type {number} */ (entry.y),
          });
        }
      } else {
        // No-position: use existing or generate random
        const existing = existingPositions?.get(pattern);
        if (existing) {
          resolved.push({ qualifiedName: pattern, x: existing.x, y: existing.y });
        } else {
          resolved.push({
            qualifiedName: pattern,
            x: Math.random() * 800 + 50,
            y: Math.random() * 600 + 50,
          });
        }
      }
    }
  }

  return { resolved, errors };
}

/**
 * Generate block content, expanding wildcards for the selected diagram.
 * @param {Diagram[]} diagrams
 * @param {Map<string, {x: number, y: number}>} nodePositions - Current positions from the canvas
 * @param {string} selectedDiagram - Name of the currently selected diagram
 * @param {Table[]} tables - All tables from the SQL file
 * @returns {string}
 */
export function generateErdPetsContent(diagrams, nodePositions, selectedDiagram, tables) {
  const lines = [];

  // Build schema -> tables map for wildcard expansion
  /** @type {Map<string, string[]>} */
  const schemaTablesMap = new Map();
  for (const table of tables) {
    const existing = schemaTablesMap.get(table.schema) || [];
    existing.push(table.qualifiedName);
    schemaTablesMap.set(table.schema, existing);
  }

  for (const diagram of diagrams) {
    lines.push(`[${diagram.name}]`);
    const isSelected = diagram.name === selectedDiagram;

    // Track explicit entries to avoid duplicates when expanding wildcards
    const explicitPatterns = new Set(
      diagram.entries
        .filter((e) => e.kind === 'explicit' || e.kind === 'no-position')
        .map((e) => e.pattern)
    );

    for (const entry of diagram.entries) {
      if (entry.kind === 'wildcard') {
        // Always preserve the wildcard
        lines.push(entry.pattern);

        if (isSelected) {
          // Also add explicit entries for matched tables
          const schema = entry.pattern.slice(0, -2); // Remove ".*"
          const schemaTables = schemaTablesMap.get(schema) || [];
          for (const qualifiedName of schemaTables) {
            // Skip if there's already an explicit entry for this table
            if (explicitPatterns.has(qualifiedName)) continue;

            const pos = nodePositions.get(qualifiedName);
            if (pos) {
              lines.push(`${qualifiedName} ${Math.round(pos.x)} ${Math.round(pos.y)}`);
            }
            // Don't add tables without positions - wildcard will handle them
          }
        }
      } else {
        // For explicit and no-position, write current position if available
        const pos = nodePositions.get(entry.pattern);
        if (pos) {
          lines.push(`${entry.pattern} ${Math.round(pos.x)} ${Math.round(pos.y)}`);
        } else if (entry.kind === 'explicit' && entry.x !== undefined && entry.y !== undefined) {
          // Preserve original position for entries not currently on canvas
          lines.push(`${entry.pattern} ${Math.round(entry.x)} ${Math.round(entry.y)}`);
        } else {
          // No position available
          lines.push(entry.pattern);
        }
      }
    }

    lines.push(''); // Blank line between diagrams
  }

  return lines.join('\n').trim();
}

/**
 * Replace or prepend @erd-pets block in SQL.
 * @param {string} sql
 * @param {string} newContent - The new block content (without comment markers)
 * @param {ErdPetsBlock | null} existingBlock - Existing block info for replacement
 * @returns {string}
 */
export function updateSqlWithErdPets(sql, newContent, existingBlock) {
  const newBlock = `/* @erd-pets\n${newContent}\n*/`;

  if (existingBlock) {
    // Replace existing block
    return (
      sql.substring(0, existingBlock.startOffset) +
      newBlock +
      sql.substring(existingBlock.endOffset)
    );
  }

  // Prepend new block at the start of file
  return newBlock + '\n\n' + sql;
}
