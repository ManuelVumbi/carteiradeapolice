import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveInitialTheme, toggleThemeMode } from './theme';

test('resolveInitialTheme respects explicit stored theme preference', () => {
  assert.equal(resolveInitialTheme('dark', false), 'dark');
  assert.equal(resolveInitialTheme('light', true), 'light');
});

test('resolveInitialTheme falls back to system preference when storage is empty or invalid', () => {
  assert.equal(resolveInitialTheme(null, true), 'dark');
  assert.equal(resolveInitialTheme(null, false), 'light');
  assert.equal(resolveInitialTheme('invalid', true), 'dark');
});

test('toggleThemeMode alternates between light and dark', () => {
  assert.equal(toggleThemeMode('light'), 'dark');
  assert.equal(toggleThemeMode('dark'), 'light');
});
