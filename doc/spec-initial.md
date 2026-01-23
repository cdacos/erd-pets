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
  - Unsupported browsers (Firefox, Safari) see an error message explaining the limitation

## File Format

A single SQL file containing both the schema and an `@erd-pets` block comment with diagram metadata:

```sql
/* @erd-pets
[main]
public.users 100 50
public.orders 400 50
public.orgs 100 200

[contracts]
contract.*
contract.contract 100 50
*/

create table public.users
(
    id       integer generated always as identity,
    email    varchar(255) not null,
    org_id   integer      not null
);

create table public.orders
(
    id      integer generated always as identity,
    user_id integer       not null,
    total   decimal(10,2)
);

create table public.orgs
(
    id   integer generated always as identity,
    name varchar(255) not null
);

create table contract.contract
(
    id      integer generated always as identity,
    user_id integer       not null,
    value   decimal(10,2)
);

alter table public.users add primary key (id);
alter table public.orders add primary key (id);
alter table public.orgs add primary key (id);
alter table contract.contract add primary key (id);

alter table public.users add foreign key (org_id) references public.orgs;
alter table public.orders add foreign key (user_id) references public.users;
alter table contract.contract add foreign key (user_id) references public.users;
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
- Coordinates are optional — missing coordinates trigger random placement (overlaps acceptable)
- Wildcards expand to matching tables at parse time, but the wildcard entry itself is preserved on save (catches new tables on next refresh)
- Explicit entries override wildcard matches for the same table (explicit position wins)
- Duplicate entries for the same table: warn and last entry wins
- Only tables listed (explicitly or via wildcard) are rendered
- Only relationships where both endpoint tables are present in the diagram are rendered
- If multiple `@erd-pets` blocks exist, warn and use the first one

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
- Default selection is the first diagram defined in the block
- One diagram rendered at a time
- If file has no `@erd-pets` block, show empty canvas (no diagrams defined)
- If a diagram's tables are all removed from the SQL, show empty canvas (diagram entry preserved)

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
- Initial canvas view centered on origin (0,0)

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
| 2 errors [expand]                        |
+------------------------------------------+
```

Note: Arrows point from FK table to referenced table.

### Error Reporting

- Errors panel at bottom of screen, collapsed by default
- Shows count of errors; click to expand
- Expanded view lists each error with context (e.g., line number, statement snippet)
- Errors persist until next Load or Refresh clears/replaces them

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
-- Table definitions (multi-line, with defaults and identity)
create table schema.tablename
(
    id              integer generated always as identity,
    name            text                                         not null,
    some_fk_id      integer                                      not null,
    created_at      timestamp with time zone default now()       not null,
    system_metadata jsonb                    default '{}'::jsonb not null
);

-- Primary keys (separate ALTER TABLE statement)
alter table schema.tablename
    add primary key (column);

-- Foreign keys (separate ALTER TABLE statement)
alter table schema.tablename
    add foreign key (column) references schema.other_table;
```

Column handling:
- Type is everything between column name and the first modifier keyword (`not null`, `default`, `generated`, etc.) or comma/closing paren
- Array types like `varchar(5)[]` must be captured correctly
- Ignore defaults, identity clauses, nullability — only the column name and type are needed for display

Requirements:
- Case-insensitive keywords (SQL is case-insensitive)
- Fully qualified table names in CREATE TABLE, ALTER TABLE, and REFERENCES
- Identifier case handling matches Postgres: unquoted identifiers fold to lowercase, quoted identifiers preserve case (e.g., `"Grant"` and `grant` are distinct)
- When FK target column is omitted, resolve to the target table's PK
- If FK target column is omitted and target table has no PK, report a parse error
- Tables without an explicit PK are valid (they just can't be FK targets without specifying the column)
- Only explicit `FOREIGN KEY` constraints create relationships (never infer from column names)
- Multi-pass parsing is acceptable (e.g., collect all tables/PKs first, then resolve FKs)
- Hand-rolled parser with unit tests (no external SQL parsing library)

Error handling:
- Parse errors do not abort parsing — log the error and continue with remaining statements
- Column parse errors skip the column but keep the table with remaining columns
- All errors are collected and surfaced in the UI (see Error Reporting below)

Ignore: schema creation, system commands, indexes, named constraints, CHECK, UNIQUE, comments, etc.

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
- May require a local server (e.g., `npx serve dist`) if File System Access API needs secure context

## Implementation Status

### Completed

**Project Setup**
- Svelte 5 + Vite project initialized
- @xyflow/svelte (Svelte Flow) integrated
- Vitest testing framework configured
- Build produces static files in `dist/`

**Canvas & Rendering**
- Full-screen Svelte Flow canvas with pan/zoom
- Custom `TableNode` component displaying:
  - Table name in header
  - Columns with types
  - PK indicator (yellow badge)
  - FK indicator (blue badge)
- Edge rendering between related tables
- MiniMap for orientation
- Zoom/pan controls

**UI Shell**
- Header toolbar with functional Load SQL, Refresh, Save buttons
- Refresh/Save disabled until a file is loaded
- Diagram selector dropdown (placeholder)
- Toast notifications for errors and success messages (`src/lib/Toast.svelte`)

**File Handling**
- File System Access API integration (`src/lib/file.js`)
- `showOpenFilePicker()` to open SQL files with `.sql` filter
- Direct write-back to the same file on Save
- Refresh re-reads file from disk
- Browser compatibility check with error message for unsupported browsers
- Tables displayed in grid layout (3 columns) after loading

**SQL Parsing [SQL]**
- Hand-rolled Postgres SQL parser (`src/lib/parser/`)
- Tokenizer with support for:
  - Keywords, identifiers (quoted and unquoted)
  - Proper case handling (unquoted fold to lowercase, quoted preserve case)
  - Numbers, strings, operators, punctuation
  - Line comments (`--`) and block comments (`/* */`)
  - Line number tracking for error reporting
- Parser extracts:
  - Table definitions from `CREATE TABLE` (schema, name, columns, types)
  - Primary keys from `ALTER TABLE ... ADD PRIMARY KEY`
  - Multi-word types (`timestamp with time zone`, `character varying`)
  - Array types (`varchar(5)[]`, `integer[]`)
  - Types with length specifiers (`varchar(255)`, `char(2)`)
- Error recovery: parse errors don't abort; continues with remaining statements
- Foreign key extraction from `ALTER TABLE ... ADD FOREIGN KEY`
- FK target column resolution to PK when not specified
- Error reporting when FK target has no PK
- 47 unit tests covering all major parsing scenarios
- Verified against `samples/contracts.sql` (16 tables, 15 FKs, 0 errors)

### Not Yet Implemented
- `@erd-pets` block parsing (positions currently ignored; save writes original SQL)
- Multiple diagrams support
- Error panel (currently using toast notifications)
