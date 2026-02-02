<script>
  /**
   * @type {{
   *   x: number,
   *   y: number,
   *   tableName: string,
   *   columnName: string,
   *   isPrimaryKey: boolean,
   *   onCreateRelationship: () => void,
   *   onTogglePrimaryKey: () => void,
   *   onClose: () => void
   * }}
   */
  let {
    x,
    y,
    tableName,
    columnName,
    isPrimaryKey,
    onCreateRelationship,
    onTogglePrimaryKey,
    onClose,
  } = $props();

  /**
   * @param {MouseEvent} e
   */
  function handleClickOutside(e) {
    const menu = document.querySelector('.column-context-menu');
    if (menu && !menu.contains(/** @type {Node} */ (e.target))) {
      onClose();
    }
  }

  /**
   * @param {KeyboardEvent} e
   */
  function handleKeydown(e) {
    if (e.key === 'Escape') {
      onClose();
    }
  }
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

<div class="column-context-menu" style="left: {x}px; top: {y}px;">
  <div class="menu-header">
    <span class="table-name">{tableName}</span>
    <span class="column-name">.{columnName}</span>
  </div>
  <div class="menu-divider"></div>
  <button
    class="menu-item"
    onclick={() => {
      onCreateRelationship();
      onClose();
    }}
  >
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
    Create Relationship
  </button>
  <button
    class="menu-item"
    class:danger={isPrimaryKey}
    onclick={() => {
      onTogglePrimaryKey();
      onClose();
    }}
  >
    {#if isPrimaryKey}
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M2 4h12M5.333 4V2.667a1.333 1.333 0 0 1 1.334-1.334h2.666a1.333 1.333 0 0 1 1.334 1.334V4m2 0v9.333a1.333 1.333 0 0 1-1.334 1.334H4.667a1.333 1.333 0 0 1-1.334-1.334V4h9.334z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Remove from Primary Key
    {:else}
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M10 1.333A2.667 2.667 0 0 1 12.667 4v1.333H14a.667.667 0 0 1 .667.667v8a.667.667 0 0 1-.667.667H2a.667.667 0 0 1-.667-.667V6a.667.667 0 0 1 .667-.667h1.333V4A2.667 2.667 0 0 1 6 1.333" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="8" cy="10" r="1.5" fill="currentColor"/>
      </svg>
      Add to Primary Key
    {/if}
  </button>
</div>

<style>
  .column-context-menu {
    position: fixed;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    box-shadow: var(--shadow-md);
    min-width: 180px;
    z-index: 1000;
    padding: 4px 0;
  }

  .menu-header {
    padding: 8px 12px;
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
  }

  .menu-header .table-name {
    color: var(--color-text-primary);
    font-weight: 500;
  }

  .menu-header .column-name {
    color: var(--color-text-muted);
  }

  .menu-divider {
    height: 1px;
    background: var(--color-border);
    margin: 4px 0;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 12px;
    border: none;
    background: none;
    color: var(--color-text-primary);
    font-size: var(--font-size-sm);
    cursor: pointer;
    text-align: left;
  }

  .menu-item:hover {
    background: var(--color-surface-hover);
  }

  .menu-item svg {
    color: var(--color-text-muted);
  }
</style>
