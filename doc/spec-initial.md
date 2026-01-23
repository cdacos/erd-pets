# erd-pets

A browser-based ERD visualizer for hand-crafted database diagrams.

## Concept

Unlike auto-layout ERD tools, erd-pets lets you position tables exactly where you want them. Your schema stays in SQL (the source of truth), while diagram layout lives in a separate file you can version control.

The name plays on the DevOps "pets vs cattle" metaphor — these are diagrams you care for individually, not disposable generated output.

## Tech Stack

- **Svelte + Svelte Flow** for the UI
- Build to static files (deployable as a folder or single HTML)
- No backend — all file handling via browser File API

## File Format

### SQL Schema (input, read-only)

Standard Postgres DDL. The tool parses `CREATE TABLE` statements and `REFERENCES` clauses.

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    org_id INT REFERENCES orgs(id)
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    total DECIMAL(10,2)
);

CREATE TABLE orgs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255)
);
```

### Diagram File (input/output)

One file per diagram. Simple line-based format:

```
schema ./schema.sql
users 100 50
orders 400 50
orgs 100 200
```

- Line 1: path to schema file (informational — user still picks files manually)
- Remaining lines: `tablename x y`
- Only tables listed in the diagram file are rendered
- Coordinates are top-left of the table node

## Features (Phase 1)

### Load
- Two file pickers: "Load Schema" and "Load Diagram"
- Parse SQL to extract tables, columns, types, PKs, FKs
- Parse diagram file to get positions
- Error handling: surface parse errors clearly

### Render
- Each table is a Svelte Flow node showing:
  - Table name (header)
  - Columns with types
  - PK indicator
  - FK indicator
- Arrows between tables based on REFERENCES clauses
- Only render relationships where both tables are in the diagram

### Edit
- Drag tables to reposition
- Pan and zoom the canvas
- Minimap for orientation

### Export
- "Export Diagram" button
- Downloads updated diagram file with new coordinates
- Preserves the schema line

## UI

Keep it minimal:

```
+------------------------------------------+
| [Load Schema] [Load Diagram] [Export]    |
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

## SQL Parsing

Keep it simple. Handle:

```sql
CREATE TABLE tablename (
    column_name TYPE,
    column_name TYPE PRIMARY KEY,
    column_name TYPE REFERENCES other_table(column),
    column_name TYPE NOT NULL,
    PRIMARY KEY (column),
    FOREIGN KEY (column) REFERENCES other_table(column)
);
```

Ignore: indexes, constraints with names, CHECK, UNIQUE, comments, etc.

Assume clean, consistent Postgres syntax. Don't try to handle every edge case.

## Phase 2 (future, out of scope for now)

- Add/remove tables from diagram via UI
- Manual relations (arrows not defined in SQL)
- Schema editing (add columns, change types, add FKs)
- Multiple diagrams open at once

## Deliverable

A buildable Svelte project that:
- `npm install` → `npm run dev` for development
- `npm run build` produces a `dist/` folder with static files
- Works by opening `dist/index.html` in a browser (no server required)
