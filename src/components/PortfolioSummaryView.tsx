import { Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import {
  formatAKZ,
  formatDatePT,
  getPolicyGlobalLimit,
  getPortfolioStats,
} from '../data/policies';
import { InsurancePolicy } from '../data/types';
import { getPolicyAccent, shortInsurerName } from '../utils/policyAccents';
import type { ExtractedPolicyPayload } from '../utils/policyImport';
import { PolicyFileDropzone } from './PolicyFileDropzone';
import { SheetTabId } from './Sidebar';

interface PortfolioSummaryViewProps {
  policies: InsurancePolicy[];
  hasCustomChanges: boolean;
  onOpenPolicy: (policyId: string, tab?: SheetTabId) => void;
  onCreatePolicy: () => void;
  onEditPolicy: (policy: InsurancePolicy) => void;
  onRequestDeletePolicy: (policy: InsurancePolicy) => void;
  onResetDefaults: () => void;
  onImportedDocument: (extracted: ExtractedPolicyPayload, fileName: string) => void;
}

export function PortfolioSummaryView({
  policies,
  hasCustomChanges,
  onOpenPolicy,
  onCreatePolicy,
  onEditPolicy,
  onRequestDeletePolicy,
  onResetDefaults,
  onImportedDocument,
}: PortfolioSummaryViewProps) {
  const stats = getPortfolioStats(policies);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-cyan-700 dark:text-cyan-400">
            Carteira Consolidada de Seguros de Saúde · Grupo Espacie
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white text-balance">
            Resumo Geral das Apólices
          </h1>
          <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
            Visão integrada de {stats.totalPolicies} {stats.totalPolicies === 1 ? 'apólice activa' : 'apólices activas'} ({stats.totalMembers} aderentes). Adicione, actualize ou elimine qualquer apólice para recalcular automaticamente.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {hasCustomChanges && (
            <button
              type="button"
              onClick={onResetDefaults}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-[#17233D] border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
              Repor Originais (4)
            </button>
          )}
          <button
            type="button"
            onClick={onCreatePolicy}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Adicionar Apólice
          </button>
        </div>
      </div>

      {/* 4 KPI cards with colorful top accent bars */}
      <section aria-label="Indicadores globais da carteira" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800/90 rounded-xl overflow-hidden">
          <div className="h-1 w-full bg-cyan-500" />
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Volume Total Anual</p>
            <p className="mt-2 text-xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
              {formatAKZ(stats.totalAnnualPremium)}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              Equiv. {formatAKZ(stats.totalMonthlyEquivalent)} / mês
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800/90 rounded-xl overflow-hidden">
          <div className="h-1 w-full bg-rose-500" />
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Apólices na Carteira</p>
            <p className="mt-2 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white whitespace-nowrap">
              {stats.totalPolicies} {stats.totalPolicies === 1 ? 'apólice' : 'apólices'}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
              {policies.length > 0
                ? policies.map((p) => p.projectName).join(' · ')
                : 'Nenhuma apólice ativa'}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800/90 rounded-xl overflow-hidden">
          <div className="h-1 w-full bg-emerald-500" />
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total de Pessoas Seguras</p>
            <p className="mt-2 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white whitespace-nowrap">
              {stats.totalMembers} aderentes
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
              {stats.byInsurer.length > 0
                ? stats.byInsurer.map((i) => `${i.policyCount} ${shortInsurerName(i.insurer)}`).join(' · ')
                : 'Sem seguradoras associadas'}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800/90 rounded-xl overflow-hidden">
          <div className="h-1 w-full bg-amber-500" />
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Custo Médio / Aderente</p>
            <p className="mt-2 text-xl font-bold font-mono tabular-nums text-cyan-700 dark:text-cyan-400 whitespace-nowrap">
              {formatAKZ(stats.averagePremiumPerMember)}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Mín: {formatAKZ(stats.minMemberPremium)} · Máx: {formatAKZ(stats.maxMemberPremium)}
            </p>
          </div>
        </div>
      </section>

      <section aria-label="Importar ou actualizar apólice por ficheiro">
        <PolicyFileDropzone
          compact
          title="Adicionar ou Actualizar Apólice por Ficheiro (PDF, Word, Imagem, Excel)"
          description="Arraste ou selecione um documento da seguradora. O sistema identifica automaticamente a apólice e recalcula todos os quadros."
          existingPolicyContext={
            policies.length > 0
              ? `Apólices existentes: ${policies.map((p) => `${p.metadata.policyNumber} (${p.projectName})`).join(', ')}`
              : undefined
          }
          onExtracted={onImportedDocument}
        />
      </section>

      {policies.length === 0 ? (
        <section className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800/90 rounded-xl py-16 px-6 text-center space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            A carteira está vazia
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            Todas as apólices foram eliminadas. Adicione uma nova apólice para começar a calcular totais ou restaure as 4 apólices originais dos PDFs.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={onCreatePolicy}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Adicionar Primeira Apólice
            </button>
            <button
              type="button"
              onClick={onResetDefaults}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Repor 4 Apólices Originais
            </button>
          </div>
        </section>
      ) : (
        <>
          {/* Color-coded Policy Segments Bar (inspired by reference image) */}
          <section aria-label="Acesso rápido colorido por apólice" className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Segmentos & Projetos Ativos
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Clique num projeto para abrir o submenu detalhado
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {policies.map((pol, idx) => {
                const accent = getPolicyAccent(pol, idx);
                return (
                  <button
                    key={pol.id}
                    type="button"
                    onClick={() => onOpenPolicy(pol.id, 'resumo')}
                    className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full border transition-colors whitespace-nowrap shrink-0 ${accent.outlineButton}`}
                  >
                    <span className={`h-2 w-2 rounded-full ${accent.topBarBg}`} aria-hidden="true" />
                    <span>
                      {pol.projectName} · {pol.metadata.policyNumber}
                    </span>
                    <span className="font-mono tabular-nums opacity-80">({pol.members.length})</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Premiums by Policy: Total, Minimum, Average, Maximum + CRUD Actions */}
          <section aria-label="Prémios por apólice: total, mínimo, médio e máximo" className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800/90 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800/90 bg-slate-50/70 dark:bg-[#0E1628] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Prémios por Apólice — Total, Mínimo, Médio e Máximo
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {policies.map((p) => `${p.projectName} (${p.metadata.policyNumber})`).join(' · ')}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800/90 bg-slate-50/40 dark:bg-[#141F36] font-semibold text-slate-600 dark:text-slate-300">
                    <th className="py-3 px-2 w-9 text-center">#</th>
                    <th className="py-3 px-2 whitespace-nowrap">Projeto</th>
                    <th className="py-3 px-2 whitespace-nowrap">Apólice</th>
                    <th className="py-3 px-2 whitespace-nowrap">Seguradora</th>
                    <th className="py-3 px-2 text-right whitespace-nowrap">Ader.</th>
                    <th className="py-3 px-2 text-right whitespace-nowrap">Prémio Total</th>
                    <th className="py-3 px-2 text-right whitespace-nowrap">Mín. / Ader.</th>
                    <th className="py-3 px-2 text-right whitespace-nowrap">Méd. / Ader.</th>
                    <th className="py-3 px-2 text-right whitespace-nowrap">Máx. / Ader.</th>
                    <th className="py-3 px-2 text-right whitespace-nowrap">Gerir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {stats.byPolicy.map((row, idx) => {
                    const pol = policies[idx];
                    const accent = getPolicyAccent(pol, idx);
                    const hasNominalDiff = Math.abs(row.nominalMemberSum - row.totalPolicyPremium) >= 0.05;
                    return (
                      <tr
                        key={row.policyId}
                        className="hover:bg-slate-50/80 dark:hover:bg-[#16223B] transition-colors"
                      >
                        <td className="py-3 px-2 text-center">
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-mono font-bold ${accent.badgeBg}`}
                          >
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-3 px-2 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onOpenPolicy(row.policyId, 'resumo')}
                            className={`text-left hover:underline underline-offset-2 ${accent.textAccent}`}
                          >
                            {row.projectName}
                          </button>
                        </td>
                        <td className="py-3 px-2 font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onOpenPolicy(row.policyId, 'resumo')}
                            className="hover:underline underline-offset-2"
                          >
                            {row.policyNumber}
                          </button>
                        </td>
                        <td className="py-3 px-2 text-slate-700 dark:text-slate-300 max-w-[140px] truncate" title={row.insurer}>
                          {shortInsurerName(row.insurer)}
                        </td>
                        <td className="py-3 px-2 text-right font-mono tabular-nums text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {row.memberCount}
                        </td>
                        <td className="py-3 px-2 text-right font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                          {formatAKZ(row.totalPolicyPremium)}
                          {hasNominalDiff && (
                            <span className="block text-[11px] font-normal text-slate-500 dark:text-slate-400">
                              Nom.: {formatAKZ(row.nominalMemberSum)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {formatAKZ(row.minPremium)}
                          {row.zeroCount > 0 && (
                            <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                              &gt;0: {formatAKZ(row.minNonZeroPremium)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                          {formatAKZ(row.averagePolicyPerMember)}
                          {hasNominalDiff && (
                            <span className="block text-[11px] font-normal text-slate-500 dark:text-slate-400">
                              Nom.: {formatAKZ(row.averageNominalPerMember)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {formatAKZ(row.maxPremium)}
                        </td>
                        <td className="py-3 px-2 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => onEditPolicy(pol)}
                              aria-label={`Editar apólice ${row.policyNumber} (${row.projectName})`}
                              title="Actualizar apólice"
                              className="p-1.5 rounded-md text-blue-600 dark:text-cyan-400 hover:bg-blue-50 dark:hover:bg-cyan-950/60 transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onRequestDeletePolicy(pol)}
                              aria-label={`Eliminar apólice ${row.policyNumber} (${row.projectName})`}
                              title="Eliminar apólice"
                              className="p-1.5 rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 dark:border-slate-800/90 bg-slate-100/80 dark:bg-[#0E1628] font-semibold text-slate-900 dark:text-white">
                    <td className="py-3 px-2" colSpan={4}>
                      Consolidado da Carteira ({stats.totalPolicies} {stats.totalPolicies === 1 ? 'Apólice' : 'Apólices'})
                    </td>
                    <td className="py-3 px-2 text-right font-mono tabular-nums">{stats.totalMembers}</td>
                    <td className="py-3 px-2 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                      {formatAKZ(stats.totalAnnualPremium)}
                    </td>
                    <td className="py-3 px-2 text-right font-mono tabular-nums whitespace-nowrap">
                      {formatAKZ(stats.minMemberPremium)}
                      {stats.minMemberPremium === 0 && stats.minNonZeroMemberPremium > 0 && (
                        <span className="block text-[11px] font-normal text-slate-500 dark:text-slate-400">
                          &gt;0: {formatAKZ(stats.minNonZeroMemberPremium)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-right font-mono tabular-nums whitespace-nowrap">
                      {formatAKZ(stats.averagePremiumPerMember)}
                    </td>
                    <td className="py-3 px-2 text-right font-mono tabular-nums whitespace-nowrap">
                      {formatAKZ(stats.maxMemberPremium)}
                    </td>
                    <td className="py-3 px-2" />
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800/90 bg-slate-50/50 dark:bg-[#0D1424] text-[11px] text-slate-600 dark:text-slate-400">
              Nota: Nos contratos da A Mundial, o Prémio Total da apólice inclui encargos e impostos adicionais face à soma nominal dos aderentes. Na apólice Total (5423633), 2 aderentes figuram com prémio individual de 0,00 AKZ (menor valor contributivo &gt; 0: 166.738,72 AKZ).
            </div>
          </section>

          {/* Comparative Policies Table */}
          <section className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800/90 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800/90 bg-slate-50/70 dark:bg-[#0E1628] flex items-center justify-between gap-4">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Quadro Comparativo das {policies.length} {policies.length === 1 ? 'Apólice' : 'Apólices'}
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
                Clique numa apólice para expandir o respetivo submenu
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800/90 bg-slate-50/40 dark:bg-[#141F36] font-semibold text-slate-600 dark:text-slate-300">
                    <th className="py-3 px-2 whitespace-nowrap">Projeto</th>
                    <th className="py-3 px-2 whitespace-nowrap">Apólice</th>
                    <th className="py-3 px-2 whitespace-nowrap">Seguradora & Produto</th>
                    <th className="py-3 px-2 whitespace-nowrap">Tomador</th>
                    <th className="py-3 px-2 whitespace-nowrap">Plano</th>
                    <th className="py-3 px-2 whitespace-nowrap">Vigência</th>
                    <th className="py-3 px-1.5 text-right whitespace-nowrap">Ader.</th>
                    <th className="py-3 px-2 text-right whitespace-nowrap">Limite Máx.</th>
                    <th className="py-3 px-2 text-right whitespace-nowrap">Prémio Anual</th>
                    <th className="py-3 px-2 text-right whitespace-nowrap">Submenu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {policies.map((pol, idx) => {
                    const gl = getPolicyGlobalLimit(pol);
                    const accent = getPolicyAccent(pol, idx);
                    return (
                      <tr
                        key={pol.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-[#16223B] transition-colors"
                      >
                        <td className="py-3 px-2 font-semibold text-slate-900 dark:text-white max-w-[125px]">
                          <span className="flex items-center gap-2 min-w-0">
                            <span className={`h-2 w-2 rounded-full shrink-0 ${accent.topBarBg}`} aria-hidden="true" />
                            <span className="truncate" title={pol.projectName}>
                              {pol.projectName}
                            </span>
                          </span>
                        </td>
                        <td className="py-3 px-2 font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {pol.metadata.policyNumber}
                          <span className="block font-sans text-[11px] font-normal text-slate-500 dark:text-slate-400">
                            Acta {pol.metadata.endorsementNumber}
                          </span>
                        </td>
                        <td className="py-3 px-2 max-w-[140px]">
                          <span className="font-semibold text-slate-900 dark:text-slate-100 block truncate" title={pol.metadata.insurer}>
                            {pol.metadata.insurer}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 block truncate" title={pol.metadata.product}>
                            {pol.metadata.product}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-slate-700 dark:text-slate-300 max-w-[125px]">
                          <span className="block truncate font-medium text-slate-900 dark:text-slate-100" title={pol.holder.name}>
                            {pol.holder.name}
                          </span>
                          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            NIF {pol.holder.nif}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-slate-700 dark:text-slate-300 max-w-[120px]">
                          <span className="block truncate" title={pol.metadata.planName}>{pol.metadata.planName}</span>
                        </td>
                        <td className="py-3 px-2 font-mono tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {formatDatePT(pol.metadata.effectiveDate)}
                          <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                            até {formatDatePT(pol.metadata.expiryDate)}
                          </span>
                        </td>
                        <td className="py-3 px-1.5 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onOpenPolicy(pol.id, 'aderentes')}
                            className="hover:text-cyan-600 dark:hover:text-cyan-400 underline decoration-slate-300 dark:decoration-slate-600 underline-offset-2"
                          >
                            {pol.members.length}
                          </button>
                        </td>
                        <td className="py-3 px-2 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {formatAKZ(gl.numericLimit).replace(' AKZ', '')}
                        </td>
                        <td className="py-3 px-2 text-right font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                          {formatAKZ(pol.metadata.totalAnnualPremium)}
                        </td>
                        <td className="py-3 px-2 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onOpenPolicy(pol.id, 'resumo')}
                            className={`text-xs font-semibold hover:underline underline-offset-2 whitespace-nowrap ${accent.textAccent}`}
                          >
                            Abrir →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 dark:border-slate-800/90 bg-slate-100/80 dark:bg-[#0E1628] font-semibold text-slate-900 dark:text-white">
                    <td className="py-3 px-2.5" colSpan={6}>
                      Total Consolidado da Carteira ({stats.totalPolicies} {stats.totalPolicies === 1 ? 'Apólice' : 'Apólices'})
                    </td>
                    <td className="py-3 px-2 text-right font-mono tabular-nums">
                      {stats.totalMembers}
                    </td>
                    <td className="py-3 px-2.5 text-right text-slate-500 dark:text-slate-400">—</td>
                    <td className="py-3 px-2.5 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                      {formatAKZ(stats.totalAnnualPremium)}
                    </td>
                    <td className="py-3 px-2.5" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          {/* Distribution by Insurer and Holder */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800/90 rounded-xl overflow-hidden">
              <div className="h-1 w-full bg-violet-500" />
              <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800/90 bg-slate-50/70 dark:bg-[#0E1628]">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Distribuição por Seguradora
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800/90 text-slate-500 dark:text-slate-400 font-semibold bg-slate-50/40 dark:bg-[#141F36]">
                      <th className="py-2.5 px-4">Seguradora</th>
                      <th className="py-2.5 px-3 text-right">Apólices</th>
                      <th className="py-2.5 px-3 text-right">Aderentes</th>
                      <th className="py-2.5 px-3 text-right">Prémio Anual</th>
                      <th className="py-2.5 px-4 text-right">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {stats.byInsurer.map((row) => (
                      <tr key={row.insurer} className="hover:bg-slate-50/70 dark:hover:bg-[#16223B]">
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                          {row.insurer}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums dark:text-slate-300">
                          {row.policyCount}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums dark:text-slate-300">
                          {row.memberCount}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums font-medium text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                          {formatAKZ(row.totalPremium)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                          {row.sharePercent.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800/90 rounded-xl overflow-hidden">
              <div className="h-1 w-full bg-blue-500" />
              <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800/90 bg-slate-50/70 dark:bg-[#0E1628]">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Distribuição por Tomador do Seguro
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800/90 text-slate-500 dark:text-slate-400 font-semibold bg-slate-50/40 dark:bg-[#141F36]">
                      <th className="py-2.5 px-4">Tomador / NIF</th>
                      <th className="py-2.5 px-3 text-right">Apólices</th>
                      <th className="py-2.5 px-3 text-right">Aderentes</th>
                      <th className="py-2.5 px-4 text-right">Prémio Anual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {stats.byHolder.map((row) => (
                      <tr key={`${row.holderName}-${row.nif}`} className="hover:bg-slate-50/70 dark:hover:bg-[#16223B]">
                        <td className="py-3 px-4">
                          <span className="font-medium text-slate-900 dark:text-white block">
                            {row.holderName}
                          </span>
                          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            NIF {row.nif}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums dark:text-slate-300">
                          {row.policyCount}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums dark:text-slate-300">
                          {row.memberCount}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                          {formatAKZ(row.totalPremium)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
