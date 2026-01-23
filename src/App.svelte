<script>
  import {
    SvelteFlow,
    Controls,
    Background,
    MiniMap,
  } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import TableNode from './lib/TableNode.svelte';
  import Toast from './lib/Toast.svelte';
  import { openSqlFile, saveToFile, isFileSystemAccessSupported } from './lib/file.js';
  import { parsePostgresSQL } from './lib/parser/postgres.js';

  const nodeTypes = {
    table: TableNode,
  };

  /** @type {FileSystemFileHandle | null} */
  let fileHandle = $state(null);

  /** @type {string} */
  let sqlContent = $state('');

  /** @type {import('./lib/Toast.svelte').Toast[]} */
  let toasts = $state([]);

  let toastId = 0;

  let nodes = $state.raw([]);
  let edges = $state.raw([]);

  /**
   * Show a toast notification.
   * @param {string} message
   * @param {import('./lib/Toast.svelte').ToastType} type
   */
  function showToast(message, type = 'info') {
    const id = ++toastId;
    toasts = [...toasts, { id, message, type }];
    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id);
    }, 5000);
  }

  /**
   * Convert parsed tables and foreign keys to Svelte Flow nodes and edges.
   * @param {import('./lib/parser/types.js').Table[]} tables
   * @param {import('./lib/parser/types.js').ForeignKey[]} foreignKeys
   */
  function convertToFlow(tables, foreignKeys) {
    // Create a set of FK source columns for marking
    const fkColumns = new Set(
      foreignKeys.map((fk) => `${fk.sourceTable}.${fk.sourceColumn}`)
    );

    // Grid layout: 3 columns, spacing 300x250
    const cols = 3;
    const spacingX = 300;
    const spacingY = 250;

    const newNodes = tables.map((table, index) => ({
      id: table.qualifiedName,
      type: 'table',
      position: {
        x: (index % cols) * spacingX + 50,
        y: Math.floor(index / cols) * spacingY + 50,
      },
      data: {
        label: table.qualifiedName,
        columns: table.columns.map((col) => ({
          name: col.name,
          type: col.type,
          isPrimaryKey: col.isPrimaryKey,
          isForeignKey: fkColumns.has(`${table.qualifiedName}.${col.name}`),
        })),
      },
    }));

    // Create edges only for FKs where both tables exist
    const tableNames = new Set(tables.map((t) => t.qualifiedName));
    const newEdges = foreignKeys
      .filter((fk) => tableNames.has(fk.sourceTable) && tableNames.has(fk.targetTable))
      .map((fk) => ({
        id: `${fk.sourceTable}.${fk.sourceColumn}->${fk.targetTable}.${fk.targetColumn}`,
        source: fk.sourceTable,
        target: fk.targetTable,
        type: 'default',
      }));

    nodes = newNodes;
    edges = newEdges;
  }

  /**
   * Handle Load SQL button click.
   */
  async function handleLoad() {
    if (!isFileSystemAccessSupported()) {
      showToast(
        'File System Access API not supported. Please use Chrome, Edge, or another Chromium-based browser.',
        'error'
      );
      return;
    }

    try {
      const result = await openSqlFile();
      fileHandle = result.handle;
      sqlContent = result.content;

      const parseResult = parsePostgresSQL(sqlContent);

      // Show parse errors as warnings
      if (parseResult.errors.length > 0) {
        for (const error of parseResult.errors) {
          showToast(error, 'error');
        }
      }

      convertToFlow(parseResult.tables, parseResult.foreignKeys);

      if (parseResult.tables.length === 0) {
        showToast('No tables found in the SQL file.', 'info');
      } else {
        showToast(`Loaded ${parseResult.tables.length} tables.`, 'success');
      }
    } catch (err) {
      // User cancelled the picker - not an error
      if (err.name === 'AbortError') {
        return;
      }
      showToast(err.message || 'Failed to load file.', 'error');
    }
  }

  /**
   * Handle Save button click.
   */
  async function handleSave() {
    if (!fileHandle) {
      showToast('No file loaded. Use Load SQL first.', 'error');
      return;
    }

    try {
      // For now, save the original SQL content
      // TODO: Update @erd-pets block with current positions
      await saveToFile(fileHandle, sqlContent);
      showToast('File saved.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to save file.', 'error');
    }
  }

  /**
   * Handle Refresh button click.
   */
  async function handleRefresh() {
    if (!fileHandle) {
      showToast('No file loaded. Use Load SQL first.', 'error');
      return;
    }

    try {
      const file = await fileHandle.getFile();
      sqlContent = await file.text();

      const parseResult = parsePostgresSQL(sqlContent);

      if (parseResult.errors.length > 0) {
        for (const error of parseResult.errors) {
          showToast(error, 'error');
        }
      }

      convertToFlow(parseResult.tables, parseResult.foreignKeys);
      showToast('Refreshed from file.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to refresh file.', 'error');
    }
  }
</script>

<div class="app">
  <header>
    <button onclick={handleLoad}>Load SQL</button>
    <button onclick={handleRefresh} disabled={!fileHandle}>Refresh</button>
    <button onclick={handleSave} disabled={!fileHandle}>Save</button>
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

<Toast {toasts} />

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

  main {
    flex: 1;
    background: #fafafa;
  }
</style>
