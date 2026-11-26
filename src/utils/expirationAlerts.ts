import { getPolicyCategory, parseIsoDateUTC } from '../data/policies';
import {
  InsurancePolicy,
  MedicalCertificateRecord,
  MedicalFitnessStatus,
  PolicyCategory,
  WorkMode,
} from '../data/types';

export const CERTIFICATES_STORAGE_KEY = 'espacie_medical_certificates_v1';
export const ALERT_SETTINGS_STORAGE_KEY = 'espacie_alert_settings_v1';
export const DEFAULT_ALERT_REFERENCE_DATE = '2026-11-26';
export const DEFAULT_ALERT_WARNING_DAYS = 60;

export type AlertSeverity = 'expired' | 'critical' | 'warning' | 'valid';

export interface PolicyExpirationAlert {
  kind: 'policy';
  policyId: string;
  policyNumber: string;
  projectName: string;
  insurer: string;
  policyCategory: PolicyCategory;
  expiryDate: string;
  daysRemaining: number;
  severity: AlertSeverity;
  memberCount: number;
  totalAnnualPremium: number;
}

export interface MedicalCertificateAlert {
  kind: 'medical_certificate';
  certificate: MedicalCertificateRecord;
  daysRemaining: number;
  severity: AlertSeverity;
}

export interface AlertsSummary {
  expiredCount: number;
  criticalCount: number;
  warningCount: number;
  validCount: number;
  urgentCount: number;
  policyUrgentCount: number;
  certificateUrgentCount: number;
}

export interface AlertSettings {
  referenceDateIso: string;
  warningDays: number;
}

export const INITIAL_MEDICAL_CERTIFICATES: MedicalCertificateRecord[] = [
  {
    id: 'cert-01',
    workerName: 'Francisco Lengo Manguenda Nvengo',
    policyId: '29980',
    policyNumber: '29980',
    projectName: 'Acidentes Trabalho (Geral)',
    role: 'Electricista',
    workMode: 'Offshore',
    certificateType: 'Atestado de Aptidão Offshore (OGUK / MTO)',
    certificateNumber: 'AT-MED-2025-0107',
    issueDate: '2025-11-18',
    expiryDate: '2026-11-18',
    fitnessStatus: 'Apto',
    notes: 'Renovação periódica anual obrigatória antes do próximo embarque.',
  },
  {
    id: 'cert-02',
    workerName: 'Simão Kosso',
    policyId: '29980',
    policyNumber: '29980',
    projectName: 'Acidentes Trabalho (Geral)',
    role: 'Tubista',
    workMode: 'Offshore',
    certificateType: 'Atestado Médico Ocupacional Periódico',
    certificateNumber: 'AT-MED-2025-0111',
    issueDate: '2025-12-04',
    expiryDate: '2026-12-04',
    fitnessStatus: 'Apto',
    notes: 'Agendar exames complementares de audiometria e espirometria.',
  },
  {
    id: 'cert-03',
    workerName: 'Anastácio Neves Jorge',
    policyId: '29980',
    policyNumber: '29980',
    projectName: 'Acidentes Trabalho (Geral)',
    role: 'Içador',
    workMode: 'Offshore',
    certificateType: 'Atestado de Aptidão Offshore & Altura',
    certificateNumber: 'AT-MED-2025-0129',
    issueDate: '2025-12-09',
    expiryDate: '2026-12-09',
    fitnessStatus: 'Apto',
    notes: 'Certificação específica para trabalho em altura e movimentação de cargas.',
  },
  {
    id: 'cert-04',
    workerName: 'Paulo Simba Bernardo',
    policyId: '29980',
    policyNumber: '29980',
    projectName: 'Acidentes Trabalho (Geral)',
    role: 'Soldador',
    workMode: 'Offshore',
    certificateType: 'Atestado Médico Ocupacional (Soldadura)',
    certificateNumber: 'AT-MED-2026-0008',
    issueDate: '2026-01-08',
    expiryDate: '2027-01-08',
    fitnessStatus: 'Apto com Restrições',
    notes: 'Reavaliação oftalmológica recomendada aos 12 meses.',
  },
  {
    id: 'cert-05',
    workerName: 'Obed Tati Cosme',
    policyId: '29980',
    policyNumber: '29980',
    projectName: 'Acidentes Trabalho (Geral)',
    role: 'QHSE Sénior Nivel 1',
    workMode: 'Onshore',
    certificateType: 'Atestado Médico de Saúde no Trabalho',
    certificateNumber: 'AT-MED-2026-0014',
    issueDate: '2026-01-14',
    expiryDate: '2027-01-14',
    fitnessStatus: 'Apto',
    notes: 'Controlo anual QHSE.',
  },
  {
    id: 'cert-06',
    workerName: 'LUCINDA MANUELA DO NASCIMENTO LELO',
    policyId: '29980',
    policyNumber: '29980',
    projectName: 'Acidentes Trabalho (Geral)',
    role: 'QHSE',
    workMode: 'Offshore',
    certificateType: 'Atestado de Aptidão Offshore (OGUK / MTO)',
    certificateNumber: 'AT-MED-2026-0237',
    issueDate: '2026-05-20',
    expiryDate: '2027-05-20',
    fitnessStatus: 'Apto',
    notes: 'Válido para rotações em plataforma.',
  },
  {
    id: 'cert-07',
    workerName: 'António Nascimento Sumbo',
    policyId: '29980',
    policyNumber: '29980',
    projectName: 'Acidentes Trabalho (Geral)',
    role: 'HSE',
    workMode: 'Onshore',
    certificateType: 'Atestado Médico Periódico',
    certificateNumber: 'AT-MED-2025-0125',
    issueDate: '2025-11-12',
    expiryDate: '2026-11-12',
    fitnessStatus: 'Pendente',
    notes: 'Aguarda entrega de boletim médico actualizado na clínica.',
  },
  {
    id: 'cert-08',
    workerName: 'Pedro Carlos',
    policyId: '27279',
    policyNumber: '27279',
    projectName: 'Dietsmann',
    role: 'Instrumentista',
    workMode: 'Offshore',
    certificateType: 'Atestado Médico de Aptidão Offshore',
    certificateNumber: 'DT-MED-2026-0037',
    issueDate: '2026-04-15',
    expiryDate: '2027-04-15',
    fitnessStatus: 'Apto',
    notes: 'Associado à apólice Saúde Dietsmann & Acidentes de Trabalho.',
  },
];

export function computeDaysRemaining(expiryIso: string, referenceIso: string): number {
  if (!expiryIso || !referenceIso) return 0;
  const exp = parseIsoDateUTC(expiryIso);
  const ref = parseIsoDateUTC(referenceIso);
  if (Number.isNaN(exp.getTime()) || Number.isNaN(ref.getTime())) return 0;
  const diffMs = exp.getTime() - ref.getTime();
  return Math.round(diffMs / 86400000);
}

export function classifyAlertSeverity(
  daysRemaining: number,
  warningDays: number = DEFAULT_ALERT_WARNING_DAYS
): AlertSeverity {
  if (daysRemaining < 0) return 'expired';
  if (daysRemaining <= 15) return 'critical';
  if (daysRemaining <= warningDays) return 'warning';
  return 'valid';
}

export function addYearsToIsoDate(isoDate: string, years: number = 1): string {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return isoDate;
  const [y, m, d] = parts;
  const dt = new Date(Date.UTC(y + years, m - 1, d));
  return dt.toISOString().slice(0, 10);
}

export function buildPolicyAlerts(
  policies: InsurancePolicy[],
  referenceIso: string = DEFAULT_ALERT_REFERENCE_DATE,
  warningDays: number = DEFAULT_ALERT_WARNING_DAYS
): PolicyExpirationAlert[] {
  return policies
    .map((p) => {
      const daysRemaining = computeDaysRemaining(p.metadata.expiryDate, referenceIso);
      return {
        kind: 'policy' as const,
        policyId: p.id,
        policyNumber: p.metadata.policyNumber,
        projectName: p.projectName,
        insurer: p.metadata.insurer,
        policyCategory: getPolicyCategory(p),
        expiryDate: p.metadata.expiryDate,
        daysRemaining,
        severity: classifyAlertSeverity(daysRemaining, warningDays),
        memberCount: p.members.length,
        totalAnnualPremium: p.metadata.totalAnnualPremium,
      };
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

export function buildMemberSyncedCertificates(
  policies: InsurancePolicy[],
  existingCerts: MedicalCertificateRecord[]
): MedicalCertificateRecord[] {
  const merged = [...existingCerts];
  const seenKeys = new Set(
    existingCerts.map((c) => `${c.policyId}::${c.workerName.trim().toLowerCase()}`)
  );

  for (const pol of policies) {
    for (const m of pol.members) {
      if (!m.medicalCertificateExpiry) continue;
      const key = `${pol.id}::${m.name.trim().toLowerCase()}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      merged.push({
        id: `member-${pol.id}-${m.id}`,
        workerName: m.name,
        policyId: pol.id,
        policyNumber: pol.metadata.policyNumber,
        projectName: pol.projectName,
        role: m.role ?? 'Colaborador',
        workMode: (m.workMode ?? 'Onshore') as WorkMode,
        certificateType: 'Atestado Médico Ocupacional',
        certificateNumber: m.medicalCertificateNumber ?? `AT-${pol.metadata.policyNumber}-${m.id}`,
        issueDate: m.entryDate,
        expiryDate: m.medicalCertificateExpiry,
        fitnessStatus: (m.medicalCertificateStatus ?? 'Apto') as MedicalFitnessStatus,
      });
    }
  }

  return merged;
}

export function buildMedicalCertificateAlerts(
  certificates: MedicalCertificateRecord[],
  policies: InsurancePolicy[],
  referenceIso: string = DEFAULT_ALERT_REFERENCE_DATE,
  warningDays: number = DEFAULT_ALERT_WARNING_DAYS
): MedicalCertificateAlert[] {
  const combined = buildMemberSyncedCertificates(policies, certificates);
  return combined
    .map((certificate) => {
      const daysRemaining = computeDaysRemaining(certificate.expiryDate, referenceIso);
      return {
        kind: 'medical_certificate' as const,
        certificate,
        daysRemaining,
        severity: classifyAlertSeverity(daysRemaining, warningDays),
      };
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

export function summarizeAlerts(
  policyAlerts: PolicyExpirationAlert[],
  certificateAlerts: MedicalCertificateAlert[]
): AlertsSummary {
  const all = [...policyAlerts, ...certificateAlerts];
  const expiredCount = all.filter((a) => a.severity === 'expired').length;
  const criticalCount = all.filter((a) => a.severity === 'critical').length;
  const warningCount = all.filter((a) => a.severity === 'warning').length;
  const validCount = all.filter((a) => a.severity === 'valid').length;
  const policyUrgentCount = policyAlerts.filter((a) => a.severity !== 'valid').length;
  const certificateUrgentCount = certificateAlerts.filter((a) => a.severity !== 'valid').length;

  return {
    expiredCount,
    criticalCount,
    warningCount,
    validCount,
    urgentCount: expiredCount + criticalCount + warningCount,
    policyUrgentCount,
    certificateUrgentCount,
  };
}

export function formatDaysRemainingLabel(daysRemaining: number): string {
  if (daysRemaining < -1) return `Expirado há ${Math.abs(daysRemaining)} dias`;
  if (daysRemaining === -1) return 'Expirado ontem';
  if (daysRemaining === 0) return 'Expira hoje';
  if (daysRemaining === 1) return 'Expira amanhã';
  return `${daysRemaining} dias restantes`;
}

export function upsertMedicalCertificate(
  list: MedicalCertificateRecord[],
  record: MedicalCertificateRecord
): MedicalCertificateRecord[] {
  const exists = list.some((c) => c.id === record.id);
  if (exists) {
    return list.map((c) => (c.id === record.id ? record : c));
  }
  return [record, ...list];
}

export function deleteMedicalCertificate(
  list: MedicalCertificateRecord[],
  id: string
): MedicalCertificateRecord[] {
  return list.filter((c) => c.id !== id);
}

export function loadStoredCertificates(): MedicalCertificateRecord[] {
  if (typeof window === 'undefined') return INITIAL_MEDICAL_CERTIFICATES;
  try {
    const raw = window.localStorage.getItem(CERTIFICATES_STORAGE_KEY);
    if (!raw) return INITIAL_MEDICAL_CERTIFICATES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MedicalCertificateRecord[]) : INITIAL_MEDICAL_CERTIFICATES;
  } catch {
    return INITIAL_MEDICAL_CERTIFICATES;
  }
}

export function saveStoredCertificates(certs: MedicalCertificateRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CERTIFICATES_STORAGE_KEY, JSON.stringify(certs));
  } catch {
    // Ignore storage quota errors
  }
}

export function resetStoredCertificates(): MedicalCertificateRecord[] {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(CERTIFICATES_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }
  return INITIAL_MEDICAL_CERTIFICATES;
}

export function loadAlertSettings(): AlertSettings {
  const fallback: AlertSettings = {
    referenceDateIso: DEFAULT_ALERT_REFERENCE_DATE,
    warningDays: DEFAULT_ALERT_WARNING_DAYS,
  };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(ALERT_SETTINGS_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<AlertSettings>;
    return {
      referenceDateIso:
        typeof parsed.referenceDateIso === 'string' && parsed.referenceDateIso
          ? parsed.referenceDateIso
          : fallback.referenceDateIso,
      warningDays:
        typeof parsed.warningDays === 'number' && parsed.warningDays >= 7
          ? parsed.warningDays
          : fallback.warningDays,
    };
  } catch {
    return fallback;
  }
}

export function saveAlertSettings(settings: AlertSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ALERT_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}
