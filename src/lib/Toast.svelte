<script>
  /**
   * @typedef {'info' | 'error' | 'success'} ToastType
   * @typedef {{ id: number, message: string, type: ToastType }} Toast
   */

  /** @type {{ toasts: Toast[] }} */
  let { toasts = [] } = $props();
</script>

<div class="toast-container">
  {#each toasts as toast (toast.id)}
    <div class="toast toast-{toast.type}">
      {toast.message}
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
    padding: 12px 16px;
    border-radius: 6px;
    font-size: 14px;
    box-shadow: var(--shadow-md);
    animation: slideIn 0.2s ease-out;
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
