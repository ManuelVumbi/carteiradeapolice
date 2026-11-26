import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_POLICIES,
  POLICY_24050,
  POLICY_27279,
  POLICY_5423633,
  POLICY_5671605,
  calculateAge,
  getAgeBracket,
  getPolicyPremiumStats,
  getPortfolioStats,
  getPremiumTiers,
} from './policyData';

test('all 4 policies match exact PDF member counts and annual premiums', () => {
  assert.equal(ALL_POLICIES.length, 4);

  // Apólice 27279 (Dietsmann)
  assert.equal(POLICY_27279.projectName, 'Dietsmann');
  assert.equal(POLICY_27279.members.length, 15);
  assert.equal(
    Math.round(POLICY_27279.members.reduce((a, m) => a + m.annualPremium, 0) * 100) / 100,
    7499545.85
  );

  // Apólice 24050 (SPIE)
  assert.equal(POLICY_24050.projectName, 'SPIE');
  assert.equal(POLICY_24050.members.length, 135);
  assert.equal(
    Math.round(POLICY_24050.members.reduce((a, m) => a + m.annualPremium, 0) * 100) / 100,
    22902277.41
  );
  assert.equal(POLICY_24050.billingNotice?.totalToPay, 22902277.41);

  // Apólice 5423633 (Total)
  assert.equal(POLICY_5423633.projectName, 'Total');
  assert.equal(POLICY_5423633.members.length, 16);
  assert.equal(POLICY_5423633.metadata.totalAnnualPremium, 3584925.01);
  assert.equal(
    Math.round(POLICY_5423633.members.reduce((a, m) => a + m.annualPremium, 0) * 100) / 100,
    3179717.07
  );

  // Apólice 5671605 (Paenal)
  assert.equal(POLICY_5671605.projectName, 'Paenal');
  assert.equal(POLICY_5671605.members.length, 2);
  assert.equal(POLICY_5671605.metadata.totalAnnualPremium, 545516.0);
  assert.equal(
    Math.round(POLICY_5671605.members.reduce((a, m) => a + m.annualPremium, 0) * 100) / 100,
    519380.0
  );
});

test('per-policy premium stats compute exact total, minimum, average, and maximum values', () => {
  const s27279 = getPolicyPremiumStats(POLICY_27279);
  assert.equal(s27279.projectName, 'Dietsmann');
  assert.equal(s27279.totalPolicyPremium, 7499545.85);
  assert.equal(s27279.minPremium, 437512.4);
  assert.equal(s27279.averagePolicyPerMember, 499969.72);
  assert.equal(s27279.maxPremium, 602545.94);

  const s24050 = getPolicyPremiumStats(POLICY_24050);
  assert.equal(s24050.projectName, 'SPIE');
  assert.equal(s24050.totalPolicyPremium, 22902277.41);
  assert.equal(s24050.minPremium, 132720.53);
  assert.equal(s24050.averagePolicyPerMember, 169646.5);
  assert.equal(s24050.maxPremium, 261951.69);

  const s5423633 = getPolicyPremiumStats(POLICY_5423633);
  assert.equal(s5423633.projectName, 'Total');
  assert.equal(s5423633.totalPolicyPremium, 3584925.01);
  assert.equal(s5423633.minPremium, 0);
  assert.equal(s5423633.minNonZeroPremium, 166738.72);
  assert.equal(s5423633.averagePolicyPerMember, 224057.81);
  assert.equal(s5423633.averageNominalPerMember, 198732.32);
  assert.equal(s5423633.maxPremium, 288278.25);
  assert.equal(s5423633.zeroCount, 2);

  const s5671605 = getPolicyPremiumStats(POLICY_5671605);
  assert.equal(s5671605.projectName, 'Paenal');
  assert.equal(s5671605.totalPolicyPremium, 545516.0);
  assert.equal(s5671605.minPremium, 246622.0);
  assert.equal(s5671605.averagePolicyPerMember, 272758.0);
  assert.equal(s5671605.averageNominalPerMember, 259690.0);
  assert.equal(s5671605.maxPremium, 272758.0);
});

test('consolidated portfolio stats aggregate all 4 policies and 168 members accurately', () => {
  const stats = getPortfolioStats(ALL_POLICIES);
  assert.equal(stats.totalPolicies, 4);
  assert.equal(stats.totalMembers, 168);
  assert.equal(stats.totalAnnualPremium, 34532264.27);
  assert.equal(stats.byPolicy.length, 4);
  assert.equal(stats.minMemberPremium, 0);
  assert.equal(stats.minNonZeroMemberPremium, 132720.53);
  assert.equal(stats.maxMemberPremium, 602545.94);
  assert.equal(stats.byInsurer.length, 2);
  assert.equal(stats.byHolder.length, 2);
});

test('premium tiers account for all 15 members in 27279 and 135 members in 24050', () => {
  const tiers27279 = getPremiumTiers(POLICY_27279.members, true, '2026-07-15');
  assert.equal(tiers27279.length, 5);
  assert.equal(tiers27279.reduce((acc, t) => acc + t.count, 0), 15);

  const tiers24050 = getPremiumTiers(POLICY_24050.members, false, '2026-09-04');
  assert.equal(tiers24050.reduce((acc, t) => acc + t.count, 0), 135);
  assert.equal(
    Math.round(tiers24050.reduce((acc, t) => acc + t.totalPremium, 0) * 100) / 100,
    22902277.41
  );
});

test('age calculation and age bracket classification handle valid and null birth dates', () => {
  assert.equal(calculateAge('1998-04-09', '2026-07-15'), 28);
  assert.equal(calculateAge('1978-10-10', '2026-07-15'), 47);
  assert.equal(calculateAge(null, '2026-09-04'), null);
  assert.equal(getAgeBracket(28), '≤ 30 anos');
  assert.equal(getAgeBracket(33), '31–35 anos');
  assert.equal(getAgeBracket(39), '36–40 anos');
  assert.equal(getAgeBracket(44), '41–45 anos');
  assert.equal(getAgeBracket(47), '≥ 46 anos');
  assert.equal(getAgeBracket(null), 'Sem data nasc.');
});
