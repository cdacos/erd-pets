<script>
  import { tick } from 'svelte';

  /**
   * @typedef {import('./parser/types.js').Table} Table
   */

  /**
   * @type {{
   *   open: boolean,
   *   tables: Table[],
   *   onSubmit: (sourceTable: string, sourceColumn: string, targetTable: string, targetColumn: string) => void,
   *   onCancel: () => void
   * }}
   */
  let {
    open = false,
    tables,
    onSubmit,
    onCancel,
  } = $props();

  let sourceTable = $state('');
  let sourceColumn = $state('');
  let targetTable = $state('');
  let targetColumn = $state('');
  let sourceSelectEl = $state(null);
  let mouseDownTarget = $state(null);

  let sourceTableObj = $derived(tables.find((t) => t.qualifiedName === sourceTable));
  let targetTableObj = $derived(tables.find((t) => t.qualifiedName === targetTable));

  let sourceColumns = $derived(sourceTableObj?.columns ?? []);
  let targetColumns = $derived(targetTableObj?.columns ?? []);

  let canSubmit = $derived(sourceTable && sourceColumn && targetTable && targetColumn);

  // Reset form and focus when dialog opens
  $effect(() => {
    if (open) {
      sourceTable = '';
      sourceColumn = '';
      targetTable = '';
      targetColumn = '';
      tick().then(() => {
        sourceSelectEl?.focus();
      });
    }
  });

  // Reset source column when source table changes
  $effect(() => {
    if (sourceTable) {
      sourceColumn = '';
    }
  });

  // Reset target column when target table changes
  $effect(() => {
    if (targetTable) {
      targetColumn = '';
    }
  });

  /**
   * @param {Event} e
   */
  function handleSubmit(e) {
    e.preventDefault();
    if (canSubmit) {
      onSubmit(sourceTable, sourceColumn, targetTable, targetColumn);
    }
  }

  /**
   * @param {MouseEvent} e
   */
  function handleMouseDown(e) {
    mouseDownTarget = e.target;
  }

  /**
   * @param {MouseEvent} e
   */
  function handleBackdropClick(e) {
    if (e.target === e.currentTarget && mouseDownTarget === e.currentTarget) {
      onCancel();
    }
    mouseDownTarget = null;
  }

  /**
   * @param {KeyboardEvent} e
   */
  function handleKeydown(e) {
    if (e.key === 'Escape') {
      onCancel();
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canSubmit) {
      e.preventDefault();
      onSubmit(sourceTable, sourceColumn, targetTable, targetColumn);
    }
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <!-- svelte-ignore a11y_interactive_supports_focus -->
  <div
    class="backdrop"
    role="dialog"
    aria-modal="true"
    aria-labelledby="dialog-title"
    onmousedown={handleMouseDown}
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
  >
    <div class="dialog">
      <h2 id="dialog-title">Create Relationship</h2>
      <form onsubmit={handleSubmit}>
        <div class="form-group">
          <label for="source-table">Source Table</label>
          <select id="source-table" bind:this={sourceSelectEl} bind:value={sourceTable}>
            <option value="">Select table...</option>
            {#each tables as table (table.qualifiedName)}
              <option value={table.qualifiedName}>{table.qualifiedName}</option>
            {/each}
          </select>
        </div>

        <div class="form-group">
          <label for="source-column">Source Column</label>
          <select id="source-column" bind:value={sourceColumn} disabled={!sourceTable}>
            <option value="">Select column...</option>
            {#each sourceColumns as col (col.name)}
              <option value={col.name}>{col.name}</option>
            {/each}
          </select>
        </div>

        <div class="arrow-indicator">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M12 19l-4-4M12 19l4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>references</span>
        </div>

        <div class="form-group">
          <label for="target-table">Target Table</label>
          <select id="target-table" bind:value={targetTable}>
            <option value="">Select table...</option>
            {#each tables as table (table.qualifiedName)}
              <option value={table.qualifiedName}>{table.qualifiedName}</option>
            {/each}
          </select>
        </div>

        <div class="form-group">
          <label for="target-column">Target Column</label>
          <select id="target-column" bind:value={targetColumn} disabled={!targetTable}>
            <option value="">Select column...</option>
            {#each targetColumns as col (col.name)}
              <option value={col.name}>{col.name}</option>
            {/each}
          </select>
        </div>

        <p class="hint">Press <kbd>Cmd</kbd>+<kbd>Enter</kbd> to create.</p>
        <div class="actions">
          <button type="button" class="cancel" onclick={onCancel}>Cancel</button>
          <button type="submit" class="confirm" disabled={!canSubmit}>Create</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .dialog {
    background: var(--color-surface);
    border-radius: 8px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
    box-shadow: var(--shadow-lg);
  }

  h2 {
    margin: 0 0 20px 0;
    font-size: var(--font-size-xl);
    font-weight: 600;
    color: var(--color-text-heading);
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  label {
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--color-text-secondary);
  }

  select {
    padding: 8px 12px;
    border: 1px solid var(--color-border-strong);
    border-radius: 6px;
    font-family: var(--font-mono);
    font-size: var(--font-size-base);
    background: var(--color-surface);
    color: var(--color-text-primary);
    cursor: pointer;
  }

  select:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .arrow-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    padding: 4px 0;
  }

  .hint {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  kbd {
    display: inline-block;
    padding: 2px 5px;
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    background: var(--color-surface-elevated);
    border: 1px solid var(--color-border);
    border-radius: 3px;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 8px;
  }

  button {
    padding: 8px 16px;
    border-radius: 6px;
    font-size: var(--font-size-base);
    cursor: pointer;
    border: 1px solid transparent;
  }

  .cancel {
    background: var(--color-surface);
    border-color: var(--color-border-strong);
    color: var(--color-text-primary);
  }

  .cancel:hover {
    background: var(--color-surface-hover);
  }

  .confirm {
    background: var(--color-accent);
    color: white;
  }

  .confirm:hover:not(:disabled) {
    background: var(--color-accent-hover);
  }

  .confirm:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
