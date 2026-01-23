<script>
  import {
    SvelteFlow,
    Controls,
    Background,
    MiniMap,
    useSvelteFlow,
  } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import TableNode from './lib/TableNode.svelte';

  const nodeTypes = {
    table: TableNode,
  };

  let nodes = $state([
    {
      id: 'users',
      type: 'table',
      position: { x: 100, y: 50 },
      data: {
        label: 'public.users',
        columns: [
          { name: 'id', type: 'integer', isPrimaryKey: true },
          { name: 'email', type: 'varchar(255)' },
          { name: 'org_id', type: 'integer', isForeignKey: true },
        ],
      },
    },
    {
      id: 'orgs',
      type: 'table',
      position: { x: 100, y: 250 },
      data: {
        label: 'public.orgs',
        columns: [
          { name: 'id', type: 'integer', isPrimaryKey: true },
          { name: 'name', type: 'varchar(255)' },
        ],
      },
    },
  ]);

  let edges = $state([
    {
      id: 'users-orgs',
      source: 'users',
      target: 'orgs',
      type: 'default',
    },
  ]);
</script>

<div class="app">
  <header>
    <button>Load SQL</button>
    <button>Refresh</button>
    <button>Save</button>
    <select>
      <option>main</option>
    </select>
  </header>

  <main>
    <SvelteFlow
      bind:nodes
      bind:edges
      {nodeTypes}
      fitView
    >
      <Controls />
      <Background />
      <MiniMap />
    </SvelteFlow>
  </main>
</div>

<style>
  .app {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
  }

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

  header button:hover {
    background: #f3f4f6;
  }

  header select {
    margin-left: auto;
    padding: 6px 12px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 13px;
    background: white;
  }

  main {
    flex: 1;
    background: #fafafa;
  }
</style>
