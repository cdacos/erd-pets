<script>
  import { getBezierPath } from '@xyflow/svelte';

  let {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style,
    markerEnd,
    data,
    source,
    target,
  } = $props();

  let showTooltip = $state(false);

  let path = $derived(
    getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    })
  );

  let tooltipX = $derived((sourceX + targetX) / 2);
  let tooltipY = $derived((sourceY + targetY) / 2);
</script>

<g
  class="tooltip-edge"
  onmouseenter={() => (showTooltip = true)}
  onmouseleave={() => (showTooltip = false)}
>
  <!-- Invisible wider path for easier hover targeting -->
  <path
    d={path[0]}
    fill="none"
    stroke="transparent"
    stroke-width="20"
  />
  <!-- Visible edge path -->
  <path
    {id}
    class="svelte-flow__edge-path"
    d={path[0]}
    fill="none"
    stroke="#b1b1b7"
    stroke-width="1"
    {style}
    marker-end={markerEnd}
  />

  {#if showTooltip}
    <foreignObject
      x={tooltipX - 100}
      y={tooltipY - 40}
      width="200"
      height="80"
      class="tooltip-container"
    >
      <div class="tooltip">
        <div class="tooltip-row">
          <span class="label">From:</span>
          <span class="value">{source}.{data?.sourceColumn}</span>
        </div>
        <div class="tooltip-row">
          <span class="label">To:</span>
          <span class="value">{target}.{data?.targetColumn}</span>
        </div>
      </div>
    </foreignObject>
  {/if}
</g>

<style>
  .tooltip-container {
    overflow: visible;
    pointer-events: none;
  }

  .tooltip {
    background: #1f2937;
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-family: system-ui, sans-serif;
    font-size: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    width: fit-content;
    white-space: nowrap;
  }

  .tooltip-row {
    display: flex;
    gap: 8px;
  }

  .tooltip-row + .tooltip-row {
    margin-top: 4px;
  }

  .label {
    color: #9ca3af;
    font-weight: 500;
  }

  .value {
    color: #f3f4f6;
    font-family: ui-monospace, monospace;
  }
</style>
