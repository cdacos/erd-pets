/**
 * JSONC Diagram File Parser
 *
 * Parses .erd-pets.json files with JSONC support (comments allowed).
 *
 * @module diagram
 */

/**
 * @typedef {import('./types.js').DiagramFile} DiagramFile
 * @typedef {import('./types.js').DiagramDefinition} DiagramDefinition
 * @typedef {import('./types.js').DiagramTableEntry} DiagramTableEntry
 * @typedef {import('./types.js').ResolvedTableEntry} ResolvedTableEntry
 * @typedef {import('./types.js').RelationRule} RelationRule
 * @typedef {import('./types.js').ParseError} ParseError
 * @typedef {import('./types.js').Table} Table
 * @typedef {import('./types.js').ForeignKey} ForeignKey
 */

/**
 * Strip JSONC comments from a string.
 * Handles line comments (//) and block comments, preserving strings.
 * @param {string} content
 * @returns {string}
 */
export function stripJsonComments(content) {
  let result = '';
  let i = 0;
  const len = content.length;

  while (i < len) {
    // Check for string start
    if (content[i] === '"') {
      const start = i;
      i++; // Move past opening quote
      // Find closing quote, handling escapes
      while (i < len) {
        if (content[i] === '\\' && i + 1 < len) {
          i += 2; // Skip escaped character
        } else if (content[i] === '"') {
          i++; // Move past closing quote
          break;
        } else {
          i++;
        }
      }
      result += content.slice(start, i);
    }
    // Check for line comment
    else if (content[i] === '/' && i + 1 < len && content[i + 1] === '/') {
      // Skip until end of line
      while (i < len && content[i] !== '\n') {
        i++;
      }
      // Keep the newline for line number preservation
      if (i < len) {
        result += content[i];
        i++;
      }
    }
    // Check for block comment
    else if (content[i] === '/' && i + 1 < len && content[i + 1] === '*') {
      i += 2; // Skip /*
      // Count newlines in the comment to preserve line numbers
      let newlines = '';
      while (i < len) {
        if (content[i] === '*' && i + 1 < len && content[i + 1] === '/') {
          i += 2; // Skip */
          break;
        }
        if (content[i] === '\n') {
          newlines += '\n';
        }
        i++;
      }
      result += newlines;
    }
    // Regular character
    else {
      result += content[i];
      i++;
    }
  }

  return result;
}

/**
 * Validate the structure of a parsed diagram file.
 * @param {unknown} data
 * @returns {ParseError[]}
 */
function validateDiagramFile(data) {
  /** @type {ParseError[]} */
  const errors = [];

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    errors.push({ message: 'Diagram file must be a JSON object' });
    return errors;
  }

  const obj = /** @type {Record<string, unknown>} */ (data);

  // Validate sql field
  if (!('sql' in obj)) {
    errors.push({ message: 'Missing required field: "sql"' });
  } else if (typeof obj.sql !== 'string') {
    errors.push({ message: 'Field "sql" must be a string' });
  } else if (obj.sql.trim() === '') {
    errors.push({ message: 'Field "sql" cannot be empty' });
  }

  // Validate diagrams field
  if (!('diagrams' in obj)) {
    errors.push({ message: 'Missing required field: "diagrams"' });
  } else if (!Array.isArray(obj.diagrams)) {
    errors.push({ message: 'Field "diagrams" must be an array' });
  } else {
    const seenIds = new Set();
    for (let i = 0; i < obj.diagrams.length; i++) {
      const diagram = obj.diagrams[i];
      const prefix = `diagrams[${i}]`;

      if (typeof diagram !== 'object' || diagram === null || Array.isArray(diagram)) {
        errors.push({ message: `${prefix}: must be an object` });
        continue;
      }

      const d = /** @type {Record<string, unknown>} */ (diagram);

      // Validate id
      if (!('id' in d)) {
        errors.push({ message: `${prefix}: missing required field "id"` });
      } else if (typeof d.id !== 'string') {
        errors.push({ message: `${prefix}.id: must be a string` });
      } else if (d.id.trim() === '') {
        errors.push({ message: `${prefix}.id: cannot be empty` });
      } else if (seenIds.has(d.id)) {
        errors.push({ message: `${prefix}.id: duplicate id "${d.id}"` });
      } else {
        seenIds.add(d.id);
      }

      // Validate title
      if (!('title' in d)) {
        errors.push({ message: `${prefix}: missing required field "title"` });
      } else if (typeof d.title !== 'string') {
        errors.push({ message: `${prefix}.title: must be a string` });
      }

      // Validate tables
      if (!('tables' in d)) {
        errors.push({ message: `${prefix}: missing required field "tables"` });
      } else if (!Array.isArray(d.tables)) {
        errors.push({ message: `${prefix}.tables: must be an array` });
      } else {
        for (let j = 0; j < d.tables.length; j++) {
          const table = d.tables[j];
          const tablePrefix = `${prefix}.tables[${j}]`;

          if (typeof table !== 'object' || table === null || Array.isArray(table)) {
            errors.push({ message: `${tablePrefix}: must be an object` });
            continue;
          }

          const t = /** @type {Record<string, unknown>} */ (table);

          // Validate name (required)
          if (!('name' in t)) {
            errors.push({ message: `${tablePrefix}: missing required field "name"` });
          } else if (typeof t.name !== 'string') {
            errors.push({ message: `${tablePrefix}.name: must be a string` });
          } else if (t.name.trim() === '') {
            errors.push({ message: `${tablePrefix}.name: cannot be empty` });
          }

          // Validate optional id
          if ('id' in t && typeof t.id !== 'string') {
            errors.push({ message: `${tablePrefix}.id: must be a string` });
          }

          // Validate optional x, y
          if ('x' in t && typeof t.x !== 'number') {
            errors.push({ message: `${tablePrefix}.x: must be a number` });
          }
          if ('y' in t && typeof t.y !== 'number') {
            errors.push({ message: `${tablePrefix}.y: must be a number` });
          }

          // Validate optional color
          if ('color' in t && typeof t.color !== 'string') {
            errors.push({ message: `${tablePrefix}.color: must be a string` });
          }
        }
      }

      // Validate optional relations
      if ('relations' in d) {
        if (!Array.isArray(d.relations)) {
          errors.push({ message: `${prefix}.relations: must be an array` });
        } else {
          for (let k = 0; k < d.relations.length; k++) {
            const relation = d.relations[k];
            const relPrefix = `${prefix}.relations[${k}]`;

            if (typeof relation !== 'object' || relation === null || Array.isArray(relation)) {
              errors.push({ message: `${relPrefix}: must be an object` });
              continue;
            }

            const r = /** @type {Record<string, unknown>} */ (relation);

            // Validate from (required)
            if (!('from' in r)) {
              errors.push({ message: `${relPrefix}: missing required field "from"` });
            } else if (typeof r.from !== 'string') {
              errors.push({ message: `${relPrefix}.from: must be a string` });
            } else if (r.from.trim() === '') {
              errors.push({ message: `${relPrefix}.from: cannot be empty` });
            }

            // Validate to (required)
            if (!('to' in r)) {
              errors.push({ message: `${relPrefix}: missing required field "to"` });
            } else if (typeof r.to !== 'string') {
              errors.push({ message: `${relPrefix}.to: must be a string` });
            } else if (r.to.trim() === '') {
              errors.push({ message: `${relPrefix}.to: cannot be empty` });
            }

            // Validate optional line
            if ('line' in r) {
              if (typeof r.line !== 'string') {
                errors.push({ message: `${relPrefix}.line: must be a string` });
              } else if (!['solid', 'dashed', 'hidden'].includes(r.line)) {
                errors.push({ message: `${relPrefix}.line: must be "solid", "dashed", or "hidden"` });
              }
            }

            // Validate optional color
            if ('color' in r && typeof r.color !== 'string') {
              errors.push({ message: `${relPrefix}.color: must be a string` });
            }
          }
        }
      }
    }
  }

  return errors;
}

/**
 * Parse a JSONC diagram file.
 * @param {string} content - Raw file content (may contain JSONC comments)
 * @returns {{ data: DiagramFile | null, errors: ParseError[] }}
 */
export function parseDiagramFile(content) {
  /** @type {ParseError[]} */
  const errors = [];

  // Strip comments
  const stripped = stripJsonComments(content);

  // Parse JSON
  let parsed;
  try {
    parsed = JSON.parse(stripped);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push({ message: `JSON parse error: ${message}` });
    return { data: null, errors };
  }

  // Validate structure
  const validationErrors = validateDiagramFile(parsed);
  if (validationErrors.length > 0) {
    return { data: null, errors: validationErrors };
  }

  return { data: /** @type {DiagramFile} */ (parsed), errors };
}

/**
 * Check if a pattern is a wildcard.
 * @param {string} pattern
 * @returns {boolean}
 */
function isWildcard(pattern) {
  return pattern === '*' || pattern.endsWith('*');
}

/**
 * Expand a wildcard pattern against available tables.
 * @param {string} pattern
 * @param {Table[]} tables
 * @returns {string[]} - Qualified names of matching tables
 */
function expandWildcard(pattern, tables) {
  if (pattern === '*') {
    // Global wildcard: all tables
    return tables.map((t) => t.qualifiedName);
  }

  if (pattern.endsWith('.*')) {
    // Schema wildcard: schema.*
    const schema = pattern.slice(0, -2);
    return tables.filter((t) => t.schema === schema).map((t) => t.qualifiedName);
  }

  if (pattern.includes('.') && pattern.endsWith('*')) {
    // Schema + table prefix wildcard: schema.prefix*
    const dotIndex = pattern.indexOf('.');
    const schema = pattern.slice(0, dotIndex);
    const tablePrefix = pattern.slice(dotIndex + 1, -1); // Remove trailing *
    return tables
      .filter((t) => t.schema === schema && t.name.startsWith(tablePrefix))
      .map((t) => t.qualifiedName);
  }

  if (pattern.endsWith('*')) {
    // Prefix wildcard: prefix*
    const prefix = pattern.slice(0, -1);
    return tables
      .filter((t) => t.qualifiedName.startsWith(prefix))
      .map((t) => t.qualifiedName);
  }

  return [];
}

/**
 * Resolve diagram table entries against SQL tables.
 * Expands wildcards and validates explicit entries.
 * @param {DiagramDefinition} diagram
 * @param {Table[]} tables
 * @param {Map<string, {x: number, y: number}>} [existingPositions] - Positions to preserve (for refresh)
 * @returns {{ resolved: ResolvedTableEntry[], errors: ParseError[] }}
 */
export function resolveDiagramTables(diagram, tables, existingPositions) {
  /** @type {ResolvedTableEntry[]} */
  const resolved = [];
  /** @type {ParseError[]} */
  const errors = [];

  // Build a map of table qualified names for quick lookup
  const tableMap = new Map(tables.map((t) => [t.qualifiedName, t]));

  // Track explicit entries (to skip from wildcard expansion)
  const explicitNames = new Set(
    diagram.tables.filter((t) => !isWildcard(t.name)).map((t) => t.name)
  );

  // Track which tables we've added (to avoid duplicates)
  const addedTables = new Set();

  // Process entries in order
  for (const entry of diagram.tables) {
    if (isWildcard(entry.name)) {
      // Expand wildcard
      const matchingTables = expandWildcard(entry.name, tables);

      if (matchingTables.length === 0) {
        errors.push({
          message: `No tables found matching pattern "${entry.name}"`,
        });
        continue;
      }

      for (const qualifiedName of matchingTables) {
        // Skip if already added or if there's an explicit entry for this table
        if (addedTables.has(qualifiedName) || explicitNames.has(qualifiedName)) {
          continue;
        }

        addedTables.add(qualifiedName);

        // Use existing position if available, otherwise generate random
        const existing = existingPositions?.get(qualifiedName);
        if (existing) {
          resolved.push({
            qualifiedName,
            x: existing.x,
            y: existing.y,
            fromWildcard: true,
            originalPattern: entry.name,
          });
        } else {
          resolved.push({
            qualifiedName,
            x: Math.random() * 800 + 50,
            y: Math.random() * 600 + 50,
            fromWildcard: true,
            originalPattern: entry.name,
          });
        }
      }
    } else {
      // Explicit entry
      if (!tableMap.has(entry.name)) {
        errors.push({
          message: `Table "${entry.name}" not found in SQL`,
        });
        continue;
      }

      if (addedTables.has(entry.name)) {
        continue; // Already added (shouldn't happen normally)
      }

      addedTables.add(entry.name);

      // Determine position
      const existing = existingPositions?.get(entry.name);
      let x, y;

      if (existing) {
        x = existing.x;
        y = existing.y;
      } else if (typeof entry.x === 'number' && typeof entry.y === 'number') {
        x = entry.x;
        y = entry.y;
      } else {
        x = Math.random() * 800 + 50;
        y = Math.random() * 600 + 50;
      }

      resolved.push({
        qualifiedName: entry.name,
        x,
        y,
        id: entry.id,
        color: entry.color,
        fromWildcard: false,
      });
    }
  }

  return { resolved, errors };
}

/**
 * Serialize a diagram file back to JSONC.
 * Preserves wildcards and updates positions for the selected diagram.
 * @param {DiagramFile} diagramFile
 * @param {string} selectedDiagramId
 * @param {Map<string, {x: number, y: number}>} nodePositions - Current positions from canvas
 * @param {Table[]} tables - All tables from SQL
 * @returns {string}
 */
/**
 * Create a default diagram file structure for a new SQL schema.
 * @param {string} sqlFilename - The filename of the SQL file (just the name, not full path)
 * @returns {DiagramFile}
 */
export function createDefaultDiagramFile(sqlFilename) {
  return {
    sql: sqlFilename,
    diagrams: [
      {
        id: 'main',
        title: 'All Tables',
        tables: [{ name: '*' }],
      },
    ],
  };
}

/**
 * Convert a glob pattern to a regular expression.
 * Supports * as wildcard matching any characters (including dots).
 * @param {string} pattern
 * @returns {RegExp}
 */
function globToRegex(pattern) {
  // Escape regex special chars except *
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  // Replace * with .* for wildcard
  const regexStr = '^' + escaped.replace(/\*/g, '.*') + '$';
  return new RegExp(regexStr);
}

/**
 * Check if a column path matches a glob pattern.
 * @param {string} path - Full column path (schema.table.column)
 * @param {string} pattern - Glob pattern
 * @returns {boolean}
 */
function matchesGlob(path, pattern) {
  return globToRegex(pattern).test(path);
}

/**
 * @typedef {Object} ResolvedRelation
 * @property {boolean} hidden - Whether the edge should be hidden
 * @property {'solid' | 'dashed'} [line] - Line style
 * @property {string} [color] - Hex color
 */

/**
 * Apply relation rules to a foreign key and return styling.
 * First matching rule wins.
 * @param {ForeignKey} fk
 * @param {RelationRule[]} relations
 * @returns {ResolvedRelation}
 */
export function resolveRelation(fk, relations) {
  const fromPath = `${fk.sourceTable}.${fk.sourceColumn}`;
  const toPath = `${fk.targetTable}.${fk.targetColumn}`;

  for (const rule of relations) {
    if (matchesGlob(fromPath, rule.from) && matchesGlob(toPath, rule.to)) {
      if (rule.line === 'hidden') {
        return { hidden: true };
      }
      return {
        hidden: false,
        line: rule.line === 'dashed' ? 'dashed' : 'solid',
        color: rule.color,
      };
    }
  }

  // No match - default styling
  return { hidden: false };
}

export function serializeDiagramFile(diagramFile, selectedDiagramId, nodePositions, tables) {
  // Deep clone to avoid mutating the original
  const output = {
    sql: diagramFile.sql,
    diagrams: diagramFile.diagrams.map((diagram) => {
      const isSelected = diagram.id === selectedDiagramId;

      // For non-selected diagrams, preserve as-is
      if (!isSelected) {
        return {
          id: diagram.id,
          title: diagram.title,
          tables: diagram.tables.map((t) => ({ ...t })),
          ...(diagram.relations ? { relations: diagram.relations } : {}),
          ...(diagram.notes ? { notes: diagram.notes } : {}),
          ...(diagram.arrows ? { arrows: diagram.arrows } : {}),
        };
      }

      // For selected diagram, update positions
      // Build a map of existing entries by name (for merging)
      const entryMap = new Map(diagram.tables.map((t) => [t.name, t]));

      // Track explicit names (non-wildcards)
      const explicitNames = new Set(
        diagram.tables.filter((t) => !isWildcard(t.name)).map((t) => t.name)
      );

      // Build new tables array
      /** @type {DiagramTableEntry[]} */
      const newTables = [];

      for (const entry of diagram.tables) {
        if (isWildcard(entry.name)) {
          // Keep wildcard as-is
          newTables.push({ name: entry.name });

          // Add explicit positions for tables matched by this wildcard
          const matchingTables = expandWildcard(entry.name, tables);
          for (const qualifiedName of matchingTables) {
            // Skip if there's an explicit entry for this table
            if (explicitNames.has(qualifiedName)) {
              continue;
            }

            const pos = nodePositions.get(qualifiedName);
            if (pos) {
              newTables.push({
                name: qualifiedName,
                x: Math.round(pos.x),
                y: Math.round(pos.y),
              });
              // Add to explicit names to avoid duplicates from other wildcards
              explicitNames.add(qualifiedName);
            }
          }
        } else {
          // Explicit entry - update position from canvas
          const pos = nodePositions.get(entry.name);
          const newEntry = { ...entry };

          if (pos) {
            newEntry.x = Math.round(pos.x);
            newEntry.y = Math.round(pos.y);
          }

          newTables.push(newEntry);
        }
      }

      return {
        id: diagram.id,
        title: diagram.title,
        tables: newTables,
        ...(diagram.relations ? { relations: diagram.relations } : {}),
        ...(diagram.notes ? { notes: diagram.notes } : {}),
        ...(diagram.arrows ? { arrows: diagram.arrows } : {}),
      };
    }),
  };

  return JSON.stringify(output, null, 2);
}
