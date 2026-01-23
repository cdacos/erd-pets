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
 * @typedef {Object} ParseError
 * @property {string} message
 * @property {number} [line]
 * @property {string} [context]
 */

/**
 * @typedef {Object} ParseResult
 * @property {Table[]} tables
 * @property {ParseError[]} errors
 */

/**
 * @typedef {'KEYWORD' | 'IDENTIFIER' | 'QUOTED_IDENTIFIER' | 'NUMBER' | 'STRING' | 'PUNCTUATION' | 'OPERATOR' | 'WHITESPACE' | 'COMMENT' | 'EOF'} TokenType
 */

/**
 * @typedef {Object} Token
 * @property {TokenType} type
 * @property {string} value
 * @property {number} line
 * @property {number} column
 */

export {};
