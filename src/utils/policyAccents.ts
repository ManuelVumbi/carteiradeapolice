import { InsurancePolicy, PolicyAccentColor } from '../data/types';

export interface AccentPaletteEntry {
  key: PolicyAccentColor;
  label: string;
  badgeBg: string;
  topBarBg: string;
  outlineButton: string;
  textAccent: string;
  softBg: string;
  ringAccent: string;
}

export const ACCENT_PALETTES: Record<PolicyAccentColor, AccentPaletteEntry> = {
  rose: {
    key: 'rose',
    label: 'Rosa / Magenta',
    badgeBg: 'bg-rose-600 text-white',
    topBarBg: 'bg-rose-500',
    outlineButton:
      'border-rose-500/70 text-rose-700 dark:text-rose-300 bg-rose-50/70 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40',
    textAccent: 'text-rose-600 dark:text-rose-400',
    softBg: 'bg-rose-50 dark:bg-rose-950/40',
    ringAccent: 'dark:ring-rose-500/40',
  },
  blue: {
    key: 'blue',
    label: 'Azul Royal',
    badgeBg: 'bg-blue-600 text-white',
    topBarBg: 'bg-blue-500',
    outlineButton:
      'border-blue-500/70 text-blue-700 dark:text-blue-300 bg-blue-50/70 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40',
    textAccent: 'text-blue-600 dark:text-blue-400',
    softBg: 'bg-blue-50 dark:bg-blue-950/40',
    ringAccent: 'dark:ring-blue-500/40',
  },
  emerald: {
    key: 'emerald',
    label: 'Esmeralda',
    badgeBg: 'bg-emerald-600 text-white',
    topBarBg: 'bg-emerald-500',
    outlineButton:
      'border-emerald-500/70 text-emerald-700 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40',
    textAccent: 'text-emerald-600 dark:text-emerald-400',
    softBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    ringAccent: 'dark:ring-emerald-500/40',
  },
  amber: {
    key: 'amber',
    label: 'Âmbar / Dourado',
    badgeBg: 'bg-amber-500 text-slate-950',
    topBarBg: 'bg-amber-500',
    outlineButton:
      'border-amber-500/70 text-amber-800 dark:text-amber-300 bg-amber-50/70 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40',
    textAccent: 'text-amber-700 dark:text-amber-400',
    softBg: 'bg-amber-50 dark:bg-amber-950/40',
    ringAccent: 'dark:ring-amber-500/40',
  },
  cyan: {
    key: 'cyan',
    label: 'Ciano',
    badgeBg: 'bg-cyan-600 text-white',
    topBarBg: 'bg-cyan-500',
    outlineButton:
      'border-cyan-500/70 text-cyan-700 dark:text-cyan-300 bg-cyan-50/70 dark:bg-cyan-950/30 hover:bg-cyan-100 dark:hover:bg-cyan-900/40',
    textAccent: 'text-cyan-600 dark:text-cyan-400',
    softBg: 'bg-cyan-50 dark:bg-cyan-950/40',
    ringAccent: 'dark:ring-cyan-500/40',
  },
  violet: {
    key: 'violet',
    label: 'Violeta',
    badgeBg: 'bg-violet-600 text-white',
    topBarBg: 'bg-violet-500',
    outlineButton:
      'border-violet-500/70 text-violet-700 dark:text-violet-300 bg-violet-50/70 dark:bg-violet-950/30 hover:bg-violet-100 dark:hover:bg-violet-900/40',
    textAccent: 'text-violet-600 dark:text-violet-400',
    softBg: 'bg-violet-50 dark:bg-violet-950/40',
    ringAccent: 'dark:ring-violet-500/40',
  },
  red: {
    key: 'red',
    label: 'Carmesim',
    badgeBg: 'bg-red-600 text-white',
    topBarBg: 'bg-red-500',
    outlineButton:
      'border-red-500/70 text-red-700 dark:text-red-300 bg-red-50/70 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/40',
    textAccent: 'text-red-600 dark:text-red-400',
    softBg: 'bg-red-50 dark:bg-red-950/40',
    ringAccent: 'dark:ring-red-500/40',
  },
};

const POLICY_COLOR_CYCLE: PolicyAccentColor[] = [
  'rose',
  'blue',
  'emerald',
  'amber',
  'cyan',
  'violet',
  'red',
];

const DEFAULT_POLICY_COLORS: Record<string, PolicyAccentColor> = {
  '27279': 'rose',
  '24050': 'blue',
  '5423633': 'emerald',
  '5671605': 'amber',
};

export function getPolicyAccent(
  policy: Pick<InsurancePolicy, 'id' | 'accentColor'>,
  index: number = 0
): AccentPaletteEntry {
  const key =
    policy.accentColor ??
    DEFAULT_POLICY_COLORS[policy.id] ??
    POLICY_COLOR_CYCLE[index % POLICY_COLOR_CYCLE.length];
  return ACCENT_PALETTES[key];
}

export function getNextAccentColor(index: number): PolicyAccentColor {
  return POLICY_COLOR_CYCLE[index % POLICY_COLOR_CYCLE.length];
}

export function shortInsurerName(insurer: string): string {
  const clean = insurer.trim();
  if (!clean) return '—';
  const words = clean.split(/\s+/);
  if (words.length >= 2 && words[0].length <= 2) {
    return `${words[0]} ${words[1].replace(/,$/, '')}`;
  }
  return words[0].replace(/,$/, '');
}

