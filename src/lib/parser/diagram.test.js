import { describe, it, expect } from 'vitest';
import {
  stripJsonComments,
  parseDiagramFile,
  resolveDiagramTables,
  serializeDiagramFile,
  resolveRelation,
} from './diagram.js';

describe('stripJsonComments', () => {
  it('returns content unchanged when no comments', () => {
    const input = '{"foo": "bar"}';
    expect(stripJsonComments(input)).toBe(input);
  });

  it('strips line comments', () => {
    const input = `{
  // this is a comment
  "foo": "bar"
}`;
    const result = stripJsonComments(input);
    expect(result).not.toContain('// this is a comment');
    expect(result).toContain('"foo": "bar"');
  });

  it('strips block comments', () => {
    const input = `{
  /* this is a
     block comment */
  "foo": "bar"
}`;
    const result = stripJsonComments(input);
    expect(result).not.toContain('block comment');
    expect(result).toContain('"foo": "bar"');
  });

  it('preserves strings containing //', () => {
    const input = '{"url": "https://example.com"}';
    expect(stripJsonComments(input)).toBe(input);
  });

  it('preserves strings containing /*', () => {
    const input = '{"pattern": "/* comment */"}';
    expect(stripJsonComments(input)).toBe(input);
  });

  it('handles escaped quotes inside strings', () => {
    const input = '{"text": "say \\"hello\\""}';
    expect(stripJsonComments(input)).toBe(input);
  });

  it('handles comment after string value', () => {
    const input = '{"foo": "bar" // inline comment\n}';
    const result = stripJsonComments(input);
    expect(result).toContain('"foo": "bar"');
    expect(result).not.toContain('inline comment');
  });

  it('handles multiple line comments', () => {
    const input = `{
  // comment 1
  "a": 1,
  // comment 2
  "b": 2
}`;
    const result = stripJsonComments(input);
    expect(result).not.toContain('comment 1');
    expect(result).not.toContain('comment 2');
    expect(result).toContain('"a": 1');
    expect(result).toContain('"b": 2');
  });

  it('handles nested block comments gracefully', () => {
    const input = '{"x": 1 /* outer /* inner */ }';
    const result = stripJsonComments(input);
    // Block comment ends at first */, rest is kept
    expect(result).toContain('"x": 1');
  });

  it('preserves newlines in block comments for line number tracking', () => {
    const input = `{
  /* line 2
     line 3
     line 4 */
  "foo": "bar"
}`;
    const result = stripJsonComments(input);
    // Should have same number of lines
    expect(result.split('\n').length).toBe(input.split('\n').length);
  });
});

describe('parseDiagramFile', () => {
  it('parses valid diagram file', () => {
    const content = `{
  "sql": "schema.sql",
  "diagrams": [
    {
      "id": "main",
      "title": "Main Diagram",
      "tables": [
        { "name": "public.users", "x": 100, "y": 200 }
      ]
    }
  ]
}`;
    const { data, errors } = parseDiagramFile(content);

    expect(errors).toHaveLength(0);
    expect(data).not.toBeNull();
    expect(data?.sql).toBe('schema.sql');
    expect(data?.diagrams).toHaveLength(1);
    expect(data?.diagrams[0].id).toBe('main');
    expect(data?.diagrams[0].title).toBe('Main Diagram');
    expect(data?.diagrams[0].tables).toHaveLength(1);
  });

  it('parses JSONC with comments', () => {
    const content = `{
  // Path to SQL schema
  "sql": "schema.sql",
  "diagrams": [
    {
      "id": "main",
      "title": "Main",
      /* Core tables */
      "tables": []
    }
  ]
}`;
    const { data, errors } = parseDiagramFile(content);

    expect(errors).toHaveLength(0);
    expect(data?.sql).toBe('schema.sql');
  });

  it('reports missing sql field', () => {
    const content = '{"diagrams": []}';
    const { data, errors } = parseDiagramFile(content);

    expect(data).toBeNull();
    expect(errors.some((e) => e.message.includes('"sql"'))).toBe(true);
  });

  it('reports missing diagrams field', () => {
    const content = '{"sql": "schema.sql"}';
    const { data, errors } = parseDiagramFile(content);

    expect(data).toBeNull();
    expect(errors.some((e) => e.message.includes('"diagrams"'))).toBe(true);
  });

  it('reports invalid JSON', () => {
    const content = '{ invalid json }';
    const { data, errors } = parseDiagramFile(content);

    expect(data).toBeNull();
    expect(errors.some((e) => e.message.includes('parse error'))).toBe(true);
  });

  it('reports empty sql field', () => {
    const content = '{"sql": "", "diagrams": []}';
    const { data, errors } = parseDiagramFile(content);

    expect(data).toBeNull();
    expect(errors.some((e) => e.message.includes('cannot be empty'))).toBe(true);
  });

  it('reports missing diagram id', () => {
    const content = `{
  "sql": "schema.sql",
  "diagrams": [{ "title": "Test", "tables": [] }]
}`;
    const { data, errors } = parseDiagramFile(content);

    expect(data).toBeNull();
    expect(errors.some((e) => e.message.includes('"id"'))).toBe(true);
  });

  it('reports missing diagram title', () => {
    const content = `{
  "sql": "schema.sql",
  "diagrams": [{ "id": "test", "tables": [] }]
}`;
    const { data, errors } = parseDiagramFile(content);

    expect(data).toBeNull();
    expect(errors.some((e) => e.message.includes('"title"'))).toBe(true);
  });

  it('reports missing diagram tables', () => {
    const content = `{
  "sql": "schema.sql",
  "diagrams": [{ "id": "test", "title": "Test" }]
}`;
    const { data, errors } = parseDiagramFile(content);

    expect(data).toBeNull();
    expect(errors.some((e) => e.message.includes('"tables"'))).toBe(true);
  });

  it('reports duplicate diagram ids', () => {
    const content = `{
  "sql": "schema.sql",
  "diagrams": [
    { "id": "main", "title": "First", "tables": [] },
    { "id": "main", "title": "Second", "tables": [] }
  ]
}`;
    const { data, errors } = parseDiagramFile(content);

    expect(data).toBeNull();
    expect(errors.some((e) => e.message.includes('duplicate'))).toBe(true);
  });

  it('reports missing table name', () => {
    const content = `{
  "sql": "schema.sql",
  "diagrams": [
    { "id": "main", "title": "Test", "tables": [{ "x": 100 }] }
  ]
}`;
    const { data, errors } = parseDiagramFile(content);

    expect(data).toBeNull();
    expect(errors.some((e) => e.message.includes('"name"'))).toBe(true);
  });

  it('reports invalid x coordinate type', () => {
    const content = `{
  "sql": "schema.sql",
  "diagrams": [
    { "id": "main", "title": "Test", "tables": [{ "name": "public.t", "x": "100" }] }
  ]
}`;
    const { data, errors } = parseDiagramFile(content);

    expect(data).toBeNull();
    expect(errors.some((e) => e.message.includes('.x'))).toBe(true);
  });

  it('parses table with optional fields', () => {
    const content = `{
  "sql": "schema.sql",
  "diagrams": [
    {
      "id": "main",
      "title": "Test",
      "tables": [
        { "id": "u", "name": "public.users", "x": 100, "y": 200, "color": "#3b82f6" }
      ]
    }
  ]
}`;
    const { data, errors } = parseDiagramFile(content);

    expect(errors).toHaveLength(0);
    expect(data?.diagrams[0].tables[0]).toMatchObject({
      id: 'u',
      name: 'public.users',
      x: 100,
      y: 200,
      color: '#3b82f6',
    });
  });

  it('parses wildcard table entries', () => {
    const content = `{
  "sql": "schema.sql",
  "diagrams": [
    {
      "id": "main",
      "title": "Test",
      "tables": [
        { "name": "public.*" },
        { "name": "contract.prefix*" },
        { "name": "*" }
      ]
    }
  ]
}`;
    const { data, errors } = parseDiagramFile(content);

    expect(errors).toHaveLength(0);
    expect(data?.diagrams[0].tables).toHaveLength(3);
  });
});

describe('resolveDiagramTables', () => {
  const tables = [
    { qualifiedName: 'public.users', schema: 'public', name: 'users', columns: [] },
    { qualifiedName: 'public.posts', schema: 'public', name: 'posts', columns: [] },
    { qualifiedName: 'contract.contract', schema: 'contract', name: 'contract', columns: [] },
    { qualifiedName: 'contract.scope', schema: 'contract', name: 'scope', columns: [] },
  ];

  it('resolves explicit entries with positions', () => {
    const diagram = {
      id: 'main',
      title: 'Main',
      tables: [{ name: 'public.users', x: 100, y: 200 }],
    };

    const { resolved, errors } = resolveDiagramTables(diagram, tables);

    expect(errors).toHaveLength(0);
    expect(resolved).toHaveLength(1);
    expect(resolved[0]).toMatchObject({
      qualifiedName: 'public.users',
      x: 100,
      y: 200,
      fromWildcard: false,
    });
  });

  it('resolves explicit entries without positions', () => {
    const diagram = {
      id: 'main',
      title: 'Main',
      tables: [{ name: 'public.users' }],
    };

    const { resolved, errors } = resolveDiagramTables(diagram, tables);

    expect(errors).toHaveLength(0);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].qualifiedName).toBe('public.users');
    expect(typeof resolved[0].x).toBe('number');
    expect(typeof resolved[0].y).toBe('number');
  });

  it('expands schema.* wildcard', () => {
    const diagram = {
      id: 'main',
      title: 'Main',
      tables: [{ name: 'contract.*' }],
    };

    const { resolved, errors } = resolveDiagramTables(diagram, tables);

    expect(errors).toHaveLength(0);
    expect(resolved).toHaveLength(2);
    const names = resolved.map((r) => r.qualifiedName);
    expect(names).toContain('contract.contract');
    expect(names).toContain('contract.scope');
    expect(resolved.every((r) => r.fromWildcard)).toBe(true);
  });

  it('expands * global wildcard', () => {
    const diagram = {
      id: 'main',
      title: 'Main',
      tables: [{ name: '*' }],
    };

    const { resolved, errors } = resolveDiagramTables(diagram, tables);

    expect(errors).toHaveLength(0);
    expect(resolved).toHaveLength(4);
  });

  it('expands prefix* wildcard', () => {
    const diagram = {
      id: 'main',
      title: 'Main',
      tables: [{ name: 'con*' }],
    };

    const { resolved, errors } = resolveDiagramTables(diagram, tables);

    expect(errors).toHaveLength(0);
    expect(resolved).toHaveLength(2);
    const names = resolved.map((r) => r.qualifiedName);
    expect(names).toContain('contract.contract');
    expect(names).toContain('contract.scope');
  });

  it('expands schema.prefix* wildcard', () => {
    const diagram = {
      id: 'main',
      title: 'Main',
      tables: [{ name: 'contract.sco*' }],
    };

    const { resolved, errors } = resolveDiagramTables(diagram, tables);

    expect(errors).toHaveLength(0);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].qualifiedName).toBe('contract.scope');
  });

  it('explicit entries override wildcards', () => {
    const diagram = {
      id: 'main',
      title: 'Main',
      tables: [
        { name: 'contract.*' },
        { name: 'contract.contract', x: 500, y: 600 },
      ],
    };

    const { resolved, errors } = resolveDiagramTables(diagram, tables);

    expect(errors).toHaveLength(0);
    expect(resolved).toHaveLength(2);

    const contractEntry = resolved.find((r) => r.qualifiedName === 'contract.contract');
    expect(contractEntry?.x).toBe(500);
    expect(contractEntry?.y).toBe(600);
    expect(contractEntry?.fromWildcard).toBe(false);

    const scopeEntry = resolved.find((r) => r.qualifiedName === 'contract.scope');
    expect(scopeEntry?.fromWildcard).toBe(true);
  });

  it('reports missing table', () => {
    const diagram = {
      id: 'main',
      title: 'Main',
      tables: [{ name: 'public.nonexistent' }],
    };

    const { resolved, errors } = resolveDiagramTables(diagram, tables);

    expect(resolved).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('not found');
  });

  it('reports empty wildcard match', () => {
    const diagram = {
      id: 'main',
      title: 'Main',
      tables: [{ name: 'nonexistent.*' }],
    };

    const { resolved, errors } = resolveDiagramTables(diagram, tables);

    expect(resolved).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('No tables found');
  });

  it('preserves existing positions on refresh', () => {
    const diagram = {
      id: 'main',
      title: 'Main',
      tables: [{ name: 'public.users', x: 100, y: 200 }],
    };
    const existingPositions = new Map([['public.users', { x: 999, y: 888 }]]);

    const { resolved } = resolveDiagramTables(diagram, tables, existingPositions);

    expect(resolved[0].x).toBe(999);
    expect(resolved[0].y).toBe(888);
  });

  it('preserves id and color from entry', () => {
    const diagram = {
      id: 'main',
      title: 'Main',
      tables: [{ id: 'u', name: 'public.users', x: 100, y: 200, color: '#ff0000' }],
    };

    const { resolved } = resolveDiagramTables(diagram, tables);

    expect(resolved[0].id).toBe('u');
    expect(resolved[0].color).toBe('#ff0000');
  });

  it('tracks original pattern for wildcard matches', () => {
    const diagram = {
      id: 'main',
      title: 'Main',
      tables: [{ name: 'public.*' }],
    };

    const { resolved } = resolveDiagramTables(diagram, tables);

    expect(resolved.every((r) => r.originalPattern === 'public.*')).toBe(true);
  });
});

describe('serializeDiagramFile', () => {
  const tables = [
    { qualifiedName: 'public.users', schema: 'public', name: 'users', columns: [] },
    { qualifiedName: 'public.posts', schema: 'public', name: 'posts', columns: [] },
    { qualifiedName: 'contract.contract', schema: 'contract', name: 'contract', columns: [] },
    { qualifiedName: 'contract.scope', schema: 'contract', name: 'scope', columns: [] },
  ];

  it('serializes valid JSON', () => {
    const diagramFile = {
      sql: 'schema.sql',
      diagrams: [
        { id: 'main', title: 'Main', tables: [{ name: 'public.users', x: 100, y: 200 }] },
      ],
    };
    const nodePositions = new Map([['public.users', { x: 150, y: 250 }]]);

    const result = serializeDiagramFile(diagramFile, 'main', nodePositions, tables);
    const parsed = JSON.parse(result);

    expect(parsed.sql).toBe('schema.sql');
    expect(parsed.diagrams).toHaveLength(1);
  });

  it('updates positions for selected diagram', () => {
    const diagramFile = {
      sql: 'schema.sql',
      diagrams: [
        { id: 'main', title: 'Main', tables: [{ name: 'public.users', x: 100, y: 200 }] },
      ],
    };
    const nodePositions = new Map([['public.users', { x: 150.7, y: 250.3 }]]);

    const result = serializeDiagramFile(diagramFile, 'main', nodePositions, tables);
    const parsed = JSON.parse(result);

    expect(parsed.diagrams[0].tables[0].x).toBe(151); // Rounded
    expect(parsed.diagrams[0].tables[0].y).toBe(250);
  });

  it('preserves non-selected diagram positions', () => {
    const diagramFile = {
      sql: 'schema.sql',
      diagrams: [
        { id: 'first', title: 'First', tables: [{ name: 'public.users', x: 100, y: 200 }] },
        { id: 'second', title: 'Second', tables: [{ name: 'public.users', x: 500, y: 600 }] },
      ],
    };
    const nodePositions = new Map([['public.users', { x: 150, y: 250 }]]);

    const result = serializeDiagramFile(diagramFile, 'first', nodePositions, tables);
    const parsed = JSON.parse(result);

    // First diagram updated
    expect(parsed.diagrams[0].tables[0].x).toBe(150);
    // Second diagram preserved
    expect(parsed.diagrams[1].tables[0].x).toBe(500);
  });

  it('preserves wildcards and adds explicit positions', () => {
    const diagramFile = {
      sql: 'schema.sql',
      diagrams: [
        { id: 'main', title: 'Main', tables: [{ name: 'contract.*' }] },
      ],
    };
    const nodePositions = new Map([
      ['contract.contract', { x: 100, y: 200 }],
      ['contract.scope', { x: 300, y: 400 }],
    ]);

    const result = serializeDiagramFile(diagramFile, 'main', nodePositions, tables);
    const parsed = JSON.parse(result);

    const tableEntries = parsed.diagrams[0].tables;
    expect(tableEntries[0].name).toBe('contract.*'); // Wildcard preserved
    expect(tableEntries.find((t) => t.name === 'contract.contract')).toMatchObject({ x: 100, y: 200 });
    expect(tableEntries.find((t) => t.name === 'contract.scope')).toMatchObject({ x: 300, y: 400 });
  });

  it('does not duplicate explicit entries when expanding wildcards', () => {
    const diagramFile = {
      sql: 'schema.sql',
      diagrams: [
        {
          id: 'main',
          title: 'Main',
          tables: [
            { name: 'contract.*' },
            { id: 'c', name: 'contract.contract', x: 500, y: 600, color: '#ff0000' },
          ],
        },
      ],
    };
    const nodePositions = new Map([
      ['contract.contract', { x: 500, y: 600 }],
      ['contract.scope', { x: 300, y: 400 }],
    ]);

    const result = serializeDiagramFile(diagramFile, 'main', nodePositions, tables);
    const parsed = JSON.parse(result);

    const contractEntries = parsed.diagrams[0].tables.filter((t) => t.name === 'contract.contract');
    expect(contractEntries).toHaveLength(1);
    expect(contractEntries[0].id).toBe('c');
    expect(contractEntries[0].color).toBe('#ff0000');
  });

  it('preserves optional notes and arrows', () => {
    const diagramFile = {
      sql: 'schema.sql',
      diagrams: [
        {
          id: 'main',
          title: 'Main',
          tables: [{ name: 'public.users', x: 100, y: 200 }],
          notes: [{ id: 'n1', text: 'Test note' }],
          arrows: [{ from: 'u', to: 'n1' }],
        },
      ],
    };
    const nodePositions = new Map([['public.users', { x: 150, y: 250 }]]);

    const result = serializeDiagramFile(diagramFile, 'main', nodePositions, tables);
    const parsed = JSON.parse(result);

    expect(parsed.diagrams[0].notes).toEqual([{ id: 'n1', text: 'Test note' }]);
    expect(parsed.diagrams[0].arrows).toEqual([{ from: 'u', to: 'n1' }]);
  });

  it('preserves table id and color on update', () => {
    const diagramFile = {
      sql: 'schema.sql',
      diagrams: [
        {
          id: 'main',
          title: 'Main',
          tables: [{ id: 'u', name: 'public.users', x: 100, y: 200, color: '#3b82f6' }],
        },
      ],
    };
    const nodePositions = new Map([['public.users', { x: 150, y: 250 }]]);

    const result = serializeDiagramFile(diagramFile, 'main', nodePositions, tables);
    const parsed = JSON.parse(result);

    expect(parsed.diagrams[0].tables[0]).toMatchObject({
      id: 'u',
      name: 'public.users',
      x: 150,
      y: 250,
      color: '#3b82f6',
    });
  });

  it('roundtrip preserves structure', () => {
    const original = `{
  "sql": "schema.sql",
  "diagrams": [
    {
      "id": "main",
      "title": "Main",
      "tables": [
        { "name": "public.users", "x": 100, "y": 200 }
      ]
    }
  ]
}`;
    const { data } = parseDiagramFile(original);
    const nodePositions = new Map([['public.users', { x: 100, y: 200 }]]);

    const serialized = serializeDiagramFile(data, 'main', nodePositions, tables);
    const { data: reparsed, errors } = parseDiagramFile(serialized);

    expect(errors).toHaveLength(0);
    expect(reparsed?.sql).toBe(data?.sql);
    expect(reparsed?.diagrams[0].id).toBe(data?.diagrams[0].id);
    expect(reparsed?.diagrams[0].tables[0].name).toBe(data?.diagrams[0].tables[0].name);
  });

  it('preserves relations array', () => {
    const diagramFile = {
      sql: 'schema.sql',
      diagrams: [
        {
          id: 'main',
          title: 'Main',
          tables: [{ name: 'public.users', x: 100, y: 200 }],
          relations: [
            { from: '*.created_by', to: '*.user.id', visible: false },
            { from: '*.tenant_id', to: '*.tenant.id', line: 'dashed', color: '#9ca3af' },
          ],
        },
      ],
    };
    const nodePositions = new Map([['public.users', { x: 150, y: 250 }]]);

    const result = serializeDiagramFile(diagramFile, 'main', nodePositions, tables);
    const parsed = JSON.parse(result);

    expect(parsed.diagrams[0].relations).toEqual([
      { from: '*.created_by', to: '*.user.id', visible: false },
      { from: '*.tenant_id', to: '*.tenant.id', line: 'dashed', color: '#9ca3af' },
    ]);
  });
});

describe('parseDiagramFile relations validation', () => {
  it('parses valid relations', () => {
    const content = `{
  "sql": "schema.sql",
  "diagrams": [{
    "id": "main",
    "title": "Test",
    "tables": [],
    "relations": [
      { "from": "*.created_by", "to": "*.user.id", "visible": false },
      { "from": "*.order_id", "to": "*.orders.id", "color": "#22c55e" }
    ]
  }]
}`;
    const { data, errors } = parseDiagramFile(content);

    expect(errors).toHaveLength(0);
    expect(data?.diagrams[0].relations).toHaveLength(2);
  });

  it('reports missing from field', () => {
    const content = `{
  "sql": "schema.sql",
  "diagrams": [{
    "id": "main",
    "title": "Test",
    "tables": [],
    "relations": [{ "to": "*.user.id" }]
  }]
}`;
    const { data, errors } = parseDiagramFile(content);

    expect(data).toBeNull();
    expect(errors.some((e) => e.message.includes('"from"'))).toBe(true);
  });

  it('reports missing to field', () => {
    const content = `{
  "sql": "schema.sql",
  "diagrams": [{
    "id": "main",
    "title": "Test",
    "tables": [],
    "relations": [{ "from": "*.created_by" }]
  }]
}`;
    const { data, errors } = parseDiagramFile(content);

    expect(data).toBeNull();
    expect(errors.some((e) => e.message.includes('"to"'))).toBe(true);
  });

  it('reports invalid line value', () => {
    const content = `{
  "sql": "schema.sql",
  "diagrams": [{
    "id": "main",
    "title": "Test",
    "tables": [],
    "relations": [{ "from": "*.x", "to": "*.y", "line": "invalid" }]
  }]
}`;
    const { data, errors } = parseDiagramFile(content);

    expect(data).toBeNull();
    expect(errors.some((e) => e.message.includes('solid'))).toBe(true);
  });

  it('accepts all valid line values', () => {
    const content = `{
  "sql": "schema.sql",
  "diagrams": [{
    "id": "main",
    "title": "Test",
    "tables": [],
    "relations": [
      { "from": "*.a", "to": "*.b", "line": "solid" },
      { "from": "*.c", "to": "*.d", "line": "dashed" },
      { "from": "*.e", "to": "*.f", "visible": false }
    ]
  }]
}`;
    const { data, errors } = parseDiagramFile(content);

    expect(errors).toHaveLength(0);
    expect(data?.diagrams[0].relations).toHaveLength(3);
  });
});

describe('resolveRelation', () => {
  it('returns default styling when no rules match', () => {
    const fk = {
      sourceTable: 'public.orders',
      sourceColumn: 'user_id',
      targetTable: 'public.users',
      targetColumn: 'id',
    };

    const result = resolveRelation(fk, []);

    expect(result).toEqual({ hidden: false });
  });

  it('matches exact column pattern', () => {
    const fk = {
      sourceTable: 'public.orders',
      sourceColumn: 'created_by',
      targetTable: 'public.users',
      targetColumn: 'id',
    };
    const relations = [
      { from: 'public.orders.created_by', to: 'public.users.id', visible: false },
    ];

    const result = resolveRelation(fk, relations);

    expect(result).toEqual({ hidden: true });
  });

  it('matches wildcard from pattern', () => {
    const fk = {
      sourceTable: 'public.orders',
      sourceColumn: 'created_by',
      targetTable: 'public.users',
      targetColumn: 'id',
    };
    const relations = [
      { from: '*.created_by', to: 'public.users.id', visible: false },
    ];

    const result = resolveRelation(fk, relations);

    expect(result).toEqual({ hidden: true });
  });

  it('matches wildcard to pattern', () => {
    const fk = {
      sourceTable: 'public.orders',
      sourceColumn: 'user_id',
      targetTable: 'public.users',
      targetColumn: 'id',
    };
    const relations = [
      { from: 'public.orders.user_id', to: '*.users.id', line: 'dashed' },
    ];

    const result = resolveRelation(fk, relations);

    expect(result).toEqual({ hidden: false, line: 'dashed' });
  });

  it('matches both wildcards', () => {
    const fk = {
      sourceTable: 'contract.orders',
      sourceColumn: 'created_by',
      targetTable: 'auth.users',
      targetColumn: 'id',
    };
    const relations = [
      { from: '*.created_by', to: '*.users.id', visible: false },
    ];

    const result = resolveRelation(fk, relations);

    expect(result).toEqual({ hidden: true });
  });

  it('returns color when specified', () => {
    const fk = {
      sourceTable: 'public.orders',
      sourceColumn: 'priority_id',
      targetTable: 'public.priority',
      targetColumn: 'id',
    };
    const relations = [
      { from: '*.priority_id', to: '*.priority.id', color: '#22c55e' },
    ];

    const result = resolveRelation(fk, relations);

    expect(result).toEqual({ hidden: false, line: 'solid', color: '#22c55e' });
  });

  it('returns dashed line with color', () => {
    const fk = {
      sourceTable: 'public.orders',
      sourceColumn: 'tenant_id',
      targetTable: 'public.tenant',
      targetColumn: 'id',
    };
    const relations = [
      { from: '*.tenant_id', to: '*.tenant.id', line: 'dashed', color: '#9ca3af' },
    ];

    const result = resolveRelation(fk, relations);

    expect(result).toEqual({ hidden: false, line: 'dashed', color: '#9ca3af' });
  });

  it('first matching rule wins', () => {
    const fk = {
      sourceTable: 'public.orders',
      sourceColumn: 'created_by',
      targetTable: 'public.users',
      targetColumn: 'id',
    };
    const relations = [
      { from: '*.created_by', to: '*', visible: false },
      { from: '*', to: '*.users.id', color: '#ff0000' },
    ];

    const result = resolveRelation(fk, relations);

    expect(result).toEqual({ hidden: true });
  });

  it('requires both from and to to match', () => {
    const fk = {
      sourceTable: 'public.orders',
      sourceColumn: 'created_by',
      targetTable: 'public.products',
      targetColumn: 'id',
    };
    const relations = [
      { from: '*.created_by', to: '*.users.id', visible: false },
    ];

    const result = resolveRelation(fk, relations);

    expect(result).toEqual({ hidden: false }); // No match because target is products, not users
  });

  it('matches suffix patterns', () => {
    const fk = {
      sourceTable: 'public.orders',
      sourceColumn: 'updated_by',
      targetTable: 'public.users',
      targetColumn: 'id',
    };
    const relations = [
      { from: '*_by', to: '*.id', visible: false },
    ];

    const result = resolveRelation(fk, relations);

    expect(result).toEqual({ hidden: true });
  });
});
