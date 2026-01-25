<script>
  /**
   * @typedef {import('./parser/types.js').Table} Table
   */

  /** @type {{
   *   tables: Table[],
   *   visibleTables: Set<string>,
   *   onToggle: (qualifiedName: string, visible: boolean) => void,
   *   onShowSql: (qualifiedName: string) => void,
   *   onCenterTable: (qualifiedName: string) => void
   * }} */
  let {
    tables,
    visibleTables,
    onToggle,
    onShowSql,
    onCenterTable,
  } = $props();

  let searchQuery = $state('');

  let filteredTables = $derived(
    tables.filter((t) =>
      t.qualifiedName.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );
</script>

<aside class="table-list-panel">
  <div class="search-box">
    <input
      type="text"
      placeholder="Search tables..."
      bind:value={searchQuery}
    />
  </div>
  <ul class="table-list">
    {#each filteredTables as table (table.qualifiedName)}
      {@const isVisible = visibleTables.has(table.qualifiedName)}
      <li>
        <span class="table-name" title={table.qualifiedName}>{table.qualifiedName}</span>
        <div class="table-actions">
          <button
            class="icon-btn"
            class:active={isVisible}
            title={isVisible ? 'Hide table' : 'Show table'}
            onclick={() => onToggle(table.qualifiedName, !isVisible)}
          >
            {#if isVisible}
              <!-- Eye open icon -->
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 4C4.5 4 2 8 2 8s2.5 4 6 4 6-4 6-4-2.5-4-6-4Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.5"/>
              </svg>
            {:else}
              <!-- Eye closed icon -->
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M2 8s2.5 4 6 4c1.1 0 2.1-.3 3-.8M14 8s-1.2-1.9-3-3M6.5 5.2C5.3 5.7 4.2 6.6 3.3 7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M3 3l10 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            {/if}
          </button>
          <button
            class="icon-btn"
            title="Show SQL"
            onclick={() => onShowSql(table.qualifiedName)}
          >
            <!-- Code/SQL icon -->
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M5 4L2 8l3 4M11 4l3 4-3 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button
            class="icon-btn"
            class:disabled={!isVisible}
            title="Center in diagram"
            onclick={() => isVisible && onCenterTable(table.qualifiedName)}
            disabled={!isVisible}
          >
            <!-- Crosshair/target icon -->
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.5"/>
              <path d="M8 2v3M8 11v3M2 8h3M11 8h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </li>
    {/each}
  </ul>
</aside>

<style>
  .table-list-panel {
    width: 220px;
    min-width: 220px;
    background: var(--color-surface);
    border-right: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .search-box {
    padding: 8px;
    border-bottom: 1px solid var(--color-border);
  }

  .search-box input {
    width: 100%;
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

  .table-list {
    flex: 1;
    overflow-y: auto;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .table-list li {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-bottom: 1px solid var(--color-border);
  }

  .table-list li:hover {
    background: var(--color-surface-hover);
  }

  .table-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--font-mono);
    font-size: var(--font-size-base);
    color: var(--color-text-primary);
  }

  .table-actions {
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

  .icon-btn.active {
    color: var(--color-text-primary);
  }

  .icon-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
