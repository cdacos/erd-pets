/**
 * @typedef {Object} Column
 * @property {string} name
 * @property {string} type
 * @property {boolean} isPrimaryKey
 */

/**
 * @typedef {Object} Table
 * @property {string} schema
 * @property {string} name
 * @property {string} qualifiedName - "schema.name"
 * @property {Column[]} columns
 */

/**
 * @typedef {Object} ForeignKey
 * @property {string} sourceTable - Fully qualified source table name (schema.table)
 * @property {string} sourceColumn - Column in the source table
 * @property {string} targetTable - Fully qualified target table name (schema.table)
 * @property {string} targetColumn - Column in the target table (resolved from PK if not specified)
 */

/**
 * @typedef {Object} ParseError
 * @property {string} message
 * @property {number} [line]
 * @property {string} [context]
 */

/**
 * @typedef {Object} ParseResult
 * @property {Table[]} tables
 * @property {ForeignKey[]} foreignKeys
 * @property {ParseError[]} errors
 */

/**
 * @typedef {'KEYWORD' | 'IDENTIFIER' | 'QUOTED_IDENTIFIER' | 'NUMBER' | 'STRING' | 'PUNCTUATION' | 'OPERATOR' | 'WHITESPACE' | 'COMMENT' | 'EOF'} TokenType
 */

/**
 * @typedef {Object} DiagramEntry
 * @property {'explicit' | 'wildcard' | 'no-position'} kind
 * @property {string} pattern - "schema.table" or "schema.*"
 * @property {number} [x]
 * @property {number} [y]
 * @property {number} line - Source line for errors
 */

/**
 * @typedef {Object} Diagram
 * @property {string} name
 * @property {DiagramEntry[]} entries
 */

/**
 * @typedef {Object} ErdPetsBlock
 * @property {Diagram[]} diagrams
 * @property {ParseError[]} errors
 * @property {number} startOffset - For replacement
 * @property {number} endOffset
 */

/**
 * @typedef {Object} ResolvedPosition
 * @property {string} qualifiedName - "schema.table"
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {Object} Token
 * @property {TokenType} type
 * @property {string} value
 * @property {number} line
 * @property {number} column
 */

// ============================================================================
// JSONC Diagram File Types (new format)
// ============================================================================

/**
 * @typedef {Object} DiagramTableEntry
 * @property {string} [id] - Optional ID for arrow references
 * @property {string} name - Qualified name or wildcard pattern
 * @property {number} [x] - Position in pixels
 * @property {number} [y] - Position in pixels
 * @property {string} [color] - Hex color for table header
 * @property {boolean} [visible] - Whether table is visible (default: true)
 */

/**
 * @typedef {Object} RelationRule
 * @property {string} from - Glob pattern for source column (schema.table.column)
 * @property {string} to - Glob pattern for target column (schema.table.column)
 * @property {'solid' | 'dashed'} [line] - Line style (default: solid)
 * @property {string} [color] - Hex color for the edge
 * @property {boolean} [visible] - Whether relation is visible (default: true)
 */

/**
 * @typedef {Object} Note
 * @property {string} id
 * @property {string} text
 * @property {number} x
 * @property {number} y
 * @property {string} [color] - Hex color (default: #fef3c7)
 */

/**
 * @typedef {Object} DiagramDefinition
 * @property {string} id - Unique identifier within file
 * @property {string} title - Display name
 * @property {DiagramTableEntry[]} tables
 * @property {RelationRule[]} [relations] - FK edge styling rules
 * @property {Note[]} [notes] - Sticky notes on the diagram
 * @property {any[]} [arrows] - Phase 2
 */

/**
 * @typedef {Object} DiagramFile
 * @property {string} sql - Path to schema SQL file (relative to diagram file)
 * @property {DiagramDefinition[]} diagrams
 */

/**
 * @typedef {Object} ResolvedTableEntry
 * @property {string} qualifiedName - "schema.table"
 * @property {number} x
 * @property {number} y
 * @property {string} [id] - Optional ID for arrow references
 * @property {string} [color] - Hex color for table header
 * @property {boolean} fromWildcard - Whether this entry came from wildcard expansion
 * @property {string} [originalPattern] - The wildcard pattern that matched this table
 */

export {};
