<script>
  import { Handle, Position } from '@xyflow/svelte';

  let { data } = $props();

  // Layout constants (must match CSS)
  const HEADER_HEIGHT = 29; // 6px padding * 2 + ~17px text
  const COLUMNS_TOP_PADDING = 4;
  const COLUMN_HEIGHT = 22; // 3px padding * 2 + ~16px text

  /**
   * Calculate vertical offset for a column handle.
   * @param {number} index - Column index (0-based)
   * @returns {number} - Pixel offset from top of node
   */
  function getColumnTop(index) {
    return HEADER_HEIGHT + COLUMNS_TOP_PADDING + index * COLUMN_HEIGHT + COLUMN_HEIGHT / 2;
  }
</script>

<!-- Per-column handles on left and right edges -->
{#each data.columns as column, index}
  <Handle
    id="left-{column.name}-source"
    type="source"
    position={Position.Left}
    style="top: {getColumnTop(index)}px"
  />
  <Handle
    id="left-{column.name}-target"
    type="target"
    position={Position.Left}
    style="top: {getColumnTop(index)}px"
  />
  <Handle
    id="right-{column.name}-source"
    type="source"
    position={Position.Right}
    style="top: {getColumnTop(index)}px"
  />
  <Handle
    id="right-{column.name}-target"
    type="target"
    position={Position.Right}
    style="top: {getColumnTop(index)}px"
  />
{/each}

<div class="table-node">
  <div class="table-header">{data.label}</div>
  <div class="table-columns">
    {#each data.columns as column}
      <div class="column">
        <span class="column-name">
          {#if column.isPrimaryKey}<span class="pk">PK</span>{/if}
          {#if column.isForeignKey}<span class="fk">FK</span>{/if}
          {column.name}
        </span>
        <span class="column-type">{column.type}</span>
      </div>
    {/each}
  </div>
</div>

<style>
  :global(.svelte-flow .svelte-flow__handle) {
    opacity: 0;
    pointer-events: none;
  }

  .table-node {
    background: white;
    border: 2px solid #374151;
    border-radius: 4px;
    min-width: 150px;
    font-family: system-ui, sans-serif;
    font-size: 12px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .table-header {
    background: #374151;
    color: white;
    padding: 6px 10px;
    font-weight: 600;
    border-radius: 2px 2px 0 0;
  }

  .table-columns {
    padding: 4px 0;
  }

  .column {
    display: flex;
    justify-content: space-between;
    padding: 3px 10px;
    gap: 12px;
  }

  .column:hover {
    background: #f3f4f6;
  }

  .column-name {
    color: #1f2937;
  }

  .column-type {
    color: #6b7280;
  }

  .pk, .fk {
    font-size: 9px;
    font-weight: 600;
    padding: 1px 3px;
    border-radius: 2px;
    margin-right: 4px;
  }

  .pk {
    background: #fbbf24;
    color: #78350f;
  }

  .fk {
    background: #60a5fa;
    color: #1e3a8a;
  }
</style>
