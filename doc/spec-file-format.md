# ERD-Pets File Format Specification

**Version:** 1.0

**File Extension:** `*.erd-pets.json` (JSONC — comments allowed)

## Overview

A diagram file references a single SQL schema file and contains one or more diagram definitions. Each diagram is a curated view of tables from that schema, with optional notes and custom arrows for annotations.

**Two file handles are required:**
- Diagram file (`.erd-pets.json`) — read/write
- SQL schema file (`.sql`) — read (write support planned for schema editing)

## Structure

```jsonc
{
  "sql": "string",                  // required path to schema SQL file (relative to diagram file)
  "diagrams": [                     // required, one or more diagrams
    {
      "id": "string",               // unique identifier within file
      "title": "string",            // display name
      "tables": [ ],                // required
      "relations": [ ],             // optional
      "notes": [ ],                 // optional
      "arrows": [ ]                 // optional
    }
  ]
}
```

## Tables

```jsonc
{ "id": "u", "name": "public.user", "x": 50, "y": 100, "color": "#3b82f6" }
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | no | For arrow references |
| `name` | string | yes | Fully qualified table name or wildcard pattern |
| `x`, `y` | number | no | Position in pixels; omit for auto-placement |
| `color` | string | no | Hex color for table header |
| `visible` | boolean | no | Whether table is visible (default: `true`) |

### Wildcards

Table names support wildcard patterns:
- `schema.*` — all tables in schema
- `schema.prefix*` — tables starting with prefix

Wildcards expand to matching tables at parse time. Tables matched by wildcards that lack explicit positions are auto-placed. Explicit entries override wildcard matches for the same table.

### Hiding Tables

Use `visible: false` to hide tables. This is useful with wildcards to show most tables but exclude specific ones:

```jsonc
"tables": [
  { "name": "audit.*", "visible": false },  // Hide all audit tables
  { "name": "audit.important", "x": 100 },  // But show this one (explicit overrides wildcard)
  { "name": "*" }                           // Show all other tables
]
```

Precedence rules:
1. Explicit entries always win over wildcards
2. An explicit entry (even without `visible`) overrides a wildcard's `visible: false`

### Validation

- Tables listed in the diagram but not found in the SQL schema produce an error
- Errors are displayed persistently in the UI until resolved
- Duplicate table entries: warn and last entry wins

## Relations

Style or hide FK edges based on pattern matching. Each entry matches relationships by their source (`from`) and target (`to`) columns.

```jsonc
{ "from": "*.created_by", "to": "*.auth_user.id", "visible": false }
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `from` | string | yes | Glob pattern for source column (`schema.table.column`) |
| `to` | string | yes | Glob pattern for target column (`schema.table.column`) |
| `line` | string | no | `solid` (default), `dashed` |
| `color` | string | no | Line color (hex) |
| `visible` | boolean | no | Whether relation is visible (default: `true`) |

### Pattern Matching

Patterns match against the fully qualified column path: `schema.table.column`

- `*` matches any characters (including dots)
- `*.created_by` — any column named `created_by`
- `public.orders.*` — any column in `public.orders`
- `*.audit.*` — any column in any `audit` table

### Evaluation

- Relations are evaluated in order; first match wins
- If no relation matches, the FK edge renders with default styling
- Multiple relations can match different edges independently

### Examples

```jsonc
"relations": [
  // Hide all audit trail relationships
  { "from": "*.created_by", "to": "*.auth_user.id", "visible": false },
  { "from": "*.updated_by", "to": "*.auth_user.id", "visible": false },

  // De-emphasize tenant relationships
  { "from": "*.tenant_id", "to": "*.tenant.id", "line": "dashed", "color": "#9ca3af" },

  // Highlight important relationship
  { "from": "*.order_id", "to": "*.orders.id", "color": "#22c55e" }
]
```

## Notes

```jsonc
{ "id": "n1", "x": 50, "y": 250, "text": "TODO", "color": "#fef3c7" }
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | no | For arrow references |
| `x`, `y` | number | yes | Position in pixels |
| `text` | string | yes | Supports multiline |
| `color` | string | no | Background hex color |

## Arrows

Custom arrows connect any two entities (tables or notes) by `id`. These are for annotations only — foreign key relationships from the SQL schema are rendered automatically as separate edges.

```jsonc
{ "from": "u", "to": "n1", "label": "see note", "line": "dashed", "ends": "none" }
```

| Field | Type | Required | Values |
|-------|------|----------|--------|
| `from` | string | yes | Source entity id |
| `to` | string | yes | Target entity id |
| `label` | string | no | Text label |
| `line` | string | no | `solid` (default), `dashed` |
| `ends` | string | no | `end` (default), `both`, `none` |
| `color` | string | no | Line color (hex) |

**Ends:**
- `end` — arrow at target only →
- `both` — arrows at both ends ↔
- `none` — plain line, no arrows

## Edge Rendering

Two types of edges are rendered:

1. **FK edges** — Auto-generated from `FOREIGN KEY` constraints in the SQL schema. Arrow points from FK table toward referenced table. Only rendered when both endpoint tables are present in the diagram.

2. **Custom arrows** — Defined in the `arrows` array. Used for annotations (e.g., note pointing to a table, or indicating a logical relationship not expressed in SQL).

## File Loading

1. User opens a `.erd-pets.json` file via file picker
2. Parse the diagram file (JSONC)
3. Resolve the `sql` path relative to the diagram file location
4. Automatically open and parse the SQL schema file
5. Expand wildcards against the parsed schema
6. Report errors for tables not found in schema
7. Render the first diagram by default; diagram selector allows switching

## File Saving

When saving:
- Write updated positions and diagram metadata to the `.erd-pets.json` file
- Wildcards are preserved in output
- Auto-placed tables receive explicit coordinates after being positioned
- SQL file is not modified (until schema editing support is added)

## Example

```jsonc
// contracts.erd-pets.json
{
  "sql": "../schema.sql",
  "diagrams": [
    {
      "id": "main",
      "title": "Core Tables",
      "tables": [
        { "id": "u", "name": "public.user", "x": 50, "y": 100 },
        { "id": "r", "name": "public.role", "x": 300, "y": 100 },
        { "id": "ur", "name": "public.user_role", "x": 175, "y": 280 }
      ],
      "notes": [
        { "id": "n1", "x": 400, "y": 50, "text": "Junction table\nfor many-to-many" }
      ],
      "arrows": [
        { "from": "n1", "to": "ur", "line": "dashed", "ends": "none" }
      ]
    },
    {
      "id": "contracts",
      "title": "Contract Module",
      "tables": [
        { "name": "contract.*" },
        { "id": "c", "name": "contract.contract", "x": 100, "y": 50 }
      ],
      "relations": [
        { "from": "*.created_by", "to": "*.user.id", "visible": false },
        { "from": "*.updated_by", "to": "*.user.id", "visible": false }
      ]
    }
  ]
}
```

---

## Migration Plan

### Phase 1: New File Format Support

1. **JSONC Parser**
   - Add JSONC parsing (strip comments, then JSON.parse)
   - Validate against schema structure
   - Report parse errors clearly

2. **Dual File Handle Management**
   - Refactor `src/lib/file.js` to manage two file handles
   - Load flow: open diagram file → resolve SQL path → open SQL file
   - Track both handles for refresh/save operations

3. **Diagram File Parser** (`src/lib/parser/diagram.js`)
   - Parse diagram file structure
   - Expand wildcard patterns against schema
   - Validate table references against parsed SQL
   - Collect errors for missing tables

4. **Update UI Flow**
   - "Load Diagram" button (replaces "Load SQL")
   - Auto-load referenced SQL file
   - Diagram selector populated from `diagrams` array
   - Persistent error panel for validation errors

5. **Save Implementation**
   - Write diagram file with current positions
   - Preserve wildcards
   - Add coordinates to previously auto-placed tables

### Phase 2: Notes and Custom Arrows

1. **Note Nodes**
   - New `NoteNode` component
   - Draggable, editable text
   - Background color support

2. **Custom Arrow Rendering**
   - Render `arrows` array as edges
   - Support `line` style (solid/dashed)
   - Support `ends` variants
   - Labels on edges

3. **UI for Adding Notes/Arrows**
   - Context menu or toolbar to add notes
   - Drag to create arrows between entities

### Phase 3: Deprecate Old Format

1. **Migration Utility**
   - Detect `/* @erd-pets ... */` blocks in SQL files
   - Extract diagram definitions
   - Generate equivalent `.erd-pets.json` file
   - Optionally remove block from SQL file

2. **Remove Old Parser**
   - Delete `@erd-pets` block parsing code
   - Update documentation
