# Coding Conventions

## General
- Being correct is extremely important. Being agreeable is not required.
- Never hardcode reference data (e.g., lookup tables, seed data) without explicit user approval

## Svelte
- Use Svelte 5 runes exclusively (`$state`, `$props`, `$effect`, `$derived`)
- No legacy patterns: `export let`, `$:` reactive statements, `<slot>`, `createEventDispatcher`
- Always create (sub-)components. A component with more than 200 lines is a code smell.
- Always handle errors, informing the user with the toast component.
