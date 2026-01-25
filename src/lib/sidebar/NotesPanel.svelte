<script>
  import { tick } from 'svelte';

  /**
   * @typedef {import('../parser/types.js').Note} Note
   */

  /** @type {{
   *   notes: Note[],
   *   onCenter: (noteId: string) => void,
   *   onCreate: () => void,
   *   onEdit: (noteId: string) => void,
   *   onDelete: (noteId: string) => void,
   *   focusSearch?: number
   * }} */
  let {
    notes,
    onCenter,
    onCreate,
    onEdit,
    onDelete,
    focusSearch = 0,
  } = $props();

  let searchQuery = $state('');
  /** @type {HTMLInputElement | null} */
  let searchInputEl = $state(null);

  let filteredNotes = $derived(
    notes.filter((n) =>
      n.text.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  // Focus search input when focusSearch changes
  $effect(() => {
    if (focusSearch > 0 && searchInputEl) {
      tick().then(() => {
        searchInputEl?.focus();
        searchInputEl?.select();
      });
    }
  });

  /**
   * Truncate text for display.
   * @param {string} text
   * @param {number} maxLength
   * @returns {string}
   */
  function truncate(text, maxLength = 40) {
    if (!text) return '(empty)';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '...';
  }
</script>

<div class="notes-panel">
  <div class="search-box">
    <input
      bind:this={searchInputEl}
      type="text"
      placeholder="Search notes..."
      bind:value={searchQuery}
    />
    <button class="new-btn" title="Create new note" onclick={onCreate}>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>
  </div>

  {#if notes.length === 0}
    <div class="empty-state">
      <svg width="32" height="32" viewBox="0 0 16 16" fill="none" class="empty-icon">
        <rect x="3" y="2" width="10" height="12" rx="1" stroke="currentColor" stroke-width="1.5"/>
        <line x1="5" y1="5" x2="11" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="5" y1="8" x2="11" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="5" y1="11" x2="9" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <p>No notes yet</p>
      <p class="hint">Right-click on the canvas to add a note</p>
    </div>
  {:else}
    <ul class="notes-list">
      {#each filteredNotes as note (note.id)}
        <li>
          <span class="color-indicator" style="background-color: {note.color || '#fef3c7'};"></span>
          <span class="note-text" title={note.text}>{truncate(note.text)}</span>
          <div class="note-actions">
            <button
              class="icon-btn"
              title="Center in diagram"
              onclick={() => onCenter(note.id)}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.5"/>
                <path d="M8 2v3M8 11v3M2 8h3M11 8h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
            <button
              class="icon-btn"
              title="Edit note"
              onclick={() => onEdit(note.id)}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M11.5 2.5l2 2M3 11l-1 3 3-1 8.5-8.5-2-2L3 11z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <button
              class="icon-btn danger"
              title="Delete note"
              onclick={() => onDelete(note.id)}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M3 4h10M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1M5 4v9a1 1 0 001 1h4a1 1 0 001-1V4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .notes-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .search-box {
    padding: 8px;
    border-bottom: 1px solid var(--color-border);
    display: flex;
    gap: 6px;
  }

  .search-box input {
    flex: 1;
    min-width: 0;
    padding: 6px 8px;
    border: 1px solid var(--color-border-strong);
    border-radius: 4px;
    font-size: var(--font-size-base);
    background: var(--color-surface);
    color: var(--color-text-primary);
    box-sizing: border-box;
  }

  .search-box input::placeholder {
    color: var(--color-text-muted);
  }

  .search-box input:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  .new-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 1px solid var(--color-border-strong);
    border-radius: 4px;
    background: var(--color-surface);
    color: var(--color-text-muted);
    cursor: pointer;
    flex-shrink: 0;
  }

  .new-btn:hover {
    background: var(--color-surface-hover);
    color: var(--color-text-primary);
  }

  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    color: var(--color-text-muted);
    text-align: center;
  }

  .empty-icon {
    margin-bottom: 12px;
    opacity: 0.5;
  }

  .empty-state p {
    margin: 0;
    font-size: var(--font-size-base);
  }

  .empty-state .hint {
    margin-top: 8px;
    font-size: var(--font-size-sm);
    opacity: 0.7;
  }

  .notes-list {
    flex: 1;
    overflow-y: auto;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .notes-list li {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-bottom: 1px solid var(--color-border);
  }

  .notes-list li:hover {
    background: var(--color-surface-hover);
  }

  .color-indicator {
    width: 12px;
    height: 12px;
    border-radius: 2px;
    flex-shrink: 0;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  .note-text {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--font-size-base);
    color: var(--color-text-primary);
  }

  .note-actions {
    display: flex;
    gap: 2px;
    flex-shrink: 0;
  }

  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: color 0.15s, background-color 0.15s;
  }

  .icon-btn:hover {
    background: var(--color-surface-elevated);
    color: var(--color-text-primary);
  }

  .icon-btn.danger:hover {
    background: rgba(220, 38, 38, 0.1);
    color: #dc2626;
  }
</style>
