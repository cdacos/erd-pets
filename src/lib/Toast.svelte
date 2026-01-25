<script>
  /**
   * @typedef {'info' | 'error' | 'success'} ToastType
   * @typedef {{ id: number, message: string, type: ToastType }} Toast
   */

  /** @type {{ toasts: Toast[], onDismiss?: (id: number) => void }} */
  let { toasts = [], onDismiss } = $props();
</script>

<div class="toast-container">
  {#each toasts as toast (toast.id)}
    <div class="toast toast-{toast.type}">
      <span class="toast-message">{toast.message}</span>
      {#if toast.type === 'error' && onDismiss}
        <button class="toast-dismiss" onclick={() => onDismiss(toast.id)} aria-label="Dismiss">
          &times;
        </button>
      {/if}
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    bottom: 16px;
    right: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 1000;
    max-width: 400px;
  }

  .toast {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 12px 16px;
    border-radius: 6px;
    font-size: var(--font-size-base);
    box-shadow: var(--shadow-md);
    animation: slideIn 0.2s ease-out;
  }

  .toast-message {
    flex: 1;
  }

  .toast-dismiss {
    background: none;
    border: none;
    font-size: var(--font-size-xl);
    line-height: 1;
    cursor: pointer;
    opacity: 0.7;
    color: inherit;
    padding: 0;
    margin: -2px -4px 0 0;
  }

  .toast-dismiss:hover {
    opacity: 1;
  }

  .toast-error {
    background: var(--color-toast-error-bg);
    border: 1px solid var(--color-toast-error-border);
    color: var(--color-toast-error-text);
  }

  .toast-success {
    background: var(--color-toast-success-bg);
    border: 1px solid var(--color-toast-success-border);
    color: var(--color-toast-success-text);
  }

  .toast-info {
    background: var(--color-toast-info-bg);
    border: 1px solid var(--color-toast-info-border);
    color: var(--color-toast-info-text);
  }

  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
</style>
