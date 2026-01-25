<script>
  /**
   * @type {{
   *   open: boolean,
   *   title: string,
   *   message: string,
   *   confirmLabel?: string,
   *   cancelLabel?: string,
   *   onConfirm: () => void,
   *   onCancel: () => void
   * }}
   */
  let {
    open = false,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
  } = $props();

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
      <h2 id="dialog-title">{title}</h2>
      <p>{message}</p>
      <div class="actions">
        <button class="cancel" onclick={onCancel}>{cancelLabel}</button>
        <button class="confirm" onclick={onConfirm}>{confirmLabel}</button>
      </div>
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
    margin: 0 0 12px 0;
    font-size: var(--font-size-xl);
    font-weight: 600;
    color: var(--color-text-heading);
  }

  p {
    margin: 0 0 20px 0;
    font-size: var(--font-size-base);
    color: var(--color-text-secondary);
    line-height: 1.5;
  }

  .actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
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

  .confirm:hover {
    background: var(--color-accent-hover);
  }
</style>
