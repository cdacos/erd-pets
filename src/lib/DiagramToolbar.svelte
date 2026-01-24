<script>
  /**
   * @typedef {import('./parser/types.js').DiagramDefinition} DiagramDefinition
   */

  /** @type {{ onLoad: () => void, onRefresh: () => void, onSave: () => void, onDiagramChange: (id: string) => void, diagrams: DiagramDefinition[], selectedDiagramId: string, fileLoaded: boolean }} */
  let {
    onLoad,
    onRefresh,
    onSave,
    onDiagramChange,
    diagrams,
    selectedDiagramId,
    fileLoaded,
  } = $props();
</script>

<header>
  <button onclick={onLoad}>Load Diagram</button>
  <button onclick={onRefresh} disabled={!fileLoaded}>Refresh</button>
  <button onclick={onSave} disabled={!fileLoaded}>Save</button>
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
    margin-left: auto;
    padding: 6px 12px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 13px;
    background: white;
  }
</style>
