import { RotateCcw } from 'lucide-react';
import { formatAKZ } from '../data/policies';
import { InsurancePolicy } from '../data/types';
import { calculateScenarioCost } from '../utils/simulator';

interface SimulatorSheetViewProps {
  policy: InsurancePolicy;
  expenses: Record<string, number>;
  onChangeExpense: (scenarioId: string, value: number) => void;
  onResetDefaults: () => void;
  onApplyPreset: (preset: 'low' | 'typical' | 'stress') => void;
}

export function SimulatorSheetView({
  policy,
  expenses,
  onChangeExpense,
  onResetDefaults,
  onApplyPreset,
}: SimulatorSheetViewProps) {
  const scenarios = policy.simulatorScenarios;
  const results = scenarios.map((sc) => ({
    scenario: sc,
    result: calculateScenarioCost(sc, expenses[sc.id] ?? sc.defaultExpenseAKZ),
  }));

  const totals = results.reduce(
    (acc, { result }) => {
      acc.expense += result.expenseAKZ;
      acc.redePlusCost += result.beneficiaryCostRedePlus;
      acc.insurerPaid += result.insurerPaidRedePlus;
      acc.outReimbursement += result.reimbursementOutOfNetwork;
      acc.outCost += result.beneficiaryCostOutOfNetwork;
      acc.savings += result.savingsInRedePlus;
      return acc;
    },
    {
      expense: 0,
      redePlusCost: 0,
      insurerPaid: 0,
      outReimbursement: 0,
      outCost: 0,
      savings: 0,
    }
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white text-balance">
            Folha 4 · Simulador de Custos ({policy.shortLabel})
          </h1>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Altere as despesas estimadas abaixo. Os valores editados são exportados diretamente para as células amarelas do ficheiro Excel.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onApplyPreset('low')}
            className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-[#111A2E] border border-cyan-300 dark:border-cyan-700/60 rounded-lg text-cyan-700 dark:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 whitespace-nowrap"
          >
            Cenário Moderado
          </button>
          <button
            type="button"
            onClick={() => onApplyPreset('typical')}
            className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-[#111A2E] border border-blue-300 dark:border-blue-700/60 rounded-lg text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 whitespace-nowrap"
          >
            Cenário Base
          </button>
          <button
            type="button"
            onClick={() => onApplyPreset('stress')}
            className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-[#111A2E] border border-rose-300 dark:border-rose-700/60 rounded-lg text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 whitespace-nowrap"
          >
            Testar Excesso de Limite
          </button>
          <button
            type="button"
            onClick={onResetDefaults}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Repor
          </button>
        </div>
      </div>

      {/* Live Totals KPI strip with colored top accent bars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800/90 rounded-xl overflow-hidden">
          <div className="h-1 w-full bg-blue-500" />
          <div className="p-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Despesas Simuladas</p>
            <p className="mt-1.5 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white whitespace-nowrap">
              {formatAKZ(totals.expense)}
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800/90 rounded-xl overflow-hidden">
          <div className="h-1 w-full bg-amber-500" />
          <div className="p-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Custo Beneficiário (Rede+)</p>
            <p className="mt-1.5 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white whitespace-nowrap">
              {formatAKZ(totals.redePlusCost)}
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800/90 rounded-xl overflow-hidden">
          <div className="h-1 w-full bg-red-500" />
          <div className="p-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Custo Beneficiário (Fora da Rede)</p>
            <p className="mt-1.5 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white whitespace-nowrap">
              {formatAKZ(totals.outCost)}
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800/90 rounded-xl overflow-hidden">
          <div className="h-1 w-full bg-emerald-500" />
          <div className="p-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Poupança Estimada na Rede+</p>
            <p className="mt-1.5 text-xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
              {formatAKZ(totals.savings)}
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Calculator Grid */}
      <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800/90 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800/90 bg-slate-50 dark:bg-[#141F36] font-semibold text-slate-600 dark:text-slate-300">
                <th className="py-3 px-2.5">Cenário / Cobertura</th>
                <th className="py-3 px-2 text-right whitespace-nowrap">Limite (AKZ)</th>
                <th className="py-3 px-2 whitespace-nowrap">Regra Rede+</th>
                <th className="py-3 px-2 text-right whitespace-nowrap">Despesa (AKZ)</th>
                <th className="py-3 px-2 text-center whitespace-nowrap">Estado</th>
                <th className="py-3 px-2 text-right whitespace-nowrap">Rede+ (AKZ)</th>
                <th className="py-3 px-2 text-right whitespace-nowrap">Fora Rede (AKZ)</th>
                <th className="py-3 px-2.5 text-right whitespace-nowrap">Poupança (AKZ)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {results.map(({ scenario, result }) => (
                <tr key={scenario.id} className="hover:bg-slate-50/70 dark:hover:bg-[#16223B] transition-colors">
                  <td className="py-2.5 px-2.5 text-xs sm:text-sm font-medium text-slate-900 dark:text-white">
                    {scenario.label}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {formatAKZ(scenario.limitAKZ).replace(' AKZ', '')}
                  </td>
                  <td className="py-2.5 px-2 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {scenario.copayRuleLabel}
                  </td>
                  <td className="py-2 px-2 text-right">
                    <label htmlFor={`input-${scenario.id}`} className="sr-only">
                      Despesa estimada para {scenario.label}
                    </label>
                    <input
                      id={`input-${scenario.id}`}
                      type="number"
                      min={0}
                      step={5000}
                      value={result.expenseAKZ}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        onChangeExpense(scenario.id, Number.isFinite(val) && val >= 0 ? val : 0);
                      }}
                      className="w-24 px-2 py-1.5 text-right text-xs font-mono tabular-nums font-semibold bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700/80 rounded-md text-amber-950 dark:text-amber-200 focus:bg-white dark:focus:bg-[#0B1120] focus:outline-none focus:border-cyan-500"
                    />
                  </td>
                  <td className="py-2.5 px-2 text-center whitespace-nowrap">
                    {result.withinLimit ? (
                      <span className="font-medium text-emerald-700 dark:text-emerald-400">Dentro do limite</span>
                    ) : (
                      <span className="font-semibold text-red-700 dark:text-red-400">
                        Excede {formatAKZ(result.exceededByAKZ).replace(' AKZ', '')}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {formatAKZ(result.beneficiaryCostRedePlus).replace(' AKZ', '')}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {formatAKZ(result.beneficiaryCostOutOfNetwork).replace(' AKZ', '')}
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                    {formatAKZ(result.savingsInRedePlus).replace(' AKZ', '')}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 dark:border-slate-800/90 bg-slate-100/80 dark:bg-[#0E1628] font-semibold text-slate-900 dark:text-white">
                <td className="py-3 px-2.5">Total Simulado (AKZ)</td>
                <td className="py-3 px-2" colSpan={2} />
                <td className="py-3 px-2 text-right font-mono tabular-nums whitespace-nowrap">
                  {formatAKZ(totals.expense).replace(' AKZ', '')}
                </td>
                <td className="py-3 px-2" />
                <td className="py-3 px-2 text-right font-mono tabular-nums whitespace-nowrap">
                  {formatAKZ(totals.redePlusCost).replace(' AKZ', '')}
                </td>
                <td className="py-3 px-2 text-right font-mono tabular-nums whitespace-nowrap">
                  {formatAKZ(totals.outCost).replace(' AKZ', '')}
                </td>
                <td className="py-3 px-2.5 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                  {formatAKZ(totals.savings).replace(' AKZ', '')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
