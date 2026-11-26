import { SimulatorScenario } from '../data/types';
import { POLICY_27279 } from '../data/policy27279';

export type { SimulatorScenario };

export interface SimulatorResult {
  scenarioId: string;
  expenseAKZ: number;
  withinLimit: boolean;
  exceededByAKZ: number;
  beneficiaryCostRedePlus: number;
  insurerPaidRedePlus: number;
  reimbursementOutOfNetwork: number;
  beneficiaryCostOutOfNetwork: number;
  savingsInRedePlus: number;
}

export const SIMULATOR_SCENARIOS: SimulatorScenario[] = POLICY_27279.simulatorScenarios;

export function calculateScenarioCost(
  scenario: SimulatorScenario,
  rawExpenseAKZ: number
): SimulatorResult {
  const expenseAKZ = Number.isFinite(rawExpenseAKZ) && rawExpenseAKZ > 0 ? rawExpenseAKZ : 0;
  const withinLimit = expenseAKZ <= scenario.limitAKZ;
  const exceededByAKZ = Math.max(0, expenseAKZ - scenario.limitAKZ);
  const coveredBase = Math.min(expenseAKZ, scenario.limitAKZ);

  let copayRedePlus = 0;
  if (coveredBase > 0) {
    if (scenario.copayType === 'fixed') {
      copayRedePlus = Math.min(coveredBase, scenario.copayValue);
    } else if (scenario.copayType === 'percent') {
      copayRedePlus = Math.round(coveredBase * (scenario.copayValue / 100) * 100) / 100;
    }
  }

  const beneficiaryCostRedePlus = Math.round((copayRedePlus + exceededByAKZ) * 100) / 100;
  const insurerPaidRedePlus = Math.round((expenseAKZ - beneficiaryCostRedePlus) * 100) / 100;

  const reimbursementOutOfNetwork =
    Math.round(coveredBase * (scenario.outOfNetworkReimbursementPercent / 100) * 100) / 100;
  const beneficiaryCostOutOfNetwork =
    Math.round((expenseAKZ - reimbursementOutOfNetwork) * 100) / 100;

  const savingsInRedePlus =
    Math.round((beneficiaryCostOutOfNetwork - beneficiaryCostRedePlus) * 100) / 100;

  return {
    scenarioId: scenario.id,
    expenseAKZ,
    withinLimit,
    exceededByAKZ,
    beneficiaryCostRedePlus,
    insurerPaidRedePlus,
    reimbursementOutOfNetwork,
    beneficiaryCostOutOfNetwork,
    savingsInRedePlus,
  };
}
