<script>
  /**
   * @typedef {Object} NoteContextMenuProps
   * @property {number} x - X position of menu
   * @property {number} y - Y position of menu
   * @property {string} noteId - ID of the note
   * @property {string | undefined} currentColor - Current note color
   * @property {(noteId: string, color: string | undefined) => void} onColorChange
   * @property {(noteId: string) => void} onEdit
   * @property {(noteId: string) => void} onDelete
   * @property {() => void} onClose
   */

  /** @type {NoteContextMenuProps} */
  let { x, y, noteId, currentColor, onColorChange, onEdit, onDelete, onClose } = $props();

  const DEFAULT_COLOR = '#fef3c7';

  // Warm-tone preset colors for post-it notes
  const presetColors = [
    '#fef3c7', // Amber-100 (default post-it yellow)
    '#fef08a', // Yellow-200
    '#fed7aa', // Orange-200
    '#fecaca', // Red-200
    '#fbcfe8', // Pink-200
    '#ddd6fe', // Violet-200
    '#bfdbfe', // Blue-200
    '#bbf7d0', // Green-200
    '#e5e7eb', // Gray-200 (neutral)
  ];

  /**
   * Handle color selection.
   * @param {string} color
   */
  function selectColor(color) {
    onColorChange(noteId, color === DEFAULT_COLOR ? undefined : color);
    onClose();
  }

  /**
   * Handle custom color input change.
   * @param {Event} e
   */
  function handleCustomColor(e) {
    const input = /** @type {HTMLInputElement} */ (e.target);
    selectColor(input.value);
  }

  /**
   * Handle edit click.
   */
  function handleEdit() {
    onEdit(noteId);
    onClose();
  }

  /**
   * Handle delete click.
   */
  function handleDelete() {
    onDelete(noteId);
    onClose();
  }

  /**
   * Handle clicks outside the menu.
   * @param {MouseEvent} e
   */
  function handleClickOutside(e) {
    const target = /** @type {HTMLElement} */ (e.target);
    if (!target.closest('.note-context-menu')) {
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
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

<div
  class="note-context-menu"
  style="left: {x}px; top: {y}px;"
  role="menu"
>
  <div class="menu-section">
    <div class="menu-label">Note Color</div>
    <div class="color-grid">
      {#each presetColors as color}
        <button
          class="color-swatch"
          class:selected={currentColor === color || (!currentColor && color === DEFAULT_COLOR)}
          style="background-color: {color};"
          onclick={() => selectColor(color)}
          title={color}
        ></button>
      {/each}
      <label class="color-picker-wrapper" title="Custom color">
        <input
          type="color"
          value={currentColor || DEFAULT_COLOR}
          oninput={handleCustomColor}
          class="color-picker-input"
        />
        <span class="color-picker-icon">+</span>
      </label>
    </div>
  </div>

  <div class="menu-divider"></div>

  <button class="menu-item" onclick={handleEdit}>
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M11.5 2.5l2 2M3 11l-1 3 3-1 8.5-8.5-2-2L3 11z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    Edit Text
  </button>

  <button class="menu-item danger" onclick={handleDelete}>
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M3 4h10M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1M5 4v9a1 1 0 001 1h4a1 1 0 001-1V4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    Delete Note
  </button>
</div>

<style>
  .note-context-menu {
    position: fixed;
    z-index: 1000;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    box-shadow: var(--shadow-lg, 0 10px 25px rgba(0, 0, 0, 0.2));
    min-width: 180px;
    padding: 8px 0;
    font-size: var(--font-size-base);
  }

  .menu-section {
    padding: 4px 12px 8px;
  }

  .menu-label {
    font-size: var(--font-size-xs);
    font-weight: 500;
    color: var(--color-text-secondary);
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .color-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 6px;
  }

  .color-swatch {
    width: 24px;
    height: 24px;
    border: 2px solid transparent;
    border-radius: 4px;
    cursor: pointer;
    transition: transform 0.1s, border-color 0.1s;
  }

  .color-swatch:hover {
    transform: scale(1.1);
  }

  .color-swatch.selected {
    border-color: var(--color-text-primary);
  }

  .color-picker-wrapper {
    width: 24px;
    height: 24px;
    border: 2px dashed var(--color-border);
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
  }

  .color-picker-wrapper:hover {
    border-color: var(--color-text-secondary);
  }

  .color-picker-input {
    position: absolute;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
  }

  .color-picker-icon {
    font-size: var(--font-size-base);
    font-weight: 600;
    color: var(--color-text-secondary);
    pointer-events: none;
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
    flex-shrink: 0;
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
</style>
