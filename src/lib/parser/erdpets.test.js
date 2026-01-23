import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractErdPetsBlock,
  parseErdPetsContent,
  parseErdPets,
  resolveDiagram,
  generateErdPetsContent,
  updateSqlWithErdPets,
} from './erdpets.js';

describe('extractErdPetsBlock', () => {
  it('extracts a single block', () => {
    const sql = `/* @erd-pets
[main]
public.users 100 200
*/
CREATE TABLE public.users (id integer);`;

    const result = extractErdPetsBlock(sql);

    expect(result).not.toBeNull();
    expect(result.content).toContain('[main]');
    expect(result.content).toContain('public.users 100 200');
    expect(result.startOffset).toBe(0);
    expect(result.endOffset).toBe(sql.indexOf('*/') + 2);
    expect(result.errors).toHaveLength(0);
  });

  it('returns null when no block found', () => {
    const sql = `CREATE TABLE public.users (id integer);`;

    const result = extractErdPetsBlock(sql);

    expect(result).toBeNull();
  });

  it('warns on multiple blocks and uses first', () => {
    const sql = `/* @erd-pets
[first]
public.a 10 20
*/
CREATE TABLE public.a (id integer);
/* @erd-pets
[second]
public.b 30 40
*/`;

    const result = extractErdPetsBlock(sql);

    expect(result).not.toBeNull();
    expect(result.content).toContain('[first]');
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain('Multiple @erd-pets blocks');
  });

  it('handles block at start of file', () => {
    const sql = `/* @erd-pets
[main]
*/
SELECT 1;`;

    const result = extractErdPetsBlock(sql);

    expect(result).not.toBeNull();
    expect(result.startOffset).toBe(0);
  });

  it('handles block in middle of file', () => {
    const sql = `CREATE TABLE x (id int);

/* @erd-pets
[main]
public.x 0 0
*/

SELECT 1;`;

    const result = extractErdPetsBlock(sql);

    expect(result).not.toBeNull();
    expect(result.startOffset).toBeGreaterThan(0);
  });

  it('handles block at end of file', () => {
    const sql = `SELECT 1;
/* @erd-pets
[main]
*/`;

    const result = extractErdPetsBlock(sql);

    expect(result).not.toBeNull();
    expect(result.endOffset).toBe(sql.length);
  });
});

describe('parseErdPetsContent', () => {
  it('parses single diagram with explicit entry', () => {
    const content = `
[main]
public.users 100 200
`;

    const result = parseErdPetsContent(content, 1);

    expect(result.diagrams).toHaveLength(1);
    expect(result.diagrams[0].name).toBe('main');
    expect(result.diagrams[0].entries).toHaveLength(1);
    expect(result.diagrams[0].entries[0]).toMatchObject({
      kind: 'explicit',
      pattern: 'public.users',
      x: 100,
      y: 200,
    });
    expect(result.errors).toHaveLength(0);
  });

  it('parses multiple diagrams', () => {
    const content = `
[diagram1]
public.a 10 20

[diagram2]
public.b 30 40
`;

    const result = parseErdPetsContent(content, 1);

    expect(result.diagrams).toHaveLength(2);
    expect(result.diagrams[0].name).toBe('diagram1');
    expect(result.diagrams[1].name).toBe('diagram2');
  });

  it('parses wildcard entries', () => {
    const content = `
[main]
contract.*
`;

    const result = parseErdPetsContent(content, 1);

    expect(result.diagrams[0].entries).toHaveLength(1);
    expect(result.diagrams[0].entries[0]).toMatchObject({
      kind: 'wildcard',
      pattern: 'contract.*',
    });
  });

  it('parses no-position entries', () => {
    const content = `
[main]
public.users
`;

    const result = parseErdPetsContent(content, 1);

    expect(result.diagrams[0].entries[0]).toMatchObject({
      kind: 'no-position',
      pattern: 'public.users',
    });
  });

  it('reports duplicate entries and uses last', () => {
    const content = `
[main]
public.users 100 200
public.users 300 400
`;

    const result = parseErdPetsContent(content, 1);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain('Duplicate entry');
    expect(result.diagrams[0].entries).toHaveLength(1);
    expect(result.diagrams[0].entries[0].x).toBe(300);
  });

  it('reports entry before diagram header', () => {
    const content = `
public.users 100 200
[main]
`;

    const result = parseErdPetsContent(content, 1);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain('before any [diagram] header');
  });

  it('handles empty lines', () => {
    const content = `

[main]

public.users 100 200

public.posts 300 400

`;

    const result = parseErdPetsContent(content, 1);

    expect(result.diagrams).toHaveLength(1);
    expect(result.diagrams[0].entries).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });

  it('reports invalid coordinates', () => {
    const content = `
[main]
public.users abc def
`;

    const result = parseErdPetsContent(content, 1);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain('Invalid coordinates');
    expect(result.diagrams[0].entries).toHaveLength(0);
  });

  it('reports invalid pattern format', () => {
    const content = `
[main]
users 100 200
`;

    const result = parseErdPetsContent(content, 1);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain('must be schema.table');
  });

  it('preserves line numbers for errors', () => {
    const content = `
[main]
public.users 100 200
bad_pattern
`;

    const result = parseErdPetsContent(content, 10);

    expect(result.errors[0].line).toBe(13); // 10 + 3 (0-indexed line 3 for "bad_pattern")
  });
});

describe('parseErdPets', () => {
  it('combines extraction and parsing', () => {
    const sql = `/* @erd-pets
[main]
public.users 100 200
*/
CREATE TABLE public.users (id integer);`;

    const result = parseErdPets(sql);

    expect(result).not.toBeNull();
    expect(result.diagrams).toHaveLength(1);
    expect(result.diagrams[0].entries).toHaveLength(1);
    expect(result.startOffset).toBe(0);
    expect(result.endOffset).toBeGreaterThan(0);
  });

  it('returns null when no block', () => {
    const sql = `CREATE TABLE public.users (id integer);`;

    const result = parseErdPets(sql);

    expect(result).toBeNull();
  });

  it('combines errors from extraction and parsing', () => {
    const sql = `/* @erd-pets
bad_pattern
*/
/* @erd-pets
[second]
*/`;

    const result = parseErdPets(sql);

    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});

describe('resolveDiagram', () => {
  const tables = [
    { qualifiedName: 'public.users', schema: 'public', name: 'users', columns: [] },
    { qualifiedName: 'public.posts', schema: 'public', name: 'posts', columns: [] },
    { qualifiedName: 'contract.contract', schema: 'contract', name: 'contract', columns: [] },
    { qualifiedName: 'contract.scope', schema: 'contract', name: 'scope', columns: [] },
  ];

  it('uses explicit positions', () => {
    const diagram = {
      name: 'main',
      entries: [{ kind: 'explicit', pattern: 'public.users', x: 100, y: 200, line: 1 }],
    };

    const result = resolveDiagram(diagram, tables);

    expect(result.resolved).toHaveLength(1);
    expect(result.resolved[0]).toEqual({
      qualifiedName: 'public.users',
      x: 100,
      y: 200,
    });
    expect(result.errors).toHaveLength(0);
  });

  it('expands wildcards', () => {
    const diagram = {
      name: 'main',
      entries: [{ kind: 'wildcard', pattern: 'contract.*', line: 1 }],
    };

    const result = resolveDiagram(diagram, tables);

    expect(result.resolved).toHaveLength(2);
    const names = result.resolved.map((r) => r.qualifiedName);
    expect(names).toContain('contract.contract');
    expect(names).toContain('contract.scope');
  });

  it('explicit overrides wildcard', () => {
    const diagram = {
      name: 'main',
      entries: [
        { kind: 'wildcard', pattern: 'contract.*', line: 1 },
        { kind: 'explicit', pattern: 'contract.contract', x: 500, y: 600, line: 2 },
      ],
    };

    const result = resolveDiagram(diagram, tables);

    // Should have 2 tables: contract.scope from wildcard, contract.contract from explicit
    expect(result.resolved).toHaveLength(2);

    const contractEntry = result.resolved.find((r) => r.qualifiedName === 'contract.contract');
    expect(contractEntry.x).toBe(500);
    expect(contractEntry.y).toBe(600);
  });

  it('reports missing table', () => {
    const diagram = {
      name: 'main',
      entries: [{ kind: 'explicit', pattern: 'public.nonexistent', x: 100, y: 200, line: 5 }],
    };

    const result = resolveDiagram(diagram, tables);

    expect(result.resolved).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain('not found');
    expect(result.errors[0].line).toBe(5);
  });

  it('preserves existing positions on refresh', () => {
    const diagram = {
      name: 'main',
      entries: [{ kind: 'explicit', pattern: 'public.users', x: 100, y: 200, line: 1 }],
    };
    const existingPositions = new Map([['public.users', { x: 999, y: 888 }]]);

    const result = resolveDiagram(diagram, tables, existingPositions);

    expect(result.resolved[0].x).toBe(999);
    expect(result.resolved[0].y).toBe(888);
  });

  it('reports empty schema for wildcard', () => {
    const diagram = {
      name: 'main',
      entries: [{ kind: 'wildcard', pattern: 'nonexistent.*', line: 3 }],
    };

    const result = resolveDiagram(diagram, tables);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain('No tables found');
    expect(result.errors[0].line).toBe(3);
  });

  it('generates random positions for no-position entries', () => {
    const diagram = {
      name: 'main',
      entries: [{ kind: 'no-position', pattern: 'public.users', line: 1 }],
    };

    const result = resolveDiagram(diagram, tables);

    expect(result.resolved).toHaveLength(1);
    expect(result.resolved[0].qualifiedName).toBe('public.users');
    expect(typeof result.resolved[0].x).toBe('number');
    expect(typeof result.resolved[0].y).toBe('number');
  });
});

describe('generateErdPetsContent', () => {
  it('generates correct format', () => {
    const diagrams = [
      {
        name: 'main',
        entries: [
          { kind: 'explicit', pattern: 'public.users', x: 100, y: 200, line: 1 },
          { kind: 'explicit', pattern: 'public.posts', x: 300, y: 400, line: 2 },
        ],
      },
    ];
    const nodePositions = new Map([
      ['public.users', { x: 150.5, y: 250.7 }],
      ['public.posts', { x: 350, y: 450 }],
    ]);

    const result = generateErdPetsContent(diagrams, nodePositions);

    expect(result).toContain('[main]');
    expect(result).toContain('public.users 151 251'); // Rounded
    expect(result).toContain('public.posts 350 450');
  });

  it('preserves wildcards', () => {
    const diagrams = [
      {
        name: 'main',
        entries: [
          { kind: 'wildcard', pattern: 'contract.*', line: 1 },
          { kind: 'explicit', pattern: 'public.users', x: 100, y: 200, line: 2 },
        ],
      },
    ];
    const nodePositions = new Map([['public.users', { x: 100, y: 200 }]]);

    const result = generateErdPetsContent(diagrams, nodePositions);

    expect(result).toContain('contract.*');
    expect(result).not.toContain('contract.* '); // No coordinates after wildcard
  });

  it('preserves original positions for entries not on canvas', () => {
    const diagrams = [
      {
        name: 'main',
        entries: [{ kind: 'explicit', pattern: 'public.other', x: 100, y: 200, line: 1 }],
      },
    ];
    const nodePositions = new Map(); // Empty - this diagram not currently displayed

    const result = generateErdPetsContent(diagrams, nodePositions);

    // Should preserve original position from entry
    expect(result).toContain('public.other 100 200');
  });

  it('writes no-position entries without coordinates when not on canvas', () => {
    const diagrams = [
      {
        name: 'main',
        entries: [{ kind: 'no-position', pattern: 'public.new', line: 1 }],
      },
    ];
    const nodePositions = new Map();

    const result = generateErdPetsContent(diagrams, nodePositions);

    expect(result).toContain('public.new');
    expect(result).not.toMatch(/public\.new \d/);
  });

  it('handles multiple diagrams', () => {
    const diagrams = [
      {
        name: 'first',
        entries: [{ kind: 'explicit', pattern: 'public.a', x: 0, y: 0, line: 1 }],
      },
      {
        name: 'second',
        entries: [{ kind: 'explicit', pattern: 'public.b', x: 0, y: 0, line: 1 }],
      },
    ];
    const nodePositions = new Map([
      ['public.a', { x: 10, y: 20 }],
      ['public.b', { x: 30, y: 40 }],
    ]);

    const result = generateErdPetsContent(diagrams, nodePositions);

    expect(result).toContain('[first]');
    expect(result).toContain('[second]');
  });
});

describe('updateSqlWithErdPets', () => {
  it('replaces existing block', () => {
    const sql = `/* @erd-pets
[old]
public.x 0 0
*/
CREATE TABLE t (id int);`;

    const existingBlock = {
      diagrams: [],
      errors: [],
      startOffset: 0,
      endOffset: sql.indexOf('*/') + 2,
    };

    const result = updateSqlWithErdPets(sql, '[new]\npublic.y 1 1', existingBlock);

    expect(result).toContain('[new]');
    expect(result).not.toContain('[old]');
    expect(result).toContain('CREATE TABLE t');
  });

  it('prepends when no existing block', () => {
    const sql = `CREATE TABLE t (id int);`;

    const result = updateSqlWithErdPets(sql, '[main]\npublic.t 0 0', null);

    expect(result.startsWith('/* @erd-pets')).toBe(true);
    expect(result).toContain('[main]');
    expect(result).toContain('CREATE TABLE t');
  });

  it('preserves content after block', () => {
    const sql = `SELECT 1;
/* @erd-pets
[main]
*/
CREATE TABLE t (id int);
SELECT 2;`;

    const start = sql.indexOf('/* @erd-pets');
    const end = sql.indexOf('*/\n') + 2;
    const existingBlock = {
      diagrams: [],
      errors: [],
      startOffset: start,
      endOffset: end,
    };

    const result = updateSqlWithErdPets(sql, '[updated]', existingBlock);

    expect(result).toContain('SELECT 1;');
    expect(result).toContain('CREATE TABLE t');
    expect(result).toContain('SELECT 2;');
    expect(result).toContain('[updated]');
  });
});
