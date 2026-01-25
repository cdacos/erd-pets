<script>
  import { tick } from 'svelte';

  /**
   * @typedef {import('../parser/types.js').Arrow} Arrow
   */

  /** @type {{
   *   arrows: Arrow[],
   *   visibleTables: Set<string>,
   *   onCenterFrom: (tableName: string) => void,
   *   onCenterTo: (tableName: string) => void,
   *   onCreate: () => void,
   *   onDelete: (arrow: Arrow) => void,
   *   focusSearch?: number
   * }} */
  let {
    arrows,
    visibleTables,
    onCenterFrom,
    onCenterTo,
    onCreate,
    onDelete,
    focusSearch = 0,
  } = $props();

  let searchQuery = $state('');
  /** @type {HTMLInputElement | null} */
  let searchInputEl = $state(null);

  let filteredArrows = $derived(
    arrows.filter((arrow) => {
      const query = searchQuery.toLowerCase();
      return (
        arrow.from.toLowerCase().includes(query) ||
        arrow.to.toLowerCase().includes(query) ||
        (arrow.label?.toLowerCase().includes(query) ?? false)
      );
    })
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
</script>

<div class="arrows-panel">
  <div class="search-box">
    <input
      bind:this={searchInputEl}
      type="text"
      placeholder="Search arrows..."
      bind:value={searchQuery}
    />
    <button class="new-btn" title="Create new arrow (or right-click a table)" onclick={onCreate}>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>
  </div>

  {#if arrows.length === 0}
    <div class="empty-state">
      <svg width="32" height="32" viewBox="0 0 16 16" fill="none" class="empty-icon">
        <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <p>No arrows yet</p>
      <p class="hint">Right-click on a table and select "Create Arrow"</p>
    </div>
  {:else if filteredArrows.length === 0}
    <div class="empty-state">
      <p>No matching arrows</p>
    </div>
  {:else}
    <ul class="arrows-list">
      {#each filteredArrows as arrow (arrow.id)}
        {@const fromVisible = visibleTables.has(arrow.from)}
        {@const toVisible = visibleTables.has(arrow.to)}
        <li>
          {#if arrow.color}
            <span class="color-indicator" style="background-color: {arrow.color};"></span>
          {/if}
          <div class="arrow-info">
            <div class="arrow-endpoints">
              <span class="table-ref" title={arrow.from}>{arrow.from}</span>
              <span class="arrow-icon">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6H10M10 6L7 3M10 6L7 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
              <span class="table-ref" title={arrow.to}>{arrow.to}</span>
            </div>
            {#if arrow.label}
              <span class="arrow-label" title={arrow.label}>{arrow.label}</span>
            {/if}
          </div>
          <div class="arrow-actions">
            <button
              class="icon-btn"
              class:disabled={!fromVisible}
              title="Center source table"
              onclick={() => fromVisible && onCenterFrom(arrow.from)}
              disabled={!fromVisible}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.5"/>
                <path d="M8 2v3M8 11v3M2 8h3M11 8h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
            <button
              class="icon-btn"
              class:disabled={!toVisible}
              title="Center target table"
              onclick={() => toVisible && onCenterTo(arrow.to)}
              disabled={!toVisible}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <rect x="4" y="4" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.5"/>
                <path d="M8 2v2M8 12v2M2 8h2M12 8h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
            <button
              class="icon-btn danger"
              title="Delete arrow"
              onclick={() => onDelete(arrow)}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .arrows-panel {
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

  .arrows-list {
    flex: 1;
    overflow-y: auto;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .arrows-list li {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 8px;
    border-bottom: 1px solid var(--color-border);
  }

  .arrows-list li:hover {
    background: var(--color-surface-hover);
  }

  .color-indicator {
    width: 12px;
    height: 12px;
    border-radius: 2px;
    flex-shrink: 0;
    margin-top: 4px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  .arrow-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .arrow-endpoints {
    display: flex;
    align-items: center;
    gap: 0;
    overflow: hidden;
  }

  .table-ref {
    font-family: var(--font-mono);
    font-size: var(--font-size-base);
    color: var(--color-text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .arrow-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-muted);
    padding: 0 6px;
    flex-shrink: 0;
  }

  .arrow-label {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .arrow-actions {
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

  .icon-btn:hover:not(:disabled) {
    background: var(--color-surface-elevated);
    color: var(--color-text-primary);
  }

  .icon-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .icon-btn.danger:hover:not(:disabled) {
    background: rgba(220, 38, 38, 0.1);
    color: #dc2626;
  }
</style>
