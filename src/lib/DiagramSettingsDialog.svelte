<script>
  import { expandWildcard, isWildcard } from './parser/diagram.js';

  /**
   * @typedef {import('./parser/types.js').DiagramDefinition} DiagramDefinition
   * @typedef {import('./parser/types.js').DiagramTableEntry} DiagramTableEntry
   * @typedef {import('./parser/types.js').Table} Table
   */

  /**
   * @type {{
   *   open: boolean,
   *   diagram: DiagramDefinition | null,
   *   sqlTables: Table[],
   *   onRenameDiagram: (newTitle: string) => void,
   *   onDeleteDiagram: () => void,
   *   onUpdateEntries: (entries: DiagramTableEntry[]) => void,
   *   onClose: () => void
   * }}
   */
  let {
    open = false,
    diagram = null,
    sqlTables = [],
    onRenameDiagram,
    onDeleteDiagram,
    onUpdateEntries,
    onClose,
  } = $props();

  let editingTitle = $state(false);
  let titleInput = $state('');
  let newEntryPattern = $state('');
  let titleInputEl = $state(null);
  let patternInputEl = $state(null);

  // Build set of valid table names for quick lookup
  let tableNames = $derived(new Set(sqlTables.map((t) => t.qualifiedName)));

  // Resolve each entry to determine its status
  let resolvedEntries = $derived(() => {
    if (!diagram) return [];

    return diagram.tables.map((entry, index) => {
      const wild = isWildcard(entry.name);
      let status = 'valid';
      let matchCount = 0;

      if (wild) {
        const matches = expandWildcard(entry.name, sqlTables);
        matchCount = matches.length;
        status = matchCount === 0 ? 'empty' : 'valid';
      } else {
        status = tableNames.has(entry.name) ? 'valid' : 'stale';
      }

      return {
        index,
        entry,
        isWildcard: wild,
        status,
        matchCount,
      };
    });
  });

  let staleCount = $derived(resolvedEntries().filter((e) => e.status === 'stale').length);
  let entryCount = $derived(diagram?.tables.length ?? 0);

  // Focus title input when editing starts
  $effect(() => {
    if (editingTitle && titleInputEl) {
      setTimeout(() => titleInputEl?.focus(), 0);
    }
  });

  // Reset state when dialog opens
  $effect(() => {
    if (open && diagram) {
      editingTitle = false;
      titleInput = diagram.title;
      newEntryPattern = '';
    }
  });

  function startEditingTitle() {
    titleInput = diagram?.title ?? '';
    editingTitle = true;
  }

  function saveTitle() {
    const newTitle = titleInput.trim();
    if (newTitle && diagram && newTitle !== diagram.title) {
      onRenameDiagram(newTitle);
    }
    editingTitle = false;
  }

  function cancelEditingTitle() {
    editingTitle = false;
    titleInput = diagram?.title ?? '';
  }

  /**
   * @param {KeyboardEvent} e
   */
  function handleTitleKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveTitle();
    } else if (e.key === 'Escape') {
      cancelEditingTitle();
    }
  }

  /**
   * Remove an entry by index.
   * @param {number} index
   */
  function removeEntry(index) {
    if (!diagram) return;
    const newEntries = diagram.tables.filter((_, i) => i !== index);
    onUpdateEntries(newEntries);
  }

  /**
   * Remove all stale entries at once.
   */
  function removeAllStale() {
    if (!diagram) return;
    const newEntries = diagram.tables.filter((entry) => {
      if (isWildcard(entry.name)) return true;
      return tableNames.has(entry.name);
    });
    onUpdateEntries(newEntries);
  }

  /**
   * Add a new entry.
   * @param {Event} e
   */
  function handleAddEntry(e) {
    e.preventDefault();
    if (!diagram) return;

    const pattern = newEntryPattern.trim();
    if (!pattern) return;

    // Check for duplicates
    if (diagram.tables.some((t) => t.name === pattern)) {
      return;
    }

    const newEntries = [...diagram.tables, { name: pattern }];
    onUpdateEntries(newEntries);
    newEntryPattern = '';
  }

  /**
   * Handle backdrop click.
   * @param {MouseEvent} e
   */
  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  /**
   * Handle keydown for escape.
   * @param {KeyboardEvent} e
   */
  function handleKeydown(e) {
    if (e.key === 'Escape' && !editingTitle) {
      onClose();
    }
  }
</script>

{#if open && diagram}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="backdrop"
    role="dialog"
    aria-modal="true"
    aria-labelledby="dialog-title"
    tabindex="-1"
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
  >
    <div class="dialog">
      <div class="header">
        {#if editingTitle}
          <input
            bind:this={titleInputEl}
            type="text"
            class="title-input"
            bind:value={titleInput}
            onkeydown={handleTitleKeydown}
            onblur={saveTitle}
          />
        {:else}
          <h2 id="dialog-title">{diagram.title}</h2>
          <button class="edit-title-btn" onclick={startEditingTitle} title="Rename diagram">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        {/if}
      </div>

      <div class="section">
        <div class="section-header">
          <span class="section-title">Table Entries</span>
          <span class="entry-stats">
            {entryCount} {entryCount === 1 ? 'entry' : 'entries'}{#if staleCount > 0}, <span class="stale-count">{staleCount} stale</span>{/if}
          </span>
          {#if staleCount > 0}
            <button class="remove-stale-btn" onclick={removeAllStale}>
              Remove stale
            </button>
          {/if}
        </div>

        <div class="entries-list">
          {#each resolvedEntries() as { index, entry, isWildcard: wild, status, matchCount }}
            <div class="entry-row" class:stale={status === 'stale'} class:empty={status === 'empty'}>
              <span class="entry-type" class:wildcard={wild}>{wild ? '*' : 'T'}</span>
              <span class="entry-name" title={entry.name}>{entry.name}</span>
              {#if wild}
                <span class="match-count" class:warning={matchCount === 0}>
                  {matchCount} {matchCount === 1 ? 'table' : 'tables'}
                </span>
              {/if}
              {#if entry.color}
                <span class="color-swatch" style="background: {entry.color}"></span>
              {/if}
              <button
                class="delete-btn"
                onclick={() => removeEntry(index)}
                title="Remove entry"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          {:else}
            <div class="empty-state">No table entries</div>
          {/each}
        </div>

        <form class="add-entry-form" onsubmit={handleAddEntry}>
          <input
            bind:this={patternInputEl}
            type="text"
            bind:value={newEntryPattern}
            placeholder="e.g., public.users or schema.*"
            autocomplete="off"
          />
          <button type="submit" class="add-btn" disabled={!newEntryPattern.trim()}>Add</button>
        </form>
      </div>

      <div class="footer">
        <button class="delete-diagram-btn" onclick={onDeleteDiagram}>
          Delete Diagram
        </button>
        <button class="close-btn" onclick={onClose}>Close</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1100;
  }

  .dialog {
    background: var(--color-surface);
    border-radius: 8px;
    padding: 24px;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: var(--shadow-lg);
  }

  .header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 20px;
  }

  h2 {
    margin: 0;
    font-size: var(--font-size-xl);
    font-weight: 600;
    color: var(--color-text-heading);
  }

  .title-input {
    flex: 1;
    padding: 6px 10px;
    border: 1px solid var(--color-primary);
    border-radius: 4px;
    font-size: var(--font-size-xl);
    font-weight: 600;
    background: var(--color-surface);
    color: var(--color-text-heading);
  }

  .title-input:focus {
    outline: none;
    box-shadow: 0 0 0 2px var(--color-primary-alpha);
  }

  .edit-title-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    border-radius: 4px;
  }

  .edit-title-btn:hover {
    background: var(--color-surface-hover);
    color: var(--color-text-primary);
  }

  .section {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  .section-title {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .entry-stats {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  .stale-count {
    color: #dc2626;
  }

  .remove-stale-btn {
    margin-left: auto;
    padding: 4px 8px;
    border: none;
    background: transparent;
    color: #dc2626;
    font-size: var(--font-size-sm);
    cursor: pointer;
    border-radius: 4px;
  }

  .remove-stale-btn:hover {
    background: rgba(220, 38, 38, 0.1);
  }

  .entries-list {
    flex: 1;
    overflow-y: auto;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    margin-bottom: 12px;
    min-height: 150px;
    max-height: 300px;
  }

  .entry-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--color-border);
  }

  .entry-row:last-child {
    border-bottom: none;
  }

  .entry-row:hover {
    background: var(--color-surface-hover);
  }

  .entry-row.stale {
    background: rgba(220, 38, 38, 0.08);
  }

  .entry-row.stale:hover {
    background: rgba(220, 38, 38, 0.12);
  }

  .entry-type {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 4px;
    font-size: var(--font-size-xs);
    font-weight: 600;
    background: var(--color-surface-alt);
    color: var(--color-text-muted);
  }

  .entry-type.wildcard {
    background: var(--color-primary-alpha);
    color: var(--color-primary);
  }

  .entry-name {
    flex: 1;
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .entry-row.stale .entry-name {
    color: #dc2626;
    text-decoration: line-through;
  }

  .match-count {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .match-count.warning {
    color: #ca8a04;
  }

  .color-swatch {
    width: 14px;
    height: 14px;
    border-radius: 3px;
    border: 1px solid var(--color-border);
  }

  .delete-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    border-radius: 4px;
  }

  .delete-btn:hover {
    background: rgba(220, 38, 38, 0.1);
    color: #dc2626;
  }

  .empty-state {
    padding: 24px;
    text-align: center;
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
  }

  .add-entry-form {
    display: flex;
    gap: 8px;
  }

  .add-entry-form input {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid var(--color-border-strong);
    border-radius: 6px;
    font-size: var(--font-size-sm);
    font-family: var(--font-mono);
    background: var(--color-surface);
    color: var(--color-text-primary);
  }

  .add-entry-form input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px var(--color-primary-alpha);
  }

  .add-entry-form input::placeholder {
    font-family: var(--font-sans);
    color: var(--color-text-muted);
  }

  .add-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    background: var(--color-accent);
    color: white;
    font-size: var(--font-size-sm);
    cursor: pointer;
  }

  .add-btn:hover:not(:disabled) {
    background: var(--color-accent-hover);
  }

  .add-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .footer {
    display: flex;
    justify-content: space-between;
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid var(--color-border);
  }

  .delete-diagram-btn {
    padding: 8px 16px;
    border: 1px solid #dc2626;
    border-radius: 6px;
    background: transparent;
    color: #dc2626;
    font-size: var(--font-size-sm);
    cursor: pointer;
  }

  .delete-diagram-btn:hover {
    background: rgba(220, 38, 38, 0.1);
  }

  .close-btn {
    padding: 8px 16px;
    border: 1px solid var(--color-border-strong);
    border-radius: 6px;
    background: var(--color-surface);
    color: var(--color-text-primary);
    font-size: var(--font-size-sm);
    cursor: pointer;
  }

  .close-btn:hover {
    background: var(--color-surface-hover);
  }
</style>
