import { ALL_POLICIES, formatAKZ, getPolicyCategory } from '../data/policies';
import {
  CoverageItem,
  Gender,
  InsurancePolicy,
  MedicalFitnessStatus,
  PolicyAccentColor,
  PolicyCategory,
  PolicyMember,
  SimulatorScenario,
  WorkMode,
} from '../data/types';
import { getNextAccentColor } from './policyAccents';

export const POLICIES_STORAGE_KEY = 'espacie_apolices_portfolio_v1';

export interface PolicyMemberDraft {
  id?: number;
  name: string;
  birthDate: string;
  gender: Gender;
  documentId: string;
  healthCode: string;
  entryDate: string;
  annualPremium: string;
  waitingPeriod: string;
  plan: string;
  workMode?: WorkMode;
  role?: string;
  baseSalaryAKZ?: string;
  medicalCertificateNumber?: string;
  medicalCertificateExpiry?: string;
  medicalCertificateStatus?: MedicalFitnessStatus;
}

export interface PolicyFormDraft {
  id?: string;
  policyCategory: PolicyCategory;
  projectName: string;
  policyNumber: string;
  endorsementNumber: string;
  insurer: string;
  product: string;
  documentType: string;
  planName: string;
  accentColor: PolicyAccentColor;
  startDate: string;
  effectiveDate: string;
  expiryDate: string;
  renewalDate: string;
  duration: string;
  billingFrequency: string;
  territorialScope: string;
  holderName: string;
  holderNif: string;
  holderPhone: string;
  holderEmail: string;
  holderAddress: string;
  producerAgent: string;
  globalLimitAKZ: string;
  totalAnnualPremiumAKZ: string;
  autoComputeTotalFromMembers: boolean;
  workAccidentReferenceMonth: string;
  payrollOnshoreAKZ: string;
  payrollOffshoreAKZ: string;
  onshoreCount: string;
  offshoreCount: string;
  notesText: string;
  members: PolicyMemberDraft[];
}

export interface PolicyValidationErrors {
  projectName?: string;
  policyNumber?: string;
  insurer?: string;
  planName?: string;
  holderName?: string;
  effectiveDate?: string;
  expiryDate?: string;
  totalAnnualPremiumAKZ?: string;
  globalLimitAKZ?: string;
  members?: string;
}

export function createEmptyPolicyDraft(
  existingCount: number = 0,
  category: PolicyCategory = 'saude'
): PolicyFormDraft {
  const today = '2026-10-12';
  const nextYear = '2027-10-12';
  const isWorkAccident = category === 'acidente_trabalho';
  return {
    policyCategory: category,
    projectName: '',
    policyNumber: '',
    endorsementNumber: '1.0',
    insurer: 'Aliança Seguros',
    product: isWorkAccident ? 'Acidentes Trabalho - Prémio Variável' : 'Saúde Grupo',
    documentType: isWorkAccident ? 'NOTA DE PAGAMENTO + RELAÇÃO NOMINAL' : 'CONDIÇÕES PARTICULARES',
    planName: isWorkAccident ? 'Prémio Variável (Onshore & Offshore)' : 'Plano 2',
    accentColor: getNextAccentColor(existingCount),
    startDate: today,
    effectiveDate: today,
    expiryDate: nextYear,
    renewalDate: nextYear,
    duration: isWorkAccident ? 'Mensal (Prémio Variável)' : 'Anual',
    billingFrequency: isWorkAccident ? 'Único (Mensal)' : 'Anual',
    territorialScope: isWorkAccident
      ? 'Angola — Unidades Escritório (Onshore) & Offshore'
      : 'Rede+ Angola & Reembolso Fora da Rede',
    holderName: 'Espacie Services, Limitada',
    holderNif: '5402038937',
    holderPhone: '926 394 307',
    holderEmail: 'accounting@espacie.com',
    holderAddress: 'Luanda, Angola',
    producerAgent: 'VENDA DIRECTA',
    globalLimitAKZ: isWorkAccident ? '0' : '10000000',
    totalAnnualPremiumAKZ: '0',
    autoComputeTotalFromMembers: true,
    workAccidentReferenceMonth: isWorkAccident ? 'Outubro 2026' : '',
    payrollOnshoreAKZ: '0',
    payrollOffshoreAKZ: '0',
    onshoreCount: '0',
    offshoreCount: '0',
    notesText: '',
    members: [],
  };
}

export function policyToDraft(policy: InsurancePolicy): PolicyFormDraft {
  const globalCov = policy.coverages.find(
    (c) => c.category === 'Limite Geral' && c.numericLimit !== null
  );
  const highestLimit =
    globalCov?.numericLimit ??
    policy.coverages.reduce((max, c) => Math.max(max, c.numericLimit ?? 0), 0);
  const memberSum =
    Math.round(policy.members.reduce((acc, m) => acc + m.annualPremium, 0) * 100) / 100;
  const matchesMemberSum =
    policy.members.length > 0 &&
    Math.abs(memberSum - policy.metadata.totalAnnualPremium) < 0.05;

  return {
    id: policy.id,
    policyCategory: getPolicyCategory(policy),
    projectName: policy.projectName,
    policyNumber: policy.metadata.policyNumber,
    endorsementNumber: policy.metadata.endorsementNumber,
    insurer: policy.metadata.insurer,
    product: policy.metadata.product,
    documentType: policy.metadata.documentType,
    planName: policy.metadata.planName,
    accentColor: policy.accentColor ?? 'blue',
    startDate: policy.metadata.startDate,
    effectiveDate: policy.metadata.effectiveDate,
    expiryDate: policy.metadata.expiryDate,
    renewalDate: policy.metadata.renewalDate,
    duration: policy.metadata.duration,
    billingFrequency: policy.metadata.billingFrequency,
    territorialScope: policy.metadata.territorialScope ?? '',
    holderName: policy.holder.name,
    holderNif: policy.holder.nif,
    holderPhone: policy.holder.phone,
    holderEmail: policy.holder.email,
    holderAddress: policy.holder.address,
    producerAgent: policy.holder.producerAgent,
    globalLimitAKZ: String(highestLimit || 10000000),
    totalAnnualPremiumAKZ: String(policy.metadata.totalAnnualPremium),
    autoComputeTotalFromMembers: matchesMemberSum,
    workAccidentReferenceMonth: policy.workAccidentDetails?.referenceMonth ?? '',
    payrollOnshoreAKZ: String(policy.workAccidentDetails?.payrollOnshoreAKZ ?? 0),
    payrollOffshoreAKZ: String(policy.workAccidentDetails?.payrollOffshoreAKZ ?? 0),
    onshoreCount: String(policy.workAccidentDetails?.onshoreCount ?? 0),
    offshoreCount: String(policy.workAccidentDetails?.offshoreCount ?? 0),
    notesText: (policy.notes ?? []).join('\n'),
    members: policy.members.map((m) => ({
      id: m.id,
      name: m.name,
      birthDate: m.birthDate ?? '',
      gender: m.gender,
      documentId: m.documentId,
      healthCode: m.healthCode,
      entryDate: m.entryDate,
      annualPremium: String(m.annualPremium),
      waitingPeriod: m.waitingPeriod,
      plan: m.plan,
      workMode: m.workMode,
      role: m.role,
      baseSalaryAKZ: m.baseSalaryAKZ !== undefined ? String(m.baseSalaryAKZ) : undefined,
      medicalCertificateNumber: m.medicalCertificateNumber,
      medicalCertificateExpiry: m.medicalCertificateExpiry,
      medicalCertificateStatus: m.medicalCertificateStatus,
    })),
  };
}

export function validatePolicyDraft(
  draft: PolicyFormDraft,
  existingPolicies: InsurancePolicy[],
  editingPolicyId?: string
): PolicyValidationErrors {
  const errors: PolicyValidationErrors = {};

  if (!draft.projectName.trim()) {
    errors.projectName = 'Indique o nome do projeto / correspondência.';
  }

  const num = draft.policyNumber.trim();
  if (!num) {
    errors.policyNumber = 'Indique o número da apólice.';
  } else {
    const duplicate = existingPolicies.some(
      (p) =>
        p.id !== editingPolicyId &&
        p.metadata.policyNumber.trim().toLowerCase() === num.toLowerCase()
    );
    if (duplicate) {
      errors.policyNumber = `Já existe uma apólice com o número ${num}.`;
    }
  }

  if (!draft.insurer.trim()) {
    errors.insurer = 'Indique a seguradora.';
  }
  if (!draft.planName.trim()) {
    errors.planName = 'Indique o plano contratado.';
  }
  if (!draft.holderName.trim()) {
    errors.holderName = 'Indique o tomador do seguro.';
  }
  if (!draft.effectiveDate.trim()) {
    errors.effectiveDate = 'Indique a data de efeito.';
  }
  if (!draft.expiryDate.trim()) {
    errors.expiryDate = 'Indique a data de vencimento.';
  }

  const limitVal = Number(draft.globalLimitAKZ);
  if (!Number.isFinite(limitVal) || limitVal < 0) {
    errors.globalLimitAKZ = 'O limite máximo deve ser um número igual ou superior a 0.';
  }

  if (!draft.autoComputeTotalFromMembers) {
    const premiumVal = Number(draft.totalAnnualPremiumAKZ);
    if (!Number.isFinite(premiumVal) || premiumVal < 0) {
      errors.totalAnnualPremiumAKZ = 'O prémio total anual deve ser um valor igual ou superior a 0.';
    }
  }

  for (let i = 0; i < draft.members.length; i++) {
    const m = draft.members[i];
    if (!m.name.trim()) {
      errors.members = `O aderente #${i + 1} precisa de um nome válido.`;
      break;
    }
    const prem = Number(m.annualPremium);
    if (!Number.isFinite(prem) || prem < 0) {
      errors.members = `O prémio do aderente "${m.name}" não pode ser negativo ou inválido.`;
      break;
    }
  }

  return errors;
}

function buildDefaultCoverages(policyId: string, planName: string, globalLimit: number): CoverageItem[] {
  const hospLimit = Math.round(globalLimit * 0.8);
  const ambLimit = Math.min(1000000, Math.max(250000, Math.round(globalLimit * 0.05)));
  const medLimit = Math.min(400000, Math.max(100000, Math.round(ambLimit * 0.4)));
  const estomLimit = Math.min(250000, Math.max(100000, Math.round(ambLimit * 0.25)));

  return [
    {
      id: `${policyId}-cov-01`,
      order: 1,
      category: 'Limite Geral',
      level: 'Principal',
      name: 'Limite Máximo Anual Global',
      numericLimit: globalLimit,
      limitLabel: formatAKZ(globalLimit),
      copayRedePlus: '—',
      copayType: 'none',
      copayValue: 0,
      outOfNetworkShare: '—',
      outOfNetworkPercent: null,
      waitingPeriod: '—',
      deductible: '—',
      notes: `Teto máximo anual do ${planName}`,
    },
    {
      id: `${policyId}-cov-02`,
      order: 2,
      category: 'Hospitalização',
      level: 'Principal',
      name: 'Internamento Hospitalar / Cirurgia',
      numericLimit: hospLimit,
      limitLabel: formatAKZ(hospLimit),
      copayRedePlus: '10 %',
      copayType: 'percent',
      copayValue: 10,
      outOfNetworkShare: '30 %',
      outOfNetworkPercent: 30,
      waitingPeriod: '90 dias',
      deductible: '—',
      notes: '10% co-pagamento na Rede+ · 30% fora da Rede',
    },
    {
      id: `${policyId}-cov-03`,
      order: 3,
      category: 'Ambulatório',
      level: 'Principal',
      name: 'Ambulatório (Consultas, Exames e Urgências)',
      numericLimit: ambLimit,
      limitLabel: formatAKZ(ambLimit),
      copayRedePlus: '15 %',
      copayType: 'percent',
      copayValue: 15,
      outOfNetworkShare: '40 %',
      outOfNetworkPercent: 40,
      waitingPeriod: '30 dias',
      deductible: '—',
      notes: '15% co-pagamento na Rede+ · 40% fora da Rede',
    },
    {
      id: `${policyId}-cov-04`,
      order: 4,
      category: 'Medicamentos',
      level: 'Principal',
      name: 'Medicamentos',
      numericLimit: medLimit,
      limitLabel: formatAKZ(medLimit),
      copayRedePlus: '15 %',
      copayType: 'percent',
      copayValue: 15,
      outOfNetworkShare: '40 %',
      outOfNetworkPercent: 40,
      waitingPeriod: '30 dias',
      deductible: '—',
      notes: 'Sujeito a prescrição médica',
    },
    {
      id: `${policyId}-cov-05`,
      order: 5,
      category: 'Estomatologia',
      level: 'Principal',
      name: 'Estomatologia',
      numericLimit: estomLimit,
      limitLabel: formatAKZ(estomLimit),
      copayRedePlus: '15 %',
      copayType: 'percent',
      copayValue: 15,
      outOfNetworkShare: '40 %',
      outOfNetworkPercent: 40,
      waitingPeriod: '60 dias',
      deductible: '—',
      notes: 'Consultas e tratamentos dentários',
    },
  ];
}

function buildDefaultScenarios(
  policyId: string,
  coverages: CoverageItem[]
): SimulatorScenario[] {
  const hosp = coverages.find((c) => c.category === 'Hospitalização' || c.category === 'Internamento Hospitalar');
  const amb = coverages.find((c) => c.category === 'Ambulatório');
  const med = coverages.find((c) => c.category === 'Medicamentos');

  const scenarios: SimulatorScenario[] = [];
  if (hosp && hosp.numericLimit !== null) {
    scenarios.push({
      id: `${policyId}-sim-hosp`,
      label: hosp.name,
      category: hosp.category,
      limitAKZ: hosp.numericLimit,
      copayRuleLabel: hosp.copayRedePlus === '—' ? 'Sem co-pagamento' : `${hosp.copayRedePlus} co-pagamento`,
      copayType: hosp.copayType,
      copayValue: hosp.copayValue,
      outOfNetworkReimbursementPercent: hosp.outOfNetworkPercent ?? 60,
      defaultExpenseAKZ: Math.round(hosp.numericLimit * 0.12),
      coverageRowRef: 4 + hosp.order,
    });
  }
  if (amb && amb.numericLimit !== null) {
    scenarios.push({
      id: `${policyId}-sim-amb`,
      label: amb.name,
      category: amb.category,
      limitAKZ: amb.numericLimit,
      copayRuleLabel: amb.copayRedePlus === '—' ? 'Sem co-pagamento' : `${amb.copayRedePlus} co-pagamento`,
      copayType: amb.copayType,
      copayValue: amb.copayValue,
      outOfNetworkReimbursementPercent: amb.outOfNetworkPercent ?? 60,
      defaultExpenseAKZ: Math.round(amb.numericLimit * 0.35),
      coverageRowRef: 4 + amb.order,
    });
  }
  if (med && med.numericLimit !== null) {
    scenarios.push({
      id: `${policyId}-sim-med`,
      label: med.name,
      category: med.category,
      limitAKZ: med.numericLimit,
      copayRuleLabel: med.copayRedePlus === '—' ? 'Sem co-pagamento' : `${med.copayRedePlus} co-pagamento`,
      copayType: med.copayType,
      copayValue: med.copayValue,
      outOfNetworkReimbursementPercent: med.outOfNetworkPercent ?? 60,
      defaultExpenseAKZ: Math.round(med.numericLimit * 0.4),
      coverageRowRef: 4 + med.order,
    });
  }
  return scenarios;
}

export function buildPolicyFromDraft(
  draft: PolicyFormDraft,
  existingPolicy?: InsurancePolicy
): InsurancePolicy {
  const cleanNumber = draft.policyNumber.trim();
  const id =
    existingPolicy?.id ??
    `${cleanNumber.replace(/[^a-zA-Z0-9_-]/g, '') || 'pol'}-${Date.now().toString(36)}`;
  const projectName = draft.projectName.trim();
  const insurer = draft.insurer.trim();
  const planName = draft.planName.trim();
  const shortInsurer = insurer.includes('Mundial')
    ? 'A Mundial'
    : insurer.includes('Aliança')
      ? 'Aliança'
      : insurer;

  const members: PolicyMember[] = draft.members.map((m, idx) => ({
    id: idx + 1,
    name: m.name.trim(),
    birthDate: m.birthDate.trim() ? m.birthDate.trim() : null,
    gender: m.gender,
    documentId: m.documentId.trim(),
    healthCode: m.healthCode.trim() || `${cleanNumber}-${String(idx + 1).padStart(3, '0')}`,
    entryDate: m.entryDate.trim() || draft.effectiveDate,
    annualPremium: Math.round((Number(m.annualPremium) || 0) * 100) / 100,
    waitingPeriod: m.waitingPeriod.trim() || 'Não',
    plan: m.plan.trim() || planName,
    workMode: m.workMode,
    role: m.role?.trim() || undefined,
    baseSalaryAKZ:
      m.baseSalaryAKZ !== undefined && m.baseSalaryAKZ !== ''
        ? Math.round((Number(m.baseSalaryAKZ) || 0) * 100) / 100
        : undefined,
    medicalCertificateNumber: m.medicalCertificateNumber?.trim() || undefined,
    medicalCertificateExpiry: m.medicalCertificateExpiry?.trim() || undefined,
    medicalCertificateStatus: m.medicalCertificateStatus,
  }));

  const memberSum =
    Math.round(members.reduce((acc, m) => acc + m.annualPremium, 0) * 100) / 100;
  const totalAnnualPremium = draft.autoComputeTotalFromMembers
    ? memberSum
    : Math.round((Number(draft.totalAnnualPremiumAKZ) || 0) * 100) / 100;

  const isWorkAccident = draft.policyCategory === 'acidente_trabalho';
  const onshoreMembers = members.filter((m) => m.workMode === 'Onshore');
  const offshoreMembers = members.filter((m) => m.workMode === 'Offshore');
  const derivedOnshorePayroll =
    Math.round(onshoreMembers.reduce((acc, m) => acc + (m.baseSalaryAKZ ?? 0), 0) * 100) / 100;
  const derivedOffshorePayroll =
    Math.round(offshoreMembers.reduce((acc, m) => acc + (m.baseSalaryAKZ ?? 0), 0) * 100) / 100;

  const payrollOnshoreAKZ =
    derivedOnshorePayroll > 0
      ? derivedOnshorePayroll
      : Math.round((Number(draft.payrollOnshoreAKZ) || 0) * 100) / 100;
  const payrollOffshoreAKZ =
    derivedOffshorePayroll > 0
      ? derivedOffshorePayroll
      : Math.round((Number(draft.payrollOffshoreAKZ) || 0) * 100) / 100;
  const payrollTotalAKZ = Math.round((payrollOnshoreAKZ + payrollOffshoreAKZ) * 100) / 100;

  const globalLimit = Math.round(
    ((Number(draft.globalLimitAKZ) || 0) || (isWorkAccident ? payrollTotalAKZ : 0)) * 100
  ) / 100;

  let coverages: CoverageItem[];
  if (existingPolicy && existingPolicy.coverages.length > 0) {
    let updatedLimit = false;
    coverages = existingPolicy.coverages.map((c) => {
      if (!updatedLimit && c.category === 'Limite Geral' && c.numericLimit !== null) {
        updatedLimit = true;
        return {
          ...c,
          numericLimit: globalLimit,
          limitLabel: formatAKZ(globalLimit),
        };
      }
      return c;
    });
  } else {
    coverages = buildDefaultCoverages(id, planName, globalLimit);
  }

  const simulatorScenarios =
    existingPolicy && existingPolicy.simulatorScenarios.length > 0
      ? existingPolicy.simulatorScenarios
      : buildDefaultScenarios(id, coverages);

  const notes = draft.notesText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const hasBirthDates = members.length === 0 ? true : members.some((m) => m.birthDate !== null);

  return {
    id,
    shortLabel: `Apólice ${cleanNumber}`,
    projectName,
    subtitle: `${projectName} · ${shortInsurer} (${members.length} ${isWorkAccident ? 'colab.' : 'ader.'})`,
    policyCategory: draft.policyCategory,
    accentColor: draft.accentColor,
    hasBirthDates,
    holder: {
      name: draft.holderName.trim(),
      nif: draft.holderNif.trim() || '—',
      phone: draft.holderPhone.trim() || '—',
      email: draft.holderEmail.trim() || '—',
      address: draft.holderAddress.trim() || '—',
      producerAgent: draft.producerAgent.trim() || 'VENDA DIRECTA',
      clientNumber: existingPolicy?.holder.clientNumber,
    },
    metadata: {
      insurer,
      product:
        draft.product.trim() ||
        (isWorkAccident ? 'Acidentes Trabalho - Prémio Variável' : 'Saúde Grupo'),
      documentType: draft.documentType.trim() || 'CONDIÇÕES PARTICULARES',
      policyNumber: cleanNumber,
      endorsementNumber: draft.endorsementNumber.trim() || '1.0',
      planName,
      startDate: draft.startDate.trim() || draft.effectiveDate,
      effectiveDate: draft.effectiveDate.trim(),
      expiryDate: draft.expiryDate.trim(),
      renewalDate: draft.renewalDate.trim() || draft.expiryDate.trim(),
      duration: draft.duration.trim() || 'Anual',
      billingFrequency: draft.billingFrequency.trim() || 'Anual',
      simpleAnnualPremium:
        existingPolicy?.metadata.simpleAnnualPremium ?? totalAnnualPremium,
      totalAnnualPremium,
      totalMembers: members.length,
      currency: 'AKZ',
      issueStamp: existingPolicy?.metadata.issueStamp ?? new Date().toISOString().slice(0, 16).replace('T', ' '),
      territorialScope: draft.territorialScope.trim() || undefined,
    },
    billingNotice: existingPolicy?.billingNotice,
    workAccidentDetails: isWorkAccident
      ? {
          referenceMonth:
            draft.workAccidentReferenceMonth.trim() ||
            existingPolicy?.workAccidentDetails?.referenceMonth ||
            'Mensal',
          onshoreCount:
            onshoreMembers.length > 0
              ? onshoreMembers.length
              : Number(draft.onshoreCount) || existingPolicy?.workAccidentDetails?.onshoreCount || 0,
          offshoreCount:
            offshoreMembers.length > 0
              ? offshoreMembers.length
              : Number(draft.offshoreCount) || existingPolicy?.workAccidentDetails?.offshoreCount || 0,
          payrollOnshoreAKZ,
          payrollOffshoreAKZ,
          payrollTotalAKZ,
          escritorioInvoiceAKZ: existingPolicy?.workAccidentDetails?.escritorioInvoiceAKZ,
          offshoreInvoiceAKZ: existingPolicy?.workAccidentDetails?.offshoreInvoiceAKZ,
          multicaixaEntity: existingPolicy?.workAccidentDetails?.multicaixaEntity,
          multicaixaReference: existingPolicy?.workAccidentDetails?.multicaixaReference,
        }
      : undefined,
    coverages,
    members,
    simulatorScenarios,
    notes: notes.length > 0 ? notes : undefined,
  };
}

export function upsertPolicy(
  policies: InsurancePolicy[],
  nextPolicy: InsurancePolicy
): InsurancePolicy[] {
  const exists = policies.some((p) => p.id === nextPolicy.id);
  if (exists) {
    return policies.map((p) => (p.id === nextPolicy.id ? nextPolicy : p));
  }
  return [...policies, nextPolicy];
}

export function deletePolicyById(
  policies: InsurancePolicy[],
  policyId: string
): InsurancePolicy[] {
  return policies.filter((p) => p.id !== policyId);
}

export function upsertMemberInPolicy(
  policy: InsurancePolicy,
  member: PolicyMember,
  syncPolicyTotal: boolean = true
): InsurancePolicy {
  const exists = policy.members.some((m) => m.id === member.id);
  const rawMembers = exists
    ? policy.members.map((m) => (m.id === member.id ? member : m))
    : [...policy.members, { ...member, id: policy.members.reduce((max, x) => Math.max(max, x.id), 0) + 1 }];

  const reindexed = rawMembers.map((m, idx) => ({ ...m, id: idx + 1 }));
  const memberSum =
    Math.round(reindexed.reduce((acc, m) => acc + m.annualPremium, 0) * 100) / 100;
  const shortInsurer = policy.metadata.insurer.includes('Mundial')
    ? 'A Mundial'
    : policy.metadata.insurer.includes('Aliança')
      ? 'Aliança'
      : policy.metadata.insurer;

  return {
    ...policy,
    subtitle: `${policy.projectName} · ${shortInsurer} (${reindexed.length} ader.)`,
    hasBirthDates: reindexed.some((m) => m.birthDate !== null) || policy.hasBirthDates,
    members: reindexed,
    metadata: {
      ...policy.metadata,
      totalMembers: reindexed.length,
      totalAnnualPremium: syncPolicyTotal
        ? memberSum
        : policy.metadata.totalAnnualPremium,
    },
  };
}

export function deleteMemberFromPolicy(
  policy: InsurancePolicy,
  memberId: number,
  syncPolicyTotal: boolean = true
): InsurancePolicy {
  const reindexed = policy.members
    .filter((m) => m.id !== memberId)
    .map((m, idx) => ({ ...m, id: idx + 1 }));
  const memberSum =
    Math.round(reindexed.reduce((acc, m) => acc + m.annualPremium, 0) * 100) / 100;
  const shortInsurer = policy.metadata.insurer.includes('Mundial')
    ? 'A Mundial'
    : policy.metadata.insurer.includes('Aliança')
      ? 'Aliança'
      : policy.metadata.insurer;

  return {
    ...policy,
    subtitle: `${policy.projectName} · ${shortInsurer} (${reindexed.length} ader.)`,
    members: reindexed,
    metadata: {
      ...policy.metadata,
      totalMembers: reindexed.length,
      totalAnnualPremium: syncPolicyTotal
        ? memberSum
        : policy.metadata.totalAnnualPremium,
    },
  };
}

export function loadStoredPolicies(): InsurancePolicy[] {
  if (typeof window === 'undefined') return ALL_POLICIES;
  try {
    const raw = window.localStorage.getItem(POLICIES_STORAGE_KEY);
    if (!raw) return ALL_POLICIES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as InsurancePolicy[];
    }
    return ALL_POLICIES;
  } catch {
    return ALL_POLICIES;
  }
}

export function saveStoredPolicies(policies: InsurancePolicy[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(POLICIES_STORAGE_KEY, JSON.stringify(policies));
  } catch {
    // Ignore storage quota errors
  }
}

export function resetStoredPolicies(): InsurancePolicy[] {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(POLICIES_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }
  return ALL_POLICIES;
}
