<script>
  import { Handle, Position } from '@xyflow/svelte';

  /**
   * @typedef {Object} NoteNodeData
   * @property {string} id
   * @property {string} text
   * @property {string} [color]
   * @property {(id: string, text: string) => void} onTextChange
   * @property {boolean} [isArrowLinking]
   * @property {(nodeId: string) => void} [onNodeClick]
   */

  /** @type {{ data: NoteNodeData }} */
  let { data } = $props();

  const DEFAULT_COLOR = '#fef3c7';

  let isEditing = $state(false);
  let editText = $state('');
  /** @type {HTMLTextAreaElement | null} */
  let textareaEl = $state(null);

  let bgColor = $derived(data.color || DEFAULT_COLOR);

  /**
   * Start editing on double-click.
   */
  function handleDoubleClick() {
    editText = data.text;
    isEditing = true;
    // Focus textarea after render
    requestAnimationFrame(() => {
      textareaEl?.focus();
      textareaEl?.select();
    });
  }

  /**
   * Save the edited text.
   */
  function saveEdit() {
    const trimmed = editText.trim();
    if (trimmed !== data.text) {
      data.onTextChange(data.id, trimmed);
    }
    isEditing = false;
  }

  /**
   * Cancel editing.
   */
  function cancelEdit() {
    isEditing = false;
    editText = '';
  }

  /**
   * Handle keydown in textarea.
   * @param {KeyboardEvent} e
   */
  function handleKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  }

  /**
   * Handle blur - save changes.
   */
  function handleBlur() {
    if (isEditing) {
      saveEdit();
    }
  }
</script>

<!-- Center handles for arrow connections -->
<Handle
  id="left-center-source"
  type="source"
  position={Position.Left}
  style="top: 50%"
/>
<Handle
  id="left-center-target"
  type="target"
  position={Position.Left}
  style="top: 50%"
/>
<Handle
  id="right-center-source"
  type="source"
  position={Position.Right}
  style="top: 50%"
/>
<Handle
  id="right-center-target"
  type="target"
  position={Position.Right}
  style="top: 50%"
/>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="note-node"
  class:arrow-linking-target={data.isArrowLinking}
  style="background-color: {bgColor};"
  ondblclick={handleDoubleClick}
  onclick={(e) => {
    if (data.isArrowLinking) {
      e.stopPropagation();
      data.onNodeClick?.(data.id);
    }
  }}
  role="button"
  tabindex="0"
>
  {#if isEditing}
    <textarea
      bind:this={textareaEl}
      bind:value={editText}
      onkeydown={handleKeydown}
      onblur={handleBlur}
      class="note-textarea"
      placeholder="Enter note text..."
    ></textarea>
  {:else}
    <div class="note-content">
      {#if data.text}
        {data.text}
      {:else}
        <span class="placeholder">Double-click to edit</span>
      {/if}
    </div>
  {/if}
</div>

<style>
  .note-node {
    min-width: 120px;
    max-width: 200px;
    min-height: 60px;
    padding: 10px 12px;
    border-radius: 2px;
    box-shadow: 2px 2px 6px rgba(0, 0, 0, 0.15);
    font-size: var(--font-size-sm);
    line-height: 1.4;
    cursor: default;
    /* Post-it folded corner effect */
    position: relative;
  }

  .note-node::after {
    content: '';
    position: absolute;
    bottom: 0;
    right: 0;
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 0 0 12px 12px;
    border-color: transparent transparent rgba(0, 0, 0, 0.1) transparent;
  }

  .note-content {
    white-space: pre-wrap;
    word-break: break-word;
    color: #1f2937;
  }

  .placeholder {
    color: #9ca3af;
    font-style: italic;
  }

  .note-textarea {
    width: 100%;
    min-height: 40px;
    padding: 0;
    border: none;
    background: transparent;
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    color: #1f2937;
    resize: none;
    outline: none;
  }

  .note-textarea::placeholder {
    color: #9ca3af;
    font-style: italic;
  }

  .note-node.arrow-linking-target {
    cursor: crosshair;
  }

  .note-node.arrow-linking-target:hover {
    box-shadow: 0 0 0 2px var(--color-primary), 2px 2px 6px rgba(0, 0, 0, 0.15);
  }
</style>
