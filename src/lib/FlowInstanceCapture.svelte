<script>
  import { useSvelteFlow } from '@xyflow/svelte';

  /** @type {{ onCapture: (instance: import('@xyflow/svelte').SvelteFlowInstance) => void }} */
  let { onCapture } = $props();

  const instance = useSvelteFlow();

  $effect(() => {
    onCapture(instance);
  });
</script>
