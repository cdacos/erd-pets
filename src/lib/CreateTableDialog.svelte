<script>
  import { tick } from 'svelte';
  import { CREATE_TABLE_TEMPLATE } from './parser/postgres.js';

  /**
   * @type {{
   *   open: boolean,
   *   initialSql?: string,
   *   editingTable?: string,
   *   onSubmit: (sql: string) => void,
   *   onCancel: () => void
   * }}
   */
  let {
    open = false,
    initialSql = '',
    editingTable = '',
    onSubmit,
    onCancel,
  } = $props();

  let sql = $state('');
  let textareaEl = $state(null);
  let mouseDownTarget = $state(null);

  let isEditing = $derived(!!editingTable);
  let title = $derived(isEditing ? `Edit ${editingTable}` : 'Create Table');
  let submitLabel = $derived(isEditing ? 'Save' : 'Create');

  // Initialize with initialSql or template and focus when dialog opens
  $effect(() => {
    if (open) {
      sql = initialSql || CREATE_TABLE_TEMPLATE;
      // Focus after DOM updates
      tick().then(() => {
        if (textareaEl) {
          textareaEl.focus();
        }
      });
    } else {
      sql = '';
    }
  });

  /**
   * Handle form submission.
   * @param {Event} e
   */
  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = sql.trim();
    if (trimmed) {
      onSubmit(trimmed);
    }
  }

  /**
   * Track mousedown target to prevent closing on text selection drag.
   * @param {MouseEvent} e
   */
  function handleMouseDown(e) {
    mouseDownTarget = e.target;
  }

  /**
   * Handle backdrop click - only close if both mousedown and mouseup were on backdrop.
   * @param {MouseEvent} e
   */
  function handleBackdropClick(e) {
    if (e.target === e.currentTarget && mouseDownTarget === e.currentTarget) {
      onCancel();
    }
    mouseDownTarget = null;
  }

  /**
   * Handle keydown for escape.
   * @param {KeyboardEvent} e
   */
  function handleKeydown(e) {
    if (e.key === 'Escape') {
      onCancel();
    }
    // Cmd/Ctrl+Enter to submit
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit(e);
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
      <h2 id="dialog-title">{title}</h2>
      <form onsubmit={handleSubmit}>
        <textarea
          bind:this={textareaEl}
          bind:value={sql}
          placeholder="Enter CREATE TABLE statement..."
          spellcheck="false"
        ></textarea>
        <p class="hint">Press <kbd>Cmd</kbd>+<kbd>Enter</kbd> to {isEditing ? 'save' : 'create'}.</p>
        <div class="actions">
          <button type="button" class="cancel" onclick={onCancel}>Cancel</button>
          <button type="submit" class="confirm" disabled={!sql.trim()}>{submitLabel}</button>
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
    max-width: 900px;
    width: 90%;
    box-shadow: var(--shadow-lg);
  }

  h2 {
    margin: 0 0 16px 0;
    font-size: var(--font-size-xl);
    font-weight: 600;
    color: var(--color-text-heading);
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  textarea {
    width: 100%;
    height: 300px;
    padding: 12px;
    border: 1px solid var(--color-border-strong);
    border-radius: 6px;
    font-family: var(--font-mono);
    font-size: var(--font-size-base);
    background: var(--color-surface);
    color: var(--color-text-primary);
    resize: vertical;
    box-sizing: border-box;
  }

  textarea::placeholder {
    color: var(--color-text-muted);
  }

  textarea:focus {
    outline: none;
    border-color: var(--color-primary);
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
    gap: 12px;
    justify-content: flex-end;
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
