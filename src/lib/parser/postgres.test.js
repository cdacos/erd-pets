import { describe, it, expect } from 'vitest';
import { tokenize, TokenStream } from './tokenizer.js';
import { parsePostgresSQL } from './postgres.js';

describe('tokenizer', () => {
	it('tokenizes simple SQL', () => {
		const tokens = tokenize('CREATE TABLE users (id integer);');
		const types = tokens.map((t) => t.type);

		expect(types).toContain('KEYWORD');
		expect(types).toContain('IDENTIFIER');
		expect(types).toContain('PUNCTUATION');
		expect(types[types.length - 1]).toBe('EOF');
	});

	it('handles quoted identifiers', () => {
		const tokens = tokenize('SELECT "Grant" FROM users');

		const quoted = tokens.find((t) => t.type === 'QUOTED_IDENTIFIER');
		expect(quoted).toBeDefined();
		expect(quoted?.value).toBe('Grant');
	});

	it('folds unquoted identifiers to lowercase', () => {
		const tokens = tokenize('SELECT UserName FROM Users');

		const identifiers = tokens.filter((t) => t.type === 'IDENTIFIER');
		expect(identifiers.map((t) => t.value)).toEqual(['username', 'users']);
	});

	it('handles line comments', () => {
		const tokens = tokenize('SELECT -- this is a comment\n* FROM users');

		// Comment should be skipped
		const types = tokens.map((t) => t.type);
		expect(types).not.toContain('COMMENT');
	});

	it('handles block comments', () => {
		const tokens = tokenize('SELECT /* block\ncomment */ * FROM users');

		const types = tokens.map((t) => t.type);
		expect(types).not.toContain('COMMENT');
	});

	it('tracks line numbers', () => {
		const tokens = tokenize('CREATE\nTABLE\nusers');

		expect(tokens[0].line).toBe(1); // CREATE
		expect(tokens[1].line).toBe(2); // TABLE
		expect(tokens[2].line).toBe(3); // users
	});

	it('handles string literals', () => {
		const tokens = tokenize("SELECT 'hello world' FROM users");

		const str = tokens.find((t) => t.type === 'STRING');
		expect(str).toBeDefined();
		expect(str?.value).toBe('hello world');
	});

	it('handles operators', () => {
		const tokens = tokenize("SELECT * FROM users WHERE id = 1 AND name::text <> ''");

		const operators = tokens.filter((t) => t.type === 'OPERATOR');
		expect(operators.map((t) => t.value)).toContain('::');
		expect(operators.map((t) => t.value)).toContain('<>');
	});
});

describe('TokenStream', () => {
	it('provides peek and next operations', () => {
		const tokens = tokenize('CREATE TABLE');
		const stream = new TokenStream(tokens);

		expect(stream.peek().value).toBe('CREATE');
		expect(stream.next().value).toBe('CREATE');
		expect(stream.peek().value).toBe('TABLE');
	});

	it('supports save and restore', () => {
		const tokens = tokenize('CREATE TABLE users');
		const stream = new TokenStream(tokens);

		const saved = stream.save();
		stream.next();
		stream.next();
		expect(stream.peek().value).toBe('users');

		stream.restore(saved);
		expect(stream.peek().value).toBe('CREATE');
	});

	it('matches tokens conditionally', () => {
		const tokens = tokenize('CREATE TABLE');
		const stream = new TokenStream(tokens);

		expect(stream.match('KEYWORD', 'SELECT')).toBeNull();
		expect(stream.match('KEYWORD', 'CREATE')).not.toBeNull();
		expect(stream.peek().value).toBe('TABLE');
	});
});

describe('parsePostgresSQL', () => {
	it('parses a simple table', () => {
		const sql = `
      CREATE TABLE users (
        id integer,
        name text
      );
    `;

		const result = parsePostgresSQL(sql);

		expect(result.tables).toHaveLength(1);
		expect(result.tables[0].schema).toBe('public');
		expect(result.tables[0].name).toBe('users');
		expect(result.tables[0].columns).toHaveLength(2);
		expect(result.tables[0].columns[0]).toEqual({
			name: 'id',
			type: 'integer',
			isPrimaryKey: false
		});
		expect(result.tables[0].columns[1]).toEqual({
			name: 'name',
			type: 'text',
			isPrimaryKey: false
		});
	});

	it('parses schema-qualified table names', () => {
		const sql = `CREATE TABLE myschema.users (id integer);`;

		const result = parsePostgresSQL(sql);

		expect(result.tables[0].schema).toBe('myschema');
		expect(result.tables[0].name).toBe('users');
		expect(result.tables[0].qualifiedName).toBe('myschema.users');
	});

	it('handles quoted identifiers', () => {
		const sql = `CREATE TABLE contract."grant" (id integer);`;

		const result = parsePostgresSQL(sql);

		expect(result.tables[0].schema).toBe('contract');
		expect(result.tables[0].name).toBe('grant');
		expect(result.tables[0].qualifiedName).toBe('contract.grant');
	});

	it('parses multi-word types (timestamp with time zone)', () => {
		const sql = `
      CREATE TABLE events (
        created_at timestamp with time zone
      );
    `;

		const result = parsePostgresSQL(sql);

		expect(result.tables[0].columns[0].type).toBe('timestamp with time zone');
	});

	it('parses character varying type', () => {
		const sql = `
      CREATE TABLE users (
        name character varying
      );
    `;

		const result = parsePostgresSQL(sql);

		expect(result.tables[0].columns[0].type).toBe('character varying');
	});

	it('parses types with length specifiers', () => {
		const sql = `
      CREATE TABLE users (
        name varchar(255),
        code char(2)
      );
    `;

		const result = parsePostgresSQL(sql);

		expect(result.tables[0].columns[0].type).toBe('varchar(255)');
		expect(result.tables[0].columns[1].type).toBe('char(2)');
	});

	it('parses array types', () => {
		const sql = `
      CREATE TABLE regions (
        codes varchar(5)[]
      );
    `;

		const result = parsePostgresSQL(sql);

		expect(result.tables[0].columns[0].type).toBe('varchar(5)[]');
	});

	it('parses integer array types', () => {
		const sql = `
      CREATE TABLE data (
        values integer[]
      );
    `;

		const result = parsePostgresSQL(sql);

		expect(result.tables[0].columns[0].type).toBe('integer[]');
	});

	it('handles columns with NOT NULL', () => {
		const sql = `
      CREATE TABLE users (
        id integer not null,
        name text
      );
    `;

		const result = parsePostgresSQL(sql);

		expect(result.tables[0].columns[0].type).toBe('integer');
		expect(result.tables[0].columns[1].type).toBe('text');
	});

	it('handles columns with DEFAULT', () => {
		const sql = `
      CREATE TABLE users (
        created_at timestamp with time zone default now(),
        active boolean default true
      );
    `;

		const result = parsePostgresSQL(sql);

		expect(result.tables[0].columns[0].type).toBe('timestamp with time zone');
		expect(result.tables[0].columns[1].type).toBe('boolean');
	});

	it('handles GENERATED ALWAYS AS IDENTITY', () => {
		const sql = `
      CREATE TABLE users (
        id integer generated always as identity
      );
    `;

		const result = parsePostgresSQL(sql);

		expect(result.tables[0].columns[0].type).toBe('integer');
	});

	it('handles bigint with GENERATED ALWAYS AS IDENTITY', () => {
		const sql = `
      CREATE TABLE assets (
        id bigint generated always as identity
      );
    `;

		const result = parsePostgresSQL(sql);

		expect(result.tables[0].columns[0].type).toBe('bigint');
	});

	it('handles complex DEFAULT expressions', () => {
		const sql = `
      CREATE TABLE users (
        metadata jsonb default '{}'::jsonb not null
      );
    `;

		const result = parsePostgresSQL(sql);

		expect(result.tables[0].columns[0].type).toBe('jsonb');
	});

	it('resolves primary keys via ALTER TABLE', () => {
		const sql = `
      CREATE TABLE users (
        id integer,
        name text
      );
      ALTER TABLE users ADD PRIMARY KEY (id);
    `;

		const result = parsePostgresSQL(sql);

		expect(result.tables[0].columns[0].isPrimaryKey).toBe(true);
		expect(result.tables[0].columns[1].isPrimaryKey).toBe(false);
	});

	it('resolves primary keys for schema-qualified tables', () => {
		const sql = `
      CREATE TABLE myschema.users (
        id integer,
        name text
      );
      ALTER TABLE myschema.users ADD PRIMARY KEY (id);
    `;

		const result = parsePostgresSQL(sql);

		expect(result.tables[0].columns[0].isPrimaryKey).toBe(true);
	});

	it('resolves primary keys for quoted identifiers', () => {
		const sql = `
      CREATE TABLE contract."grant" (
        id integer,
        name text
      );
      ALTER TABLE contract."grant" ADD PRIMARY KEY (id);
    `;

		const result = parsePostgresSQL(sql);

		expect(result.tables[0].columns[0].isPrimaryKey).toBe(true);
	});

	it('parses multiple tables', () => {
		const sql = `
      CREATE TABLE users (id integer);
      CREATE TABLE posts (id integer, user_id integer);
    `;

		const result = parsePostgresSQL(sql);

		expect(result.tables).toHaveLength(2);
		expect(result.tables[0].name).toBe('users');
		expect(result.tables[1].name).toBe('posts');
	});

	it('ignores non-table statements', () => {
		const sql = `
      CREATE SCHEMA myschema;
      CREATE TABLE users (id integer);
      ALTER SYSTEM SET timezone = 'UTC';
      SELECT pg_reload_conf();
    `;

		const result = parsePostgresSQL(sql);

		expect(result.tables).toHaveLength(1);
		expect(result.tables[0].name).toBe('users');
	});

	it('recovers from parse errors', () => {
		const sql = `
      CREATE TABLE broken (
        id integer,,,,
      );
      CREATE TABLE valid (id integer);
    `;

		const result = parsePostgresSQL(sql);

		// Should still parse the valid table
		expect(result.tables.some((t) => t.name === 'valid')).toBe(true);
	});

	it('handles timestamptz alias', () => {
		const sql = `
      CREATE TABLE events (
        created_at timestamptz
      );
    `;

		const result = parsePostgresSQL(sql);

		expect(result.tables[0].columns[0].type).toBe('timestamptz');
	});

	it('handles IF NOT EXISTS', () => {
		const sql = `
      CREATE TABLE IF NOT EXISTS users (id integer);
    `;

		const result = parsePostgresSQL(sql);

		expect(result.tables).toHaveLength(1);
		expect(result.tables[0].name).toBe('users');
	});

	it('skips table-level constraints', () => {
		const sql = `
      CREATE TABLE users (
        id integer,
        name text,
        PRIMARY KEY (id),
        UNIQUE (name)
      );
    `;

		const result = parsePostgresSQL(sql);

		expect(result.tables[0].columns).toHaveLength(2);
		expect(result.tables[0].columns[0].name).toBe('id');
		expect(result.tables[0].columns[1].name).toBe('name');
	});
});

describe('parsePostgresSQL with contracts.sql patterns', () => {
	it('parses asset.asset table pattern', () => {
		const sql = `
      CREATE TABLE asset.asset (
        id bigint generated always as identity,
        name text not null,
        quantity integer default 100 not null,
        created_at timestamp with time zone default now() not null,
        system_metadata jsonb default '{}'::jsonb not null
      );
      ALTER TABLE asset.asset ADD PRIMARY KEY (id);
    `;

		const result = parsePostgresSQL(sql);

		expect(result.tables).toHaveLength(1);
		const table = result.tables[0];
		expect(table.qualifiedName).toBe('asset.asset');
		expect(table.columns).toHaveLength(5);

		expect(table.columns[0]).toMatchObject({ name: 'id', type: 'bigint', isPrimaryKey: true });
		expect(table.columns[1]).toMatchObject({ name: 'name', type: 'text' });
		expect(table.columns[2]).toMatchObject({ name: 'quantity', type: 'integer' });
		expect(table.columns[3]).toMatchObject({ name: 'created_at', type: 'timestamp with time zone' });
		expect(table.columns[4]).toMatchObject({ name: 'system_metadata', type: 'jsonb' });
	});

	it('parses contract.region with varchar array', () => {
		const sql = `
      CREATE TABLE contract.region (
        id integer generated always as identity,
        name text not null,
        country_codes_az_uq varchar(5)[] not null
      );
      ALTER TABLE contract.region ADD PRIMARY KEY (id);
    `;

		const result = parsePostgresSQL(sql);

		const table = result.tables[0];
		expect(table.columns[2]).toMatchObject({
			name: 'country_codes_az_uq',
			type: 'varchar(5)[]'
		});
	});

	it('parses contract.date_type with char(2)', () => {
		const sql = `
      CREATE TABLE contract.date_type (
        id integer generated always as identity,
        name text not null,
        kind char(2) not null
      );
    `;

		const result = parsePostgresSQL(sql);

		expect(result.tables[0].columns[2]).toMatchObject({
			name: 'kind',
			type: 'char(2)'
		});
	});
});
