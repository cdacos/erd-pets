<script>
  import ThemeSelector from './ThemeSelector.svelte';

  /**
   * @typedef {import('./parser/types.js').DiagramDefinition} DiagramDefinition
   * @typedef {'circular' | 'hierarchical'} LayoutType
   * @typedef {'rounded' | 'bezier'} EdgeStyle
   */

  /** @type {{ onNew: () => void, onLoad: () => void, onRefresh: () => void, onSave: () => void, onDiagramChange: (id: string) => void, onLayout: (type: LayoutType) => void, onEdgeStyleChange: (style: EdgeStyle) => void, onExport: (pixelRatio: number) => void, diagrams: DiagramDefinition[], selectedDiagramId: string, fileLoaded: boolean, diagramFileName: string, sqlFileName: string, edgeStyle: EdgeStyle, showTableList: boolean, onToggleTableList: () => void }} */
  let {
    onNew,
    onLoad,
    onRefresh,
    onSave,
    onDiagramChange,
    onLayout,
    onEdgeStyleChange,
    onExport,
    diagrams,
    selectedDiagramId,
    fileLoaded,
    diagramFileName = '',
    sqlFileName = '',
    edgeStyle = 'rounded',
    showTableList = false,
    onToggleTableList,
  } = $props();

  /** @type {LayoutType[]} */
  const layoutOptions = [
    'circular',
    'hierarchical',
  ];

  /**
   * Handle layout selection.
   * @param {Event} e
   */
  function handleLayoutChange(e) {
    const select = /** @type {HTMLSelectElement} */ (e.target);
    const value = /** @type {LayoutType} */ (select.value);
    if (value) {
      onLayout(value);
      // Reset to placeholder after selection
      select.value = '';
    }
  }

  /**
   * Handle export selection.
   * @param {Event} e
   */
  function handleExportChange(e) {
    const select = /** @type {HTMLSelectElement} */ (e.target);
    const value = select.value;
    if (value === '1x') {
      onExport(1);
    } else if (value === '2x') {
      onExport(2);
    }
    // Reset to placeholder after selection
    select.value = '';
  }
</script>

<header>
  <button
    class="toggle-list-btn"
    class:active={showTableList}
    onclick={onToggleTableList}
    title="Toggle table list"
    disabled={!fileLoaded}
  >
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  </button>
  <button onclick={onNew}>New</button>
  <button onclick={onLoad}>Open</button>
  <button onclick={onRefresh} disabled={!fileLoaded}>Refresh</button>
  <button onclick={onSave} disabled={!fileLoaded}>Save</button>
  <select
    class="export-select"
    onchange={handleExportChange}
    disabled={!fileLoaded}
  >
    <option value="">Export</option>
    <option value="1x">WebP (1x)</option>
    <option value="2x">WebP (2x)</option>
  </select>
  <select
    class="layout-select"
    onchange={handleLayoutChange}
    disabled={!fileLoaded}
  >
    <option value="">Layout</option>
    {#each layoutOptions as layout}
      <option value={layout}>{layout.charAt(0).toUpperCase() + layout.slice(1)}</option>
    {/each}
  </select>
  <select
    value={edgeStyle}
    onchange={(e) => onEdgeStyleChange(e.target.value)}
  >
    <option value="rounded">Edges: Rounded</option>
    <option value="bezier">Edges: Bezier</option>
  </select>
  <ThemeSelector />
  {#if diagramFileName || sqlFileName}
    <span class="file-names">
      {#if diagramFileName}<span class="file-name">{diagramFileName}</span>{/if}
      {#if diagramFileName && sqlFileName}<span class="separator">→</span>{/if}
      {#if sqlFileName}<span class="file-name sql">{sqlFileName}</span>{/if}
    </span>
  {/if}
  <select
    value={selectedDiagramId}
    onchange={(e) => onDiagramChange(e.target.value)}
    disabled={diagrams.length === 0}
  >
    {#each diagrams as d}
      <option value={d.id}>{d.title}</option>
    {/each}
    {#if diagrams.length === 0}
      <option value="">No diagrams</option>
    {/if}
  </select>
</header>

<style>
  header {
    display: flex;
    gap: 8px;
    padding: 8px 12px;
    background: var(--color-surface-alt);
    border-bottom: 1px solid var(--color-border);
    align-items: center;
  }

  header button {
    background: var(--color-surface);
    border: 1px solid var(--color-border-strong);
    border-radius: 4px;
    padding: 6px 12px;
    cursor: pointer;
    font-size: 13px;
    color: var(--color-text-primary);
  }

  header button:hover:not(:disabled) {
    background: var(--color-surface-hover);
  }

  header button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .toggle-list-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px 8px;
  }

  .toggle-list-btn.active {
    background: var(--color-surface-hover);
    border-color: var(--color-primary);
  }

  .toggle-list-btn svg {
    display: block;
  }

  header select {
    padding: 6px 12px;
    border: 1px solid var(--color-border-strong);
    border-radius: 4px;
    font-size: 13px;
    background: var(--color-surface);
    color: var(--color-text-primary);
  }

  .file-names {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--color-text-secondary);
  }

  .file-name {
    font-family: ui-monospace, monospace;
    background: var(--color-surface-hover);
    padding: 4px 8px;
    border-radius: 4px;
  }

  .separator {
    color: var(--color-text-muted);
  }
</style>
