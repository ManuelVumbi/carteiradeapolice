export interface PolicyHolder {
  name: string;
  address: string;
  nif: string;
  phone: string;
  email: string;
  producerAgent: string;
  clientNumber?: string;
}

export interface PolicyMetadata {
  insurer: string;
  product: string;
  documentType: string;
  policyNumber: string;
  endorsementNumber: string; // Acta N.º
  planName: string;
  startDate: string; // ISO YYYY-MM-DD
  effectiveDate: string; // ISO YYYY-MM-DD
  expiryDate: string; // ISO YYYY-MM-DD
  renewalDate: string; // ISO YYYY-MM-DD
  duration: string;
  billingFrequency: string; // Fraccionamento
  simpleAnnualPremium?: number;
  totalAnnualPremium: number;
  totalMembers: number;
  currency: string;
  issueStamp: string;
  territorialScope?: string;
}

export interface BillingNotice {
  noticeNumber: string; // Nota Pagam. Nº P2026.197
  referenceCode: string; // XPP2026/197
  periodStart: string;
  periodEnd: string;
  issueDate: string;
  dueDate: string;
  agency: string;
  simplePremium: number;
  charges: number;
  vat: number;
  totalToPay: number;
  bankName: string;
  bankAccount: string;
  nib: string;
  iban: string;
  swift: string;
  unitCount: number;
}

export type CoverageCategory =
  | 'Limite Geral'
  | 'Internamento Hospitalar'
  | 'Hospitalização'
  | 'Maternidade'
  | 'Ambulatório'
  | 'Medicamentos'
  | 'Estomatologia'
  | 'Oftalmologia'
  | 'Âmbito e Extensão'
  | 'Outros Benefícios';

export interface CoverageItem {
  id: string;
  order: number;
  category: CoverageCategory;
  level: 'Principal' | 'Sub-cobertura';
  name: string;
  numericLimit: number | null;
  limitLabel: string;
  copayRedePlus: string;
  copayType: 'fixed' | 'percent' | 'none';
  copayValue: number;
  outOfNetworkShare: string;
  outOfNetworkPercent: number | null;
  waitingPeriod: string;
  deductible: string;
  notes: string;
}

export type Gender = 'Masculino' | 'Feminino' | 'Não indicado';
export type PolicyCategory = 'saude' | 'acidente_trabalho';
export type WorkMode = 'Onshore' | 'Offshore';
export type MedicalFitnessStatus = 'Apto' | 'Apto com Restrições' | 'Pendente';

export interface WorkAccidentDetails {
  referenceMonth: string;
  onshoreCount: number;
  offshoreCount: number;
  payrollOnshoreAKZ: number;
  payrollOffshoreAKZ: number;
  payrollTotalAKZ: number;
  escritorioInvoiceAKZ?: number;
  offshoreInvoiceAKZ?: number;
  multicaixaEntity?: string;
  multicaixaReference?: string;
}

export interface MedicalCertificateRecord {
  id: string;
  workerName: string;
  policyId: string;
  policyNumber: string;
  projectName: string;
  role: string;
  workMode: WorkMode;
  certificateType: string;
  certificateNumber: string;
  issueDate: string; // ISO YYYY-MM-DD
  expiryDate: string; // ISO YYYY-MM-DD
  fitnessStatus: MedicalFitnessStatus;
  notes?: string;
}

export interface PolicyMember {
  id: number;
  name: string;
  birthDate: string | null; // ISO YYYY-MM-DD or null when not present in billing notice
  gender: Gender;
  documentId: string;
  healthCode: string;
  entryDate: string; // ISO YYYY-MM-DD (or period start in billing notice)
  periodEnd?: string;
  annualPremium: number;
  waitingPeriod: string;
  plan: string;
  workMode?: WorkMode;
  role?: string;
  baseSalaryAKZ?: number;
  medicalCertificateNumber?: string;
  medicalCertificateExpiry?: string;
  medicalCertificateStatus?: MedicalFitnessStatus;
}

export interface SimulatorScenario {
  id: string;
  label: string;
  category: string;
  limitAKZ: number;
  copayRuleLabel: string;
  copayType: 'fixed' | 'percent' | 'none';
  copayValue: number;
  outOfNetworkReimbursementPercent: number;
  defaultExpenseAKZ: number;
  coverageRowRef: number; // 1-based row in Coberturas sheet
}

export type PolicyAccentColor =
  | 'rose'
  | 'blue'
  | 'emerald'
  | 'amber'
  | 'violet'
  | 'cyan'
  | 'red';

export interface InsurancePolicy {
  id: string;
  shortLabel: string;
  projectName: string;
  subtitle: string;
  policyCategory?: PolicyCategory;
  accentColor?: PolicyAccentColor;
  holder: PolicyHolder;
  metadata: PolicyMetadata;
  billingNotice?: BillingNotice;
  workAccidentDetails?: WorkAccidentDetails;
  coverages: CoverageItem[];
  members: PolicyMember[];
  simulatorScenarios: SimulatorScenario[];
  hasBirthDates: boolean;
  notes?: string[];
}
