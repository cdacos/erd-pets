<script>
  /**
   * @type {{
   *   x: number,
   *   y: number,
   *   onCreateTable: () => void,
   *   onClose: () => void
   * }}
   */
  let { x, y, onCreateTable, onClose } = $props();

  /**
   * Handle clicks outside the menu.
   * @param {MouseEvent} e
   */
  function handleClickOutside(e) {
    const target = /** @type {HTMLElement} */ (e.target);
    if (!target.closest('.pane-context-menu')) {
      onClose();
    }
  }

  /**
   * Handle escape key.
   * @param {KeyboardEvent} e
   */
  function handleKeydown(e) {
    if (e.key === 'Escape') {
      onClose();
    }
  }

  function handleCreateTable() {
    onCreateTable();
    onClose();
  }
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

<div
  class="pane-context-menu"
  style="left: {x}px; top: {y}px;"
  role="menu"
>
  <button class="menu-item" onclick={handleCreateTable}>
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
    Create Table
  </button>
</div>

<style>
  .pane-context-menu {
    position: fixed;
    z-index: 1000;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    box-shadow: var(--shadow-lg, 0 10px 25px rgba(0, 0, 0, 0.2));
    min-width: 150px;
    padding: 4px 0;
    font-size: var(--font-size-base);
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 12px;
    text-align: left;
    background: none;
    border: none;
    color: var(--color-text-primary);
    cursor: pointer;
    font-size: var(--font-size-base);
  }

  .menu-item:hover {
    background: var(--color-surface-hover);
  }

  .menu-item svg {
    color: var(--color-text-muted);
  }
</style>
