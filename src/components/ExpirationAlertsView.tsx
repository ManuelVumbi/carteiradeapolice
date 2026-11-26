import { FormEvent, useMemo, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Stethoscope,
  Trash2,
  X,
} from 'lucide-react';
import { formatAKZ, formatDatePT } from '../data/policies';
import {
  InsurancePolicy,
  MedicalCertificateRecord,
  MedicalFitnessStatus,
  WorkMode,
} from '../data/types';
import {
  AlertSeverity,
  AlertsSummary,
  MedicalCertificateAlert,
  PolicyExpirationAlert,
  addYearsToIsoDate,
  formatDaysRemainingLabel,
} from '../utils/expirationAlerts';
import { SheetTabId } from './Sidebar';

interface ExpirationAlertsViewProps {
  policies: InsurancePolicy[];
  policyAlerts: PolicyExpirationAlert[];
  certificateAlerts: MedicalCertificateAlert[];
  summary: AlertsSummary;
  referenceDateIso: string;
  warningDays: number;
  hasCustomCertificates: boolean;
  onChangeReferenceDate: (iso: string) => void;
  onChangeWarningDays: (days: number) => void;
  onOpenPolicy: (policyId: string, tab?: SheetTabId) => void;
  onEditPolicy: (policy: InsurancePolicy) => void;
  onSaveCertificate: (record: MedicalCertificateRecord) => void;
  onDeleteCertificate: (id: string) => void;
  onResetCertificates: () => void;
}

type AlertsFilterTab = 'todos' | 'urgentes' | 'apolices' | 'atestados';

function SeverityBadge({ severity, daysRemaining }: { severity: AlertSeverity; daysRemaining: number }) {
  const label = formatDaysRemainingLabel(daysRemaining);
  if (severity === 'expired') {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono tabular-nums text-xs font-semibold text-red-700 dark:text-red-400 whitespace-nowrap">
        <AlertOctagon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>Expirado · {label}</span>
      </span>
    );
  }
  if (severity === 'critical') {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono tabular-nums text-xs font-semibold text-orange-700 dark:text-orange-400 whitespace-nowrap">
        <ShieldAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>Crítico · {label}</span>
      </span>
    );
  }
  if (severity === 'warning') {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono tabular-nums text-xs font-semibold text-amber-700 dark:text-amber-400 whitespace-nowrap">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>A Expirar · {label}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 font-mono tabular-nums text-xs font-medium text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>Válido · {label}</span>
    </span>
  );
}

export function ExpirationAlertsView({
  policies,
  policyAlerts,
  certificateAlerts,
  summary,
  referenceDateIso,
  warningDays,
  hasCustomCertificates,
  onChangeReferenceDate,
  onChangeWarningDays,
  onOpenPolicy,
  onEditPolicy,
  onSaveCertificate,
  onDeleteCertificate,
  onResetCertificates,
}: ExpirationAlertsViewProps) {
  const [filterTab, setFilterTab] = useState<AlertsFilterTab>('todos');
  const [search, setSearch] = useState('');

  // Certificate Add/Edit Form State
  const [formOpen, setFormOpen] = useState(false);
  const [editingCertId, setEditingCertId] = useState<string | null>(null);
  const [workerName, setWorkerName] = useState('');
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>(
    () => policies.find((p) => p.id === '29980')?.id ?? policies[0]?.id ?? ''
  );
  const [role, setRole] = useState('');
  const [workMode, setWorkMode] = useState<WorkMode>('Offshore');
  const [certificateType, setCertificateType] = useState('Atestado Médico Ocupacional Periódico');
  const [certificateNumber, setCertificateNumber] = useState('');
  const [issueDate, setIssueDate] = useState(referenceDateIso);
  const [expiryDate, setExpiryDate] = useState(() => addYearsToIsoDate(referenceDateIso, 1));
  const [fitnessStatus, setFitnessStatus] = useState<MedicalFitnessStatus>('Apto');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const workerSuggestions = useMemo(() => {
    const items: Array<{
      name: string;
      policyId: string;
      role: string;
      workMode: WorkMode;
    }> = [];
    for (const p of policies) {
      for (const m of p.members) {
        items.push({
          name: m.name,
          policyId: p.id,
          role: m.role ?? 'Colaborador',
          workMode: m.workMode ?? 'Onshore',
        });
      }
    }
    return items;
  }, [policies]);

  const filteredPolicyAlerts = useMemo(() => {
    if (filterTab === 'atestados') return [];
    const q = search.trim().toLowerCase();
    return policyAlerts.filter((a) => {
      if (filterTab === 'urgentes' && a.severity === 'valid') return false;
      if (!q) return true;
      return `${a.policyNumber} ${a.projectName} ${a.insurer}`.toLowerCase().includes(q);
    });
  }, [policyAlerts, filterTab, search]);

  const filteredCertAlerts = useMemo(() => {
    if (filterTab === 'apolices') return [];
    const q = search.trim().toLowerCase();
    return certificateAlerts.filter((a) => {
      if (filterTab === 'urgentes' && a.severity === 'valid') return false;
      if (!q) return true;
      const c = a.certificate;
      return `${c.workerName} ${c.role} ${c.certificateNumber} ${c.certificateType} ${c.policyNumber} ${c.workMode}`
        .toLowerCase()
        .includes(q);
    });
  }, [certificateAlerts, filterTab, search]);

  const openCreateCertificate = () => {
    const defaultPol = policies.find((p) => p.id === '29980') ?? policies[0];
    setEditingCertId(null);
    setWorkerName('');
    setSelectedPolicyId(defaultPol?.id ?? '');
    setRole('');
    setWorkMode('Offshore');
    setCertificateType('Atestado de Aptidão Offshore / Trabalho');
    setCertificateNumber(`AT-MED-${new Date().getFullYear()}-${String(certificateAlerts.length + 1).padStart(3, '0')}`);
    setIssueDate(referenceDateIso);
    setExpiryDate(addYearsToIsoDate(referenceDateIso, 1));
    setFitnessStatus('Apto');
    setNotes('');
    setFormError(null);
    setFormOpen(true);
  };

  const openEditCertificate = (cert: MedicalCertificateRecord) => {
    setEditingCertId(cert.id);
    setWorkerName(cert.workerName);
    setSelectedPolicyId(cert.policyId);
    setRole(cert.role);
    setWorkMode(cert.workMode);
    setCertificateType(cert.certificateType);
    setCertificateNumber(cert.certificateNumber);
    setIssueDate(cert.issueDate);
    setExpiryDate(cert.expiryDate);
    setFitnessStatus(cert.fitnessStatus);
    setNotes(cert.notes ?? '');
    setFormError(null);
    setFormOpen(true);
  };

  const handleWorkerNameChange = (val: string) => {
    setWorkerName(val);
    const match = workerSuggestions.find(
      (w) => w.name.toLowerCase() === val.trim().toLowerCase()
    );
    if (match) {
      setSelectedPolicyId(match.policyId);
      setRole(match.role);
      setWorkMode(match.workMode);
    }
  };

  const handleRenewCertificateOneYear = (cert: MedicalCertificateRecord) => {
    const baseDate = cert.expiryDate > referenceDateIso ? cert.expiryDate : referenceDateIso;
    const renewed: MedicalCertificateRecord = {
      ...cert,
      issueDate: referenceDateIso,
      expiryDate: addYearsToIsoDate(baseDate, 1),
      fitnessStatus: cert.fitnessStatus === 'Pendente' ? 'Apto' : cert.fitnessStatus,
    };
    onSaveCertificate(renewed);
  };

  const handleSubmitCertificate = (e: FormEvent) => {
    e.preventDefault();
    if (!workerName.trim()) {
      setFormError('Indique o nome do colaborador.');
      return;
    }
    if (!expiryDate.trim()) {
      setFormError('Indique a data de validade / expiração do atestado médico.');
      return;
    }
    const linkedPol = policies.find((p) => p.id === selectedPolicyId) ?? policies[0];
    const record: MedicalCertificateRecord = {
      id: editingCertId ?? `cert-${Date.now().toString(36)}`,
      workerName: workerName.trim(),
      policyId: linkedPol?.id ?? selectedPolicyId,
      policyNumber: linkedPol?.metadata.policyNumber ?? '29980',
      projectName: linkedPol?.projectName ?? 'Acidentes Trabalho (Geral)',
      role: role.trim() || 'Colaborador',
      workMode,
      certificateType: certificateType.trim() || 'Atestado Médico Ocupacional',
      certificateNumber:
        certificateNumber.trim() || `MED-${Date.now().toString().slice(-5)}`,
      issueDate: issueDate.trim() || referenceDateIso,
      expiryDate: expiryDate.trim(),
      fitnessStatus,
      notes: notes.trim() || undefined,
    };
    onSaveCertificate(record);
    setFormOpen(false);
    setFormError(null);
  };

  const inputCls =
    'w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
            Controlo Preventivo de Conformidade · Apólices & Saúde Ocupacional
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white text-balance">
            Alertas de Expiração — Apólices e Atestados Médicos
          </h1>
          <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
            Monitorização automática de vencimentos contratuais e validade de atestados médicos de aptidão (Onshore & Offshore) à data de {formatDatePT(referenceDateIso)}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {hasCustomCertificates && (
            <button
              type="button"
              onClick={onResetCertificates}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-[#17233D] border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
              Repor Atestados
            </button>
          )}
          <button
            type="button"
            onClick={openCreateCertificate}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Registar Atestado Médico
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <section aria-label="Resumo de alertas de expiração" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800/90 rounded-xl overflow-hidden">
          <div className="h-1 w-full bg-red-500" />
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Expirados</p>
            <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-red-700 dark:text-red-400">
              {summary.expiredCount}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Renovação imediata necessária
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800/90 rounded-xl overflow-hidden">
          <div className="h-1 w-full bg-orange-500" />
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Críticos (≤ 15 dias)</p>
            <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-orange-700 dark:text-orange-400">
              {summary.criticalCount}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Vencem nas próximas 2 semanas
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800/90 rounded-xl overflow-hidden">
          <div className="h-1 w-full bg-amber-500" />
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              A Expirar (≤ {warningDays} dias)
            </p>
            <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-amber-700 dark:text-amber-400">
              {summary.warningCount}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {summary.policyUrgentCount} apólice(s) · {summary.certificateUrgentCount} atestado(s) urgentes
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800/90 rounded-xl overflow-hidden">
          <div className="h-1 w-full bg-emerald-500" />
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Conformes / Válidos</p>
            <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
              {summary.validCount}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Sem alerta na janela de {warningDays} dias
            </p>
          </div>
        </div>
      </section>

      {/* Filter & Threshold Controls */}
      <section className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800/90 rounded-xl p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Filtrar tipo de alerta"
            className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#0B1120] rounded-lg"
          >
            {(
              [
                { id: 'todos', label: `Todos (${policyAlerts.length + certificateAlerts.length})` },
                { id: 'urgentes', label: `Urgentes (${summary.urgentCount})` },
                { id: 'apolices', label: `Apólices (${policyAlerts.length})` },
                { id: 'atestados', label: `Atestados (${certificateAlerts.length})` },
              ] as Array<{ id: AlertsFilterTab; label: string }>
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  filterTab === tab.id
                    ? 'bg-white dark:bg-[#1A2744] text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative min-w-[220px] flex-1 sm:flex-initial">
            <label htmlFor="alerts-search" className="sr-only">
              Pesquisar apólice ou colaborador
            </label>
            <Search
              className="h-4 w-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="alerts-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar apólice, nome ou função..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-slate-400" aria-hidden="true" />
            <label htmlFor="alert-ref-date" className="text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
              Data base:
            </label>
            <input
              id="alert-ref-date"
              type="date"
              value={referenceDateIso}
              onChange={(e) => onChangeReferenceDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-mono tabular-nums bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="alert-window-days" className="text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
              Antecedência:
            </label>
            <select
              id="alert-window-days"
              value={warningDays}
              onChange={(e) => onChangeWarningDays(Number(e.target.value))}
              className="px-2.5 py-1.5 text-xs font-medium bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
            >
              <option value={15}>15 dias</option>
              <option value={30}>30 dias</option>
              <option value={45}>45 dias</option>
              <option value={60}>60 dias</option>
              <option value={90}>90 dias</option>
            </select>
          </div>
        </div>
      </section>

      {/* Inline Medical Certificate Form */}
      {formOpen && (
        <form
          onSubmit={handleSubmitCertificate}
          noValidate
          className="bg-white dark:bg-[#111A2E] border border-cyan-300 dark:border-cyan-700/70 rounded-xl overflow-hidden"
        >
          <div className="h-1 w-full bg-cyan-500" />
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
                {editingCertId ? 'Actualizar Atestado Médico' : 'Registar Novo Atestado Médico'}
              </h2>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                aria-label="Fechar formulário de atestado médico"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label htmlFor="cert-worker" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Colaborador / Trabalhador *
                </label>
                <input
                  id="cert-worker"
                  type="text"
                  list="espacie-workers-list"
                  value={workerName}
                  onChange={(e) => handleWorkerNameChange(e.target.value)}
                  placeholder="Escreva ou selecione da lista de trabalhadores..."
                  className={inputCls}
                />
                <datalist id="espacie-workers-list">
                  {workerSuggestions.map((w, i) => (
                    <option key={`${w.policyId}-${w.name}-${i}`} value={w.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label htmlFor="cert-policy" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Apólice Associada
                </label>
                <select
                  id="cert-policy"
                  value={selectedPolicyId}
                  onChange={(e) => setSelectedPolicyId(e.target.value)}
                  className={inputCls}
                >
                  {policies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.projectName} ({p.metadata.policyNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="cert-mode" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Regime
                </label>
                <select
                  id="cert-mode"
                  value={workMode}
                  onChange={(e) => setWorkMode(e.target.value as WorkMode)}
                  className={inputCls}
                >
                  <option value="Offshore">Offshore</option>
                  <option value="Onshore">Onshore</option>
                </select>
              </div>

              <div>
                <label htmlFor="cert-role" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Função
                </label>
                <input
                  id="cert-role"
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Ex: Electricista, Tubista"
                  className={inputCls}
                />
              </div>

              <div>
                <label htmlFor="cert-type" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tipo de Atestado
                </label>
                <input
                  id="cert-type"
                  type="text"
                  value={certificateType}
                  onChange={(e) => setCertificateType(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label htmlFor="cert-num" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  N.º do Atestado
                </label>
                <input
                  id="cert-num"
                  type="text"
                  value={certificateNumber}
                  onChange={(e) => setCertificateNumber(e.target.value)}
                  className={`${inputCls} font-mono tabular-nums`}
                />
              </div>

              <div>
                <label htmlFor="cert-status" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Aptidão Clínica
                </label>
                <select
                  id="cert-status"
                  value={fitnessStatus}
                  onChange={(e) => setFitnessStatus(e.target.value as MedicalFitnessStatus)}
                  className={inputCls}
                >
                  <option value="Apto">Apto</option>
                  <option value="Apto com Restrições">Apto com Restrições</option>
                  <option value="Pendente">Pendente</option>
                </select>
              </div>

              <div>
                <label htmlFor="cert-issue" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Data de Emissão
                </label>
                <input
                  id="cert-issue"
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className={`${inputCls} font-mono tabular-nums`}
                />
              </div>

              <div>
                <label htmlFor="cert-expiry" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Data de Validade / Expiração *
                </label>
                <input
                  id="cert-expiry"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className={`${inputCls} font-mono tabular-nums`}
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="cert-notes" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Observações Médicas / Logísticas
                </label>
                <input
                  id="cert-notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Exames periódicos agendados, requisito de embarque..."
                  className={inputCls}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
              >
                {editingCertId ? 'Guardar Alterações' : 'Guardar Atestado Médico'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Section 1: Policy Expirations */}
      {filterTab !== 'atestados' && (
        <section className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800/90 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800/90 bg-slate-50/70 dark:bg-[#0E1628] flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Vencimento das Apólices ({filteredPolicyAlerts.length})
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Ordenadas por data de expiração mais próxima
            </span>
          </div>

          {filteredPolicyAlerts.length === 0 ? (
            <div className="py-10 px-6 text-center text-xs text-slate-500 dark:text-slate-400">
              Nenhuma apólice corresponde aos filtros selecionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800/90 bg-slate-50/40 dark:bg-[#141F36] font-semibold text-slate-600 dark:text-slate-300">
                    <th className="py-3 px-4 whitespace-nowrap">Apólice / Projeto</th>
                    <th className="py-3 px-3 whitespace-nowrap">Categoria</th>
                    <th className="py-3 px-3 whitespace-nowrap">Seguradora</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">Pessoas</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">Prémio</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">Vencimento</th>
                    <th className="py-3 px-3 whitespace-nowrap">Estado do Alerta</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Acção</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredPolicyAlerts.map((alert) => {
                    const targetPol = policies.find((p) => p.id === alert.policyId);
                    return (
                      <tr key={alert.policyId} className="hover:bg-slate-50/70 dark:hover:bg-[#16223B]">
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => onOpenPolicy(alert.policyId, 'resumo')}
                            className="font-semibold text-slate-900 dark:text-white hover:underline text-left"
                          >
                            Apólice {alert.policyNumber} · {alert.projectName}
                          </button>
                        </td>
                        <td className="py-3 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {alert.policyCategory === 'acidente_trabalho'
                            ? 'Acidentes de Trabalho'
                            : 'Seguro de Saúde'}
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {alert.insurer}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-900 dark:text-slate-100">
                          {alert.memberCount}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                          {formatAKZ(alert.totalAnnualPremium)}
                        </td>
                        <td className="py-3 px-3 text-center font-mono tabular-nums text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {formatDatePT(alert.expiryDate)}
                        </td>
                        <td className="py-3 px-3">
                          <SeverityBadge severity={alert.severity} daysRemaining={alert.daysRemaining} />
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {targetPol && (
                            <button
                              type="button"
                              onClick={() => onEditPolicy(targetPol)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-cyan-300 bg-blue-50 dark:bg-cyan-950/60 border border-blue-200 dark:border-cyan-800/80 rounded-md hover:bg-blue-100 dark:hover:bg-cyan-900/70"
                            >
                              <Pencil className="h-3 w-3" aria-hidden="true" />
                              Renovar / Editar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Section 2: Medical Certificates */}
      {filterTab !== 'apolices' && (
        <section className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800/90 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800/90 bg-slate-50/70 dark:bg-[#0E1628] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Atestados Médicos Ocupacionais ({filteredCertAlerts.length})
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Renovação rápida (+1 ano) ou edição completa de cada colaborador
            </span>
          </div>

          {filteredCertAlerts.length === 0 ? (
            <div className="py-10 px-6 text-center space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <p>Nenhum atestado médico encontrado com os filtros actuais.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800/90 bg-slate-50/40 dark:bg-[#141F36] font-semibold text-slate-600 dark:text-slate-300">
                    <th className="py-3 px-4 whitespace-nowrap">Colaborador / Função</th>
                    <th className="py-3 px-3 whitespace-nowrap">Regime · Apólice</th>
                    <th className="py-3 px-3 whitespace-nowrap">Atestado</th>
                    <th className="py-3 px-3 whitespace-nowrap">Aptidão</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">Validade</th>
                    <th className="py-3 px-3 whitespace-nowrap">Estado do Alerta</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Gerir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredCertAlerts.map((alert) => {
                    const c = alert.certificate;
                    const isSyncedMember = c.id.startsWith('member-');
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-[#16223B]">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {c.workerName}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {c.role}
                          </div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {c.workMode}
                          </div>
                          <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            Apólice {c.policyNumber}
                          </div>
                        </td>
                        <td className="py-3 px-3 max-w-[230px]">
                          <div className="font-medium text-slate-800 dark:text-slate-200 truncate" title={c.certificateType}>
                            {c.certificateType}
                          </div>
                          <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            {c.certificateNumber}
                          </div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">
                          {c.fitnessStatus}
                        </td>
                        <td className="py-3 px-3 text-center font-mono tabular-nums text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {formatDatePT(c.expiryDate)}
                        </td>
                        <td className="py-3 px-3">
                          <SeverityBadge severity={alert.severity} daysRemaining={alert.daysRemaining} />
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleRenewCertificateOneYear(c)}
                              aria-label={`Renovar atestado de ${c.workerName} por 1 ano`}
                              title="Renovar +1 ano"
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/70"
                            >
                              <RefreshCw className="h-3 w-3" aria-hidden="true" />
                              +1 Ano
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditCertificate(c)}
                              aria-label={`Editar atestado de ${c.workerName}`}
                              className="p-1.5 rounded text-blue-600 dark:text-cyan-400 hover:bg-blue-50 dark:hover:bg-cyan-950/60"
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            {!isSyncedMember && (
                              <button
                                type="button"
                                onClick={() => onDeleteCertificate(c.id)}
                                aria-label={`Eliminar atestado de ${c.workerName}`}
                                className="p-1.5 rounded text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60"
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
