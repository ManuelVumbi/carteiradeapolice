import { useEffect, useMemo, useState } from 'react';
import { ALL_POLICIES, getPolicyById, getPortfolioStats } from './data/policies';
import { InsurancePolicy, PolicyMember } from './data/types';
import { downloadPolicyWorkbook, downloadPortfolioWorkbook } from './utils/excelExport';
import { getPolicyAccent } from './utils/policyAccents';
import {
  deleteMemberFromPolicy,
  deletePolicyById,
  loadStoredPolicies,
  resetStoredPolicies,
  saveStoredPolicies,
  upsertMemberInPolicy,
  upsertPolicy,
} from './utils/policyManager';
import { persistAndApplyTheme, readStoredTheme, ThemeMode, toggleThemeMode } from './utils/theme';
import { Sidebar, SheetTabId, ViewScope } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { PortfolioSummaryView } from './components/PortfolioSummaryView';
import { ExecutiveSummaryView } from './components/ExecutiveSummaryView';
import { MembersSheetView } from './components/MembersSheetView';
import { CoveragesSheetView } from './components/CoveragesSheetView';
import { SimulatorSheetView } from './components/SimulatorSheetView';
import { ExportConfigModal } from './components/ExportConfigModal';
import { PolicyEditorModal, PrefilledPolicyImport } from './components/PolicyEditorModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import {
  ExtractedPolicyPayload,
  applyCoveragesToPolicy,
  findMatchingPolicy,
  mergeExtractedIntoDraft,
} from './utils/policyImport';
import { buildPolicyFromDraft, validatePolicyDraft } from './utils/policyManager';

function getDefaultExpenses(policies: InsurancePolicy[]): Record<string, number> {
  const entries: Array<[string, number]> = [];
  for (const pol of policies) {
    for (const sc of pol.simulatorScenarios) {
      entries.push([sc.id, sc.defaultExpenseAKZ]);
    }
  }
  return Object.fromEntries(entries);
}

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(readStoredTheme);
  const [policies, setPolicies] = useState<InsurancePolicy[]>(loadStoredPolicies);
  const [viewScope, setViewScope] = useState<ViewScope>('portfolio');
  const [activePolicyId, setActivePolicyId] = useState<string>(
    () => loadStoredPolicies()[0]?.id ?? ALL_POLICIES[0].id
  );
  const [activeTab, setActiveTab] = useState<SheetTabId>('resumo');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [exportConfigOpen, setExportConfigOpen] = useState(false);

  // Policy CRUD modal states
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [editingPolicy, setEditingPolicy] = useState<InsurancePolicy | null>(null);
  const [prefilledImport, setPrefilledImport] = useState<PrefilledPolicyImport | null>(null);
  const [policyToDelete, setPolicyToDelete] = useState<InsurancePolicy | null>(null);
  const [crudStatusMessage, setCrudStatusMessage] = useState<string | null>(null);

  const [referenceDateIso, setReferenceDateIso] = useState('2026-07-15');
  const [includeSimulatorSheet, setIncludeSimulatorSheet] = useState(true);
  const [includeConditionalFormatting, setIncludeConditionalFormatting] = useState(true);
  const [simulatedExpenses, setSimulatedExpenses] = useState<Record<string, number>>(() =>
    getDefaultExpenses(loadStoredPolicies())
  );

  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [lastExportFile, setLastExportFile] = useState<string | null>(null);

  useEffect(() => {
    persistAndApplyTheme(theme);
  }, [theme]);

  useEffect(() => {
    saveStoredPolicies(policies);
  }, [policies]);

  const hasCustomChanges = useMemo(
    () => JSON.stringify(policies) !== JSON.stringify(ALL_POLICIES),
    [policies]
  );

  const activePolicy = getPolicyById(activePolicyId, policies);
  const activePolicyIndex = activePolicy
    ? Math.max(0, policies.findIndex((p) => p.id === activePolicy.id))
    : 0;
  const portfolioStats = useMemo(() => getPortfolioStats(policies), [policies]);

  const handleSelectPolicySheet = (policyId: string, tab: SheetTabId = 'resumo') => {
    setActivePolicyId(policyId);
    setActiveTab(tab);
    setViewScope('policy');
  };

  const handleOpenCreatePolicy = () => {
    setEditorMode('create');
    setEditingPolicy(null);
    setPrefilledImport(null);
    setEditorOpen(true);
  };

  const handleOpenEditPolicy = (policy: InsurancePolicy) => {
    setEditorMode('edit');
    setEditingPolicy(policy);
    setPrefilledImport(null);
    setEditorOpen(true);
  };

  const syncSimulatedExpensesForPolicy = (savedPolicy: InsurancePolicy) => {
    setSimulatedExpenses((prev) => {
      const next = { ...prev };
      for (const sc of savedPolicy.simulatorScenarios) {
        if (next[sc.id] === undefined) {
          next[sc.id] = sc.defaultExpenseAKZ;
        }
      }
      return next;
    });
  };

  const handleSavePolicy = (savedPolicy: InsurancePolicy, importedFileName?: string) => {
    setPolicies((prev) => upsertPolicy(prev, savedPolicy));
    syncSimulatedExpensesForPolicy(savedPolicy);
    setActivePolicyId(savedPolicy.id);
    setPrefilledImport(null);
    const sourceNote = importedFileName ? ` a partir de "${importedFileName}"` : '';
    setCrudStatusMessage(
      editorMode === 'create'
        ? `Apólice N.º ${savedPolicy.metadata.policyNumber} (${savedPolicy.projectName}) adicionada${sourceNote}. Carteira recalculada automaticamente.`
        : `Apólice N.º ${savedPolicy.metadata.policyNumber} (${savedPolicy.projectName}) actualizada${sourceNote}. Carteira recalculada automaticamente.`
    );
  };

  const handleImportedPortfolioDocument = (
    extracted: ExtractedPolicyPayload,
    fileName: string
  ) => {
    const matched = findMatchingPolicy(extracted, policies);
    const mode: 'create' | 'edit' = matched ? 'edit' : 'create';
    const merged = mergeExtractedIntoDraft(
      extracted,
      mode,
      policies.length,
      matched ?? null
    );
    const validation = validatePolicyDraft(merged.draft, policies, matched?.id);

    if (Object.keys(validation).length === 0) {
      const finalPolicy = applyCoveragesToPolicy(
        buildPolicyFromDraft(merged.draft, matched ?? undefined),
        merged.extractedCoverages
      );
      setPolicies((prev) => upsertPolicy(prev, finalPolicy));
      syncSimulatedExpensesForPolicy(finalPolicy);
      setActivePolicyId(finalPolicy.id);
      setCrudStatusMessage(
        mode === 'edit'
          ? `Apólice N.º ${finalPolicy.metadata.policyNumber} (${finalPolicy.projectName}) actualizada automaticamente a partir de "${fileName}". Todos os quadros recalculados.`
          : `Nova apólice N.º ${finalPolicy.metadata.policyNumber} (${finalPolicy.projectName}) adicionada automaticamente a partir de "${fileName}". Todos os quadros recalculados.`
      );
      return;
    }

    const summary =
      extracted.summaryNote?.trim() ||
      (merged.fieldsUpdated.length > 0
        ? `Campos lidos de "${fileName}": ${merged.fieldsUpdated.join(', ')}. Confirme os campos assinalados e clique em Guardar.`
        : `Documento "${fileName}" lido. Preencha os campos obrigatórios assinalados.`);

    setEditorMode(mode);
    setEditingPolicy(matched ?? null);
    setPrefilledImport({
      draft: merged.draft,
      coverages: merged.extractedCoverages,
      summary,
      errors: validation,
    });
    setEditorOpen(true);
  };

  const handleConfirmDeletePolicy = (policyId: string) => {
    const target = policies.find((p) => p.id === policyId);
    const nextPolicies = deletePolicyById(policies, policyId);
    setPolicies(nextPolicies);
    setPolicyToDelete(null);

    if (viewScope === 'policy' && activePolicy?.id === policyId) {
      if (nextPolicies.length > 0) {
        setActivePolicyId(nextPolicies[0].id);
      }
      setViewScope('portfolio');
    }

    if (target) {
      setCrudStatusMessage(
        `Apólice N.º ${target.metadata.policyNumber} (${target.projectName}) eliminada da carteira.`
      );
    }
  };

  const handleResetAllPolicies = () => {
    const restored = resetStoredPolicies();
    setPolicies(restored);
    setActivePolicyId(restored[0].id);
    setViewScope('portfolio');
    setCrudStatusMessage('Carteira restaurada para as 4 apólices originais dos documentos PDF.');
  };

  const handleSaveMember = (member: PolicyMember, syncPolicyTotal: boolean) => {
    if (!activePolicy) return;
    const updated = upsertMemberInPolicy(activePolicy, member, syncPolicyTotal);
    setPolicies((prev) => upsertPolicy(prev, updated));
    setCrudStatusMessage(
      `Aderente "${member.name}" guardado na ${updated.shortLabel}. Totais recalculados.`
    );
  };

  const handleDeleteMember = (memberId: number, syncPolicyTotal: boolean) => {
    if (!activePolicy) return;
    const removed = activePolicy.members.find((m) => m.id === memberId);
    const updated = deleteMemberFromPolicy(activePolicy, memberId, syncPolicyTotal);
    setPolicies((prev) => upsertPolicy(prev, updated));
    if (removed) {
      setCrudStatusMessage(
        `Aderente "${removed.name}" removido da ${updated.shortLabel}. Totais recalculados.`
      );
    }
  };

  const handleDownloadExcel = async () => {
    if (policies.length === 0) return;
    setIsExporting(true);
    setExportError(null);
    try {
      const options = {
        referenceDateIso,
        includeSimulatorSheet,
        includeConditionalFormatting,
        simulatedExpenses,
      };
      const filename =
        viewScope === 'portfolio' || !activePolicy
          ? await downloadPortfolioWorkbook(policies, options)
          : await downloadPolicyWorkbook(activePolicy, options);
      setLastExportFile(filename);
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : 'Não foi possível gerar o ficheiro Excel.'
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleResetPolicyExpenses = () => {
    if (!activePolicy) return;
    setSimulatedExpenses((prev) => {
      const next = { ...prev };
      for (const sc of activePolicy.simulatorScenarios) {
        next[sc.id] = sc.defaultExpenseAKZ;
      }
      return next;
    });
  };

  const handleApplyPreset = (preset: 'low' | 'typical' | 'stress') => {
    if (!activePolicy) return;
    if (preset === 'typical') {
      handleResetPolicyExpenses();
      return;
    }
    const factor = preset === 'low' ? 0.45 : 1.35;
    setSimulatedExpenses((prev) => {
      const next = { ...prev };
      for (const sc of activePolicy.simulatorScenarios) {
        next[sc.id] =
          preset === 'stress' && sc.limitAKZ <= 1000000
            ? Math.round((sc.limitAKZ * 1.25) / 1000) * 1000
            : Math.round((sc.defaultExpenseAKZ * factor) / 1000) * 1000;
      }
      return next;
    });
  };

  const sheetTabs: Array<{ id: SheetTabId; label: string }> = activePolicy
    ? [
        { id: 'resumo', label: 'Resumo Executivo' },
        { id: 'aderentes', label: `Aderentes (${activePolicy.members.length})` },
        { id: 'coberturas', label: `Coberturas (${activePolicy.coverages.length})` },
        { id: 'simulador', label: 'Simulador de Custos' },
      ]
    : [];

  return (
    <div className="min-h-screen flex bg-[#F5F7FB] dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 transition-colors">
      <Sidebar
        policies={policies}
        viewScope={viewScope}
        activePolicy={activePolicy}
        activeTab={activeTab}
        onSelectPortfolio={() => setViewScope('portfolio')}
        onSelectPolicySheet={handleSelectPolicySheet}
        onCreatePolicy={handleOpenCreatePolicy}
        includeSimulatorSheet={includeSimulatorSheet}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          theme={theme}
          onToggleTheme={() => setTheme((prev) => toggleThemeMode(prev))}
          policiesCount={policies.length}
          viewScope={viewScope}
          activePolicy={activePolicy}
          activeTab={activeTab}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onCreatePolicy={handleOpenCreatePolicy}
          onOpenExportConfig={() => setExportConfigOpen(true)}
          onDownloadExcel={handleDownloadExcel}
          isExporting={isExporting}
          lastExportFile={lastExportFile}
        />

        <main className="flex-1 px-4 sm:px-6 py-6 max-w-[1400px] w-full mx-auto">
          {exportError && (
            <div
              role="alert"
              className="mb-5 px-4 py-3 text-xs font-medium text-red-800 dark:text-red-200 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 rounded-lg"
            >
              Erro na exportação: {exportError}
            </div>
          )}

          {crudStatusMessage && (
            <div
              role="status"
              className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 text-xs text-cyan-900 dark:text-cyan-200 bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-200 dark:border-cyan-800/80 rounded-lg"
            >
              <span>{crudStatusMessage}</span>
              <button
                type="button"
                onClick={() => setCrudStatusMessage(null)}
                className="text-cyan-800 dark:text-cyan-300 hover:text-cyan-950 dark:hover:text-white font-semibold self-start sm:self-auto"
              >
                Dispensar
              </button>
            </div>
          )}

          {lastExportFile && (
            <div
              role="status"
              className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 text-xs text-emerald-900 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 rounded-lg"
            >
              <span>
                Ficheiro Excel gerado com sucesso:{' '}
                <strong className="font-mono">{lastExportFile}</strong>
              </span>
              <button
                type="button"
                onClick={() => setLastExportFile(null)}
                className="text-emerald-800 dark:text-emerald-300 hover:text-emerald-950 dark:hover:text-emerald-100 font-semibold self-start sm:self-auto"
              >
                Dispensar
              </button>
            </div>
          )}

          {viewScope === 'portfolio' || !activePolicy ? (
            <PortfolioSummaryView
              policies={policies}
              hasCustomChanges={hasCustomChanges}
              onOpenPolicy={handleSelectPolicySheet}
              onCreatePolicy={handleOpenCreatePolicy}
              onEditPolicy={handleOpenEditPolicy}
              onRequestDeletePolicy={setPolicyToDelete}
              onResetDefaults={handleResetAllPolicies}
              onImportedDocument={handleImportedPortfolioDocument}
            />
          ) : (
            <>
              {activeTab === 'resumo' && (
                <ExecutiveSummaryView
                  key={`res-${activePolicy.id}`}
                  policy={activePolicy}
                  policyIndex={activePolicyIndex}
                  referenceDateIso={referenceDateIso}
                  onNavigateSheet={setActiveTab}
                  onEditPolicy={handleOpenEditPolicy}
                  onRequestDeletePolicy={setPolicyToDelete}
                />
              )}

              {activeTab === 'aderentes' && (
                <MembersSheetView
                  key={`mem-${activePolicy.id}`}
                  policy={activePolicy}
                  referenceDateIso={referenceDateIso}
                  onSaveMember={handleSaveMember}
                  onDeleteMember={handleDeleteMember}
                />
              )}

              {activeTab === 'coberturas' && (
                <CoveragesSheetView key={`cov-${activePolicy.id}`} policy={activePolicy} />
              )}

              {activeTab === 'simulador' && (
                <SimulatorSheetView
                  key={`sim-${activePolicy.id}`}
                  policy={activePolicy}
                  expenses={simulatedExpenses}
                  onChangeExpense={(id, val) =>
                    setSimulatedExpenses((prev) => ({ ...prev, [id]: val }))
                  }
                  onResetDefaults={handleResetPolicyExpenses}
                  onApplyPreset={handleApplyPreset}
                />
              )}
            </>
          )}
        </main>

        {/* Excel-style Bottom Sheet Tabs Bar */}
        <footer className="bg-white dark:bg-[#111A2E] border-t border-slate-200 dark:border-slate-800/90 px-4 sm:px-6 py-2 transition-colors">
          <div className="flex flex-wrap items-center justify-between gap-3 max-w-[1400px] mx-auto">
            {viewScope === 'portfolio' || !activePolicy ? (
              <div
                role="tablist"
                aria-label="Acesso rápido às apólices"
                className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1 py-0.5"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={true}
                  onClick={() => setViewScope('portfolio')}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-md bg-cyan-50 dark:bg-cyan-950/60 text-cyan-900 dark:text-cyan-200 border border-cyan-200 dark:border-cyan-700/70 whitespace-nowrap shrink-0"
                >
                  Resumo Geral ({policies.length})
                </button>
                {policies.map((pol, idx) => {
                  const accent = getPolicyAccent(pol, idx);
                  return (
                    <button
                      key={pol.id}
                      type="button"
                      role="tab"
                      aria-selected={false}
                      onClick={() => handleSelectPolicySheet(pol.id, 'resumo')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white border border-transparent whitespace-nowrap shrink-0"
                    >
                      <span className={`h-2 w-2 rounded-full ${accent.topBarBg}`} aria-hidden="true" />
                      {pol.projectName} · {pol.metadata.policyNumber} ({pol.members.length})
                    </button>
                  );
                })}
              </div>
            ) : (
              <div
                role="tablist"
                aria-label="Separadores do livro Excel"
                className="flex flex-wrap items-center gap-1 min-w-0 flex-1 py-0.5"
              >
                {sheetTabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        isActive
                          ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-900 dark:text-cyan-200 border border-cyan-200 dark:border-cyan-700/70 font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white border border-transparent'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            )}
            <span className="hidden md:inline text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
              {viewScope === 'portfolio' || !activePolicy
                ? `Carteira Consolidada: ${policies.length} ${policies.length === 1 ? 'apólice' : 'apólices'} · ${portfolioStats.totalMembers} aderentes`
                : `${activePolicy.shortLabel} (${activePolicy.projectName}): 4 folhas · Fórmulas dinâmicas ativas`}
            </span>
          </div>
        </footer>
      </div>

      <ExportConfigModal
        open={exportConfigOpen}
        onClose={() => setExportConfigOpen(false)}
        scopeTitle={
          viewScope === 'portfolio' || !activePolicy
            ? `Carteira Consolidada (${policies.length} Apólices · ${portfolioStats.totalMembers} Aderentes)`
            : `${activePolicy.shortLabel} (${activePolicy.projectName}) — ${activePolicy.metadata.insurer}`
        }
        isPortfolio={viewScope === 'portfolio' || !activePolicy}
        referenceDateIso={referenceDateIso}
        onChangeReferenceDate={setReferenceDateIso}
        includeSimulatorSheet={includeSimulatorSheet}
        onToggleSimulatorSheet={setIncludeSimulatorSheet}
        includeConditionalFormatting={includeConditionalFormatting}
        onToggleConditionalFormatting={setIncludeConditionalFormatting}
        onExportNow={handleDownloadExcel}
        isExporting={isExporting}
      />

      <PolicyEditorModal
        open={editorOpen}
        mode={editorMode}
        initialPolicy={editingPolicy}
        prefilledImport={prefilledImport}
        existingPolicies={policies}
        onClose={() => {
          setEditorOpen(false);
          setPrefilledImport(null);
        }}
        onSave={handleSavePolicy}
      />

      <DeleteConfirmModal
        policy={policyToDelete}
        onCancel={() => setPolicyToDelete(null)}
        onConfirm={handleConfirmDeletePolicy}
      />
    </div>
  );
}
