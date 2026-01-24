<script>
  import { BaseEdge, getSmoothStepPath, getBezierPath } from '@xyflow/svelte';

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

  // SmoothStep offset controls how far the path extends before turning
  const EDGE_OFFSET = 50;
  // Border radius for rounded corners
  const BORDER_RADIUS = 20;
  // Bezier curvature (higher = more curved)
  const BEZIER_CURVATURE = 0.5;

  let path = $derived(
    data?.edgeStyle === 'bezier'
      ? getBezierPath({
          sourceX,
          sourceY,
          sourcePosition,
          targetX,
          targetY,
          targetPosition,
          curvature: BEZIER_CURVATURE,
        })
      : getSmoothStepPath({
          sourceX,
          sourceY,
          sourcePosition,
          targetX,
          targetY,
          targetPosition,
          offset: EDGE_OFFSET,
          borderRadius: BORDER_RADIUS,
        })
  );

  let tooltipX = $derived((sourceX + targetX) / 2);
  let tooltipY = $derived((sourceY + targetY) / 2);
</script>

<defs>
  <marker
    id={`arrow-${id}`}
    markerWidth="25"
    markerHeight="25"
    viewBox="-10 -10 20 20"
    markerUnits="strokeWidth"
    orient="auto-start-reverse"
    refX="0"
    refY="0"
  >
    <polyline
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="1"
      fill={markerEnd?.color ?? 'var(--xy-edge-stroke, currentColor)'}
      points="-5,-4 0,0 -5,4 -5,-4"
    />
  </marker>
</defs>

<g
  class="tooltip-edge"
  role="graphics-symbol"
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
  <!-- Visible edge with marker -->
  <BaseEdge {id} path={path[0]} markerEnd={`url(#arrow-${id})`} {style} />

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
    background: var(--color-tooltip-bg);
    color: var(--color-tooltip-text);
    padding: 8px 12px;
    border-radius: 6px;
    font-family: system-ui, sans-serif;
    font-size: 12px;
    box-shadow: var(--shadow-md);
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
    color: var(--color-tooltip-label);
    font-weight: 500;
  }

  .value {
    color: var(--color-tooltip-value);
    font-family: ui-monospace, monospace;
  }
</style>
