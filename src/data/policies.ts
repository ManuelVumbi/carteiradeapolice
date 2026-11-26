import { POLICY_27279 } from './policy27279';
import { POLICY_24050 } from './policy24050';
import { POLICY_5423633 } from './policy5423633';
import { POLICY_5671605 } from './policy5671605';
import { POLICY_29980 } from './policy29980';
import { InsurancePolicy, PolicyCategory, PolicyMember } from './types';

export const ALL_POLICIES: InsurancePolicy[] = [
  POLICY_27279,
  POLICY_24050,
  POLICY_5423633,
  POLICY_5671605,
  POLICY_29980,
];

export function getPolicyCategory(policy: InsurancePolicy): PolicyCategory {
  if (policy.policyCategory) return policy.policyCategory;
  const prod = policy.metadata.product.toLowerCase();
  if (prod.includes('acidente') || prod.includes('trabalho')) {
    return 'acidente_trabalho';
  }
  return 'saude';
}

export function filterPoliciesByCategory(
  policies: InsurancePolicy[],
  category: 'all' | PolicyCategory
): InsurancePolicy[] {
  if (category === 'all') return policies;
  return policies.filter((p) => getPolicyCategory(p) === category);
}

export function getPolicyById(
  id: string,
  policies: InsurancePolicy[] = ALL_POLICIES
): InsurancePolicy | undefined {
  return policies.find((p) => p.id === id) ?? policies[0];
}

export interface PolicyPremiumStats {
  policyId: string;
  policyNumber: string;
  projectName: string;
  insurer: string;
  memberCount: number;
  totalPolicyPremium: number;
  nominalMemberSum: number;
  minPremium: number;
  minNonZeroPremium: number;
  averagePolicyPerMember: number;
  averageNominalPerMember: number;
  maxPremium: number;
  zeroCount: number;
}

export function getPolicyPremiumStats(policy: InsurancePolicy): PolicyPremiumStats {
  const premiums = policy.members.map((m) => m.annualPremium);
  const nonZero = premiums.filter((v) => v > 0);
  const memberCount = premiums.length;
  const nominalMemberSum = Math.round(premiums.reduce((a, b) => a + b, 0) * 100) / 100;
  const totalPolicyPremium = policy.metadata.totalAnnualPremium;
  const minPremium = premiums.length > 0 ? Math.min(...premiums) : 0;
  const minNonZeroPremium = nonZero.length > 0 ? Math.min(...nonZero) : 0;
  const maxPremium = premiums.length > 0 ? Math.max(...premiums) : 0;
  const averagePolicyPerMember =
    memberCount > 0 ? Math.round((totalPolicyPremium / memberCount) * 100) / 100 : 0;
  const averageNominalPerMember =
    memberCount > 0 ? Math.round((nominalMemberSum / memberCount) * 100) / 100 : 0;
  const zeroCount = premiums.length - nonZero.length;

  return {
    policyId: policy.id,
    policyNumber: policy.metadata.policyNumber,
    projectName: policy.projectName,
    insurer: policy.metadata.insurer,
    memberCount,
    totalPolicyPremium,
    nominalMemberSum,
    minPremium,
    minNonZeroPremium,
    averagePolicyPerMember,
    averageNominalPerMember,
    maxPremium,
    zeroCount,
  };
}

export interface PortfolioStats {
  totalPolicies: number;
  totalMembers: number;
  totalAnnualPremium: number;
  totalMonthlyEquivalent: number;
  averagePremiumPerMember: number;
  minMemberPremium: number;
  minNonZeroMemberPremium: number;
  maxMemberPremium: number;
  byPolicy: PolicyPremiumStats[];
  byInsurer: Array<{
    insurer: string;
    policyCount: number;
    memberCount: number;
    totalPremium: number;
    sharePercent: number;
  }>;
  byHolder: Array<{
    holderName: string;
    nif: string;
    policyCount: number;
    memberCount: number;
    totalPremium: number;
  }>;
}

export function getPortfolioStats(policies: InsurancePolicy[] = ALL_POLICIES): PortfolioStats {
  const totalPolicies = policies.length;
  const totalMembers = policies.reduce((acc, p) => acc + p.members.length, 0);
  const totalAnnualPremium =
    Math.round(policies.reduce((acc, p) => acc + p.metadata.totalAnnualPremium, 0) * 100) / 100;
  const totalMonthlyEquivalent = Math.round((totalAnnualPremium / 12) * 100) / 100;
  const averagePremiumPerMember =
    totalMembers > 0 ? Math.round((totalAnnualPremium / totalMembers) * 100) / 100 : 0;

  const byPolicy = policies.map(getPolicyPremiumStats);
  const allPremiums = policies.flatMap((p) => p.members.map((m) => m.annualPremium));
  const allNonZero = allPremiums.filter((v) => v > 0);
  const minMemberPremium = allPremiums.length > 0 ? Math.min(...allPremiums) : 0;
  const minNonZeroMemberPremium = allNonZero.length > 0 ? Math.min(...allNonZero) : 0;
  const maxMemberPremium = allPremiums.length > 0 ? Math.max(...allPremiums) : 0;

  const insurerMap = new Map<
    string,
    { insurer: string; policyCount: number; memberCount: number; totalPremium: number }
  >();
  for (const p of policies) {
    const key = p.metadata.insurer;
    const prev = insurerMap.get(key) ?? {
      insurer: key,
      policyCount: 0,
      memberCount: 0,
      totalPremium: 0,
    };
    prev.policyCount += 1;
    prev.memberCount += p.members.length;
    prev.totalPremium = Math.round((prev.totalPremium + p.metadata.totalAnnualPremium) * 100) / 100;
    insurerMap.set(key, prev);
  }

  const byInsurer = Array.from(insurerMap.values()).map((row) => ({
    ...row,
    sharePercent:
      totalAnnualPremium > 0
        ? Math.round((row.totalPremium / totalAnnualPremium) * 1000) / 10
        : 0,
  }));

  const holderMap = new Map<
    string,
    { holderName: string; nif: string; policyCount: number; memberCount: number; totalPremium: number }
  >();
  for (const p of policies) {
    const key = `${p.holder.name}|${p.holder.nif}`;
    const prev = holderMap.get(key) ?? {
      holderName: p.holder.name,
      nif: p.holder.nif,
      policyCount: 0,
      memberCount: 0,
      totalPremium: 0,
    };
    prev.policyCount += 1;
    prev.memberCount += p.members.length;
    prev.totalPremium = Math.round((prev.totalPremium + p.metadata.totalAnnualPremium) * 100) / 100;
    holderMap.set(key, prev);
  }

  return {
    totalPolicies,
    totalMembers,
    totalAnnualPremium,
    totalMonthlyEquivalent,
    averagePremiumPerMember,
    minMemberPremium,
    minNonZeroMemberPremium,
    maxMemberPremium,
    byPolicy,
    byInsurer,
    byHolder: Array.from(holderMap.values()),
  };
}

export function parseIsoDateUTC(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function calculateAge(birthDateIso: string | null, referenceDateIso: string): number | null {
  if (!birthDateIso) return null;
  const birth = parseIsoDateUTC(birthDateIso);
  const ref = parseIsoDateUTC(referenceDateIso);
  let age = ref.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = ref.getUTCMonth() - birth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && ref.getUTCDate() < birth.getUTCDate())) {
    age -= 1;
  }
  return age;
}

export function getAgeBracket(age: number | null): string {
  if (age === null) return 'Sem data nasc.';
  if (age <= 30) return '≤ 30 anos';
  if (age <= 35) return '31–35 anos';
  if (age <= 40) return '36–40 anos';
  if (age <= 45) return '41–45 anos';
  return '≥ 46 anos';
}

export interface PremiumTier {
  id: string;
  label: string;
  unitPremium: number;
  count: number;
  totalPremium: number;
  sharePercent: number;
}

export function getPremiumTiers(
  members: PolicyMember[],
  hasBirthDates: boolean = true,
  referenceDateIso: string = '2026-07-15'
): PremiumTier[] {
  const totalAll = members.reduce((acc, m) => acc + m.annualPremium, 0);
  const groups = new Map<
    number,
    { unitPremium: number; count: number; totalPremium: number; ages: number[] }
  >();

  for (const m of members) {
    const key = Math.round(m.annualPremium * 100) / 100;
    const entry = groups.get(key) ?? { unitPremium: key, count: 0, totalPremium: 0, ages: [] };
    entry.count += 1;
    entry.totalPremium = Math.round((entry.totalPremium + m.annualPremium) * 100) / 100;
    if (hasBirthDates && m.birthDate) {
      const age = calculateAge(m.birthDate, referenceDateIso);
      if (age !== null) entry.ages.push(age);
    }
    groups.set(key, entry);
  }

  return Array.from(groups.values())
    .sort((a, b) => a.unitPremium - b.unitPremium)
    .map((g, idx) => {
      let label = `Escalão ${idx + 1}`;
      if (g.unitPremium === 0) {
        label = 'Sem prémio individual (0,00 AKZ)';
      } else if (g.ages.length > 0) {
        const minAge = Math.min(...g.ages);
        const maxAge = Math.max(...g.ages);
        label = minAge === maxAge ? `Idade ${minAge} anos` : `Idades ${minAge}–${maxAge} anos`;
      } else {
        label = `Tarifa ${formatAKZ(g.unitPremium)}`;
      }
      return {
        id: `tier-${idx + 1}-${g.unitPremium}`,
        label,
        unitPremium: g.unitPremium,
        count: g.count,
        totalPremium: g.totalPremium,
        sharePercent: totalAll > 0 ? (g.totalPremium / totalAll) * 100 : 0,
      };
    });
}

export function formatAKZ(value: number): string {
  const fixed = value.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formattedInt},${decPart} AKZ`;
}

export function formatDatePT(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

export function getPolicyGlobalLimit(policy: InsurancePolicy): {
  numericLimit: number;
  label: string;
} {
  const maxCov = policy.coverages.find((c) => c.category === 'Limite Geral' && c.numericLimit !== null);
  if (maxCov && maxCov.numericLimit !== null) {
    return { numericLimit: maxCov.numericLimit, label: maxCov.limitLabel };
  }
  const highest = policy.coverages.reduce((max, c) => Math.max(max, c.numericLimit ?? 0), 0);
  return { numericLimit: highest, label: formatAKZ(highest) };
}
