# ERD Pets - Database Diagram Editor

Visual ERD editor that reads table definitions from SQL files.

Philosophy: Similarly to the DevOps "pets vs cattle" metaphor, these are diagrams you layout manually, not having to rely on layout engines that can't understand intent. Albeit some layout algorithms (hierarchical, circular) are available, their purpose is for initial layout, pending manual positioning. Auto-layout is applied separately to each schema, assuming that schemas already represent logical groupings of related tables.

*Please note:*

* *Chrome only* as the [File System Access](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access) API is not standardised yet.
* While functional for my specific use (PostgreSQL), this is still very much "beta" software! Primarily, more robust SQL parsing is needed.

## Install

```
npm install
```

## Run

```
npm run dev
```

## Usage

1. Click **New** to create a diagram from a SQL schema file
2. Or click **Open** to load an existing `.erd-pets.json` file
3. Drag tables to arrange them
4. Click **Save** (or `Cmd+S`) to persist positions
5. Click **Refresh** (or `Cmd+R`) to reload the SQL file after schema changes

## File Format

Diagrams are stored in `.erd-pets.json` files (JSONC with comments allowed):

```json
{
  "sql": "schema.sql",
  "diagrams": [
    {
      "id": "main",
      "title": "Core Tables",
      "tables": [
        { "name": "public.users", "x": 100, "y": 200, "color": "#3b82f6" },
        { "name": "public.posts", "x": 400, "y": 200 },
        { "name": "contract.*" }
      ]
    }
  ]
}
```

See [doc/spec-file-format.md](doc/spec-file-format.md) for the full specification, including wildcards, relations, notes, and arrows.
