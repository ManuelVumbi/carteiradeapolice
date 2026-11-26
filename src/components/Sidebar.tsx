import { useState } from 'react';
import {
  BellRing,
  LayoutDashboard,
  Users,
  ShieldCheck,
  Calculator,
  ChevronDown,
  ChevronRight,
  Layers,
  HardHat,
  HeartPulse,
  Plus,
  X,
} from 'lucide-react';
import { getPolicyCategory, getPortfolioStats } from '../data/policies';
import { InsurancePolicy, PolicyCategory } from '../data/types';
import { getPolicyAccent, shortInsurerName } from '../utils/policyAccents';

export type SheetTabId = 'resumo' | 'aderentes' | 'coberturas' | 'simulador';
export type ViewScope = 'portfolio' | 'policy' | 'alerts';

interface SidebarProps {
  policies: InsurancePolicy[];
  viewScope: ViewScope;
  activePolicy: InsurancePolicy | undefined;
  activeTab: SheetTabId;
  urgentAlertsCount: number;
  expiredAlertsCount: number;
  onSelectPortfolio: () => void;
  onSelectAlerts: () => void;
  onSelectPolicySheet: (policyId: string, tab: SheetTabId) => void;
  onCreatePolicy: (defaultCategory?: PolicyCategory) => void;
  includeSimulatorSheet: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const SHEET_ITEMS: Array<{
  id: SheetTabId;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: 'resumo', label: 'Resumo Executivo', icon: LayoutDashboard },
  { id: 'aderentes', label: 'Aderentes', icon: Users },
  { id: 'coberturas', label: 'Coberturas', icon: ShieldCheck },
  { id: 'simulador', label: 'Simulador de Custos', icon: Calculator },
];

export function Sidebar({
  policies,
  viewScope,
  activePolicy,
  activeTab,
  urgentAlertsCount,
  expiredAlertsCount,
  onSelectPortfolio,
  onSelectAlerts,
  onSelectPolicySheet,
  onCreatePolicy,
  includeSimulatorSheet,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>(() =>
    activePolicy ? { [activePolicy.id]: true } : {}
  );
  const [logoFailed, setLogoFailed] = useState(false);

  const stats = getPortfolioStats(policies);
  const healthPolicies = policies.filter((p) => getPolicyCategory(p) === 'saude');
  const workAccidentPolicies = policies.filter(
    (p) => getPolicyCategory(p) === 'acidente_trabalho'
  );

  const togglePolicyAccordion = (policyId: string) => {
    const isCurrentlyActive = viewScope === 'policy' && activePolicy?.id === policyId;
    const isCurrentlyOpen = Boolean(expandedIds[policyId]);

    if (!isCurrentlyActive) {
      setExpandedIds((prev) => ({ ...prev, [policyId]: true }));
      onSelectPolicySheet(policyId, 'resumo');
      return;
    }

    setExpandedIds((prev) => ({ ...prev, [policyId]: !isCurrentlyOpen }));
  };

  const renderPolicyAccordion = (pol: InsurancePolicy) => {
    const globalIdx = Math.max(
      0,
      policies.findIndex((p) => p.id === pol.id)
    );
    const isSelectedPolicy = viewScope === 'policy' && activePolicy?.id === pol.id;
    const isExpanded = Boolean(expandedIds[pol.id]) || isSelectedPolicy;
    const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;
    const accent = getPolicyAccent(pol, globalIdx);
    const isWorkAccident = getPolicyCategory(pol) === 'acidente_trabalho';

    return (
      <div key={pol.id} className="rounded-lg">
        <button
          type="button"
          aria-expanded={isExpanded}
          onClick={() => togglePolicyAccordion(pol.id)}
          className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left transition-colors focus-visible:outline-2 focus-visible:outline-cyan-500 ${
            isSelectedPolicy
              ? `bg-slate-900 dark:bg-[#17233D] text-white dark:ring-1 ${accent.ringAccent}`
              : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`h-6 w-6 rounded-md text-xs font-mono font-bold flex items-center justify-center shrink-0 ${accent.badgeBg}`}
            >
              {isWorkAccident ? (
                <HardHat className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                globalIdx + 1
              )}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{pol.shortLabel}</div>
              <div
                className={`text-[11px] truncate ${
                  isSelectedPolicy ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {pol.subtitle}
              </div>
            </div>
          </div>
          <ChevronIcon
            className={`h-4 w-4 shrink-0 ${
              isSelectedPolicy ? accent.textAccent : 'text-slate-400 dark:text-slate-500'
            }`}
            aria-hidden="true"
          />
        </button>

        {isExpanded && (
          <div
            role="group"
            aria-label={`Submenu da ${pol.shortLabel}`}
            className="mt-1 ml-4 pl-2.5 border-l border-slate-200 dark:border-slate-800 space-y-0.5"
          >
            {SHEET_ITEMS.map((item) => {
              const Icon = item.icon;
              const isSubActive = isSelectedPolicy && activeTab === item.id;
              const label =
                item.id === 'aderentes' && isWorkAccident ? 'Colaboradores' : item.label;
              const countText =
                item.id === 'aderentes'
                  ? `${pol.members.length}`
                  : item.id === 'coberturas'
                    ? `${pol.coverages.length}`
                    : item.id === 'simulador' && !includeSimulatorSheet
                      ? 'Oculta'
                      : null;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setExpandedIds((prev) => ({ ...prev, [pol.id]: true }));
                    onSelectPolicySheet(pol.id, item.id);
                    onCloseMobile();
                  }}
                  aria-current={isSubActive ? 'page' : undefined}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-left transition-colors focus-visible:outline-2 focus-visible:outline-cyan-500 ${
                    isSubActive
                      ? `${accent.softBg} ${accent.textAccent} font-semibold`
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white font-medium'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <Icon
                      className={`h-3.5 w-3.5 shrink-0 ${
                        isSubActive ? accent.textAccent : 'text-slate-400 dark:text-slate-500'
                      }`}
                      aria-hidden="true"
                    />
                    <span className="text-xs truncate whitespace-nowrap">{label}</span>
                  </span>
                  {countText && (
                    <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                      {countText}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const navContent = (
    <div className="flex h-full flex-col justify-between bg-white dark:bg-[#111A2E] border-r border-slate-200 dark:border-slate-800/90 overflow-y-auto transition-colors">
      <div>
        {/* Official Espacie Services Brand Header */}
        <div className="flex items-center justify-between px-4 h-16 bg-[#0D1B30] border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {!logoFailed ? (
              <img
                src="/assets/aistudio/image_3435306c.png"
                alt="Espacie Services"
                onError={() => setLogoFailed(true)}
                className="h-9 w-auto max-w-[168px] object-contain shrink-0"
              />
            ) : (
              <div className="flex flex-col leading-tight">
                <span className="text-base font-bold tracking-tight text-white">Espacie</span>
                <span className="text-[10px] tracking-[0.22em] text-sky-300 uppercase">
                  Services
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Fechar menu lateral"
            className="lg:hidden rounded-md p-2 text-slate-300 hover:bg-slate-800 hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-500"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Navegação de apólices e folhas" className="px-3 py-4 space-y-4">
          {/* Consolidated Overview + Expiration Alerts */}
          <div className="space-y-1">
            <p className="px-2 pb-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              Visão Consolidada
            </p>
            <button
              type="button"
              onClick={() => {
                onSelectPortfolio();
                onCloseMobile();
              }}
              aria-current={viewScope === 'portfolio' ? 'page' : undefined}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-left transition-colors focus-visible:outline-2 focus-visible:outline-cyan-500 ${
                viewScope === 'portfolio'
                  ? 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-900 dark:text-cyan-200 font-semibold border border-cyan-200/80 dark:border-cyan-500/30'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white font-medium border border-transparent'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Layers
                  className={`h-4 w-4 shrink-0 ${
                    viewScope === 'portfolio'
                      ? 'text-cyan-600 dark:text-cyan-400'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                  aria-hidden="true"
                />
                <span className="text-sm truncate whitespace-nowrap">Resumo Geral</span>
              </span>
              <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                {stats.totalPolicies} · {stats.totalMembers}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectAlerts();
                onCloseMobile();
              }}
              aria-current={viewScope === 'alerts' ? 'page' : undefined}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-left transition-colors focus-visible:outline-2 focus-visible:outline-cyan-500 ${
                viewScope === 'alerts'
                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-950 dark:text-amber-200 font-semibold border border-amber-300/80 dark:border-amber-500/40'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white font-medium border border-transparent'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <BellRing
                  className={`h-4 w-4 shrink-0 ${
                    expiredAlertsCount > 0
                      ? 'text-red-600 dark:text-red-400'
                      : urgentAlertsCount > 0
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                  aria-hidden="true"
                />
                <span className="text-sm truncate whitespace-nowrap">Alertas & Atestados</span>
              </span>
              <span
                className={`text-xs font-mono tabular-nums font-bold px-1.5 py-0.5 rounded shrink-0 ${
                  expiredAlertsCount > 0
                    ? 'bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300'
                    : urgentAlertsCount > 0
                      ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                      : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {urgentAlertsCount}
              </span>
            </button>
          </div>

          {/* Health Insurance Policies */}
          <div>
            <div className="flex items-center justify-between px-2 pb-1.5">
              <p className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                <HeartPulse className="h-3.5 w-3.5 text-rose-500" aria-hidden="true" />
                <span>Apólices de Saúde ({healthPolicies.length})</span>
              </p>
              <button
                type="button"
                onClick={() => {
                  onCreatePolicy('saude');
                  onCloseMobile();
                }}
                aria-label="Adicionar nova apólice de saúde"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-cyan-400 hover:text-blue-700 dark:hover:text-cyan-300"
              >
                <Plus className="h-3 w-3" aria-hidden="true" />
                Nova
              </button>
            </div>

            {healthPolicies.length === 0 ? (
              <div className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-center">
                Nenhuma apólice de saúde.
              </div>
            ) : (
              <div className="space-y-1.5">{healthPolicies.map(renderPolicyAccordion)}</div>
            )}
          </div>

          {/* Dedicated Work Accident Policies Field */}
          <div>
            <div className="flex items-center justify-between px-2 pb-1.5">
              <p className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                <HardHat className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                <span>Acidentes de Trabalho ({workAccidentPolicies.length})</span>
              </p>
              <button
                type="button"
                onClick={() => {
                  onCreatePolicy('acidente_trabalho');
                  onCloseMobile();
                }}
                aria-label="Adicionar nova apólice de acidente de trabalho"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300"
              >
                <Plus className="h-3 w-3" aria-hidden="true" />
                Nova AT
              </button>
            </div>

            {workAccidentPolicies.length === 0 ? (
              <button
                type="button"
                onClick={() => {
                  onCreatePolicy('acidente_trabalho');
                  onCloseMobile();
                }}
                className="w-full px-3 py-3 text-xs font-medium text-amber-700 dark:text-amber-300 border border-dashed border-amber-300 dark:border-amber-700/70 rounded-lg hover:bg-amber-50/50 dark:hover:bg-amber-950/30 transition-colors"
              >
                + Adicionar Apólice AT
              </button>
            ) : (
              <div className="space-y-1.5">
                {workAccidentPolicies.map(renderPolicyAccordion)}
              </div>
            )}
          </div>
        </nav>

        <div className="mx-4 mt-2 pt-4 border-t border-slate-200 dark:border-slate-800/90 space-y-2 text-xs">
          <p className="font-medium text-slate-900 dark:text-white">
            {viewScope === 'alerts'
              ? 'Monitorização de Validades'
              : viewScope === 'portfolio' || !activePolicy
                ? 'Carteira Consolidada'
                : `${activePolicy.shortLabel} (${activePolicy.projectName})`}
          </p>
          {viewScope === 'alerts' ? (
            <dl className="space-y-1.5 text-slate-600 dark:text-slate-400">
              <div className="flex justify-between gap-2">
                <dt>Expirados</dt>
                <dd className="font-mono tabular-nums font-semibold text-red-600 dark:text-red-400">
                  {expiredAlertsCount}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Total Urgentes</dt>
                <dd className="font-mono tabular-nums font-semibold text-amber-700 dark:text-amber-400">
                  {urgentAlertsCount}
                </dd>
              </div>
            </dl>
          ) : viewScope === 'portfolio' || !activePolicy ? (
            <dl className="space-y-1.5 text-slate-600 dark:text-slate-400">
              <div className="flex justify-between gap-2">
                <dt>Apólices</dt>
                <dd className="font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">
                  {stats.totalPolicies} ({healthPolicies.length} Saúde · {workAccidentPolicies.length} AT)
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Pessoas Seguras</dt>
                <dd className="font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">
                  {stats.totalMembers}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Seguradoras</dt>
                <dd className="font-medium text-slate-900 dark:text-slate-100 text-right truncate">
                  {stats.byInsurer.length > 0
                    ? stats.byInsurer.map((i) => shortInsurerName(i.insurer)).join(' · ')
                    : '—'}
                </dd>
              </div>
            </dl>
          ) : (
            <dl className="space-y-1.5 text-slate-600 dark:text-slate-400">
              <div className="flex justify-between gap-2">
                <dt>Seguradora</dt>
                <dd className="font-medium text-slate-900 dark:text-slate-100 text-right truncate">
                  {activePolicy.metadata.insurer}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Ramo</dt>
                <dd className="font-medium text-slate-900 dark:text-slate-100 text-right truncate">
                  {activePolicy.metadata.product}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Acta / Recibo</dt>
                <dd className="font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100 text-right">
                  {activePolicy.metadata.endorsementNumber}
                </dd>
              </div>
            </dl>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800/90 text-xs text-slate-500 dark:text-slate-400 shrink-0">
        <p className="truncate">
          {viewScope === 'portfolio' || !activePolicy
            ? 'Exportação consolidada (4 folhas)'
            : `Emissão: ${activePolicy.metadata.issueStamp}`}
        </p>
        <p className="mt-0.5 truncate">Espacie Services · Kwanza (AKZ)</p>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-72 shrink-0 h-screen sticky top-0">{navContent}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50 dark:bg-black/70"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-50 w-72 max-w-full h-full">{navContent}</aside>
        </div>
      )}
    </>
  );
}
