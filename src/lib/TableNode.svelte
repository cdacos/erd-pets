<script>
  import { Handle, Position } from '@xyflow/svelte';

  let { data } = $props();
</script>

<Handle type="target" position={Position.Left} />

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

<Handle type="source" position={Position.Right} />

<style>
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
