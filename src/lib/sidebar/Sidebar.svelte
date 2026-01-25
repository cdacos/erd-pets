<script>
  /**
   * @typedef {import('../parser/types.js').Table} Table
   * @typedef {'tables' | 'relationships' | 'notes' | 'arrows'} SidebarMode
   */

  import TableListPanel from '../TableListPanel.svelte';
  import RelationshipListPanel from './RelationshipListPanel.svelte';
  import NotesPanel from './NotesPanel.svelte';
  import ArrowsPanel from './ArrowsPanel.svelte';

  /** @type {{
   *   mode: SidebarMode,
   *   onModeChange: (mode: SidebarMode) => void,
   *   tables: Table[],
   *   visibleTables: Set<string>,
   *   onTableToggle: (qualifiedName: string, visible: boolean) => void,
   *   onShowTableSql: (qualifiedName: string) => void,
   *   onCenterTable: (qualifiedName: string) => void,
   *   onCreateTable: () => void,
   *   focusSearch?: number
   * }} */
  let {
    mode,
    onModeChange,
    tables,
    visibleTables,
    onTableToggle,
    onShowTableSql,
    onCenterTable,
    onCreateTable,
    focusSearch = 0,
  } = $props();

  /** @type {{ mode: SidebarMode, label: string, icon: string }[]} */
  const tabs = [
    { mode: 'tables', label: 'Tables', icon: 'table' },
    { mode: 'relationships', label: 'Relationships', icon: 'link' },
    { mode: 'notes', label: 'Notes', icon: 'note' },
    { mode: 'arrows', label: 'Arrows', icon: 'arrow' },
  ];

  let width = $state(250);
  let isResizing = $state(false);

  /**
   * @param {MouseEvent} e
   */
  function handleMouseDown(e) {
    isResizing = true;
    e.preventDefault();

    const startX = e.clientX;
    const startWidth = width;

    function onMouseMove(/** @type {MouseEvent} */ e) {
      const delta = e.clientX - startX;
      const newWidth = Math.max(180, Math.min(600, startWidth + delta));
      width = newWidth;
    }

    function onMouseUp() {
      isResizing = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }
</script>

<aside class="sidebar" class:resizing={isResizing} style="width: {width}px;">
  <nav class="sidebar-tabs">
    {#each tabs as tab (tab.mode)}
      <button
        class="tab-btn"
        class:active={mode === tab.mode}
        onclick={() => onModeChange(tab.mode)}
        title={tab.label}
      >
        {#if tab.icon === 'table'}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="3" width="12" height="10" rx="1" stroke="currentColor" stroke-width="1.5"/>
            <line x1="2" y1="6" x2="14" y2="6" stroke="currentColor" stroke-width="1.5"/>
            <line x1="6" y1="6" x2="6" y2="13" stroke="currentColor" stroke-width="1.5"/>
          </svg>
        {:else if tab.icon === 'link'}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6.5 9.5L9.5 6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M9 10L11.5 7.5C12.3284 6.67157 12.3284 5.32843 11.5 4.5C10.6716 3.67157 9.32843 3.67157 8.5 4.5L6 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M7 6L4.5 8.5C3.67157 9.32843 3.67157 10.6716 4.5 11.5C5.32843 12.3284 6.67157 12.3284 7.5 11.5L10 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        {:else if tab.icon === 'note'}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="2" width="10" height="12" rx="1" stroke="currentColor" stroke-width="1.5"/>
            <line x1="5" y1="5" x2="11" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="5" y1="8" x2="11" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="5" y1="11" x2="9" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        {:else if tab.icon === 'arrow'}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        {/if}
      </button>
    {/each}
  </nav>

  <div class="sidebar-content">
    {#if mode === 'tables'}
      <TableListPanel {tables} {visibleTables} onToggle={onTableToggle} onShowSql={onShowTableSql} {onCenterTable} onCreate={onCreateTable} {focusSearch} />
    {:else if mode === 'relationships'}
      <RelationshipListPanel />
    {:else if mode === 'notes'}
      <NotesPanel />
    {:else if mode === 'arrows'}
      <ArrowsPanel />
    {/if}
  </div>
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="resize-handle"
    onmousedown={handleMouseDown}
    role="separator"
    aria-orientation="vertical"
  ></div>
</aside>

<style>
  .sidebar {
    position: relative;
    min-width: 180px;
    max-width: 600px;
    background: var(--color-surface);
    border-right: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .sidebar.resizing {
    user-select: none;
  }

  .resize-handle {
    position: absolute;
    top: 0;
    right: 0;
    width: 4px;
    height: 100%;
    cursor: col-resize;
    background: transparent;
    transition: background-color 0.15s;
  }

  .resize-handle:hover,
  .sidebar.resizing .resize-handle {
    background: var(--color-primary);
  }

  .sidebar-tabs {
    display: flex;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
  }

  .tab-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
    border: none;
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: color 0.15s, background-color 0.15s;
  }

  .tab-btn:hover {
    background: var(--color-surface-hover);
    color: var(--color-text-primary);
  }

  .tab-btn.active {
    color: var(--color-accent);
    box-shadow: inset 0 -2px 0 var(--color-accent);
  }

  .sidebar-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .sidebar-content :global(.table-list-panel) {
    width: 100%;
    min-width: 100%;
    border-right: none;
  }
</style>
