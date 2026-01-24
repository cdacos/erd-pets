# Coding Conventions

## General
- Being correct is extremely important. Being agreeable is not required.
- Never hardcode reference data (e.g., lookup tables, seed data) without explicit user approval

## Svelte
- Use Svelte 5 runes exclusively (`$state`, `$props`, `$effect`, `$derived`)
- No legacy patterns: `export let`, `$:` reactive statements, `<slot>`, `createEventDispatcher`
- Always create (sub-)components. A component with more than 200 lines is a code smell.
- Always handle errors, informing the user with the toast component.

# Architecture

## File Format
- Diagram files: `.erd-pets.json` (JSONC with comments allowed)
- Structure: `{ sql: "schema.sql", diagrams: [{ id, title, tables: [{ name, x?, y?, color? }] }] }`
- Tables support wildcards: `*`, `schema.*`, `schema.prefix*`, `prefix*`

## Key Modules
- `src/lib/parser/diagram.js` - Parse/serialize diagram files, wildcard expansion
- `src/lib/parser/postgres.js` - SQL parsing (tables, columns, foreign keys)
- `src/lib/parser/types.js` - JSDoc type definitions
- `src/lib/fileManager.js` - File System Access API wrappers
- `src/App.svelte` - Main app state, flow conversion, keyboard shortcuts

## Patterns
- File handles (`FileSystemFileHandle`) stored in state for refresh/save
- Position preservation: pass `existingPositions` Map when refreshing to keep node positions stable
- Edge handles recalculated on node drag based on relative positions
- Use `showToast(message, 'info'|'success'|'error')` for user feedback
