<script>
  /**
   * @typedef {import('./parser/types.js').Table} Table
   */

  /** @type {{ tables: Table[], visibleTables: Set<string>, onToggle: (qualifiedName: string, visible: boolean) => void }} */
  let {
    tables,
    visibleTables,
    onToggle,
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
      <li>
        <label>
          <input
            type="checkbox"
            checked={visibleTables.has(table.qualifiedName)}
            onchange={() => onToggle(table.qualifiedName, !visibleTables.has(table.qualifiedName))}
          />
          <span class="table-name">{table.qualifiedName}</span>
        </label>
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
    font-size: 13px;
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
    border-bottom: 1px solid var(--color-border);
  }

  .table-list label {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    cursor: pointer;
    font-size: 13px;
    color: var(--color-text-primary);
  }

  .table-list label:hover {
    background: var(--color-surface-hover);
  }

  .table-list input[type="checkbox"] {
    flex-shrink: 0;
    accent-color: var(--color-primary);
  }

  .table-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: ui-monospace, monospace;
  }
</style>
