<script>
  /**
   * @typedef {Object} ContextMenuProps
   * @property {number} x - X position of menu
   * @property {number} y - Y position of menu
   * @property {string[]} tableNames - Names of the selected tables
   * @property {string | undefined} currentColor - Current header color (common color if multiple)
   * @property {(color: string | undefined) => void} onColorChange - Color change callback
   * @property {() => void} onClose - Close menu callback
   */

  /** @type {ContextMenuProps} */
  let { x, y, tableNames, currentColor, onColorChange, onClose } = $props();

  // Display text for header
  let headerText = $derived(
    tableNames.length === 1
      ? tableNames[0]
      : `${tableNames.length} tables selected`
  );

  // Preset colors for quick selection
  const presetColors = [
    '#374151', // Default gray
    '#dc2626', // Red
    '#ea580c', // Orange
    '#ca8a04', // Yellow
    '#16a34a', // Green
    '#0891b2', // Cyan
    '#2563eb', // Blue
    '#7c3aed', // Purple
    '#db2777', // Pink
  ];

  /**
   * Handle color selection from preset or picker.
   * @param {string} color
   */
  function selectColor(color) {
    onColorChange(color);
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
   * Reset to default color.
   */
  function resetColor() {
    onColorChange(undefined);
    onClose();
  }

  /**
   * Handle clicks outside the menu.
   * @param {MouseEvent} e
   */
  function handleClickOutside(e) {
    const target = /** @type {HTMLElement} */ (e.target);
    if (!target.closest('.context-menu')) {
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
  class="context-menu"
  style="left: {x}px; top: {y}px;"
  role="menu"
>
  <div class="menu-header">{headerText}</div>

  <div class="menu-section">
    <div class="menu-label">Header Color</div>
    <div class="color-grid">
      {#each presetColors as color}
        <button
          class="color-swatch"
          class:selected={currentColor === color || (!currentColor && color === '#374151')}
          style="background-color: {color};"
          onclick={() => selectColor(color)}
          title={color}
        ></button>
      {/each}
      <label class="color-picker-wrapper" title="Custom color">
        <input
          type="color"
          value={currentColor || '#374151'}
          oninput={handleCustomColor}
          class="color-picker-input"
        />
        <span class="color-picker-icon">+</span>
      </label>
    </div>
  </div>

  {#if currentColor}
    <button class="menu-item" onclick={resetColor}>
      Reset to Default
    </button>
  {/if}
</div>

<style>
  .context-menu {
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

  .menu-header {
    padding: 6px 12px 8px;
    font-weight: 600;
    color: var(--color-text-primary);
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 8px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .menu-section {
    padding: 0 12px 8px;
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

  .menu-item {
    display: block;
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
</style>
