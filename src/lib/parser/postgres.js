/** @import { Table, Column, ParseError, ParseResult } from './types.js' */
import { tokenize, TokenStream } from './tokenizer.js';

/**
 * Keywords that signal the end of a column type definition
 */
const TYPE_END_KEYWORDS = new Set([
	'NOT',
	'NULL',
	'DEFAULT',
	'GENERATED',
	'CONSTRAINT',
	'PRIMARY',
	'REFERENCES',
	'UNIQUE',
	'CHECK'
]);

/**
 * Multi-word type continuations (when these keywords follow a type keyword, they're part of the type)
 */
const TYPE_CONTINUATION_KEYWORDS = new Set(['WITH', 'WITHOUT', 'TIME', 'ZONE', 'VARYING']);

/**
 * Parse Postgres SQL and extract table definitions
 * @param {string} sql
 * @returns {ParseResult}
 */
export function parsePostgresSQL(sql) {
	const tokens = tokenize(sql);
	const stream = new TokenStream(tokens);

	/** @type {Table[]} */
	const tables = [];
	/** @type {ParseError[]} */
	const errors = [];
	/** @type {Map<string, Table>} */
	const tableMap = new Map();

	// Pass 1: Find CREATE TABLE statements
	while (!stream.isEOF()) {
		try {
			if (stream.is('KEYWORD', 'CREATE')) {
				const saved = stream.save();
				stream.next(); // consume CREATE

				if (stream.is('KEYWORD', 'TABLE')) {
					stream.next(); // consume TABLE

					// Handle IF NOT EXISTS (skip it)
					if (stream.is('KEYWORD', 'IF')) {
						stream.next();
						stream.match('KEYWORD', 'NOT');
						stream.match('KEYWORD', 'EXISTS');
					}

					const table = parseCreateTable(stream, errors);
					if (table) {
						tables.push(table);
						tableMap.set(table.qualifiedName, table);
					}
				} else {
					stream.restore(saved);
					stream.next();
				}
			} else if (stream.is('KEYWORD', 'ALTER')) {
				const saved = stream.save();
				stream.next(); // consume ALTER

				if (stream.is('KEYWORD', 'TABLE')) {
					stream.next(); // consume TABLE

					parseAlterTable(stream, tableMap, errors);
				} else {
					stream.restore(saved);
					stream.next();
				}
			} else {
				stream.next();
			}
		} catch (e) {
			errors.push({
				message: e instanceof Error ? e.message : String(e),
				line: stream.line()
			});
			// Skip to next semicolon or statement keyword
			skipToNextStatement(stream);
		}
	}

	return { tables, errors };
}

/**
 * Parse a CREATE TABLE statement (after CREATE TABLE keywords)
 * @param {TokenStream} stream
 * @param {ParseError[]} errors
 * @returns {Table | null}
 */
function parseCreateTable(stream, errors) {
	// Parse table name (schema.name or just name)
	const { schema, name } = parseQualifiedName(stream);

	if (!name) {
		errors.push({ message: 'Expected table name', line: stream.line() });
		return null;
	}

	// Expect opening parenthesis
	if (!stream.match('PUNCTUATION', '(')) {
		errors.push({ message: 'Expected ( after table name', line: stream.line() });
		return null;
	}

	/** @type {Column[]} */
	const columns = [];

	// Parse columns
	while (!stream.isEOF() && !stream.is('PUNCTUATION', ')')) {
		try {
			// Check for table-level constraint (skip it)
			if (
				stream.is('KEYWORD', 'CONSTRAINT') ||
				stream.is('KEYWORD', 'PRIMARY') ||
				stream.is('KEYWORD', 'FOREIGN') ||
				stream.is('KEYWORD', 'UNIQUE') ||
				stream.is('KEYWORD', 'CHECK')
			) {
				skipTableConstraint(stream);
			} else {
				const column = parseColumn(stream);
				if (column) {
					columns.push(column);
				}
			}
		} catch (e) {
			errors.push({
				message: e instanceof Error ? e.message : String(e),
				line: stream.line()
			});
			// Skip to next comma or closing paren
			skipToColumnEnd(stream);
		}

		// Handle comma between columns
		stream.match('PUNCTUATION', ',');
	}

	// Consume closing parenthesis
	stream.match('PUNCTUATION', ')');

	// Skip to semicolon
	while (!stream.isEOF() && !stream.is('PUNCTUATION', ';')) {
		stream.next();
	}
	stream.match('PUNCTUATION', ';');

	return {
		schema,
		name,
		qualifiedName: `${schema}.${name}`,
		columns
	};
}

/**
 * Parse a qualified name (schema.name or just name)
 * @param {TokenStream} stream
 * @returns {{ schema: string, name: string }}
 */
function parseQualifiedName(stream) {
	let schema = 'public';
	let name = '';

	// First part
	const first = parseIdentifier(stream);
	if (!first) {
		return { schema, name };
	}

	// Check for dot (schema.name)
	if (stream.match('PUNCTUATION', '.')) {
		schema = first;
		name = parseIdentifier(stream) || '';
	} else {
		name = first;
	}

	return { schema, name };
}

/**
 * Parse an identifier (quoted or unquoted)
 * @param {TokenStream} stream
 * @returns {string | null}
 */
function parseIdentifier(stream) {
	const token = stream.peek();
	if (token.type === 'IDENTIFIER' || token.type === 'QUOTED_IDENTIFIER') {
		stream.next();
		return token.value;
	}
	// Some keywords can be used as identifiers
	if (token.type === 'KEYWORD') {
		stream.next();
		return token.value.toLowerCase();
	}
	return null;
}

/**
 * Parse a column definition
 * @param {TokenStream} stream
 * @returns {Column | null}
 */
function parseColumn(stream) {
	const name = parseIdentifier(stream);
	if (!name) {
		return null;
	}

	const type = parseColumnType(stream);

	// Skip column modifiers (NOT NULL, DEFAULT, etc.)
	skipColumnModifiers(stream);

	return {
		name,
		type,
		isPrimaryKey: false
	};
}

/**
 * Parse column type, handling multi-word types and arrays
 * @param {TokenStream} stream
 * @returns {string}
 */
function parseColumnType(stream) {
	const parts = [];

	// Get first part of type
	const firstPart = parseTypePart(stream);
	if (!firstPart) {
		return 'unknown';
	}
	parts.push(firstPart);

	// Handle parenthesized arguments like varchar(255) or decimal(10,2)
	if (stream.is('PUNCTUATION', '(')) {
		parts.push(parseParenthesizedArgs(stream));
	}

	// Handle array brackets
	if (stream.is('PUNCTUATION', '[')) {
		stream.next(); // [
		stream.match('PUNCTUATION', ']');
		parts.push('[]');
	}

	// Handle multi-word types (timestamp with time zone, character varying, etc.)
	while (!stream.isEOF()) {
		const token = stream.peek();

		// Check if this is a type continuation keyword
		if (token.type === 'KEYWORD' && TYPE_CONTINUATION_KEYWORDS.has(token.value)) {
			stream.next();
			parts.push(token.value.toLowerCase());
		} else {
			break;
		}
	}

	return parts.join(' ').replace(/ \[\]$/, '[]').replace(/ \(/g, '(').replace(/\) /g, ')');
}

/**
 * Parse a single type part (keyword or identifier)
 * @param {TokenStream} stream
 * @returns {string | null}
 */
function parseTypePart(stream) {
	const token = stream.peek();
	if (token.type === 'KEYWORD' && !TYPE_END_KEYWORDS.has(token.value)) {
		stream.next();
		return token.value.toLowerCase();
	}
	if (token.type === 'IDENTIFIER') {
		stream.next();
		return token.value;
	}
	return null;
}

/**
 * Parse parenthesized arguments like (255) or (10,2)
 * @param {TokenStream} stream
 * @returns {string}
 */
function parseParenthesizedArgs(stream) {
	let result = '';
	let depth = 0;

	while (!stream.isEOF()) {
		const token = stream.next();

		if (token.type === 'PUNCTUATION' && token.value === '(') {
			depth++;
			result += '(';
		} else if (token.type === 'PUNCTUATION' && token.value === ')') {
			depth--;
			result += ')';
			if (depth === 0) {
				break;
			}
		} else if (token.type === 'PUNCTUATION' && token.value === ',') {
			result += ',';
		} else if (token.type === 'NUMBER') {
			result += token.value;
		} else if (token.type === 'IDENTIFIER' || token.type === 'KEYWORD') {
			result += token.value.toLowerCase();
		}
	}

	return result;
}

/**
 * Skip column modifiers until we hit comma or closing paren
 * @param {TokenStream} stream
 */
function skipColumnModifiers(stream) {
	let parenDepth = 0;

	while (!stream.isEOF()) {
		const token = stream.peek();

		if (token.type === 'PUNCTUATION') {
			if (token.value === '(') {
				parenDepth++;
				stream.next();
			} else if (token.value === ')') {
				if (parenDepth > 0) {
					parenDepth--;
					stream.next();
				} else {
					// End of column list
					break;
				}
			} else if (token.value === ',' && parenDepth === 0) {
				// End of this column
				break;
			} else {
				stream.next();
			}
		} else {
			stream.next();
		}
	}
}

/**
 * Skip a table-level constraint
 * @param {TokenStream} stream
 */
function skipTableConstraint(stream) {
	let parenDepth = 0;

	while (!stream.isEOF()) {
		const token = stream.peek();

		if (token.type === 'PUNCTUATION') {
			if (token.value === '(') {
				parenDepth++;
				stream.next();
			} else if (token.value === ')') {
				if (parenDepth > 0) {
					parenDepth--;
					stream.next();
				} else {
					break;
				}
			} else if (token.value === ',' && parenDepth === 0) {
				break;
			} else {
				stream.next();
			}
		} else {
			stream.next();
		}
	}
}

/**
 * Skip to next comma or closing paren (error recovery)
 * @param {TokenStream} stream
 */
function skipToColumnEnd(stream) {
	let parenDepth = 0;

	while (!stream.isEOF()) {
		const token = stream.peek();

		if (token.type === 'PUNCTUATION') {
			if (token.value === '(') {
				parenDepth++;
			} else if (token.value === ')') {
				if (parenDepth > 0) {
					parenDepth--;
				} else {
					break;
				}
			} else if (token.value === ',' && parenDepth === 0) {
				break;
			}
		}
		stream.next();
	}
}

/**
 * Skip to next statement (error recovery)
 * @param {TokenStream} stream
 */
function skipToNextStatement(stream) {
	while (!stream.isEOF()) {
		if (stream.is('PUNCTUATION', ';')) {
			stream.next();
			break;
		}
		stream.next();
	}
}

/**
 * Parse ALTER TABLE statement for primary keys
 * @param {TokenStream} stream
 * @param {Map<string, Table>} tableMap
 * @param {ParseError[]} errors
 */
function parseAlterTable(stream, tableMap, errors) {
	const { schema, name } = parseQualifiedName(stream);
	const qualifiedName = `${schema}.${name}`;

	// Look for ADD PRIMARY KEY
	while (!stream.isEOF() && !stream.is('PUNCTUATION', ';')) {
		if (stream.is('KEYWORD', 'ADD')) {
			stream.next();

			// Could be ADD CONSTRAINT name PRIMARY KEY or ADD PRIMARY KEY
			if (stream.is('KEYWORD', 'CONSTRAINT')) {
				stream.next();
				parseIdentifier(stream); // constraint name
			}

			if (stream.is('KEYWORD', 'PRIMARY')) {
				stream.next();
				if (stream.match('KEYWORD', 'KEY')) {
					// Parse the column list
					if (stream.match('PUNCTUATION', '(')) {
						const pkColumns = [];
						while (!stream.isEOF() && !stream.is('PUNCTUATION', ')')) {
							const col = parseIdentifier(stream);
							if (col) {
								pkColumns.push(col);
							}
							stream.match('PUNCTUATION', ',');
						}
						stream.match('PUNCTUATION', ')');

						// Mark columns as primary key
						const table = tableMap.get(qualifiedName);
						if (table) {
							for (const pkCol of pkColumns) {
								const column = table.columns.find((c) => c.name === pkCol);
								if (column) {
									column.isPrimaryKey = true;
								}
							}
						}
					}
				}
			}
		} else {
			stream.next();
		}
	}

	stream.match('PUNCTUATION', ';');
}
