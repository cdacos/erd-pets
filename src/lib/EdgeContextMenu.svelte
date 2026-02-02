<script>
  /**
   * @type {{
   *   x: number,
   *   y: number,
   *   sourceTable: string,
   *   sourceColumn: string,
   *   targetTable: string,
   *   targetColumn: string,
   *   isArrow: boolean,
   *   onDelete: () => void,
   *   onClose: () => void
   * }}
   */
  let {
    x,
    y,
    sourceTable,
    sourceColumn,
    targetTable,
    targetColumn,
    isArrow,
    onDelete,
    onClose,
  } = $props();

  /**
   * @param {MouseEvent} e
   */
  function handleClickOutside(e) {
    const menu = document.querySelector('.edge-context-menu');
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

<div class="edge-context-menu" style="left: {x}px; top: {y}px;">
  <div class="menu-header">
    <span class="relationship-type">{isArrow ? 'Arrow' : 'Relationship'}</span>
  </div>
  <div class="menu-info">
    <div class="info-row">
      <span class="label">From:</span>
      <span class="value">{sourceTable}.{sourceColumn}</span>
    </div>
    <div class="info-row">
      <span class="label">To:</span>
      <span class="value">{targetTable}.{targetColumn}</span>
    </div>
  </div>
  <div class="menu-divider"></div>
  <button
    class="menu-item danger"
    onclick={() => {
      onDelete();
      onClose();
    }}
  >
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M2 4h12M5.333 4V2.667a1.333 1.333 0 0 1 1.334-1.334h2.666a1.333 1.333 0 0 1 1.334 1.334V4m2 0v9.333a1.333 1.333 0 0 1-1.334 1.334H4.667a1.333 1.333 0 0 1-1.334-1.334V4h9.334z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    Delete {isArrow ? 'Arrow' : 'Relationship'}
  </button>
</div>

<style>
  .edge-context-menu {
    position: fixed;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    box-shadow: var(--shadow-md);
    min-width: 200px;
    z-index: 1000;
    padding: 4px 0;
  }

  .menu-header {
    padding: 8px 12px;
    font-size: var(--font-size-sm);
  }

  .menu-header .relationship-type {
    color: var(--color-text-primary);
    font-weight: 500;
  }

  .menu-info {
    padding: 4px 12px 8px;
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
  }

  .info-row {
    display: flex;
    gap: 8px;
  }

  .info-row + .info-row {
    margin-top: 2px;
  }

  .info-row .label {
    color: var(--color-text-muted);
  }

  .info-row .value {
    color: var(--color-text-secondary);
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

  .menu-item.danger {
    color: #dc2626;
  }

  .menu-item.danger svg {
    color: #dc2626;
  }

  .menu-item.danger:hover {
    background: rgba(220, 38, 38, 0.1);
  }

  .menu-item svg {
    color: currentColor;
  }
</style>
