import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {
  buildPolicyWorkbook,
  buildPortfolioWorkbook,
  exportPolicyWorkbookToBuffer,
  exportPortfolioWorkbookToBuffer,
} from './excelExport';
import {
  ALL_POLICIES,
  POLICY_24050,
  POLICY_27279,
  POLICY_5423633,
} from '../data/policyData';

test('buildPolicyWorkbook builds valid 4-sheet workbook for Apólice 27279', async () => {
  const simulatedExpenses = Object.fromEntries(
    POLICY_27279.simulatorScenarios.map((s) => [s.id, s.defaultExpenseAKZ])
  );

  const wb = await buildPolicyWorkbook(POLICY_27279, {
    referenceDateIso: '2026-07-15',
    includeSimulatorSheet: true,
    includeConditionalFormatting: true,
    simulatedExpenses,
  });

  assert.deepEqual(
    wb.worksheets.map((w) => w.name),
    ['Resumo Executivo', 'Aderentes', 'Coberturas', 'Simulador de Custos']
  );

  const wsResumo = wb.getWorksheet('Resumo Executivo')!;
  const totalFormula = wsResumo.getCell('C16').value as ExcelJS.CellFormulaValue;
  assert.equal(totalFormula.formula, 'SUM(Aderentes!J5:J19)');
  assert.equal(totalFormula.result, 7499545.85);

  const minFormula = wsResumo.getCell('B18').value as ExcelJS.CellFormulaValue;
  assert.equal(minFormula.formula, 'MIN(Aderentes!J5:J19)');
  assert.equal(minFormula.result, 437512.4);

  const maxFormula = wsResumo.getCell('F18').value as ExcelJS.CellFormulaValue;
  assert.equal(maxFormula.formula, 'MAX(Aderentes!J5:J19)');
  assert.equal(maxFormula.result, 602545.94);

  const bytes = await exportPolicyWorkbookToBuffer(POLICY_27279, {
    referenceDateIso: '2026-07-15',
    includeSimulatorSheet: true,
    includeConditionalFormatting: true,
    simulatedExpenses,
  });
  assert.equal(bytes[0], 0x50);
  assert.equal(bytes[1], 0x4b);
});

test('buildPolicyWorkbook handles Apólice 24050 (135 members, billingNotice, null birthDates) safely', async () => {
  const simulatedExpenses = Object.fromEntries(
    POLICY_24050.simulatorScenarios.map((s) => [s.id, s.defaultExpenseAKZ])
  );

  const wb = await buildPolicyWorkbook(POLICY_24050, {
    referenceDateIso: '2026-09-04',
    includeSimulatorSheet: true,
    includeConditionalFormatting: true,
    simulatedExpenses,
  });

  const wsResumo = wb.getWorksheet('Resumo Executivo')!;
  const totalFormula = wsResumo.getCell('C16').value as ExcelJS.CellFormulaValue;
  assert.equal(totalFormula.formula, 'SUM(Aderentes!J5:J139)');
  assert.equal(totalFormula.result, 22902277.41);
  assert.equal(wsResumo.getCell('F16').value, '—');

  const wsAderentes = wb.getWorksheet('Aderentes')!;
  assert.equal(wsAderentes.getCell('D5').value, '—');
  assert.equal(wsAderentes.getCell('H5').value, 'Sem data nasc.');
  assert.equal(wsAderentes.getCell('J139').value, 148049.52);

  const bytes = await exportPolicyWorkbookToBuffer(POLICY_24050, {
    referenceDateIso: '2026-09-04',
    includeSimulatorSheet: true,
    includeConditionalFormatting: true,
    simulatedExpenses,
  });
  const reloaded = new ExcelJS.Workbook();
  await reloaded.xlsx.load(bytes.buffer as ArrayBuffer);
  assert.equal(reloaded.worksheets.length, 4);
});

test('buildPolicyWorkbook handles Mundial 5423633 with unspecified gender row', async () => {
  const simulatedExpenses = Object.fromEntries(
    POLICY_5423633.simulatorScenarios.map((s) => [s.id, s.defaultExpenseAKZ])
  );
  const wb = await buildPolicyWorkbook(POLICY_5423633, {
    referenceDateIso: '2026-07-28',
    includeSimulatorSheet: true,
    includeConditionalFormatting: true,
    simulatedExpenses,
  });
  const wsAderentes = wb.getWorksheet('Aderentes')!;
  assert.equal(wsAderentes.getCell('E6').value, 'Não indicado');
});

test('buildPortfolioWorkbook exports consolidated 4-sheet workbook with 168 members', async () => {
  const wb = await buildPortfolioWorkbook(ALL_POLICIES, {
    referenceDateIso: '2026-07-15',
    includeSimulatorSheet: true,
    includeConditionalFormatting: true,
    simulatedExpenses: {},
  });

  assert.deepEqual(
    wb.worksheets.map((w) => w.name),
    ['Resumo Carteira', 'Comparativo Apólices', 'Todos Aderentes', 'Coberturas Principais']
  );

  const wsResumo = wb.getWorksheet('Resumo Carteira')!;
  const totalVol = wsResumo.getCell('D8').value as ExcelJS.CellFormulaValue;
  assert.equal(totalVol.result, 34532264.27);

  const wsComp = wb.getWorksheet('Comparativo Apólices')!;
  assert.equal(wsComp.getCell('O5').value, 'Dietsmann');
  assert.equal(wsComp.getCell('O6').value, 'SPIE');
  assert.equal(wsComp.getCell('O7').value, 'Total');
  assert.equal(wsComp.getCell('O8').value, 'Paenal');
  assert.equal(wsComp.getCell('P5').value, 437512.4);
  assert.equal(wsComp.getCell('R5').value, 602545.94);

  const wsAll = wb.getWorksheet('Todos Aderentes')!;
  assert.ok(wsAll.getTable('TabelaTodosAderentes'));
  assert.equal(wsAll.getCell('A172').value, 168);

  const bytes = await exportPortfolioWorkbookToBuffer(ALL_POLICIES, {
    referenceDateIso: '2026-07-15',
    includeSimulatorSheet: true,
    includeConditionalFormatting: true,
    simulatedExpenses: {},
  });
  const reloaded = new ExcelJS.Workbook();
  await reloaded.xlsx.load(bytes.buffer as ArrayBuffer);
  assert.equal(reloaded.worksheets.length, 4);
});
