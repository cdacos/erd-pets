<script>
  import { tick } from 'svelte';

  /**
   * @typedef {import('../parser/types.js').ForeignKey} ForeignKey
   */

  /** @type {{
   *   foreignKeys: ForeignKey[],
   *   visibleTables: Set<string>,
   *   onCenterTable: (qualifiedName: string) => void,
   *   focusSearch?: number
   * }} */
  let {
    foreignKeys,
    visibleTables,
    onCenterTable,
    focusSearch = 0,
  } = $props();

  let searchQuery = $state('');
  let searchInputEl = $state(null);

  let filteredForeignKeys = $derived(
    foreignKeys.filter((fk) => {
      const query = searchQuery.toLowerCase();
      return (
        fk.sourceTable.toLowerCase().includes(query) ||
        fk.sourceColumn.toLowerCase().includes(query) ||
        fk.targetTable.toLowerCase().includes(query) ||
        fk.targetColumn.toLowerCase().includes(query)
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

<aside class="relationship-list-panel">
  <div class="search-box">
    <input
      bind:this={searchInputEl}
      type="text"
      placeholder="Search relationships..."
      bind:value={searchQuery}
    />
  </div>
  {#if filteredForeignKeys.length === 0}
    <div class="empty-state">
      {#if foreignKeys.length === 0}
        <p>No foreign keys found in schema</p>
      {:else}
        <p>No matching relationships</p>
      {/if}
    </div>
  {:else}
    <ul class="relationship-list">
      {#each filteredForeignKeys as fk, i (i)}
        {@const sourceVisible = visibleTables.has(fk.sourceTable)}
        {@const targetVisible = visibleTables.has(fk.targetTable)}
        <li>
          <div class="relationship-info">
            <span class="table-ref" title={fk.sourceTable}>{fk.sourceTable}</span><span class="column-name">.{fk.sourceColumn}</span>
            <span class="arrow">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6H10M10 6L7 3M10 6L7 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <span class="table-ref" title={fk.targetTable}>{fk.targetTable}</span><span class="column-name">.{fk.targetColumn}</span>
          </div>
          <div class="relationship-actions">
            <button
              class="icon-btn"
              class:disabled={!sourceVisible}
              title="Center source table"
              onclick={() => sourceVisible && onCenterTable(fk.sourceTable)}
              disabled={!sourceVisible}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.5"/>
                <path d="M8 2v3M8 11v3M2 8h3M11 8h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
            <button
              class="icon-btn"
              class:disabled={!targetVisible}
              title="Center target table"
              onclick={() => targetVisible && onCenterTable(fk.targetTable)}
              disabled={!targetVisible}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <rect x="4" y="4" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.5"/>
                <path d="M8 2v2M8 12v2M2 8h2M12 8h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</aside>

<style>
  .relationship-list-panel {
    flex: 1;
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

  .empty-state {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }

  .empty-state p {
    color: var(--color-text-muted);
    font-size: var(--font-size-base);
    text-align: center;
    margin: 0;
  }

  .relationship-list {
    flex: 1;
    overflow-y: auto;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .relationship-list li {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 8px;
    border-bottom: 1px solid var(--color-border);
  }

  .relationship-list li:hover {
    background: var(--color-surface-hover);
  }

  .relationship-info {
    flex: 1;
    min-width: 0;
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

  .column-name {
    font-family: var(--font-mono);
    font-size: var(--font-size-base);
    color: var(--color-text-muted);
    flex-shrink: 0;
  }

  .arrow {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-muted);
    padding: 0 6px;
    flex-shrink: 0;
  }

  .relationship-actions {
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
</style>
