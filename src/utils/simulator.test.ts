import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateScenarioCost } from './simulator';
import { POLICY_27279 } from '../data/policy27279';
import { POLICY_24050 } from '../data/policy24050';
import { POLICY_5423633 } from '../data/policy5423633';

test('fixed copay scenario (27279 Internamento) calculates Rede+ vs Out-of-Network accurately', () => {
  const internamento = POLICY_27279.simulatorScenarios.find(
    (s) => s.id === '27279-sim-internamento'
  );
  assert.ok(internamento);

  const res = calculateScenarioCost(internamento, 1000000);
  assert.equal(res.withinLimit, true);
  assert.equal(res.beneficiaryCostRedePlus, 25000);
  assert.equal(res.insurerPaidRedePlus, 975000);
  assert.equal(res.reimbursementOutOfNetwork, 600000);
  assert.equal(res.beneficiaryCostOutOfNetwork, 400000);
  assert.equal(res.savingsInRedePlus, 375000);
});

test('percent copay scenario (24050 Ambulatório 15%) caps insurer coverage at annual limit', () => {
  const ambulatorio = POLICY_24050.simulatorScenarios.find(
    (s) => s.id === '24050-sim-ambulatorio'
  );
  assert.ok(ambulatorio);

  // Within 500.000 AKZ limit: 200.000 -> 15% Rede+ (30.000), 60% out-of-network (80.000 cost)
  const within = calculateScenarioCost(ambulatorio, 200000);
  assert.equal(within.withinLimit, true);
  assert.equal(within.beneficiaryCostRedePlus, 30000);
  assert.equal(within.beneficiaryCostOutOfNetwork, 80000);
  assert.equal(within.savingsInRedePlus, 50000);

  // Exceeding 500.000 AKZ limit: 700.000 -> 75.000 copay + 200.000 excess = 275.000
  const over = calculateScenarioCost(ambulatorio, 700000);
  assert.equal(over.withinLimit, false);
  assert.equal(over.exceededByAKZ, 200000);
  assert.equal(over.beneficiaryCostRedePlus, 275000);
});

test('Mundial 5423633 fractional copay (0.23% Hospitalização) works accurately', () => {
  const hosp = POLICY_5423633.simulatorScenarios.find((s) => s.id === '5423633-sim-hosp');
  assert.ok(hosp);
  const res = calculateScenarioCost(hosp, 1000000);
  assert.equal(res.beneficiaryCostRedePlus, 2300);
  assert.equal(res.insurerPaidRedePlus, 997700);
});
