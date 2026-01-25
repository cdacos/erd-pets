<script>
  import { onMount } from 'svelte';

  /**
   * @typedef {'system' | 'light' | 'dark'} ThemePreference
   */

  const STORAGE_KEY = 'erd-pets-theme';

  /** @type {ThemePreference} */
  let preference = $state('system');

  /** @type {MediaQueryList | null} */
  let mediaQuery = null;

  /**
   * Apply the theme to the document.
   * @param {boolean} isDark
   */
  function applyTheme(isDark) {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  /**
   * Update theme based on preference value.
   * @param {ThemePreference} pref
   */
  function updateTheme(pref) {
    if (pref === 'dark') {
      applyTheme(true);
    } else if (pref === 'light') {
      applyTheme(false);
    } else {
      // System preference
      applyTheme(mediaQuery?.matches ?? false);
    }
  }

  /**
   * Handle preference change.
   * @param {Event} e
   */
  function handleChange(e) {
    const select = /** @type {HTMLSelectElement} */ (e.target);
    preference = /** @type {ThemePreference} */ (select.value);
    localStorage.setItem(STORAGE_KEY, preference);
    updateTheme(preference);
  }

  /**
   * Handle system preference change.
   * @param {MediaQueryListEvent} e
   */
  function handleSystemChange(e) {
    if (preference === 'system') {
      applyTheme(e.matches);
    }
  }

  // Initialize on mount (runs once, no reactive dependencies)
  onMount(() => {
    // Load saved preference
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      preference = saved;
    }

    // Set up media query listener
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', handleSystemChange);

    // Apply initial theme
    updateTheme(preference);

    return () => {
      mediaQuery?.removeEventListener('change', handleSystemChange);
    };
  });
</script>

<select value={preference} onchange={handleChange} class="theme-select">
  <option value="system">Theme: System</option>
  <option value="light">Theme: Light</option>
  <option value="dark">Theme: Dark</option>
</select>

<style>
  .theme-select {
    padding: 6px 12px;
    border: 1px solid var(--color-border-strong);
    border-radius: 4px;
    font-size: var(--font-size-base);
    background: var(--color-surface);
    color: var(--color-text-primary);
    cursor: pointer;
  }

  .theme-select:hover {
    background: var(--color-surface-hover);
  }
</style>
