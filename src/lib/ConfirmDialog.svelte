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
    background: white;
    border-radius: 8px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  }

  h2 {
    margin: 0 0 12px 0;
    font-size: 18px;
    font-weight: 600;
    color: #111827;
  }

  p {
    margin: 0 0 20px 0;
    font-size: 14px;
    color: #6b7280;
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
    font-size: 14px;
    cursor: pointer;
    border: 1px solid transparent;
  }

  .cancel {
    background: white;
    border-color: #d1d5db;
    color: #374151;
  }

  .cancel:hover {
    background: #f3f4f6;
  }

  .confirm {
    background: #3b82f6;
    color: white;
  }

  .confirm:hover {
    background: #2563eb;
  }
</style>
