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
  import {
    parseErdPets,
    resolveDiagram,
    generateErdPetsContent,
    updateSqlWithErdPets,
  } from './lib/parser/erdpets.js';

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

  /** @type {import('./lib/parser/types.js').ErdPetsBlock | null} */
  let erdPetsBlock = $state(null);

  /** @type {string} */
  let selectedDiagram = $state('');

  /** @type {import('./lib/parser/types.js').ParseResult | null} */
  let parseResult = $state(null);

  let diagramNames = $derived(erdPetsBlock?.diagrams.map((d) => d.name) ?? []);

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
   * Used when no @erd-pets block exists (shows all tables in grid layout).
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
   * Convert using diagram positions from @erd-pets block.
   * @param {import('./lib/parser/types.js').Diagram} diagram
   * @param {import('./lib/parser/types.js').Table[]} tables
   * @param {import('./lib/parser/types.js').ForeignKey[]} foreignKeys
   * @param {Map<string, {x: number, y: number}>} [existingPositions]
   */
  function convertToFlowWithDiagram(diagram, tables, foreignKeys, existingPositions) {
    const { resolved, errors } = resolveDiagram(diagram, tables, existingPositions);

    // Show resolution errors
    for (const error of errors) {
      showToast(error.message, 'error');
    }

    // Build set of tables in this diagram
    const diagramTables = new Set(resolved.map((r) => r.qualifiedName));

    // Create a set of FK source columns for marking
    const fkColumns = new Set(
      foreignKeys.map((fk) => `${fk.sourceTable}.${fk.sourceColumn}`)
    );

    // Build nodes from resolved positions
    const tableMap = new Map(tables.map((t) => [t.qualifiedName, t]));
    const newNodes = resolved.map((pos) => {
      const table = tableMap.get(pos.qualifiedName);
      return {
        id: pos.qualifiedName,
        type: 'table',
        position: { x: pos.x, y: pos.y },
        data: {
          label: pos.qualifiedName,
          columns: table?.columns.map((col) => ({
            name: col.name,
            type: col.type,
            isPrimaryKey: col.isPrimaryKey,
            isForeignKey: fkColumns.has(`${pos.qualifiedName}.${col.name}`),
          })) ?? [],
        },
      };
    });

    // Create edges only for FKs where both tables are in diagram
    const newEdges = foreignKeys
      .filter((fk) => diagramTables.has(fk.sourceTable) && diagramTables.has(fk.targetTable))
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
   * Get current node positions as a Map.
   * @returns {Map<string, {x: number, y: number}>}
   */
  function getNodePositions() {
    return new Map(nodes.map((n) => [n.id, n.position]));
  }

  /**
   * Handle diagram selection change.
   */
  function handleDiagramChange() {
    if (!parseResult || !erdPetsBlock) return;

    const diagram = erdPetsBlock.diagrams.find((d) => d.name === selectedDiagram);
    if (diagram) {
      convertToFlowWithDiagram(diagram, parseResult.tables, parseResult.foreignKeys);
    }
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

      parseResult = parsePostgresSQL(sqlContent);

      // Show parse errors as warnings
      if (parseResult.errors.length > 0) {
        for (const error of parseResult.errors) {
          showToast(error.message || error, 'error');
        }
      }

      // Parse @erd-pets block
      erdPetsBlock = parseErdPets(sqlContent);

      if (erdPetsBlock) {
        // Show erdpets parse errors
        for (const error of erdPetsBlock.errors) {
          showToast(error.message, 'error');
        }

        // Select first diagram
        selectedDiagram = erdPetsBlock.diagrams[0]?.name ?? '';

        if (selectedDiagram) {
          const diagram = erdPetsBlock.diagrams.find((d) => d.name === selectedDiagram);
          if (diagram) {
            convertToFlowWithDiagram(diagram, parseResult.tables, parseResult.foreignKeys);
          }
        } else {
          // No diagrams in block, show all tables
          convertToFlow(parseResult.tables, parseResult.foreignKeys);
        }
      } else {
        // No @erd-pets block, show all tables in grid layout
        selectedDiagram = '';
        convertToFlow(parseResult.tables, parseResult.foreignKeys);
      }

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
      // Collect positions from nodes
      const nodePositions = getNodePositions();

      // Generate updated block content
      let newContent;
      if (erdPetsBlock && erdPetsBlock.diagrams.length > 0) {
        newContent = generateErdPetsContent(
          erdPetsBlock.diagrams,
          nodePositions,
          selectedDiagram,
          parseResult?.tables ?? []
        );
      } else if (parseResult && parseResult.tables.length > 0) {
        // No existing diagrams - create a new "main" diagram with all tables
        /** @type {import('./lib/parser/types.js').DiagramEntry[]} */
        const entries = parseResult.tables.map((t) => ({
          kind: /** @type {const} */ ('explicit'),
          pattern: t.qualifiedName,
          x: nodePositions.get(t.qualifiedName)?.x ?? 0,
          y: nodePositions.get(t.qualifiedName)?.y ?? 0,
          line: 0,
        }));
        const newDiagram = { name: 'main', entries };
        newContent = generateErdPetsContent([newDiagram], nodePositions, 'main', parseResult.tables);

        // Update erdPetsBlock for future saves
        erdPetsBlock = {
          diagrams: [newDiagram],
          errors: [],
          startOffset: 0,
          endOffset: 0,
        };
        selectedDiagram = 'main';
      } else {
        // No tables - just save original
        await saveToFile(fileHandle, sqlContent);
        showToast('File saved.', 'success');
        return;
      }

      // Update SQL with new block
      const updatedSql = updateSqlWithErdPets(sqlContent, newContent, erdPetsBlock);
      await saveToFile(fileHandle, updatedSql);
      sqlContent = updatedSql;

      // Re-parse to update offsets
      erdPetsBlock = parseErdPets(sqlContent);

      showToast('File saved with diagram positions.', 'success');
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
      // Preserve current positions for stability
      const existingPositions = getNodePositions();
      const previousDiagram = selectedDiagram;

      const file = await fileHandle.getFile();
      sqlContent = await file.text();

      parseResult = parsePostgresSQL(sqlContent);

      if (parseResult.errors.length > 0) {
        for (const error of parseResult.errors) {
          showToast(error.message || error, 'error');
        }
      }

      // Re-parse @erd-pets block
      erdPetsBlock = parseErdPets(sqlContent);

      if (erdPetsBlock) {
        for (const error of erdPetsBlock.errors) {
          showToast(error.message, 'error');
        }

        // Try to preserve selected diagram, or fall back to first
        const diagramExists = erdPetsBlock.diagrams.some((d) => d.name === previousDiagram);
        selectedDiagram = diagramExists
          ? previousDiagram
          : (erdPetsBlock.diagrams[0]?.name ?? '');

        if (selectedDiagram) {
          const diagram = erdPetsBlock.diagrams.find((d) => d.name === selectedDiagram);
          if (diagram) {
            convertToFlowWithDiagram(
              diagram,
              parseResult.tables,
              parseResult.foreignKeys,
              existingPositions
            );
          }
        } else {
          convertToFlow(parseResult.tables, parseResult.foreignKeys);
        }
      } else {
        selectedDiagram = '';
        convertToFlow(parseResult.tables, parseResult.foreignKeys);
      }

      showToast('Refreshed from file.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to refresh file.', 'error');
    }
  }

  // Keyboard shortcuts
  $effect(() => {
    /**
     * @param {KeyboardEvent} e
     */
    function handleKeydown(e) {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;

      if (e.key === 's') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'o') {
        e.preventDefault();
        handleLoad();
      }
    }

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });
</script>

<div class="app">
  <header>
    <button onclick={handleLoad}>Load SQL</button>
    <button onclick={handleRefresh} disabled={!fileHandle}>Refresh</button>
    <button onclick={handleSave} disabled={!fileHandle}>Save</button>
    <select bind:value={selectedDiagram} onchange={handleDiagramChange} disabled={diagramNames.length === 0}>
      {#each diagramNames as name}
        <option value={name}>{name}</option>
      {/each}
      {#if diagramNames.length === 0}
        <option value="">No diagrams</option>
      {/if}
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
