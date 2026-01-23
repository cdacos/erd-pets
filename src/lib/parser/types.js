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

export {};
