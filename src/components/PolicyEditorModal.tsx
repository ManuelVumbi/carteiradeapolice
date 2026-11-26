import { FormEvent, useEffect, useState } from 'react';
import { Plus, Trash2, Users, FileText, X, Pencil, Check } from 'lucide-react';
import { formatAKZ } from '../data/policies';
import { CoverageItem, Gender, InsurancePolicy, PolicyAccentColor } from '../data/types';
import { ACCENT_PALETTES } from '../utils/policyAccents';
import {
  ExtractedPolicyPayload,
  applyCoveragesToPolicy,
  mergeExtractedIntoDraft,
} from '../utils/policyImport';
import {
  PolicyFormDraft,
  PolicyMemberDraft,
  PolicyValidationErrors,
  buildPolicyFromDraft,
  createEmptyPolicyDraft,
  policyToDraft,
  validatePolicyDraft,
} from '../utils/policyManager';
import { PolicyFileDropzone } from './PolicyFileDropzone';

export interface PrefilledPolicyImport {
  draft: PolicyFormDraft;
  coverages: CoverageItem[] | null;
  summary: string;
  errors?: PolicyValidationErrors;
}

interface PolicyEditorModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialPolicy?: InsurancePolicy | null;
  prefilledImport?: PrefilledPolicyImport | null;
  existingPolicies: InsurancePolicy[];
  onClose: () => void;
  onSave: (policy: InsurancePolicy, importedFileName?: string) => void;
}

const ACCENT_OPTIONS = Object.values(ACCENT_PALETTES);

export function PolicyEditorModal({
  open,
  mode,
  initialPolicy,
  prefilledImport,
  existingPolicies,
  onClose,
  onSave,
}: PolicyEditorModalProps) {
  const [activeSection, setActiveSection] = useState<'dados' | 'aderentes'>('dados');
  const [draft, setDraft] = useState<PolicyFormDraft>(() =>
    createEmptyPolicyDraft(existingPolicies.length)
  );
  const [errors, setErrors] = useState<PolicyValidationErrors>({});
  const [extractedCoverages, setExtractedCoverages] = useState<CoverageItem[] | null>(null);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [autoApplyFile, setAutoApplyFile] = useState(true);

  // Quick member add/edit subform state
  const [editingMemberIdx, setEditingMemberIdx] = useState<number | null>(null);
  const [memberName, setMemberName] = useState('');
  const [memberBirthDate, setMemberBirthDate] = useState('');
  const [memberGender, setMemberGender] = useState<Gender>('Masculino');
  const [memberHealthCode, setMemberHealthCode] = useState('');
  const [memberPremium, setMemberPremium] = useState('');
  const [memberWaiting, setMemberWaiting] = useState('Não');
  const [memberError, setMemberError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setActiveSection('dados');
    setAutoApplyFile(true);
    setMemberError(null);
    setEditingMemberIdx(null);
    setMemberName('');
    setMemberBirthDate('');
    setMemberGender('Masculino');
    setMemberHealthCode('');
    setMemberPremium('');
    setMemberWaiting('Não');

    if (prefilledImport) {
      setDraft(prefilledImport.draft);
      setExtractedCoverages(prefilledImport.coverages);
      setImportSummary(prefilledImport.summary);
      setErrors(prefilledImport.errors ?? {});
    } else if (mode === 'edit' && initialPolicy) {
      setDraft(policyToDraft(initialPolicy));
      setExtractedCoverages(null);
      setImportSummary(null);
      setErrors({});
    } else {
      setDraft(createEmptyPolicyDraft(existingPolicies.length));
      setExtractedCoverages(null);
      setImportSummary(null);
      setErrors({});
    }
  }, [open, mode, initialPolicy, prefilledImport, existingPolicies.length]);

  if (!open) return null;

  const memberPremiums = draft.members.map((m) => Number(m.annualPremium) || 0);
  const memberSum = Math.round(memberPremiums.reduce((a, b) => a + b, 0) * 100) / 100;
  const effectiveTotal = draft.autoComputeTotalFromMembers
    ? memberSum
    : Math.round((Number(draft.totalAnnualPremiumAKZ) || 0) * 100) / 100;
  const minMember = memberPremiums.length > 0 ? Math.min(...memberPremiums) : 0;
  const maxMember = memberPremiums.length > 0 ? Math.max(...memberPremiums) : 0;
  const avgMember =
    draft.members.length > 0 ? Math.round((effectiveTotal / draft.members.length) * 100) / 100 : 0;

  const updateField = <K extends keyof PolicyFormDraft>(key: K, value: PolicyFormDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    if (key in errors) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const resetMemberSubform = () => {
    setEditingMemberIdx(null);
    setMemberName('');
    setMemberBirthDate('');
    setMemberGender('Masculino');
    setMemberHealthCode('');
    setMemberPremium('');
    setMemberWaiting('Não');
    setMemberError(null);
  };

  const handleEditMemberRow = (idx: number) => {
    const m = draft.members[idx];
    setEditingMemberIdx(idx);
    setMemberName(m.name);
    setMemberBirthDate(m.birthDate);
    setMemberGender(m.gender);
    setMemberHealthCode(m.healthCode);
    setMemberPremium(m.annualPremium);
    setMemberWaiting(m.waitingPeriod);
    setMemberError(null);
  };

  const handleSaveMemberSubform = () => {
    const cleanName = memberName.trim();
    if (!cleanName) {
      setMemberError('Indique o nome completo do aderente.');
      return;
    }
    const prem = Number(memberPremium);
    if (!Number.isFinite(prem) || prem < 0) {
      setMemberError('Indique um prémio anual válido (AKZ ≥ 0).');
      return;
    }

    const nextMember: PolicyMemberDraft = {
      name: cleanName,
      birthDate: memberBirthDate.trim(),
      gender: memberGender,
      documentId: editingMemberIdx !== null ? draft.members[editingMemberIdx].documentId : '',
      healthCode: memberHealthCode.trim(),
      entryDate: draft.effectiveDate || '2026-07-15',
      annualPremium: String(Math.round(prem * 100) / 100),
      waitingPeriod: memberWaiting.trim() || 'Não',
      plan: draft.planName.trim() || 'Plano 2',
    };

    setDraft((prev) => {
      const nextMembers =
        editingMemberIdx !== null
          ? prev.members.map((item, i) => (i === editingMemberIdx ? nextMember : item))
          : [...prev.members, nextMember];
      return { ...prev, members: nextMembers };
    });
    resetMemberSubform();
  };

  const handleRemoveMemberRow = (idx: number) => {
    setDraft((prev) => ({
      ...prev,
      members: prev.members.filter((_, i) => i !== idx),
    }));
    if (editingMemberIdx === idx) {
      resetMemberSubform();
    }
  };

  const handleFileExtracted = (
    extracted: ExtractedPolicyPayload,
    fileName: string
  ) => {
    const merged = mergeExtractedIntoDraft(
      extracted,
      mode,
      existingPolicies.length,
      initialPolicy
    );
    setDraft(merged.draft);
    setExtractedCoverages(merged.extractedCoverages);
    setErrors({});

    const summaryText =
      extracted.summaryNote?.trim() ||
      (merged.fieldsUpdated.length > 0
        ? `Campos extraídos de "${fileName}": ${merged.fieldsUpdated.join(', ')}.`
        : `Documento "${fileName}" processado.`);

    if (autoApplyFile) {
      const validation = validatePolicyDraft(
        merged.draft,
        existingPolicies,
        mode === 'edit' ? initialPolicy?.id : undefined
      );
      if (Object.keys(validation).length === 0) {
        const built = applyCoveragesToPolicy(
          buildPolicyFromDraft(
            merged.draft,
            mode === 'edit' && initialPolicy ? initialPolicy : undefined
          ),
          merged.extractedCoverages
        );
        onSave(built, fileName);
        onClose();
        return;
      }
      setErrors(validation);
      setActiveSection('dados');
      setImportSummary(
        `${summaryText} Confirme os campos obrigatórios assinalados e clique em Guardar.`
      );
      return;
    }

    setImportSummary(
      `${summaryText} Reveja os separadores "Dados da Apólice" e "Aderentes" antes de guardar.`
    );
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const validation = validatePolicyDraft(
      draft,
      existingPolicies,
      mode === 'edit' ? initialPolicy?.id : undefined
    );
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      if (validation.members && Object.keys(validation).length === 1) {
        setActiveSection('aderentes');
      } else {
        setActiveSection('dados');
      }
      return;
    }

    const built = applyCoveragesToPolicy(
      buildPolicyFromDraft(
        draft,
        mode === 'edit' && initialPolicy ? initialPolicy : undefined
      ),
      extractedCoverages
    );
    onSave(built);
    onClose();
  };

  const inputCls =
    'w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-700/90 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-[#0B1120] focus:outline-none focus:border-cyan-500';
  const labelCls = 'block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 dark:bg-black/75 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="policy-editor-title"
    >
      <div className="w-full max-w-3xl max-h-[92vh] flex flex-col bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Top accent stripe */}
        <div className={`h-1.5 w-full ${ACCENT_PALETTES[draft.accentColor].topBarBg}`} />

        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div>
            <h2 id="policy-editor-title" className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {mode === 'create'
                ? 'Adicionar Nova Apólice'
                : `Actualizar Apólice N.º ${initialPolicy?.metadata.policyNumber ?? ''}`}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Todas as estatísticas (total, mínimo, médio e máximo), gráficos e exportação Excel atualizam automaticamente.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar editor de apólice"
            className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Section Switcher + Live Preview Strip */}
        <div className="px-5 sm:px-6 py-3 bg-slate-50 dark:bg-[#0D1526] border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800/80 rounded-lg self-start">
            <button
              type="button"
              onClick={() => setActiveSection('dados')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                activeSection === 'dados'
                  ? 'bg-white dark:bg-[#16223B] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              Dados da Apólice
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('aderentes')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                activeSection === 'aderentes'
                  ? 'bg-white dark:bg-[#16223B] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              Aderentes ({draft.members.length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono tabular-nums">
            <span className="text-slate-500 dark:text-slate-400">
              Total:{' '}
              <strong className="text-emerald-700 dark:text-emerald-400">
                {formatAKZ(effectiveTotal)}
              </strong>
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              Mín: <strong className="text-slate-800 dark:text-slate-200">{formatAKZ(minMember)}</strong>
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              Méd: <strong className="text-slate-800 dark:text-slate-200">{formatAKZ(avgMember)}</strong>
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              Máx: <strong className="text-slate-800 dark:text-slate-200">{formatAKZ(maxMember)}</strong>
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} noValidate className="flex-1 min-h-0 flex flex-col">
          <div className="p-5 sm:p-6 space-y-5 flex-1 overflow-y-auto">
            {importSummary && (
              <div
                role="status"
                className="px-4 py-3 text-xs font-medium text-cyan-900 dark:text-cyan-200 bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-200 dark:border-cyan-800/80 rounded-lg"
              >
                {importSummary}
              </div>
            )}

            {Object.keys(errors).length > 0 && (
              <div
                role="alert"
                className="px-4 py-3 text-xs font-medium text-red-800 dark:text-red-200 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 rounded-lg"
              >
                Corrija os campos assinalados antes de guardar a apólice.
              </div>
            )}

            {activeSection === 'dados' ? (
              <div className="space-y-5">
                <PolicyFileDropzone
                  compact
                  title={
                    mode === 'create'
                      ? 'Preencher e Adicionar por Ficheiro (PDF, Word, Imagem, Excel)'
                      : `Actualizar Apólice ${initialPolicy?.metadata.policyNumber ?? ''} por Ficheiro`
                  }
                  description="Carregue PDF, Word (.docx), Imagem ou Excel para extrair dados, aderentes e coberturas automaticamente."
                  existingPolicyContext={
                    mode === 'edit' && initialPolicy
                      ? `Apólice N.º ${initialPolicy.metadata.policyNumber}, Projeto ${initialPolicy.projectName}, Seguradora ${initialPolicy.metadata.insurer}, Tomador ${initialPolicy.holder.name}`
                      : undefined
                  }
                  autoApplyChecked={autoApplyFile}
                  onToggleAutoApply={setAutoApplyFile}
                  autoApplyLabel="Guardar e recalcular carteira automaticamente após leitura"
                  onExtracted={handleFileExtracted}
                />
                {/* Color identity picker */}
                <div>
                  <span className={labelCls}>Cor de Identificação na Interface</span>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {ACCENT_OPTIONS.map((opt) => {
                      const selected = draft.accentColor === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => updateField('accentColor', opt.key as PolicyAccentColor)}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                            selected
                              ? `${opt.outlineButton} ring-2 ring-offset-1 ring-slate-400 dark:ring-slate-600 dark:ring-offset-[#111A2E] font-semibold`
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span className={`h-2.5 w-2.5 rounded-sm ${opt.topBarBg}`} aria-hidden="true" />
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Primary Policy Identification */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="pol-project" className={labelCls}>
                      Projeto / Correspondência *
                    </label>
                    <input
                      id="pol-project"
                      type="text"
                      value={draft.projectName}
                      onChange={(e) => updateField('projectName', e.target.value)}
                      placeholder="Ex: Sonangol, Dietsmann, SPIE"
                      className={inputCls}
                    />
                    {errors.projectName && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.projectName}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="pol-number" className={labelCls}>
                      N.º da Apólice *
                    </label>
                    <input
                      id="pol-number"
                      type="text"
                      value={draft.policyNumber}
                      onChange={(e) => updateField('policyNumber', e.target.value)}
                      placeholder="Ex: 88901"
                      className={`${inputCls} font-mono tabular-nums`}
                    />
                    {errors.policyNumber && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.policyNumber}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="pol-acta" className={labelCls}>
                      Acta N.º
                    </label>
                    <input
                      id="pol-acta"
                      type="text"
                      value={draft.endorsementNumber}
                      onChange={(e) => updateField('endorsementNumber', e.target.value)}
                      placeholder="Ex: 1.0"
                      className={`${inputCls} font-mono tabular-nums`}
                    />
                  </div>
                </div>

                {/* Insurer, Product & Plan */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="pol-insurer" className={labelCls}>
                      Seguradora *
                    </label>
                    <input
                      id="pol-insurer"
                      type="text"
                      list="insurer-suggestions"
                      value={draft.insurer}
                      onChange={(e) => updateField('insurer', e.target.value)}
                      placeholder="Aliança Seguros"
                      className={inputCls}
                    />
                    <datalist id="insurer-suggestions">
                      <option value="Aliança Seguros" />
                      <option value="A Mundial Seguros, S.A." />
                      <option value="ENSA Seguros" />
                      <option value="Fidelidade Angola" />
                      <option value="Nossa Seguros" />
                    </datalist>
                    {errors.insurer && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.insurer}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="pol-product" className={labelCls}>
                      Ramo / Produto
                    </label>
                    <input
                      id="pol-product"
                      type="text"
                      value={draft.product}
                      onChange={(e) => updateField('product', e.target.value)}
                      placeholder="Saúde Grupo"
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label htmlFor="pol-plan" className={labelCls}>
                      Plano Contratado *
                    </label>
                    <input
                      id="pol-plan"
                      type="text"
                      value={draft.planName}
                      onChange={(e) => updateField('planName', e.target.value)}
                      placeholder="Plano 2"
                      className={inputCls}
                    />
                    {errors.planName && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.planName}</p>
                    )}
                  </div>
                </div>

                {/* Dates & Billing */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label htmlFor="pol-effective" className={labelCls}>
                      Data de Efeito *
                    </label>
                    <input
                      id="pol-effective"
                      type="date"
                      value={draft.effectiveDate}
                      onChange={(e) => updateField('effectiveDate', e.target.value)}
                      className={`${inputCls} font-mono tabular-nums`}
                    />
                    {errors.effectiveDate && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.effectiveDate}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="pol-expiry" className={labelCls}>
                      Data de Vencimento *
                    </label>
                    <input
                      id="pol-expiry"
                      type="date"
                      value={draft.expiryDate}
                      onChange={(e) => updateField('expiryDate', e.target.value)}
                      className={`${inputCls} font-mono tabular-nums`}
                    />
                    {errors.expiryDate && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.expiryDate}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="pol-freq" className={labelCls}>
                      Fraccionamento
                    </label>
                    <select
                      id="pol-freq"
                      value={draft.billingFrequency}
                      onChange={(e) => updateField('billingFrequency', e.target.value)}
                      className={inputCls}
                    >
                      <option value="Anual">Anual</option>
                      <option value="Semestral">Semestral</option>
                      <option value="Trimestral">Trimestral</option>
                      <option value="Mensal">Mensal</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="pol-duration" className={labelCls}>
                      Duração
                    </label>
                    <input
                      id="pol-duration"
                      type="text"
                      value={draft.duration}
                      onChange={(e) => updateField('duration', e.target.value)}
                      placeholder="Anual"
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* Financial Totals */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0D1526] border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="pol-limit" className={labelCls}>
                        Limite Máximo Global (AKZ)
                      </label>
                      <input
                        id="pol-limit"
                        type="number"
                        min={0}
                        step={10000}
                        value={draft.globalLimitAKZ}
                        onChange={(e) => updateField('globalLimitAKZ', e.target.value)}
                        className={`${inputCls} font-mono tabular-nums`}
                      />
                      {errors.globalLimitAKZ && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                          {errors.globalLimitAKZ}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="pol-premium" className={labelCls}>
                        Prémio Total Anual da Apólice (AKZ)
                      </label>
                      <input
                        id="pol-premium"
                        type="number"
                        min={0}
                        step={0.01}
                        disabled={draft.autoComputeTotalFromMembers}
                        value={
                          draft.autoComputeTotalFromMembers
                            ? String(memberSum)
                            : draft.totalAnnualPremiumAKZ
                        }
                        onChange={(e) => updateField('totalAnnualPremiumAKZ', e.target.value)}
                        className={`${inputCls} font-mono tabular-nums disabled:opacity-60`}
                      />
                      {errors.totalAnnualPremiumAKZ && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                          {errors.totalAnnualPremiumAKZ}
                        </p>
                      )}
                    </div>
                  </div>

                  <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={draft.autoComputeTotalFromMembers}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setDraft((prev) => ({
                          ...prev,
                          autoComputeTotalFromMembers: checked,
                          totalAnnualPremiumAKZ: checked
                            ? String(memberSum)
                            : prev.totalAnnualPremiumAKZ || String(memberSum),
                        }));
                      }}
                      className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 dark:bg-[#0B1120] text-cyan-600 focus:ring-cyan-500"
                    />
                    <span>
                      Calcular Prémio Total automaticamente pela soma dos aderentes ({formatAKZ(memberSum)})
                    </span>
                  </label>
                </div>

                {/* Policyholder */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label htmlFor="pol-holder" className={labelCls}>
                      Tomador do Seguro *
                    </label>
                    <input
                      id="pol-holder"
                      type="text"
                      value={draft.holderName}
                      onChange={(e) => updateField('holderName', e.target.value)}
                      className={inputCls}
                    />
                    {errors.holderName && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.holderName}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="pol-nif" className={labelCls}>
                      NIF do Tomador
                    </label>
                    <input
                      id="pol-nif"
                      type="text"
                      value={draft.holderNif}
                      onChange={(e) => updateField('holderNif', e.target.value)}
                      className={`${inputCls} font-mono tabular-nums`}
                    />
                  </div>

                  <div>
                    <label htmlFor="pol-phone" className={labelCls}>
                      Telefone
                    </label>
                    <input
                      id="pol-phone"
                      type="text"
                      value={draft.holderPhone}
                      onChange={(e) => updateField('holderPhone', e.target.value)}
                      className={`${inputCls} font-mono tabular-nums`}
                    />
                  </div>

                  <div>
                    <label htmlFor="pol-email" className={labelCls}>
                      Email
                    </label>
                    <input
                      id="pol-email"
                      type="email"
                      value={draft.holderEmail}
                      onChange={(e) => updateField('holderEmail', e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Inline Member Add/Edit Subform */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0D1526] border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      {editingMemberIdx !== null
                        ? `Editar Aderente #${editingMemberIdx + 1}`
                        : 'Adicionar Aderente à Apólice'}
                    </h3>
                    {editingMemberIdx !== null && (
                      <button
                        type="button"
                        onClick={resetMemberSubform}
                        className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      >
                        Cancelar edição
                      </button>
                    )}
                  </div>

                  {memberError && (
                    <p role="alert" className="text-xs text-red-600 dark:text-red-400 font-medium">
                      {memberError}
                    </p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                    <div className="sm:col-span-2">
                      <label htmlFor="mem-name" className={labelCls}>
                        Nome do Aderente *
                      </label>
                      <input
                        id="mem-name"
                        type="text"
                        value={memberName}
                        onChange={(e) => setMemberName(e.target.value)}
                        placeholder="Nome completo"
                        className={inputCls}
                      />
                    </div>

                    <div>
                      <label htmlFor="mem-gender" className={labelCls}>
                        Género
                      </label>
                      <select
                        id="mem-gender"
                        value={memberGender}
                        onChange={(e) => setMemberGender(e.target.value as Gender)}
                        className={inputCls}
                      >
                        <option value="Masculino">Masculino</option>
                        <option value="Feminino">Feminino</option>
                        <option value="Não indicado">Não indicado</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="mem-birth" className={labelCls}>
                        Nascimento
                      </label>
                      <input
                        id="mem-birth"
                        type="date"
                        value={memberBirthDate}
                        onChange={(e) => setMemberBirthDate(e.target.value)}
                        className={`${inputCls} font-mono tabular-nums`}
                      />
                    </div>

                    <div>
                      <label htmlFor="mem-premium" className={labelCls}>
                        Prémio Anual (AKZ) *
                      </label>
                      <input
                        id="mem-premium"
                        type="number"
                        min={0}
                        step={0.01}
                        value={memberPremium}
                        onChange={(e) => setMemberPremium(e.target.value)}
                        placeholder="450000"
                        className={`${inputCls} font-mono tabular-nums`}
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={handleSaveMemberSubform}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors whitespace-nowrap"
                      >
                        {editingMemberIdx !== null ? (
                          <>
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                            Atualizar
                          </>
                        ) : (
                          <>
                            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                            Adicionar
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Members Table inside Modal */}
                {draft.members.length === 0 ? (
                  <div className="py-10 px-4 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Nenhum aderente nesta apólice ainda
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Adicione aderentes acima para calcular automaticamente os prémios mínimo, médio e máximo, ou guarde a apólice e adicione mais tarde.
                    </p>
                  </div>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <div className="max-h-64 overflow-y-auto overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead className="sticky top-0 bg-slate-100 dark:bg-[#0D1526] border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-300">
                          <tr>
                            <th className="py-2.5 px-3 text-center w-10">#</th>
                            <th className="py-2.5 px-3">Nome</th>
                            <th className="py-2.5 px-3">Género</th>
                            <th className="py-2.5 px-3 text-right">Prémio Anual (AKZ)</th>
                            <th className="py-2.5 px-3 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {draft.members.map((m, idx) => (
                            <tr key={`${m.name}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="py-2 px-3 text-center font-mono tabular-nums text-slate-500 dark:text-slate-400">
                                {idx + 1}
                              </td>
                              <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">
                                {m.name}
                              </td>
                              <td className="py-2 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                {m.gender === 'Não indicado' ? 'N/D' : m.gender}
                              </td>
                              <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                                {formatAKZ(Number(m.annualPremium) || 0)}
                              </td>
                              <td className="py-2 px-3 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleEditMemberRow(idx)}
                                    aria-label={`Editar aderente ${m.name}`}
                                    className="p-1.5 rounded-md text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60"
                                  >
                                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMemberRow(idx)}
                                    aria-label={`Eliminar aderente ${m.name}`}
                                    className="p-1.5 rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 bg-slate-50 dark:bg-[#0D1526] border-t border-slate-200 dark:border-slate-800 shrink-0">
            <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
              * Campos obrigatórios
            </span>
            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 whitespace-nowrap"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap"
              >
                {mode === 'create' ? 'Guardar Apólice' : 'Actualizar Apólice'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
