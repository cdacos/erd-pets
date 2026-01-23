# erd-pets

A browser-based ERD visualizer for hand-crafted database diagrams.

## Concept

Unlike auto-layout ERD tools, erd-pets lets you position tables exactly where you want them. Your schema and diagram layout live together in the same SQL file, which remains the source of truth.

The name plays on the DevOps "pets vs cattle" metaphor — these are diagrams you care for individually, not disposable generated output.

## Tech Stack

- **Svelte + Svelte Flow** for the UI
- Build to static files (deployable as a folder or single HTML)
- No backend — file handling via **File System Access API** (Chromium browsers only)
  - `showOpenFilePicker()` to open SQL files
  - Direct write-back to the same file on save
  - No download fallback — keeps implementation simple

## File Format

A single SQL file containing both the schema and an `@erd-pets` block comment with diagram metadata:

```sql
/* @erd-pets
[main]
public.users 100 50
public.orders 400 50
public.orgs 100 200

[contracts]
contracts.*
contracts.contract 100 50
*/

CREATE TABLE public.users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    org_id INT REFERENCES public.orgs(id)
);

CREATE TABLE public.orders (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES public.users(id),
    total DECIMAL(10,2)
);

CREATE TABLE public.orgs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255)
);

CREATE TABLE contracts.contract (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES public.users(id),
    value DECIMAL(10,2)
);
```

### Diagram Block Format

- Starts with `/* @erd-pets`
- Ends with `*/`
- Contains one or more named diagrams

### Diagram Entries

- `[diagram-name]` — required, groups entries below it
- `schema.table x y` — table with explicit position (pixels, top-left origin)
- `schema.table` — table with no position (random placement)
- `schema.*` — wildcard, includes all tables in schema (random placement)

### Rules

- Fully qualified table names required (`public.users`, not `users`)
- Coordinates are optional — missing coordinates trigger random placement
- Wildcards expand to matching tables at parse time, but the wildcard entry itself is preserved on save (catches new tables on next refresh)
- Explicit entries override wildcard matches for the same table (explicit position wins)
- Only tables listed (explicitly or via wildcard) are rendered
- Only relationships where both endpoint tables are present in the diagram are rendered

### Write Behavior

When saving:
- Find first `/* @erd-pets ... */` block and replace it
- If no block exists, prepend one to the file
- Wildcards are preserved in the output
- All tables receive explicit coordinates (randomly-placed tables get their current positions)

## Features (Phase 1)

### Load
- Single file picker: "Load SQL"
- Parse SQL to extract tables, columns, types, PKs, FKs
- Parse `@erd-pets` block to get diagrams and positions
- Error handling: surface parse errors clearly

### Diagram Selection
- Dropdown to select which diagram to view
- One diagram rendered at a time

### Render
- Each table is a Svelte Flow node showing:
  - Table name (header)
  - Columns with types
  - PK indicator
  - FK indicator
- Nodes auto-sized to content
- Edges (arrows) between tables based on REFERENCES clauses
- Arrow points from FK table toward referenced table (toward the PK)
- Edges are straight lines, center-to-center
- Edges render below tables (lower z-index)
- Self-referential FKs render as a visible loop (bezier curve exiting and re-entering the node)

### Edit
- Drag tables to reposition
- Pan and zoom the canvas
- Minimap for orientation

### Refresh
- "Refresh" button re-parses the SQL
- Preserves positions for existing tables
- Randomly places new tables matched by wildcards
- Removes tables no longer in SQL from the diagram

### Save
- "Save" button writes directly back to the open file
- Preserves original SQL content
- Updates `@erd-pets` block with current positions
- Wildcards remain; explicit coordinates added for all tables

## UI

Minimal interface:

```
+------------------------------------------+
| [Load SQL] [Refresh] [Save]    [v main ] |
+------------------------------------------+
|                                          |
|   +--------+          +--------+         |
|   | users  |--------->| orders |         |
|   +--------+          +--------+         |
|       |                                  |
|       v                                  |
|   +--------+                             |
|   | orgs   |                             |
|   +--------+                             |
|                                          |
|                            [minimap]     |
+------------------------------------------+
```

Note: Arrows point from FK table to referenced table.

## SQL Parsing

### Architecture

RDBMS-specific parsers convert SQL into a common internal schema format:

```
SQL File → [Postgres Parser] → Internal Schema → Diagram Renderer
                                     ↑
           [MySQL Parser] ──────────┘  (future)
```

The internal schema is explicit and unambiguous:
- Fully qualified table names (`schema.table`)
- Resolved PK columns per table
- Resolved FK relationships with explicit source and target columns

### Postgres Parser (Phase 1)

Handle these statement types:

```sql
-- Table definitions
CREATE TABLE schema.tablename (
    column_name TYPE,
    column_name TYPE NOT NULL,
    column_name TYPE DEFAULT value
);

-- Primary keys (separate statement)
ALTER TABLE schema.tablename ADD PRIMARY KEY (column);

-- Foreign keys (separate statement)
ALTER TABLE schema.tablename
    ADD FOREIGN KEY (column) REFERENCES schema.other_table;
```

Requirements:
- Fully qualified table names in CREATE TABLE, ALTER TABLE, and REFERENCES
- Handle quoted identifiers (e.g., `"grant"` for reserved words)
- When FK target column is omitted, resolve to the target table's PK
- Only explicit `FOREIGN KEY` constraints create relationships (never infer from column names)

Ignore: schema creation, system commands, indexes, named constraints, CHECK, UNIQUE, comments, etc.

Assume clean, consistent Postgres syntax. Additional syntax variations (inline constraints, SERIAL, etc.) will be added in future iterations.

## Phase 2 (future, out of scope for now)

- Add/remove tables from diagram via UI
- Virtual arrows (relationships not defined in SQL):
  ```
  ^schema.table.column -> schema.table.column "optional label"
  ^schema.table.column .> schema.table.column "optional label"
  ```
  - `^` prefix = virtual arrow
  - `->` = solid line, `.>` = dotted line
  - Quoted string = edge label
- Text notes with markdown:
  ```
  ~ 100 200 """
  ## Section Title
  Some explanatory text here.
  - bullet points
  - supported
  """
  ```
  - `~` prefix = text note
  - `x y` = position
  - Triple-quoted string = markdown content
- Grouping (visual boxes around related tables):
  ```
  [ 100 50 400 300 "core tables" ]
  [ 100 50 400 300 "core tables" #3b82f6 ]
  ```
  - `[ ... ]` = group box
  - `x y width height` = bounds
  - Quoted string = label
  - Optional `#rrggbb` = border/background color
- Optional RGB coloring for elements:
  ```
  schema.table 100 50 #ef4444
  ^a.t.col -> b.t.col "label" #22c55e
  ~ 100 200 #f59e0b """..."""
  ```
- Schema editing (add columns, change types, add FKs)
- Multiple diagrams open at once
- Crow's feet notation / cardinality indicators
- Orthogonal edge routing

## Deliverable

A buildable Svelte project that:
- `npm install` && `npm run dev` for development
- `npm run build` produces a `dist/` folder with static files
- Works by opening `dist/index.html` in a browser (no server required)
