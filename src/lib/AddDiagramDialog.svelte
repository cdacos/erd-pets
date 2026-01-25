<script>
  /**
   * @type {{
   *   open: boolean,
   *   onSubmit: (title: string) => void,
   *   onCancel: () => void
   * }}
   */
  let {
    open = false,
    onSubmit,
    onCancel,
  } = $props();

  let title = $state('');
  let inputEl = $state(null);

  // Focus input when dialog opens
  $effect(() => {
    if (open && inputEl) {
      title = '';
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => inputEl?.focus(), 0);
    }
  });

  /**
   * Handle form submission.
   * @param {Event} e
   */
  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = title.trim();
    if (trimmed) {
      onSubmit(trimmed);
      title = '';
    }
  }

  /**
   * Handle backdrop click.
   * @param {MouseEvent} e
   */
  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  }

  /**
   * Handle keydown for escape.
   * @param {KeyboardEvent} e
   */
  function handleKeydown(e) {
    if (e.key === 'Escape') {
      onCancel();
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
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
  >
    <div class="dialog">
      <h2 id="dialog-title">Add New Diagram</h2>
      <form onsubmit={handleSubmit}>
        <label for="diagram-title">Title</label>
        <input
          bind:this={inputEl}
          type="text"
          id="diagram-title"
          bind:value={title}
          placeholder="e.g., Core Tables"
          autocomplete="off"
        />
        <div class="actions">
          <button type="button" class="cancel" onclick={onCancel}>Cancel</button>
          <button type="submit" class="confirm" disabled={!title.trim()}>Add</button>
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
    z-index: 1100;
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

  label {
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--color-text-secondary);
  }

  input {
    padding: 10px 12px;
    border: 1px solid var(--color-border-strong);
    border-radius: 6px;
    font-size: var(--font-size-base);
    background: var(--color-surface);
    color: var(--color-text-primary);
  }

  input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px var(--color-primary-alpha);
  }

  input::placeholder {
    color: var(--color-text-muted);
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
