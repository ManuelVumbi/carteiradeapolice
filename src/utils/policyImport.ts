import {
  CoverageCategory,
  CoverageItem,
  Gender,
  InsurancePolicy,
  PolicyMember,
} from '../data/types.ts';
import {
  PolicyFormDraft,
  PolicyMemberDraft,
  createEmptyPolicyDraft,
  policyToDraft,
} from './policyManager.ts';
export {
  SUPPORTED_IMPORT_EXTENSIONS,
  MAX_UPLOAD_BYTES,
  getFileExtension,
  isSupportedPolicyFile,
  htmlTablesToStructuredText,
} from './documentFormat.ts';

export interface ExtractedMemberPayload {
  name: string;
  birthDate?: string | null;
  gender?: string | null;
  healthCode?: string | null;
  entryDate?: string | null;
  annualPremium?: number | null;
  waitingPeriod?: string | null;
  workMode?: string | null;
  role?: string | null;
  baseSalaryAKZ?: number | null;
  medicalCertificateExpiry?: string | null;
}

export interface ExtractedCoveragePayload {
  category?: string | null;
  item: string;
  limitText: string;
  numericLimit?: number | null;
  copayInNetwork?: string | null;
  copayOutOfNetwork?: string | null;
  notes?: string | null;
}

export interface ExtractedPolicyPayload {
  policyCategory?: string | null;
  projectName?: string | null;
  policyNumber?: string | null;
  endorsementNumber?: string | null;
  insurer?: string | null;
  product?: string | null;
  planName?: string | null;
  effectiveDate?: string | null;
  expiryDate?: string | null;
  startDate?: string | null;
  renewalDate?: string | null;
  duration?: string | null;
  billingFrequency?: string | null;
  globalLimitAKZ?: number | null;
  totalAnnualPremiumAKZ?: number | null;
  workAccidentReferenceMonth?: string | null;
  payrollOnshoreAKZ?: number | null;
  payrollOffshoreAKZ?: number | null;
  onshoreCount?: number | null;
  offshoreCount?: number | null;
  holderName?: string | null;
  holderNif?: string | null;
  holderAddress?: string | null;
  holderPhone?: string | null;
  holderEmail?: string | null;
  members?: ExtractedMemberPayload[];
  coverages?: ExtractedCoveragePayload[];
  summaryNote?: string | null;
}

export function normalizeDateISO(raw: string | null | undefined): string {
  if (!raw) return '';
  const clean = raw.trim();
  if (!clean) return '';

  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(clean);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const ptMatch = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(clean);
  if (ptMatch) {
    const [, d, m, y] = ptMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return '';
}

function normalizeGender(raw: string | null | undefined): Gender {
  const val = (raw ?? '').trim().toLowerCase();
  if (val.startsWith('f') || val.includes('mulher')) return 'Feminino';
  if (val.startsWith('m') || val.includes('homem')) return 'Masculino';
  if (val.includes('não indicado') || val.includes('n/d') || val === '') {
    return val === '' ? 'Masculino' : 'Não indicado';
  }
  return 'Não indicado';
}

function inferProjectNameFromHolder(holderName: string): string {
  const clean = holderName.trim();
  if (!clean) return '';
  const words = clean.split(/[\s,-]+/).filter((w) => w.length > 2);
  return words[0] ?? clean.slice(0, 24);
}

function normalizeCoverageCategory(raw: string | null | undefined): CoverageCategory {
  const v = (raw ?? '').trim().toLowerCase();
  if (v.includes('limite') || v.includes('geral') || v.includes('global')) return 'Limite Geral';
  if (v.includes('internamento')) return 'Internamento Hospitalar';
  if (v.includes('hospital')) return 'Hospitalização';
  if (v.includes('matern')) return 'Maternidade';
  if (v.includes('ambulat') || v.includes('consulta')) return 'Ambulatório';
  if (v.includes('medic') || v.includes('farm')) return 'Medicamentos';
  if (v.includes('estomat') || v.includes('dent')) return 'Estomatologia';
  if (v.includes('oftalm') || v.includes('ópt')) return 'Oftalmologia';
  if (v.includes('âmbito') || v.includes('extens')) return 'Âmbito e Extensão';
  return 'Outros Benefícios';
}

function parsePercentage(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const m = /(\d+(?:[.,]\d+)?)\s*%/.exec(raw);
  if (!m) return null;
  const num = Number(m[1].replace(',', '.'));
  return Number.isFinite(num) ? num : null;
}

export function findMatchingPolicy(
  extracted: ExtractedPolicyPayload,
  policies: InsurancePolicy[]
): InsurancePolicy | undefined {
  const targetNum = (extracted.policyNumber ?? '').trim().toLowerCase();
  if (targetNum) {
    const byNumber = policies.find(
      (p) => p.metadata.policyNumber.trim().toLowerCase() === targetNum
    );
    if (byNumber) return byNumber;
  }

  const targetProj = (extracted.projectName ?? '').trim().toLowerCase();
  if (targetProj) {
    const byProject = policies.find(
      (p) => p.projectName.trim().toLowerCase() === targetProj
    );
    if (byProject) return byProject;
  }

  return undefined;
}

export interface MergeExtractedResult {
  draft: PolicyFormDraft;
  extractedCoverages: CoverageItem[] | null;
  fieldsUpdated: string[];
}

export function mergeExtractedIntoDraft(
  extracted: ExtractedPolicyPayload,
  mode: 'create' | 'edit',
  existingPoliciesCount: number,
  existingPolicy?: InsurancePolicy | null
): MergeExtractedResult {
  const baseDraft =
    mode === 'edit' && existingPolicy
      ? policyToDraft(existingPolicy)
      : createEmptyPolicyDraft(existingPoliciesCount);

  const fieldsUpdated: string[] = [];
  const next: PolicyFormDraft = { ...baseDraft };

  const clean = (v: string | null | undefined) => (v ?? '').trim();

  const catRaw = clean(extracted.policyCategory).toLowerCase();
  const prodRaw = clean(extracted.product).toLowerCase();
  if (
    catRaw.includes('acidente') ||
    catRaw.includes('trabalho') ||
    prodRaw.includes('acidente') ||
    prodRaw.includes('trabalho')
  ) {
    next.policyCategory = 'acidente_trabalho';
    fieldsUpdated.push('Categoria (Acidentes de Trabalho)');
  } else if (catRaw === 'saude' || catRaw.includes('saúde')) {
    next.policyCategory = 'saude';
  }

  if (clean(extracted.projectName)) {
    next.projectName = clean(extracted.projectName);
    fieldsUpdated.push('Projeto');
  } else if (mode === 'create' && clean(extracted.holderName)) {
    next.projectName = inferProjectNameFromHolder(clean(extracted.holderName));
    if (next.projectName) fieldsUpdated.push('Projeto (inferido)');
  }

  if (clean(extracted.policyNumber)) {
    next.policyNumber = clean(extracted.policyNumber);
    fieldsUpdated.push('N.º da Apólice');
  }
  if (clean(extracted.endorsementNumber)) {
    next.endorsementNumber = clean(extracted.endorsementNumber);
    fieldsUpdated.push('Acta');
  }
  if (clean(extracted.insurer)) {
    next.insurer = clean(extracted.insurer);
    fieldsUpdated.push('Seguradora');
  }
  if (clean(extracted.product)) {
    next.product = clean(extracted.product);
    fieldsUpdated.push('Produto');
  }
  if (clean(extracted.planName)) {
    next.planName = clean(extracted.planName);
    fieldsUpdated.push('Plano');
  }

  const effIso = normalizeDateISO(extracted.effectiveDate);
  if (effIso) {
    next.effectiveDate = effIso;
    fieldsUpdated.push('Data de Efeito');
  }

  const expIso = normalizeDateISO(extracted.expiryDate);
  if (expIso) {
    next.expiryDate = expIso;
    fieldsUpdated.push('Vencimento');
  }

  if (clean(extracted.duration)) {
    next.duration = clean(extracted.duration);
  }
  if (clean(extracted.billingFrequency)) {
    next.billingFrequency = clean(extracted.billingFrequency);
  }
  if (clean(extracted.workAccidentReferenceMonth)) {
    next.workAccidentReferenceMonth = clean(extracted.workAccidentReferenceMonth);
  }
  if (typeof extracted.payrollOnshoreAKZ === 'number' && Number.isFinite(extracted.payrollOnshoreAKZ)) {
    next.payrollOnshoreAKZ = String(extracted.payrollOnshoreAKZ);
  }
  if (typeof extracted.payrollOffshoreAKZ === 'number' && Number.isFinite(extracted.payrollOffshoreAKZ)) {
    next.payrollOffshoreAKZ = String(extracted.payrollOffshoreAKZ);
  }
  if (typeof extracted.onshoreCount === 'number' && Number.isFinite(extracted.onshoreCount)) {
    next.onshoreCount = String(extracted.onshoreCount);
  }
  if (typeof extracted.offshoreCount === 'number' && Number.isFinite(extracted.offshoreCount)) {
    next.offshoreCount = String(extracted.offshoreCount);
  }

  if (
    typeof extracted.globalLimitAKZ === 'number' &&
    Number.isFinite(extracted.globalLimitAKZ) &&
    extracted.globalLimitAKZ > 0
  ) {
    next.globalLimitAKZ = String(Math.round(extracted.globalLimitAKZ * 100) / 100);
    fieldsUpdated.push('Limite Máximo');
  }

  if (clean(extracted.holderName)) {
    next.holderName = clean(extracted.holderName);
    fieldsUpdated.push('Tomador');
  }
  if (clean(extracted.holderNif)) next.holderNif = clean(extracted.holderNif);
  if (clean(extracted.holderAddress)) next.holderAddress = clean(extracted.holderAddress);
  if (clean(extracted.holderPhone)) next.holderPhone = clean(extracted.holderPhone);
  if (clean(extracted.holderEmail)) next.holderEmail = clean(extracted.holderEmail);

  const extractedMembers = (extracted.members ?? []).filter(
    (m) => m && clean(m.name).length > 0
  );

  if (extractedMembers.length > 0) {
    const mappedMembers: PolicyMemberDraft[] = extractedMembers.map((m, idx) => {
      const prem =
        typeof m.annualPremium === 'number' && Number.isFinite(m.annualPremium) && m.annualPremium >= 0
          ? Math.round(m.annualPremium * 100) / 100
          : 0;
      const entryIso = normalizeDateISO(m.entryDate) || next.effectiveDate || '2026-10-12';
      const birthIso = normalizeDateISO(m.birthDate);
      const wmRaw = clean(m.workMode).toLowerCase();
      const workMode = wmRaw.includes('off')
        ? ('Offshore' as const)
        : wmRaw.includes('on')
          ? ('Onshore' as const)
          : undefined;
      return {
        name: clean(m.name),
        birthDate: birthIso,
        gender: normalizeGender(m.gender),
        documentId: '',
        healthCode:
          clean(m.healthCode) ||
          `${next.policyNumber || 'AP'}-${String(idx + 1).padStart(3, '0')}`,
        entryDate: entryIso,
        annualPremium: String(prem),
        waitingPeriod: clean(m.waitingPeriod) || 'Não',
        plan: workMode ?? (next.planName || 'Plano 2'),
        workMode,
        role: clean(m.role) || undefined,
        baseSalaryAKZ:
          typeof m.baseSalaryAKZ === 'number' && Number.isFinite(m.baseSalaryAKZ)
            ? String(m.baseSalaryAKZ)
            : undefined,
        medicalCertificateExpiry: normalizeDateISO(m.medicalCertificateExpiry) || undefined,
      };
    });
    next.members = mappedMembers;
    fieldsUpdated.push(`${mappedMembers.length} aderente(s)`);
  }

  const memberSum =
    Math.round(
      next.members.reduce((sum, m) => sum + (Number(m.annualPremium) || 0), 0) * 100
    ) / 100;

  const docTotal =
    typeof extracted.totalAnnualPremiumAKZ === 'number' &&
    Number.isFinite(extracted.totalAnnualPremiumAKZ) &&
    extracted.totalAnnualPremiumAKZ > 0
      ? Math.round(extracted.totalAnnualPremiumAKZ * 100) / 100
      : null;

  if (docTotal !== null) {
    next.totalAnnualPremiumAKZ = String(docTotal);
    // Preserve exact invoice total if no members were parsed or if taxes/fees make invoice differ from member sum
    if (next.members.length === 0 || Math.abs(docTotal - memberSum) >= 0.05) {
      next.autoComputeTotalFromMembers = false;
    } else {
      next.autoComputeTotalFromMembers = true;
    }
    fieldsUpdated.push('Prémio Total');
  } else if (extractedMembers.length > 0) {
    next.autoComputeTotalFromMembers = true;
    next.totalAnnualPremiumAKZ = String(memberSum);
    fieldsUpdated.push('Prémio Total (calculado)');
  }

  const rawCoverages = (extracted.coverages ?? []).filter(
    (c) => c && clean(c.item).length > 0 && clean(c.limitText).length > 0
  );

  const covBaseId = (next.policyNumber || 'imp').replace(/[^a-zA-Z0-9_-]/g, '');
  const extractedCoverages: CoverageItem[] | null =
    rawCoverages.length > 0
      ? rawCoverages.map((c, idx) => {
          const copayIn = clean(c.copayInNetwork) || '—';
          const copayOut = clean(c.copayOutOfNetwork) || '—';
          const pctIn = parsePercentage(copayIn);
          const pctOut = parsePercentage(copayOut);
          return {
            id: `${covBaseId}-cov-${String(idx + 1).padStart(2, '0')}`,
            order: idx + 1,
            category: normalizeCoverageCategory(c.category || c.item),
            level: 'Principal',
            name: clean(c.item),
            numericLimit:
              typeof c.numericLimit === 'number' && Number.isFinite(c.numericLimit)
                ? c.numericLimit
                : null,
            limitLabel: clean(c.limitText),
            copayRedePlus: copayIn,
            copayType: pctIn !== null ? 'percent' : copayIn === '—' ? 'none' : 'fixed',
            copayValue: pctIn ?? 0,
            outOfNetworkShare: copayOut,
            outOfNetworkPercent: pctOut,
            waitingPeriod: '—',
            deductible: '—',
            notes: clean(c.notes),
          };
        })
      : null;

  if (extractedCoverages) {
    fieldsUpdated.push(`${extractedCoverages.length} cobertura(s)`);
  }

  return {
    draft: next,
    extractedCoverages,
    fieldsUpdated,
  };
}

export function applyCoveragesToPolicy(
  policy: InsurancePolicy,
  coverages: CoverageItem[] | null
): InsurancePolicy {
  if (!coverages || coverages.length === 0) return policy;
  return {
    ...policy,
    coverages,
    hasBirthDates:
      policy.members.length === 0
        ? true
        : policy.members.some((m: PolicyMember) => Boolean(m.birthDate)),
  };
}
