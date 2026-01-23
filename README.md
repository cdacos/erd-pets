# erd-pets

Visual ERD editor that reads table definitions from SQL files.

Philosophy: Similarly to the DevOps "pets vs cattle" metaphor, these are diagrams you layout manually, not having to rely on layout engines that can't understand intent.

## Install

```
npm install
```

## Run

```
npm run dev
```

## @erd-pets Block Syntax

Add a comment block to your SQL file:

```sql
/* @erd-pets
[diagram_name]
schema.table 100 200
schema.other
schema.*
*/
```

### Entries

| Format | Description |
|--------|-------------|
| `schema.table x y` | Table at position (x, y) |
| `schema.table` | Table with auto-generated position |
| `schema.*` | All tables in schema |
| `prefix*` | All tables matching prefix |
| `*` | All tables |

Explicit entries override wildcards.
