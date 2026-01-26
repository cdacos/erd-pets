# ERD Pets - Database Diagram Editor

Visual ERD editor that reads table definitions from SQL files.

Philosophy: Similarly to the DevOps "pets vs cattle" metaphor, these are diagrams you layout manually, not having to rely on layout engines that can't understand intent. Albeit some layout algorithms (hierarchical, circular) are available, their intent is as an initial layout pending manual positioning.

*Please note:*

* *Chrome only* as the [File System Access](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access) API is not standardised yet.
* While functional for my specific use, this is still very much BETA software!

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

### Table Entries

| Format | Description |
|--------|-------------|
| `{ "name": "schema.table", "x": 100, "y": 200 }` | Table at position (100, 200) |
| `{ "name": "schema.table" }` | Table with auto-generated position |
| `{ "name": "schema.*" }` | All tables in schema |
| `{ "name": "schema.prefix*" }` | Tables in schema matching prefix |
| `{ "name": "prefix*" }` | All tables matching prefix |
| `{ "name": "*" }` | All tables |

Optional properties: `id`, `color` (hex string), `visible` (boolean, default `true`).

Explicit entries override wildcards and can specify positions for wildcard-matched tables.

Use `"visible": false` to hide tables matched by wildcards:

```json
{
  "tables": [
    { "name": "audit.*", "visible": false },
    { "name": "*" }
  ]
}
```
