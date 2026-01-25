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
 * @typedef {import('./types.js').Note} Note
 * @typedef {import('./types.js').Arrow} Arrow
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

  // Validate optional dbType field
  if ('dbType' in obj && typeof obj.dbType !== 'string') {
    errors.push({ message: 'Field "dbType" must be a string' });
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

          // Validate optional visible
          if ('visible' in t && typeof t.visible !== 'boolean') {
            errors.push({ message: `${tablePrefix}.visible: must be a boolean` });
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
              } else if (!['solid', 'dashed'].includes(r.line)) {
                errors.push({ message: `${relPrefix}.line: must be "solid" or "dashed"` });
              }
            }

            // Validate optional color
            if ('color' in r && typeof r.color !== 'string') {
              errors.push({ message: `${relPrefix}.color: must be a string` });
            }

            // Validate optional visible
            if ('visible' in r && typeof r.visible !== 'boolean') {
              errors.push({ message: `${relPrefix}.visible: must be a boolean` });
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

  // Set default dbType if not provided
  const result = /** @type {DiagramFile} */ (parsed);
  if (!result.dbType) {
    result.dbType = 'PostgreSQL';
  }

  return { data: result, errors };
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
 * Uses "last match wins" semantics - later entries override earlier ones.
 * @param {DiagramDefinition} diagram
 * @param {Table[]} tables
 * @param {Map<string, {x: number, y: number}>} [existingPositions] - Positions to preserve (for refresh)
 * @returns {{ resolved: ResolvedTableEntry[], errors: ParseError[] }}
 */
export function resolveDiagramTables(diagram, tables, existingPositions) {
  /** @type {ParseError[]} */
  const errors = [];

  // Build a map of table qualified names for quick lookup
  const tableMap = new Map(tables.map((t) => [t.qualifiedName, t]));

  // Track table state: visibility and metadata (last match wins)
  /** @type {Map<string, { visible: boolean, entry: DiagramTableEntry | null, fromWildcard: boolean, originalPattern?: string }>} */
  const tableState = new Map();

  // Process entries in order - later entries override earlier ones
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

      const isVisible = entry.visible !== false;

      for (const qualifiedName of matchingTables) {
        tableState.set(qualifiedName, {
          visible: isVisible,
          entry: null, // Wildcard doesn't carry explicit position/color
          fromWildcard: true,
          originalPattern: entry.name,
        });
      }
    } else {
      // Explicit entry
      if (!tableMap.has(entry.name)) {
        errors.push({
          message: `Table "${entry.name}" not found in SQL`,
        });
        continue;
      }

      tableState.set(entry.name, {
        visible: entry.visible !== false,
        entry,
        fromWildcard: false,
      });
    }
  }

  // Build resolved array from visible tables
  /** @type {ResolvedTableEntry[]} */
  const resolved = [];

  for (const [qualifiedName, state] of tableState) {
    if (!state.visible) {
      continue;
    }

    // Determine position
    const existing = existingPositions?.get(qualifiedName);
    let x, y;

    if (existing) {
      x = existing.x;
      y = existing.y;
    } else if (state.entry && typeof state.entry.x === 'number' && typeof state.entry.y === 'number') {
      x = state.entry.x;
      y = state.entry.y;
    } else {
      x = Math.random() * 800 + 50;
      y = Math.random() * 600 + 50;
    }

    resolved.push({
      qualifiedName,
      x,
      y,
      id: state.entry?.id,
      color: state.entry?.color,
      fromWildcard: state.fromWildcard,
      originalPattern: state.originalPattern,
    });
  }

  return { resolved, errors };
}

/**
 * Create a default diagram file structure for a new SQL schema.
 * @param {string} sqlFilename - The filename of the SQL file (just the name, not full path)
 * @returns {DiagramFile}
 */
export function createDefaultDiagramFile(sqlFilename) {
  return {
    sql: sqlFilename,
    dbType: 'PostgreSQL',
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
      if (rule.visible === false) {
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

/**
 * Set visibility for a table in a diagram.
 * Returns updated tables array for the diagram.
 * @param {DiagramTableEntry[]} tables - Current diagram tables array
 * @param {string} qualifiedName - The table's qualified name
 * @param {boolean} visible - Whether to show or hide the table
 * @returns {DiagramTableEntry[]}
 */
export function setTableVisibility(tables, qualifiedName, visible) {
  // Find existing explicit entry for this table
  const existingIndex = tables.findIndex(
    (t) => t.name === qualifiedName && !isWildcard(t.name)
  );

  if (visible) {
    // Showing a table
    if (existingIndex !== -1) {
      const existing = tables[existingIndex];
      if (existing.visible === false) {
        // Remove the visible: false property
        const { visible: _removed, ...rest } = existing;
        // If only name remains and no other properties, we could remove entirely
        // But keep entry to preserve position if it has x/y
        const newTables = [...tables];
        newTables[existingIndex] = rest;
        return newTables;
      }
      // Already visible, no change needed
      return tables;
    }
    // No explicit entry - table might be hidden by wildcard
    // Add explicit entry to show it (will be placed by canvas)
    return [...tables, { name: qualifiedName }];
  } else {
    // Hiding a table
    if (existingIndex !== -1) {
      // Update existing entry with visible: false
      const newTables = [...tables];
      newTables[existingIndex] = { ...tables[existingIndex], visible: false };
      return newTables;
    }
    // No explicit entry - add one with visible: false
    return [...tables, { name: qualifiedName, visible: false }];
  }
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
export function serializeDiagramFile(diagramFile, selectedDiagramId, nodePositions, tables) {
  // Deep clone to avoid mutating the original
  const output = {
    sql: diagramFile.sql,
    ...(diagramFile.dbType ? { dbType: diagramFile.dbType } : {}),
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
          // Keep wildcard as-is, preserving visible attribute
          newTables.push({
            name: entry.name,
            ...(entry.visible === false ? { visible: false } : {}),
          });

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

/**
 * Generate a unique note ID.
 * @param {Note[]} existingNotes
 * @returns {string}
 */
export function generateNoteId(existingNotes) {
  const existingIds = new Set(existingNotes.map((n) => n.id));
  let counter = 1;
  while (existingIds.has(`note-${counter}`)) {
    counter++;
  }
  return `note-${counter}`;
}

/**
 * Update note positions from canvas coordinates.
 * @param {Note[]} notes - Original notes from diagram definition
 * @param {Map<string, {x: number, y: number}>} positionMap - Current positions from canvas
 * @returns {Note[]} - Notes with updated positions
 */
export function updateNotePositions(notes, positionMap) {
  return notes.map((note) => {
    const pos = positionMap.get(note.id);
    if (pos) {
      return {
        ...note,
        x: Math.round(pos.x),
        y: Math.round(pos.y),
      };
    }
    return note;
  });
}

/**
 * Generate a unique arrow ID.
 * @param {Arrow[]} existingArrows
 * @returns {string}
 */
export function generateArrowId(existingArrows) {
  const existingIds = new Set(existingArrows.map((a) => a.id));
  let counter = 1;
  while (existingIds.has(`arrow-${counter}`)) {
    counter++;
  }
  return `arrow-${counter}`;
}

/**
 * Generate a unique diagram ID from a title.
 * @param {string} title
 * @param {DiagramDefinition[]} existingDiagrams
 * @returns {string}
 */
export function generateDiagramId(title, existingDiagrams) {
  const existingIds = new Set(existingDiagrams.map((d) => d.id));
  // Convert title to kebab-case id
  let baseId = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  if (!baseId) {
    baseId = 'diagram';
  }

  let id = baseId;
  let counter = 1;
  while (existingIds.has(id)) {
    id = `${baseId}-${counter}`;
    counter++;
  }
  return id;
}
