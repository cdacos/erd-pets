<script>
  /**
   * @typedef {import('./parser/types.js').DiagramDefinition} DiagramDefinition
   */

  /** @type {{ onNew: () => void, onLoad: () => void, onRefresh: () => void, onSave: () => void, onDiagramChange: (id: string) => void, diagrams: DiagramDefinition[], selectedDiagramId: string, fileLoaded: boolean, diagramFileName: string, sqlFileName: string }} */
  let {
    onNew,
    onLoad,
    onRefresh,
    onSave,
    onDiagramChange,
    diagrams,
    selectedDiagramId,
    fileLoaded,
    diagramFileName = '',
    sqlFileName = '',
  } = $props();
</script>

<header>
  <button onclick={onNew}>New</button>
  <button onclick={onLoad}>Open</button>
  <button onclick={onRefresh} disabled={!fileLoaded}>Refresh</button>
  <button onclick={onSave} disabled={!fileLoaded}>Save</button>
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
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
    align-items: center;
  }

  header button {
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    padding: 6px 12px;
    cursor: pointer;
    font-size: 13px;
  }

  header button:hover:not(:disabled) {
    background: #f3f4f6;
  }

  header button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  header select {
    padding: 6px 12px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 13px;
    background: white;
  }

  .file-names {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #6b7280;
  }

  .file-name {
    font-family: ui-monospace, monospace;
    background: #f3f4f6;
    padding: 4px 8px;
    border-radius: 4px;
  }

  .separator {
    color: #9ca3af;
  }
</style>
