import { useMemo, useState } from 'react';
import { RotateCcw, Search } from 'lucide-react';
import { formatAKZ } from '../data/policies';
import { CoverageCategory, InsurancePolicy } from '../data/types';

interface CoveragesSheetViewProps {
  policy: InsurancePolicy;
}

const CATEGORY_COLORS = [
  'border-cyan-500/70 text-cyan-700 dark:text-cyan-300 bg-cyan-50/70 dark:bg-cyan-950/30',
  'border-rose-500/70 text-rose-700 dark:text-rose-300 bg-rose-50/70 dark:bg-rose-950/30',
  'border-emerald-500/70 text-emerald-700 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/30',
  'border-blue-500/70 text-blue-700 dark:text-blue-300 bg-blue-50/70 dark:bg-blue-950/30',
  'border-amber-500/70 text-amber-800 dark:text-amber-300 bg-amber-50/70 dark:bg-amber-950/30',
  'border-violet-500/70 text-violet-700 dark:text-violet-300 bg-violet-50/70 dark:bg-violet-950/30',
];

export function CoveragesSheetView({ policy }: CoveragesSheetViewProps) {
  const coverages = policy.coverages;
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'Todas' | CoverageCategory>('Todas');
  const [onlyPrincipals, setOnlyPrincipals] = useState(false);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(coverages.map((c) => c.category)));
    return ['Todas', ...unique] as Array<'Todas' | CoverageCategory>;
  }, [coverages]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return coverages.filter((c) => {
      if (selectedCategory !== 'Todas' && c.category !== selectedCategory) return false;
      if (onlyPrincipals && c.level !== 'Principal') return false;
      if (q) {
        const hay = `${c.name} ${c.category} ${c.notes} ${c.limitLabel}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [coverages, search, selectedCategory, onlyPrincipals]);

  const resetFilters = () => {
    setSearch('');
    setSelectedCategory('Todas');
    setOnlyPrincipals(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Folha 3 · Plano de Coberturas ({policy.shortLabel})
          </h1>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            {policy.metadata.planName} · Limites de capital, co-pagamentos na Rede+ e comparticipação fora da rede.
          </p>
        </div>
        <p className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400">
          {filtered.length} de {coverages.length} linhas visíveis
        </p>
      </div>

      {/* Category & Search Toolbar */}
      <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800/90 rounded-xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <label htmlFor="coverage-search" className="sr-only">
              Pesquisar cobertura ou condição
            </label>
            <Search
              className="h-4 w-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="coverage-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar cobertura (ex: Hospitalização, Urgência, Medicamentos)..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-[#0B1120] focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyPrincipals}
                onChange={(e) => setOnlyPrincipals(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 dark:bg-[#0B1120] text-cyan-600 focus:ring-cyan-500"
              />
              <span>Mostrar apenas coberturas principais</span>
            </label>

            {(search || selectedCategory !== 'Todas' || onlyPrincipals) && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg whitespace-nowrap"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Limpar
              </button>
            )}
          </div>
        </div>

        <div
          role="group"
          aria-label="Filtrar por categoria de cobertura"
          className="flex flex-wrap items-center gap-2 pt-1"
        >
          {categories.map((cat, idx) => {
            const active = selectedCategory === cat;
            const colorClass = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? `${colorClass} font-semibold`
                    : 'border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-[#0E1628] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Coverages Table */}
      <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800/90 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-14 px-6 text-center space-y-3">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Nenhuma cobertura encontrada</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tente outro termo de pesquisa ou selecione &ldquo;Todas&rdquo; as categorias.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-cyan-600 rounded-lg hover:bg-cyan-500"
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800/90 bg-slate-50 dark:bg-[#141F36] text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <th className="py-3 px-2.5 text-center w-10">#</th>
                  <th className="py-3 px-3 whitespace-nowrap">Categoria</th>
                  <th className="py-3 px-2.5 whitespace-nowrap">Nível</th>
                  <th className="py-3 px-3">Cobertura / Benefício</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap">Limite Capital</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap">CoPagamento Rede+</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap">Fora da Rede</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap">Carência</th>
                  <th className="py-3 px-3">Condições / Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filtered.map((c) => {
                  const isPrincipal = c.level === 'Principal';
                  return (
                    <tr
                      key={c.id}
                      className={`transition-colors ${
                        isPrincipal
                          ? 'bg-cyan-50/50 dark:bg-cyan-950/25 hover:bg-cyan-50 dark:hover:bg-cyan-950/40'
                          : 'bg-white dark:bg-[#111A2E] hover:bg-slate-50/70 dark:hover:bg-[#16223B]'
                      }`}
                    >
                      <td className="py-2.5 px-2.5 text-center font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400">
                        {c.order}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {c.category}
                      </td>
                      <td className="py-2.5 px-2.5 text-xs whitespace-nowrap">
                        <span className={isPrincipal ? 'font-semibold text-cyan-700 dark:text-cyan-400' : 'text-slate-500 dark:text-slate-400'}>
                          {c.level}
                        </span>
                      </td>
                      <td
                        className={`py-2.5 px-3 max-w-sm ${
                          isPrincipal ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-800 dark:text-slate-200 pl-5'
                        }`}
                      >
                        {isPrincipal ? c.name : `- ${c.name}`}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap ${
                          isPrincipal ? 'font-semibold text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {c.numericLimit !== null && c.limitLabel.includes('AKZ')
                          ? formatAKZ(c.numericLimit)
                          : c.limitLabel}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono tabular-nums text-xs text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {c.copayRedePlus}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono tabular-nums text-xs text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {c.outOfNetworkShare}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono tabular-nums text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {c.waitingPeriod}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-400 max-w-xs">{c.notes}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
