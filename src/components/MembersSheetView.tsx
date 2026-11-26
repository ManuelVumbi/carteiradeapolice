import { FormEvent, useMemo, useState } from 'react';
import { ArrowUpDown, Check, Pencil, Plus, RotateCcw, Search, Trash2, X } from 'lucide-react';
import {
  calculateAge,
  formatAKZ,
  formatDatePT,
  getAgeBracket,
} from '../data/policies';
import { Gender, InsurancePolicy, PolicyMember } from '../data/types';

interface MembersSheetViewProps {
  policy: InsurancePolicy;
  referenceDateIso: string;
  onSaveMember: (member: PolicyMember, syncPolicyTotal: boolean) => void;
  onDeleteMember: (memberId: number, syncPolicyTotal: boolean) => void;
}

type SortField = 'id' | 'name' | 'age' | 'entryDate' | 'annualPremium';
type SortDir = 'asc' | 'desc';

export function MembersSheetView({
  policy,
  referenceDateIso,
  onSaveMember,
  onDeleteMember,
}: MembersSheetViewProps) {
  const members = policy.members;
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState<'Todos' | Gender>('Todos');
  const [bracketFilter, setBracketFilter] = useState<string>('Todos');
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Inline member editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
  const [formName, setFormName] = useState('');
  const [formBirthDate, setFormBirthDate] = useState('');
  const [formGender, setFormGender] = useState<Gender>('Masculino');
  const [formHealthCode, setFormHealthCode] = useState('');
  const [formEntryDate, setFormEntryDate] = useState(policy.metadata.effectiveDate);
  const [formPremium, setFormPremium] = useState('');
  const [formWaiting, setFormWaiting] = useState('Não');
  const [syncTotal, setSyncTotal] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const hasUnspecifiedGender = members.some((m) => m.gender === 'Não indicado');

  const enrichedMembers = useMemo(() => {
    const totalAll = members.reduce((acc, m) => acc + m.annualPremium, 0);
    return members.map((m) => {
      const age = calculateAge(m.birthDate, referenceDateIso);
      const bracket = getAgeBracket(age);
      return {
        ...m,
        age,
        bracket,
        monthlyEquivalent: m.annualPremium / 12,
        sharePercent: totalAll > 0 ? (m.annualPremium / totalAll) * 100 : 0,
      };
    });
  }, [members, referenceDateIso]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enrichedMembers
      .filter((m) => {
        if (genderFilter !== 'Todos' && m.gender !== genderFilter) return false;
        if (bracketFilter !== 'Todos' && m.bracket !== bracketFilter) return false;
        if (q) {
          const hay = `${m.name} ${m.healthCode} ${m.bracket} ${m.documentId}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const mult = sortDir === 'asc' ? 1 : -1;
        switch (sortField) {
          case 'name':
            return a.name.localeCompare(b.name, 'pt') * mult;
          case 'age':
            return ((a.age ?? -1) - (b.age ?? -1)) * mult;
          case 'entryDate':
            return a.entryDate.localeCompare(b.entryDate) * mult;
          case 'annualPremium':
            return (a.annualPremium - b.annualPremium) * mult;
          default:
            return (a.id - b.id) * mult;
        }
      });
  }, [enrichedMembers, search, genderFilter, bracketFilter, sortField, sortDir]);

  const filteredTotal = filtered.reduce((acc, m) => acc + m.annualPremium, 0);
  const filteredMonthly = filteredTotal / 12;
  const validAges = filtered.map((m) => m.age).filter((a): a is number => a !== null);
  const filteredAvgAge =
    validAges.length > 0 ? validAges.reduce((acc, a) => acc + a, 0) / validAges.length : null;

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const resetFilters = () => {
    setSearch('');
    setGenderFilter('Todos');
    setBracketFilter('Todos');
  };

  const openAddMember = () => {
    setEditingMemberId(null);
    setFormName('');
    setFormBirthDate('');
    setFormGender('Masculino');
    setFormHealthCode('');
    setFormEntryDate(policy.metadata.effectiveDate);
    setFormPremium('');
    setFormWaiting('Não');
    setFormError(null);
    setEditorOpen(true);
  };

  const openEditMember = (m: PolicyMember) => {
    setEditingMemberId(m.id);
    setFormName(m.name);
    setFormBirthDate(m.birthDate ?? '');
    setFormGender(m.gender);
    setFormHealthCode(m.healthCode);
    setFormEntryDate(m.entryDate);
    setFormPremium(String(m.annualPremium));
    setFormWaiting(m.waitingPeriod);
    setFormError(null);
    setEditorOpen(true);
  };

  const handleMemberSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleanName = formName.trim();
    if (!cleanName) {
      setFormError('Indique o nome completo do aderente.');
      return;
    }
    const prem = Number(formPremium);
    if (!Number.isFinite(prem) || prem < 0) {
      setFormError('Indique um prémio anual válido (AKZ ≥ 0).');
      return;
    }

    const existing = members.find((m) => m.id === editingMemberId);
    const nextMember: PolicyMember = {
      id: editingMemberId ?? members.reduce((max, m) => Math.max(max, m.id), 0) + 1,
      name: cleanName,
      birthDate: formBirthDate.trim() ? formBirthDate.trim() : null,
      gender: formGender,
      documentId: existing?.documentId ?? '',
      healthCode:
        formHealthCode.trim() ||
        `${policy.metadata.policyNumber}-${String(members.length + 1).padStart(3, '0')}`,
      entryDate: formEntryDate.trim() || policy.metadata.effectiveDate,
      annualPremium: Math.round(prem * 100) / 100,
      waitingPeriod: formWaiting.trim() || 'Não',
      plan: existing?.plan ?? policy.metadata.planName,
    };

    onSaveMember(nextMember, syncTotal);
    setEditorOpen(false);
    setFormError(null);
  };

  const genderOptions: Array<'Todos' | Gender> = hasUnspecifiedGender
    ? ['Todos', 'Masculino', 'Feminino', 'Não indicado']
    : ['Todos', 'Masculino', 'Feminino'];

  const inputCls =
    'w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500';

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Folha 2 · Lista Nominal de Aderentes ({policy.shortLabel})
          </h1>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            {policy.hasBirthDates ? (
              <>
                Tabela interativa com idades calculadas a{' '}
                <span className="font-mono tabular-nums font-medium">
                  {formatDatePT(referenceDateIso)}
                </span>
                . Pode adicionar, editar ou eliminar aderentes com recálculo automático.
              </>
            ) : (
              'Listagem extraída da Nota de Pagamento. Pode adicionar, editar ou eliminar aderentes com recálculo automático.'
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <p className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400">
            {filtered.length} de {members.length} aderentes ·{' '}
            <strong className="text-emerald-700 dark:text-emerald-400">
              {formatAKZ(filteredTotal)}
            </strong>
          </p>
          <button
            type="button"
            onClick={openAddMember}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Adicionar Aderente
          </button>
        </div>
      </div>

      {/* Inline Add/Edit Member Panel */}
      {editorOpen && (
        <form
          onSubmit={handleMemberSubmit}
          noValidate
          className="bg-white dark:bg-[#111A2E] border border-cyan-300 dark:border-cyan-700/70 rounded-xl overflow-hidden"
        >
          <div className="h-1 w-full bg-cyan-500" />
          <div className="p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {editingMemberId !== null ? 'Actualizar Aderente' : 'Adicionar Novo Aderente'}
              </h2>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                aria-label="Fechar painel do aderente"
                className="p-1 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {formError && (
              <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                {formError}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              <div className="lg:col-span-2">
                <label htmlFor="sheet-mem-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nome Completo *
                </label>
                <input
                  id="sheet-mem-name"
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Nome do aderente"
                  className={inputCls}
                />
              </div>

              <div>
                <label htmlFor="sheet-mem-gender" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Género
                </label>
                <select
                  id="sheet-mem-gender"
                  value={formGender}
                  onChange={(e) => setFormGender(e.target.value as Gender)}
                  className={inputCls}
                >
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                  <option value="Não indicado">Não indicado</option>
                </select>
              </div>

              <div>
                <label htmlFor="sheet-mem-birth" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nascimento
                </label>
                <input
                  id="sheet-mem-birth"
                  type="date"
                  value={formBirthDate}
                  onChange={(e) => setFormBirthDate(e.target.value)}
                  className={`${inputCls} font-mono tabular-nums`}
                />
              </div>

              <div>
                <label htmlFor="sheet-mem-code" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cód. Saúde
                </label>
                <input
                  id="sheet-mem-code"
                  type="text"
                  value={formHealthCode}
                  onChange={(e) => setFormHealthCode(e.target.value)}
                  placeholder="Opcional"
                  className={`${inputCls} font-mono tabular-nums`}
                />
              </div>

              <div>
                <label htmlFor="sheet-mem-prem" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Prémio Anual (AKZ) *
                </label>
                <input
                  id="sheet-mem-prem"
                  type="number"
                  min={0}
                  step={0.01}
                  value={formPremium}
                  onChange={(e) => setFormPremium(e.target.value)}
                  placeholder="450000"
                  className={`${inputCls} font-mono tabular-nums`}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={syncTotal}
                  onChange={(e) => setSyncTotal(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 dark:bg-[#0B1120] text-cyan-600"
                />
                <span>Recalcular Prémio Total da apólice automaticamente</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
                >
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  {editingMemberId !== null ? 'Actualizar Aderente' : 'Guardar Aderente'}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Filter & Search Toolbar */}
      <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800/90 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <label htmlFor="member-search" className="sr-only">
              Pesquisar aderente por nome ou código saúde
            </label>
            <Search
              className="h-4 w-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="member-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Pesquisar nome ou código (${members[0]?.healthCode ?? ''})...`}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-[#0B1120] focus:outline-none focus:border-cyan-500"
            />
          </div>

          {policy.hasBirthDates && (
            <div
              role="group"
              aria-label="Filtrar por género"
              className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#0B1120] rounded-lg self-start"
            >
              {genderOptions.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGenderFilter(g)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    genderFilter === g
                      ? 'bg-white dark:bg-[#1A2744] text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {g === 'Não indicado' ? 'N/D' : g}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {policy.hasBirthDates && (
            <>
              <label htmlFor="bracket-select" className="text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                Faixa Etária:
              </label>
              <select
                id="bracket-select"
                value={bracketFilter}
                onChange={(e) => setBracketFilter(e.target.value)}
                className="px-3 py-2 text-xs font-medium bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="Todos">Todas as faixas</option>
                <option value="≤ 30 anos">≤ 30 anos</option>
                <option value="31–35 anos">31–35 anos</option>
                <option value="36–40 anos">36–40 anos</option>
                <option value="41–45 anos">41–45 anos</option>
                <option value="≥ 46 anos">≥ 46 anos</option>
              </select>
            </>
          )}

          {(search || genderFilter !== 'Todos' || bracketFilter !== 'Todos') && (
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

      {/* High-density Excel Grid */}
      <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800/90 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-14 px-6 text-center space-y-3">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {members.length === 0
                ? 'Esta apólice ainda não tem aderentes registados'
                : 'Nenhum aderente corresponde aos filtros selecionados'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {members.length === 0
                ? 'Clique em "Adicionar Aderente" para registar o primeiro beneficiário.'
                : 'Ajuste o termo de pesquisa ou limpe os filtros de género e faixa etária.'}
            </p>
            {members.length === 0 ? (
              <button
                type="button"
                onClick={openAddMember}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Adicionar Aderente
              </button>
            ) : (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-cyan-600 rounded-lg hover:bg-cyan-500"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] xl:text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800/90 bg-slate-50 dark:bg-[#141F36] font-semibold text-slate-600 dark:text-slate-300">
                  <th className="py-3 px-1.5 text-center w-8">
                    <button
                      type="button"
                      onClick={() => toggleSort('id')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                    >
                      N.º
                    </button>
                  </th>
                  <th className="py-3 px-1.5">
                    <button
                      type="button"
                      onClick={() => toggleSort('name')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                    >
                      Nome do Aderente
                      <ArrowUpDown className="h-3 w-3 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                    </button>
                  </th>
                  <th className="py-3 px-1.5 text-center whitespace-nowrap">Nasc.</th>
                  <th className="py-3 px-1 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => toggleSort('age')}
                      className="inline-flex items-center gap-0.5 hover:text-slate-900 dark:hover:text-white"
                    >
                      Id.
                      <ArrowUpDown className="h-3 w-3 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                    </button>
                  </th>
                  <th className="py-3 px-1.5 whitespace-nowrap">Sexo</th>
                  <th className="py-3 px-1.5 whitespace-nowrap">Cód. Saúde</th>
                  <th className="py-3 px-1.5 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => toggleSort('entryDate')}
                      className="inline-flex items-center gap-0.5 hover:text-slate-900 dark:hover:text-white"
                    >
                      {policy.billingNotice ? 'Início' : 'Entrada'}
                      <ArrowUpDown className="h-3 w-3 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                    </button>
                  </th>
                  <th className="py-3 px-1.5 whitespace-nowrap">Faixa</th>
                  <th className="py-3 px-1 text-center whitespace-nowrap">Car.</th>
                  <th className="py-3 px-1.5 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => toggleSort('annualPremium')}
                      className="inline-flex items-center gap-0.5 hover:text-slate-900 dark:hover:text-white ml-auto"
                    >
                      Prémio Anual
                      <ArrowUpDown className="h-3 w-3 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                    </button>
                  </th>
                  <th className="py-3 px-1.5 text-right whitespace-nowrap">Mensal</th>
                  <th className="py-3 px-1.5 text-right whitespace-nowrap">%</th>
                  <th className="py-3 px-1.5 text-right whitespace-nowrap">Gerir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filtered.map((m, idx) => (
                  <tr
                    key={`${m.healthCode}-${m.id}`}
                    className={`hover:bg-cyan-50/40 dark:hover:bg-[#16223B] transition-colors ${
                      idx % 2 === 1 ? 'bg-slate-50/35 dark:bg-[#0D1526]' : 'bg-white dark:bg-[#111A2E]'
                    }`}
                  >
                    <td className="py-2 px-1.5 text-center font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {m.id}
                    </td>
                    <td
                      className="py-2 px-1.5 font-medium text-slate-900 dark:text-white max-w-[175px] truncate"
                      title={m.name}
                    >
                      {m.name}
                    </td>
                    <td className="py-2 px-1.5 text-center font-mono tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {formatDatePT(m.birthDate)}
                    </td>
                    <td className="py-2 px-1 text-center font-mono tabular-nums text-slate-900 dark:text-slate-100">
                      {m.age !== null ? m.age : '—'}
                    </td>
                    <td className="py-2 px-1.5 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {m.gender === 'Masculino' ? 'Masc.' : m.gender === 'Feminino' ? 'Fem.' : 'N/D'}
                    </td>
                    <td className="py-2 px-1.5 font-mono tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {m.healthCode}
                    </td>
                    <td className="py-2 px-1.5 text-center font-mono tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {formatDatePT(m.entryDate)}
                    </td>
                    <td className="py-2 px-1.5 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {m.bracket.replace(' anos', '')}
                    </td>
                    <td className="py-2 px-1 text-center text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {m.waitingPeriod}
                    </td>
                    <td className="py-2 px-1.5 text-right font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                      {formatAKZ(m.annualPremium).replace(' AKZ', '')}
                    </td>
                    <td className="py-2 px-1.5 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {formatAKZ(m.monthlyEquivalent).replace(' AKZ', '')}
                    </td>
                    <td className="py-2 px-1.5 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {m.sharePercent.toFixed(1)}%
                    </td>
                    <td className="py-2 px-1.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => openEditMember(m)}
                          aria-label={`Editar aderente ${m.name}`}
                          className="p-1 rounded text-blue-600 dark:text-cyan-400 hover:bg-blue-50 dark:hover:bg-cyan-950/60"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteMember(m.id, syncTotal)}
                          aria-label={`Eliminar aderente ${m.name}`}
                          className="p-1 rounded text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 dark:border-slate-800/90 bg-slate-100/80 dark:bg-[#0E1628] font-semibold text-slate-900 dark:text-white">
                  <td className="py-3 px-1.5 text-center">Total</td>
                  <td className="py-3 px-1.5">{filtered.length} aderentes</td>
                  <td className="py-3 px-1.5" />
                  <td className="py-3 px-1 text-center font-mono tabular-nums">
                    {filteredAvgAge !== null ? filteredAvgAge.toFixed(1) : '—'}
                  </td>
                  <td className="py-3 px-1.5" colSpan={5} />
                  <td className="py-3 px-1.5 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                    {formatAKZ(filteredTotal).replace(' AKZ', '')}
                  </td>
                  <td className="py-3 px-1.5 text-right font-mono tabular-nums whitespace-nowrap">
                    {formatAKZ(filteredMonthly).replace(' AKZ', '')}
                  </td>
                  <td className="py-3 px-1.5 text-right font-mono tabular-nums whitespace-nowrap">
                    {filtered.reduce((acc, m) => acc + m.sharePercent, 0).toFixed(1)}%
                  </td>
                  <td className="py-3 px-1.5" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
