export type ThemeMode = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'espacie_apolices_theme';

export function resolveInitialTheme(
  storedValue: string | null | undefined,
  prefersDark: boolean
): ThemeMode {
  if (storedValue === 'dark' || storedValue === 'light') {
    return storedValue;
  }
  return prefersDark ? 'dark' : 'light';
}

export function toggleThemeMode(current: ThemeMode): ThemeMode {
  return current === 'dark' ? 'light' : 'dark';
}

export function readStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    stored = null;
  }
  const prefersDark =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  return resolveInitialTheme(stored, prefersDark);
}

export function persistAndApplyTheme(mode: ThemeMode): void {
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.style.colorScheme = mode;
  }
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // Ignore storage failures in restricted contexts
    }
  }
}
