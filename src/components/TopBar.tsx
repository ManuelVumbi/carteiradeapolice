import {
  BellRing,
  Download,
  Menu,
  SlidersHorizontal,
  Check,
  Moon,
  Sun,
  Plus,
} from 'lucide-react';
import { InsurancePolicy } from '../data/types';
import { ThemeMode } from '../utils/theme';
import { SheetTabId, ViewScope } from './Sidebar';

interface TopBarProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  policiesCount: number;
  viewScope: ViewScope;
  activePolicy: InsurancePolicy | undefined;
  activeTab: SheetTabId;
  urgentAlertsCount: number;
  expiredAlertsCount: number;
  onOpenMobileMenu: () => void;
  onSelectAlerts: () => void;
  onCreatePolicy: () => void;
  onOpenExportConfig: () => void;
  onDownloadExcel: () => void;
  isExporting: boolean;
  lastExportFile: string | null;
}

const TAB_TITLES: Record<SheetTabId, string> = {
  resumo: 'Resumo Executivo',
  aderentes: 'Aderentes',
  coberturas: 'Coberturas',
  simulador: 'Simulador de Custos',
};

export function TopBar({
  theme,
  onToggleTheme,
  policiesCount,
  viewScope,
  activePolicy,
  activeTab,
  urgentAlertsCount,
  expiredAlertsCount,
  onOpenMobileMenu,
  onSelectAlerts,
  onCreatePolicy,
  onOpenExportConfig,
  onDownloadExcel,
  isExporting,
  lastExportFile,
}: TopBarProps) {
  const isDark = theme === 'dark';

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-[#111A2E] border-b border-slate-200 dark:border-slate-800/90 transition-colors">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 h-16">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Abrir navegação das apólices"
            className="lg:hidden rounded-lg p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-500"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          {viewScope === 'alerts' ? (
            <nav aria-label="Localização atual" className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-500 dark:text-slate-400 hidden sm:inline whitespace-nowrap">
                Espacie Services
              </span>
              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="font-semibold text-slate-900 dark:text-white truncate">
                Alertas de Expiração & Atestados Médicos
              </span>
            </nav>
          ) : viewScope === 'portfolio' || !activePolicy ? (
            <nav aria-label="Localização atual" className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-500 dark:text-slate-400 hidden sm:inline whitespace-nowrap">
                Espacie Services
              </span>
              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="font-semibold text-slate-900 dark:text-white truncate">
                <span className="sm:hidden">Resumo Geral</span>
                <span className="hidden sm:inline">
                  Resumo Geral ({policiesCount} {policiesCount === 1 ? 'Apólice' : 'Apólices'})
                </span>
              </span>
            </nav>
          ) : (
            <nav aria-label="Localização atual" className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-500 dark:text-slate-400 hidden md:inline whitespace-nowrap">
                {activePolicy.metadata.insurer}
              </span>
              <span className="text-slate-300 dark:text-slate-700 hidden md:inline" aria-hidden="true">
                /
              </span>
              <span className="text-slate-600 dark:text-slate-300 hidden sm:inline whitespace-nowrap">
                {activePolicy.shortLabel} ({activePolicy.projectName})
              </span>
              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="font-semibold text-slate-900 dark:text-white truncate">
                {TAB_TITLES[activeTab]}
              </span>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {lastExportFile && (
            <span className="hidden xl:inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              Ficheiro transferido
            </span>
          )}

          <button
            type="button"
            onClick={onSelectAlerts}
            aria-label={`Alertas de expiração (${urgentAlertsCount} urgentes)`}
            className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-amber-500 ${
              viewScope === 'alerts'
                ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-600'
                : expiredAlertsCount > 0
                  ? 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/80 hover:bg-red-100 dark:hover:bg-red-950/80'
                  : urgentAlertsCount > 0
                    ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/80 hover:bg-amber-100 dark:hover:bg-amber-950/80'
                    : 'bg-white dark:bg-[#17233D] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <BellRing className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden md:inline">Alertas</span>
            <span className="font-mono tabular-nums font-bold">{urgentAlertsCount}</span>
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
            aria-pressed={isDark}
            title={isDark ? 'Modo claro' : 'Modo escuro'}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-[#17233D] border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-cyan-500"
          >
            {isDark ? (
              <Sun className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
            ) : (
              <Moon className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            )}
            <span className="hidden xl:inline">{isDark ? 'Claro' : 'Escuro'}</span>
          </button>

          <button
            type="button"
            onClick={onCreatePolicy}
            className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Adicionar Apólice</span>
            <span className="sm:hidden">Nova</span>
          </button>

          <button
            type="button"
            onClick={onOpenExportConfig}
            aria-label="Configurar Excel"
            className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-[#17233D] border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-cyan-500"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
            <span className="hidden xl:inline">Configurar</span>
          </button>

          <button
            type="button"
            onClick={onDownloadExcel}
            disabled={isExporting || policiesCount === 0}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sm:hidden">{isExporting ? 'A gerar...' : '.xlsx'}</span>
            <span className="hidden sm:inline">
              {isExporting
                ? 'A gerar .xlsx...'
                : viewScope !== 'policy' || !activePolicy
                  ? 'Exportar (.xlsx)'
                  : `Exportar ${activePolicy.metadata.policyNumber}`}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
