import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_POLICIES,
  getPolicyPremiumStats,
  getPortfolioStats,
} from '../data/policies';
import { POLICY_27279 } from '../data/policyData';
import {
  buildPolicyFromDraft,
  createEmptyPolicyDraft,
  deleteMemberFromPolicy,
  deletePolicyById,
  policyToDraft,
  upsertMemberInPolicy,
  upsertPolicy,
  validatePolicyDraft,
} from './policyManager';

test('validatePolicyDraft catches missing required fields and duplicate policy numbers', () => {
  const empty = createEmptyPolicyDraft(4);
  const errors = validatePolicyDraft(empty, ALL_POLICIES);
  assert.ok(errors.projectName);
  assert.ok(errors.policyNumber);

  const dup = {
    ...empty,
    projectName: 'Novo Projeto',
    policyNumber: '27279',
  };
  const dupErrors = validatePolicyDraft(dup, ALL_POLICIES);
  assert.ok(dupErrors.policyNumber?.includes('27279'));

  // Editing policy 27279 itself allows keeping policyNumber 27279
  const editErrors = validatePolicyDraft(dup, ALL_POLICIES, '27279');
  assert.equal(editErrors.policyNumber, undefined);
});

test('creating a new policy updates portfolio stats and per-policy min/avg/max automatically', () => {
  const draft = {
    ...createEmptyPolicyDraft(4),
    projectName: 'Sonangol Offshore',
    policyNumber: '88901',
    insurer: 'Aliança Seguros',
    planName: 'Plano 1 - Executivo',
    globalLimitAKZ: '15000000',
    autoComputeTotalFromMembers: true,
    members: [
      {
        name: 'Carlos Mendes',
        birthDate: '1988-05-12',
        gender: 'Masculino' as const,
        documentId: '',
        healthCode: 'SG-001',
        entryDate: '2026-07-15',
        annualPremium: '400000',
        waitingPeriod: 'Não',
        plan: 'Plano 1 - Executivo',
      },
      {
        name: 'Ana Paula',
        birthDate: '1992-11-03',
        gender: 'Feminino' as const,
        documentId: '',
        healthCode: 'SG-002',
        entryDate: '2026-07-15',
        annualPremium: '600000',
        waitingPeriod: 'Não',
        plan: 'Plano 1 - Executivo',
      },
    ],
  };

  const newPolicy = buildPolicyFromDraft(draft);
  assert.equal(newPolicy.projectName, 'Sonangol Offshore');
  assert.equal(newPolicy.metadata.policyNumber, '88901');
  assert.equal(newPolicy.metadata.totalAnnualPremium, 1000000);
  assert.equal(newPolicy.members.length, 2);
  assert.ok(newPolicy.coverages.length >= 4);
  assert.ok(newPolicy.simulatorScenarios.length >= 2);

  const pStats = getPolicyPremiumStats(newPolicy);
  assert.equal(pStats.minPremium, 400000);
  assert.equal(pStats.averagePolicyPerMember, 500000);
  assert.equal(pStats.maxPremium, 600000);

  const nextPolicies = upsertPolicy(ALL_POLICIES, newPolicy);
  const portStats = getPortfolioStats(nextPolicies);
  assert.equal(portStats.totalPolicies, 5);
  assert.equal(portStats.totalMembers, 170);
  assert.equal(portStats.totalAnnualPremium, 35532264.27);
});

test('updating and deleting a policy recalculates portfolio totals cleanly', () => {
  const editedDraft = policyToDraft(POLICY_27279);
  editedDraft.projectName = 'Dietsmann Offshore';
  editedDraft.autoComputeTotalFromMembers = false;
  editedDraft.totalAnnualPremiumAKZ = '8000000';

  const updated = buildPolicyFromDraft(editedDraft, POLICY_27279);
  const afterUpdate = upsertPolicy(ALL_POLICIES, updated);
  assert.equal(afterUpdate.length, 4);
  assert.equal(
    afterUpdate.find((p) => p.id === '27279')?.projectName,
    'Dietsmann Offshore'
  );
  assert.equal(
    getPortfolioStats(afterUpdate).totalAnnualPremium,
    35032718.42
  );

  const afterDelete = deletePolicyById(afterUpdate, '5671605');
  assert.equal(afterDelete.length, 3);
  assert.equal(getPortfolioStats(afterDelete).totalMembers, 166);
});

test('adding, updating, and removing members inside a policy updates totals', () => {
  const withAdded = upsertMemberInPolicy(
    POLICY_27279,
    {
      id: 999,
      name: 'Novo Aderente Teste',
      birthDate: '1990-01-01',
      gender: 'Masculino',
      documentId: '',
      healthCode: '999999',
      entryDate: '2026-07-15',
      annualPremium: 500000,
      waitingPeriod: 'Não',
      plan: '2',
    },
    true
  );
  assert.equal(withAdded.members.length, 16);
  assert.equal(withAdded.metadata.totalAnnualPremium, 7999545.85);

  const withRemoved = deleteMemberFromPolicy(withAdded, 16, true);
  assert.equal(withRemoved.members.length, 15);
  assert.equal(withRemoved.metadata.totalAnnualPremium, 7499545.85);
});
