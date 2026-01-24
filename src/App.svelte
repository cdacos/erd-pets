<script>
  import {
    SvelteFlow,
    Controls,
    MiniMap,
    MarkerType,
  } from '@xyflow/svelte';
  import { toCanvas } from 'html-to-image';
  import '@xyflow/svelte/dist/style.css';
  import TableNode from './lib/TableNode.svelte';
  import TooltipEdge from './lib/TooltipEdge.svelte';
  import Toast from './lib/Toast.svelte';
  import DiagramToolbar from './lib/DiagramToolbar.svelte';
  import ConfirmDialog from './lib/ConfirmDialog.svelte';
  import TableListPanel from './lib/TableListPanel.svelte';
  import { circularLayout } from './lib/layouts/circular.js';
  import {
    openDiagramFile,
    openSqlFile,
    refreshFiles,
    saveToFile,
    saveNewDiagramFile,
    isFileSystemAccessSupported,
  } from './lib/fileManager.js';
  import { parsePostgresSQL } from './lib/parser/postgres.js';
  import {
    parseDiagramFile,
    resolveDiagramTables,
    serializeDiagramFile,
    createDefaultDiagramFile,
    resolveRelation,
    setTableVisibility,
  } from './lib/parser/diagram.js';

  const nodeTypes = {
    table: TableNode,
  };

  const edgeTypes = {
    tooltip: TooltipEdge,
  };

  /** @type {FileSystemFileHandle | null} */
  let diagramHandle = $state(null);

  /** @type {FileSystemFileHandle | null} */
  let sqlHandle = $state(null);

  /** @type {string} */
  let diagramFileName = $state('');

  /** @type {string} */
  let sqlFileName = $state('');

  /** @type {string} */
  let diagramContent = $state('');

  /** @type {string} */
  let sqlContent = $state('');

  /** @type {import('./lib/Toast.svelte').Toast[]} */
  let toasts = $state([]);

  let toastId = 0;

  let nodes = $state.raw([]);
  let edges = $state.raw([]);

  /** @type {import('./lib/parser/types.js').DiagramFile | null} */
  let diagramFile = $state(null);

  /** @type {string} */
  let selectedDiagramId = $state('');

  /** @type {import('./lib/parser/types.js').ParseResult | null} */
  let parseResult = $state(null);

  let diagrams = $derived(diagramFile?.diagrams ?? []);

  /** @type {import('./lib/DiagramToolbar.svelte').LayoutType | null} */
  let pendingLayout = $state(null);

  let showLayoutConfirm = $state(false);

  /** @type {import('./lib/DiagramToolbar.svelte').EdgeStyle} */
  let edgeStyle = $state('rounded');

  let showTableList = $state(false);

  /** @type {Set<string>} */
  let visibleTableNames = $derived(new Set(nodes.map((n) => n.id)));

  /**
   * Determine the best handles for connecting two nodes based on their positions.
   * Uses left/right edge of the specific column row, choosing optimal routing:
   * - Horizontally separated: opposite sides (right→left or left→right)
   * - Vertically aligned: same side (left→left or right→right)
   * @param {{x: number, y: number}} sourcePos
   * @param {{x: number, y: number}} targetPos
   * @param {string} sourceColumn
   * @param {string} targetColumn
   * @returns {{sourceHandle: string, targetHandle: string}}
   */
  function getBestHandles(sourcePos, targetPos, sourceColumn, targetColumn) {
    const dx = targetPos.x - sourcePos.x;
    const VERTICAL_THRESHOLD = 100; // Tables within this x-distance are "vertically aligned"

    if (Math.abs(dx) < VERTICAL_THRESHOLD) {
      // Tables are vertically aligned - use same side handles
      // Choose the side away from the slight horizontal offset
      if (dx >= 0) {
        // Target is slightly right, route edges out the left
        return {
          sourceHandle: `left-${sourceColumn}-source`,
          targetHandle: `left-${targetColumn}-target`,
        };
      } else {
        // Target is slightly left, route edges out the right
        return {
          sourceHandle: `right-${sourceColumn}-source`,
          targetHandle: `right-${targetColumn}-target`,
        };
      }
    }

    // Tables are horizontally separated - use opposite sides
    if (dx >= 0) {
      // Target is to the right of source
      return {
        sourceHandle: `right-${sourceColumn}-source`,
        targetHandle: `left-${targetColumn}-target`,
      };
    } else {
      // Target is to the left of source
      return {
        sourceHandle: `left-${sourceColumn}-source`,
        targetHandle: `right-${targetColumn}-target`,
      };
    }
  }

  /**
   * Show a toast notification.
   * @param {string} message
   * @param {import('./lib/Toast.svelte').ToastType} type
   */
  function showToast(message, type = 'info') {
    const id = ++toastId;
    toasts = [...toasts, { id, message, type }];

    // Errors persist until dismissed; others auto-dismiss
    if (type !== 'error') {
      setTimeout(() => {
        toasts = toasts.filter((t) => t.id !== id);
      }, 5000);
    }

    // Echo to console for debugging
    if (type === 'error') {
      console.error('[erd-pets]', message);
    }
  }

  /**
   * Dismiss a toast by id.
   * @param {number} id
   */
  function dismissToast(id) {
    toasts = toasts.filter((t) => t.id !== id);
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

    // Build position map for handle calculation
    /** @type {Map<string, {x: number, y: number}>} */
    const positionMap = new Map();

    const newNodes = tables.map((table, index) => {
      const position = {
        x: (index % cols) * spacingX + 50,
        y: Math.floor(index / cols) * spacingY + 50,
      };
      positionMap.set(table.qualifiedName, position);
      return {
        id: table.qualifiedName,
        type: 'table',
        position,
        data: {
          label: table.qualifiedName,
          columns: table.columns.map((col) => ({
            name: col.name,
            type: col.type,
            isPrimaryKey: col.isPrimaryKey,
            isForeignKey: fkColumns.has(`${table.qualifiedName}.${col.name}`),
          })),
        },
      };
    });

    // Create edges only for FKs where both tables exist
    const tableNames = new Set(tables.map((t) => t.qualifiedName));
    const newEdges = foreignKeys
      .filter((fk) => tableNames.has(fk.sourceTable) && tableNames.has(fk.targetTable))
      .map((fk) => {
        const sourcePos = positionMap.get(fk.sourceTable);
        const targetPos = positionMap.get(fk.targetTable);
        const handles = getBestHandles(sourcePos, targetPos, fk.sourceColumn, fk.targetColumn);
        return {
          id: `${fk.sourceTable}.${fk.sourceColumn}->${fk.targetTable}.${fk.targetColumn}`,
          source: fk.sourceTable,
          target: fk.targetTable,
          sourceHandle: handles.sourceHandle,
          targetHandle: handles.targetHandle,
          type: 'tooltip',
          markerEnd: { type: MarkerType.ArrowClosed, width: 25, height: 25 },
          data: { sourceColumn: fk.sourceColumn, targetColumn: fk.targetColumn, edgeStyle },
        };
      });

    nodes = newNodes;
    edges = newEdges;
  }

  /**
   * Convert using diagram positions from diagram file.
   * @param {import('./lib/parser/types.js').DiagramDefinition} diagram
   * @param {import('./lib/parser/types.js').Table[]} tables
   * @param {import('./lib/parser/types.js').ForeignKey[]} foreignKeys
   * @param {Map<string, {x: number, y: number}>} [existingPositions]
   */
  function convertToFlowWithDiagram(diagram, tables, foreignKeys, existingPositions) {
    const { resolved, errors } = resolveDiagramTables(diagram, tables, existingPositions);

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

    // Build position map for handle calculation
    /** @type {Map<string, {x: number, y: number}>} */
    const positionMap = new Map(resolved.map((pos) => [pos.qualifiedName, { x: pos.x, y: pos.y }]));

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

    // Get relation rules for this diagram
    const relations = diagram.relations ?? [];

    // Create edges only for FKs where both tables are in diagram
    const newEdges = foreignKeys
      .filter((fk) => diagramTables.has(fk.sourceTable) && diagramTables.has(fk.targetTable))
      .map((fk) => {
        const resolved = resolveRelation(fk, relations);
        if (resolved.hidden) {
          return null;
        }
        const sourcePos = positionMap.get(fk.sourceTable);
        const targetPos = positionMap.get(fk.targetTable);
        const handles = getBestHandles(sourcePos, targetPos, fk.sourceColumn, fk.targetColumn);
        // Build style string for color and dashed
        const styleProps = [];
        if (resolved.color) styleProps.push(`stroke: ${resolved.color}`);
        if (resolved.line === 'dashed') styleProps.push('stroke-dasharray: 5 5');
        const style = styleProps.length > 0 ? styleProps.join('; ') : undefined;

        return {
          id: `${fk.sourceTable}.${fk.sourceColumn}->${fk.targetTable}.${fk.targetColumn}`,
          source: fk.sourceTable,
          target: fk.targetTable,
          sourceHandle: handles.sourceHandle,
          targetHandle: handles.targetHandle,
          type: 'tooltip',
          style,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 25,
            height: 25,
            color: resolved.color,
          },
          data: { sourceColumn: fk.sourceColumn, targetColumn: fk.targetColumn, edgeStyle },
        };
      })
      .filter((edge) => edge !== null);

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
   * Recalculate edge handles based on current node positions.
   */
  function recalculateEdgeHandles() {
    const positionMap = getNodePositions();
    edges = edges.map((edge) => {
      const sourcePos = positionMap.get(edge.source);
      const targetPos = positionMap.get(edge.target);
      if (!sourcePos || !targetPos || !edge.data?.sourceColumn || !edge.data?.targetColumn) {
        return edge;
      }
      const handles = getBestHandles(sourcePos, targetPos, edge.data.sourceColumn, edge.data.targetColumn);
      return {
        ...edge,
        sourceHandle: handles.sourceHandle,
        targetHandle: handles.targetHandle,
      };
    });
  }

  /**
   * Handle diagram selection change.
   * @param {string} newDiagramId
   */
  function handleDiagramChange(newDiagramId) {
    if (!parseResult || !diagramFile) return;

    selectedDiagramId = newDiagramId;
    const diagram = diagramFile.diagrams.find((d) => d.id === newDiagramId);
    if (diagram) {
      convertToFlowWithDiagram(diagram, parseResult.tables, parseResult.foreignKeys);
    }
  }

  /**
   * Handle New Diagram button click.
   */
  async function handleNew() {
    if (!isFileSystemAccessSupported()) {
      showToast(
        'File System Access API not supported. Please use Chrome, Edge, or another Chromium-based browser.',
        'error'
      );
      return;
    }

    try {
      // Step 1: Open SQL file
      const sqlResult = await openSqlFile();
      const newSqlHandle = sqlResult.handle;
      const newSqlContent = sqlResult.content;

      // Step 2: Parse SQL to validate it
      const newParseResult = parsePostgresSQL(newSqlContent);

      if (newParseResult.errors.length > 0) {
        for (const error of newParseResult.errors) {
          showToast(error.message || String(error), 'error');
        }
      }

      if (newParseResult.tables.length === 0) {
        showToast('No tables found in the SQL file.', 'error');
        return;
      }

      // Step 3: Create default diagram file content
      const sqlFile = await newSqlHandle.getFile();
      const defaultDiagram = createDefaultDiagramFile(sqlFile.name);
      const diagramContent = JSON.stringify(defaultDiagram, null, 2);

      // Step 4: Save new diagram file (picker starts in same directory as SQL file)
      const newDiagramHandle = await saveNewDiagramFile(diagramContent, newSqlHandle);

      // Step 5: Update state
      diagramHandle = newDiagramHandle;
      sqlHandle = newSqlHandle;
      diagramFileName = newDiagramHandle.name;
      sqlFileName = sqlFile.name;
      sqlContent = newSqlContent;
      parseResult = newParseResult;
      diagramFile = defaultDiagram;
      selectedDiagramId = 'main';

      // Step 6: Render diagram
      const diagram = diagramFile.diagrams[0];
      convertToFlowWithDiagram(diagram, parseResult.tables, parseResult.foreignKeys);

      showToast(`Created new diagram with ${parseResult.tables.length} tables.`, 'success');
    } catch (err) {
      // User cancelled the picker - not an error
      if (err.name === 'AbortError') {
        return;
      }
      showToast(err.message || 'Failed to create diagram.', 'error');
    }
  }

  /**
   * Handle Load Diagram button click.
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
      // Step 1: Open diagram file
      const diagramResult = await openDiagramFile();
      diagramHandle = diagramResult.handle;
      diagramFileName = diagramResult.handle.name;
      diagramContent = diagramResult.content;

      // Step 2: Parse diagram file
      const { data: parsedDiagram, errors: diagramErrors } = parseDiagramFile(diagramContent);

      if (diagramErrors.length > 0) {
        for (const error of diagramErrors) {
          showToast(error.message, 'error');
        }
      }

      if (!parsedDiagram) {
        showToast('Failed to parse diagram file.', 'error');
        return;
      }

      diagramFile = parsedDiagram;

      // Step 3: Prompt user to open SQL file (picker starts in same directory as diagram)
      showToast(`Please select: ${parsedDiagram.sql}`, 'info');

      const sqlResult = await openSqlFile(diagramHandle);
      sqlHandle = sqlResult.handle;
      sqlFileName = sqlResult.handle.name;
      sqlContent = sqlResult.content;

      // Step 4: Parse SQL
      parseResult = parsePostgresSQL(sqlContent);

      if (parseResult.errors.length > 0) {
        for (const error of parseResult.errors) {
          showToast(error.message || String(error), 'error');
        }
      }

      // Step 5: Select first diagram and render
      selectedDiagramId = diagramFile.diagrams[0]?.id ?? '';

      if (selectedDiagramId) {
        const diagram = diagramFile.diagrams.find((d) => d.id === selectedDiagramId);
        if (diagram) {
          convertToFlowWithDiagram(diagram, parseResult.tables, parseResult.foreignKeys);
        }
      } else {
        // No diagrams, show all tables
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
    if (!diagramHandle || !diagramFile) {
      showToast('No file loaded. Use Load Diagram first.', 'error');
      return;
    }

    try {
      // Collect positions from nodes
      const nodePositions = getNodePositions();

      // Serialize diagram file with updated positions
      const newContent = serializeDiagramFile(
        diagramFile,
        selectedDiagramId,
        nodePositions,
        parseResult?.tables ?? []
      );

      // Save to diagram file (SQL file is not modified)
      await saveToFile(diagramHandle, newContent);
      diagramContent = newContent;

      // Re-parse to update state
      const { data } = parseDiagramFile(newContent);
      if (data) {
        diagramFile = data;
      }

      showToast('Diagram saved.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to save file.', 'error');
    }
  }

  /**
   * Handle Refresh button click.
   */
  async function handleRefresh() {
    if (!diagramHandle || !sqlHandle) {
      showToast('No file loaded. Use Load Diagram first.', 'error');
      return;
    }

    try {
      // Preserve current positions for stability
      const existingPositions = getNodePositions();
      const previousDiagramId = selectedDiagramId;

      // Refresh both files
      const refreshed = await refreshFiles(diagramHandle, sqlHandle);
      diagramContent = refreshed.diagramContent;
      sqlContent = refreshed.sqlContent;

      // Re-parse diagram file
      const { data: parsedDiagram, errors: diagramErrors } = parseDiagramFile(diagramContent);

      if (diagramErrors.length > 0) {
        for (const error of diagramErrors) {
          showToast(error.message, 'error');
        }
      }

      if (!parsedDiagram) {
        showToast('Failed to parse diagram file.', 'error');
        return;
      }

      diagramFile = parsedDiagram;

      // Re-parse SQL
      parseResult = parsePostgresSQL(sqlContent);

      if (parseResult.errors.length > 0) {
        for (const error of parseResult.errors) {
          showToast(error.message || String(error), 'error');
        }
      }

      // Try to preserve selected diagram, or fall back to first
      const diagramExists = diagramFile.diagrams.some((d) => d.id === previousDiagramId);
      selectedDiagramId = diagramExists
        ? previousDiagramId
        : (diagramFile.diagrams[0]?.id ?? '');

      if (selectedDiagramId) {
        const diagram = diagramFile.diagrams.find((d) => d.id === selectedDiagramId);
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

      showToast('Refreshed from files.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to refresh files.', 'error');
    }
  }

  /**
   * Handle layout button click from toolbar.
   * Shows confirmation dialog before applying.
   * @param {import('./lib/DiagramToolbar.svelte').LayoutType} layoutType
   */
  function handleLayoutRequest(layoutType) {
    if (nodes.length === 0) {
      showToast('No tables to layout.', 'error');
      return;
    }
    pendingLayout = layoutType;
    showLayoutConfirm = true;
  }

  /**
   * Apply the pending layout after user confirmation.
   */
  function applyLayout() {
    if (!pendingLayout) return;

    /** @type {Map<string, {x: number, y: number}>} */
    let newPositions;

    switch (pendingLayout) {
      case 'circular':
        newPositions = circularLayout(nodes);
        break;
      default:
        showToast(`Unknown layout: ${pendingLayout}`, 'error');
        showLayoutConfirm = false;
        pendingLayout = null;
        return;
    }

    // Apply new positions to nodes
    nodes = nodes.map((node) => {
      const newPos = newPositions.get(node.id);
      if (newPos) {
        return { ...node, position: newPos };
      }
      return node;
    });

    // Recalculate edge handles for new positions
    recalculateEdgeHandles();

    showToast(`Applied ${pendingLayout} layout.`, 'success');
    showLayoutConfirm = false;
    pendingLayout = null;
  }

  /**
   * Cancel layout confirmation.
   */
  function cancelLayout() {
    showLayoutConfirm = false;
    pendingLayout = null;
  }

  /**
   * Handle edge style change.
   * @param {import('./lib/DiagramToolbar.svelte').EdgeStyle} newStyle
   */
  function handleEdgeStyleChange(newStyle) {
    edgeStyle = newStyle;
    // Update all existing edges with new style
    edges = edges.map((edge) => ({
      ...edge,
      data: { ...edge.data, edgeStyle: newStyle },
    }));
  }

  /**
   * Handle table visibility toggle from the side panel.
   * @param {string} qualifiedName
   * @param {boolean} visible
   */
  function handleTableVisibilityToggle(qualifiedName, visible) {
    if (!diagramFile || !selectedDiagramId || !parseResult) return;

    const diagramIndex = diagramFile.diagrams.findIndex((d) => d.id === selectedDiagramId);
    if (diagramIndex === -1) return;

    const diagram = diagramFile.diagrams[diagramIndex];
    const updatedTables = setTableVisibility(diagram.tables, qualifiedName, visible);

    // Update diagram file with new tables array
    const updatedDiagrams = [...diagramFile.diagrams];
    updatedDiagrams[diagramIndex] = { ...diagram, tables: updatedTables };
    diagramFile = { ...diagramFile, diagrams: updatedDiagrams };

    // Preserve current positions and re-render
    const existingPositions = getNodePositions();
    convertToFlowWithDiagram(
      updatedDiagrams[diagramIndex],
      parseResult.tables,
      parseResult.foreignKeys,
      existingPositions
    );
  }

  /**
   * Get bounds of all nodes in flow coordinates, using actual rendered dimensions.
   * @returns {{ x: number, y: number, width: number, height: number } | null}
   */
  function getNodesBoundsWithDimensions() {
    if (nodes.length === 0) return null;

    // Get current zoom level from viewport transform
    const viewport = document.querySelector('.svelte-flow__viewport');
    if (!viewport) return null;

    const transform = viewport.style.transform;
    const scaleMatch = transform.match(/scale\(([^)]+)\)/);
    const zoom = scaleMatch ? parseFloat(scaleMatch[1]) : 1;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const node of nodes) {
      // Get actual rendered dimensions from DOM, adjusted for zoom
      const nodeEl = document.querySelector(`[data-id="${node.id}"]`);
      if (!nodeEl) continue;

      const rect = nodeEl.getBoundingClientRect();
      const width = rect.width / zoom;
      const height = rect.height / zoom;

      // Use flow coordinates from node position
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + width);
      maxY = Math.max(maxY, node.position.y + height);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Export diagram as lossless WebP image.
   * @param {number} pixelRatio - 1 for standard, 2 for high-DPI/Retina
   */
  async function handleExport(pixelRatio) {
    if (nodes.length === 0) {
      showToast('No diagram to export.', 'error');
      return;
    }

    try {
      const nodesBounds = getNodesBoundsWithDimensions();
      if (!nodesBounds) {
        showToast('Failed to calculate diagram bounds.', 'error');
        return;
      }

      const padding = 30;
      const imageWidth = nodesBounds.width + padding * 2;
      const imageHeight = nodesBounds.height + padding * 2;

      const viewportElement = document.querySelector('.svelte-flow__viewport');
      if (!viewportElement) {
        showToast('Failed to capture diagram.', 'error');
        return;
      }

      // Get current background color from CSS variable
      const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim();

      const canvas = await toCanvas(viewportElement, {
        backgroundColor: bgColor,
        pixelRatio,
        width: imageWidth,
        height: imageHeight,
        style: {
          width: `${imageWidth}px`,
          height: `${imageHeight}px`,
          transform: `translate(${-nodesBounds.x + padding}px, ${-nodesBounds.y + padding}px)`,
        },
      });

      // Use lossy WebP with high quality
      const dataUrl = canvas.toDataURL('image/webp', 0.92);

      const link = document.createElement('a');
      link.download = `${diagramFileName.replace(/\.erd-pets\.json$/, '') || 'diagram'}.webp`;
      link.href = dataUrl;
      link.click();

      showToast(`Exported as WebP (${pixelRatio}x).`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to export.', 'error');
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
      } else if (e.key === 'n') {
        e.preventDefault();
        handleNew();
      }
    }

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });
</script>

<div class="app">
  <DiagramToolbar
    onNew={handleNew}
    onLoad={handleLoad}
    onRefresh={handleRefresh}
    onSave={handleSave}
    onDiagramChange={handleDiagramChange}
    onLayout={handleLayoutRequest}
    onEdgeStyleChange={handleEdgeStyleChange}
    onExport={handleExport}
    {diagrams}
    selectedDiagramId={selectedDiagramId}
    fileLoaded={!!diagramHandle}
    {diagramFileName}
    {sqlFileName}
    {edgeStyle}
    {showTableList}
    onToggleTableList={() => showTableList = !showTableList}
  />

  <div class="main-area">
    {#if showTableList}
      <TableListPanel
        tables={parseResult?.tables ?? []}
        visibleTables={visibleTableNames}
        onToggle={handleTableVisibilityToggle}
      />
    {/if}
    <main>
      <SvelteFlow
        bind:nodes
        bind:edges
        {nodeTypes}
        {edgeTypes}
        fitView
        onnodedragstop={recalculateEdgeHandles}
      >
        <Controls />
        <MiniMap />
      </SvelteFlow>
    </main>
  </div>
</div>

<Toast {toasts} onDismiss={dismissToast} />

<ConfirmDialog
  open={showLayoutConfirm}
  title="Apply Layout"
  message="Your current layout will be replaced. This action cannot be undone."
  confirmLabel="Apply"
  onConfirm={applyLayout}
  onCancel={cancelLayout}
/>

<style>
  .app {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .main-area {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  main {
    flex: 1;
    background: var(--color-bg);
  }
</style>
