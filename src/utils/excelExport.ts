import ExcelJS from 'exceljs';
import {
  ALL_POLICIES,
  calculateAge,
  formatDatePT,
  getAgeBracket,
  getPolicyGlobalLimit,
  getPolicyPremiumStats,
  getPortfolioStats,
  getPremiumTiers,
  parseIsoDateUTC,
} from '../data/policies';
import { InsurancePolicy, PolicyMember } from '../data/types';
import { calculateScenarioCost } from './simulator';

export interface ExcelExportOptions {
  referenceDateIso: string;
  includeSimulatorSheet: boolean;
  includeConditionalFormatting: boolean;
  simulatedExpenses: Record<string, number>;
  members?: PolicyMember[];
}

const AKZ_FORMAT = '#,##0.00 "AKZ"';
const DATE_FORMAT = 'dd-mm-yyyy';
const PERCENT_FORMAT = '0.0%';

const COLORS = {
  slate900: 'FF0F172A',
  slate800: 'FF1E293B',
  slate700: 'FF334155',
  slate500: 'FF64748B',
  slate200: 'FFE2E8F0',
  slate100: 'FFF1F5F9',
  slate50: 'FFF8FAFC',
  white: 'FFFFFFFF',
  orange600: 'FFEA580C',
  orange700: 'FFC2410C',
  orange50: 'FFFFF7ED',
  orange900: 'FF7C2D12',
  amber100: 'FFFEF3C7',
  amber800: 'FF92400E',
  green100: 'FFDCFCE7',
  green800: 'FF166534',
  red100: 'FFFEE2E2',
  red800: 'FF991B1B',
  blue700: 'FF0369A1',
};

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: COLORS.slate200 } },
  left: { style: 'thin', color: { argb: COLORS.slate200 } },
  bottom: { style: 'thin', color: { argb: COLORS.slate200 } },
  right: { style: 'thin', color: { argb: COLORS.slate200 } },
};

function styleBanner(
  ws: ExcelJS.Worksheet,
  range: string,
  title: string,
  subtitleRange: string,
  subtitle: string
) {
  ws.mergeCells(range);
  const titleCell = ws.getCell(range.split(':')[0]);
  titleCell.value = title;
  titleCell.font = { name: 'Calibri', size: 15, bold: true, color: { argb: COLORS.white } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slate900 } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(Number(titleCell.row)).height = 34;

  ws.mergeCells(subtitleRange);
  const subCell = ws.getCell(subtitleRange.split(':')[0]);
  subCell.value = subtitle;
  subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: COLORS.orange900 } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.orange50 } };
  subCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  subCell.border = {
    bottom: { style: 'medium', color: { argb: COLORS.orange600 } },
  };
  ws.getRow(Number(subCell.row)).height = 24;
}

export async function buildPolicyWorkbook(
  policy: InsurancePolicy,
  options: ExcelExportOptions
): Promise<ExcelJS.Workbook> {
  const members = options.members ?? policy.members;
  const coverages = policy.coverages;
  const scenarios = policy.simulatorScenarios;
  const meta = policy.metadata;
  const holder = policy.holder;

  const safeTableSuffix = meta.policyNumber.replace(/[^a-zA-Z0-9_]/g, '_') || 'Custom';
  const firstMemberRow = 5;
  const lastMemberRow = Math.max(firstMemberRow, firstMemberRow + members.length - 1);
  const memberPremiumSum =
    Math.round(members.reduce((acc, m) => acc + m.annualPremium, 0) * 100) / 100;
  const globalLimit = getPolicyGlobalLimit(policy);

  const validAges = members
    .map((m) => calculateAge(m.birthDate, options.referenceDateIso))
    .filter((a): a is number => a !== null);
  const avgAge =
    validAges.length > 0
      ? Math.round((validAges.reduce((acc, a) => acc + a, 0) / validAges.length) * 100) / 100
      : null;

  const wb = new ExcelJS.Workbook();
  wb.creator = `Apólice ${meta.policyNumber} · Exportador Excel`;
  wb.created = new Date();
  wb.modified = new Date();
  wb.calcProperties.fullCalcOnLoad = true;

  // =========================================================================
  // SHEET 1: RESUMO EXECUTIVO
  // =========================================================================
  const wsResumo = wb.addWorksheet('Resumo Executivo', {
    properties: { tabColor: { argb: COLORS.orange600 } },
    views: [{ showGridLines: false }],
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1 },
  });

  wsResumo.columns = [
    { width: 3 },
    { width: 30 },
    { width: 22 },
    { width: 22 },
    { width: 24 },
    { width: 22 },
    { width: 22 },
    { width: 3 },
  ];
  wsResumo.getRow(1).height = 10;

  styleBanner(
    wsResumo,
    'B2:G2',
    `APÓLICE N.º ${meta.policyNumber} (${policy.projectName.toUpperCase()}) · RESUMO EXECUTIVO — ${meta.product.toUpperCase()}`,
    'B3:G3',
    `${policy.projectName} | ${meta.insurer} | ${meta.planName} | ${meta.documentType} (Acta N.º ${meta.endorsementNumber})`
  );

  // Reference Date row (Row 4)
  wsResumo.getRow(4).height = 24;
  const refLabel = wsResumo.getCell('B4');
  refLabel.value = 'Data de Referência (Idades):';
  refLabel.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.slate700 } };
  refLabel.alignment = { vertical: 'middle', horizontal: 'left' };

  const refInput = wsResumo.getCell('C4');
  refInput.value = parseIsoDateUTC(options.referenceDateIso);
  refInput.numFmt = DATE_FORMAT;
  refInput.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.amber800 } };
  refInput.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.amber100 } };
  refInput.alignment = { vertical: 'middle', horizontal: 'center' };
  refInput.border = THIN_BORDER;

  wsResumo.mergeCells('D4:G4');
  const refHint = wsResumo.getCell('D4');
  refHint.value = policy.hasBirthDates
    ? 'Célula editável: altere esta data no Excel para recalcular automaticamente idades e faixas etárias.'
    : 'Nota: Esta apólice provém da Nota de Pagamento sem datas de nascimento; idades marcadas como "—".';
  refHint.font = { name: 'Calibri', size: 9, italic: true, color: { argb: COLORS.slate500 } };
  refHint.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  wsResumo.getRow(5).height = 10;

  // Section 1 & 2 Headers (Row 6)
  wsResumo.getRow(6).height = 24;
  wsResumo.mergeCells('B6:D6');
  const hHolder = wsResumo.getCell('B6');
  hHolder.value = 'TOMADOR DO SEGURO';
  hHolder.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.white } };
  hHolder.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slate800 } };
  hHolder.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  wsResumo.mergeCells('E6:G6');
  const hPolicy = wsResumo.getCell('E6');
  hPolicy.value = 'DADOS DA APÓLICE';
  hPolicy.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.white } };
  hPolicy.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slate800 } };
  hPolicy.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  const metaPairs: Array<[string, string, string, string]> = [
    ['Nome', holder.name, 'Seguradora / Apólice', `${meta.insurer} · N.º ${meta.policyNumber} (${policy.projectName})`],
    ['NIF', holder.nif, 'Plano Contratado', `${meta.planName} (Acta ${meta.endorsementNumber})`],
    ['Morada', holder.address, 'Data Início / Efeito', `${formatDatePT(meta.startDate)} / ${formatDatePT(meta.effectiveDate)}`],
    ['Telefone', holder.phone, 'Vencimento / Renovação', `${formatDatePT(meta.expiryDate)} / ${formatDatePT(meta.renewalDate)}`],
    ['Email', holder.email, 'Duração / Fraccionamento', `${meta.duration} · ${meta.billingFrequency}`],
    [
      holder.clientNumber ? 'N.º Cliente / Agente' : 'Agente Produtor',
      holder.clientNumber ? `${holder.clientNumber} · ${holder.producerAgent}` : holder.producerAgent,
      'Emissão / Prémio Apólice',
      `${meta.issueStamp} · Total Apólice: ${meta.totalAnnualPremium.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AKZ`,
    ],
  ];

  metaPairs.forEach(([k1, v1, k2, v2], idx) => {
    const r = 7 + idx;
    wsResumo.getRow(r).height = 20;
    const bg = idx % 2 === 0 ? COLORS.white : COLORS.slate50;

    const cB = wsResumo.getCell(`B${r}`);
    cB.value = k1;
    cB.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.slate700 } };
    cB.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    cB.border = THIN_BORDER;
    cB.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    wsResumo.mergeCells(`C${r}:D${r}`);
    const cC = wsResumo.getCell(`C${r}`);
    cC.value = v1;
    cC.font = { name: 'Calibri', size: 10, color: { argb: COLORS.slate900 } };
    cC.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    cC.border = THIN_BORDER;
    wsResumo.getCell(`D${r}`).border = THIN_BORDER;
    cC.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    const cE = wsResumo.getCell(`E${r}`);
    cE.value = k2;
    cE.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.slate700 } };
    cE.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    cE.border = THIN_BORDER;
    cE.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    wsResumo.mergeCells(`F${r}:G${r}`);
    const cF = wsResumo.getCell(`F${r}`);
    cF.value = v2;
    cF.font = { name: 'Calibri', size: 10, color: { argb: COLORS.slate900 } };
    cF.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    cF.border = THIN_BORDER;
    wsResumo.getCell(`G${r}`).border = THIN_BORDER;
    cF.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  });

  wsResumo.getRow(13).height = 12;

  // KPI Section (Rows 14-16)
  wsResumo.getRow(14).height = 24;
  wsResumo.mergeCells('B14:G14');
  const hKpi = wsResumo.getCell('B14');
  hKpi.value = 'INDICADORES-CHAVE DA APÓLICE (FÓRMULAS DINÂMICAS ENTRE FOLHAS)';
  hKpi.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.white } };
  hKpi.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.orange600 } };
  hKpi.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  const kpiDefinitions: Array<{
    col: string;
    label: string;
    value: ExcelJS.CellValue;
    numFmt: string;
  }> = [
    {
      col: 'B',
      label: 'Total de Aderentes',
      value: { formula: `COUNTA(Aderentes!B${firstMemberRow}:B${lastMemberRow})`, result: members.length },
      numFmt: '0',
    },
    {
      col: 'C',
      label:
        Math.abs(memberPremiumSum - meta.totalAnnualPremium) < 0.05
          ? 'Prémio Total Anual'
          : 'Soma Nominal (Aderentes)',
      value: { formula: `SUM(Aderentes!J${firstMemberRow}:J${lastMemberRow})`, result: memberPremiumSum },
      numFmt: AKZ_FORMAT,
    },
    {
      col: 'D',
      label: 'Prémio Médio / Aderente',
      value: {
        formula: `AVERAGE(Aderentes!J${firstMemberRow}:J${lastMemberRow})`,
        result: members.length > 0 ? memberPremiumSum / members.length : 0,
      },
      numFmt: AKZ_FORMAT,
    },
    {
      col: 'E',
      label: 'Equivalente Mensal Nominal',
      value: { formula: 'C16/12', result: memberPremiumSum / 12 },
      numFmt: AKZ_FORMAT,
    },
    {
      col: 'F',
      label: 'Idade Média do Grupo',
      value:
        policy.hasBirthDates && avgAge !== null
          ? { formula: `AVERAGE(Aderentes!D${firstMemberRow}:D${lastMemberRow})`, result: avgAge }
          : '—',
      numFmt: policy.hasBirthDates && avgAge !== null ? '0.0 "anos"' : '@',
    },
    {
      col: 'G',
      label: 'Limite Máximo Global',
      value: { formula: 'Coberturas!D5', result: globalLimit.numericLimit },
      numFmt: AKZ_FORMAT,
    },
  ];

  wsResumo.getRow(15).height = 20;
  wsResumo.getRow(16).height = 28;
  kpiDefinitions.forEach((k) => {
    const labelCell = wsResumo.getCell(`${k.col}15`);
    labelCell.value = k.label;
    labelCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: COLORS.slate500 } };
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slate100 } };
    labelCell.alignment = { vertical: 'middle', horizontal: 'center' };
    labelCell.border = THIN_BORDER;

    const valCell = wsResumo.getCell(`${k.col}16`);
    valCell.value = k.value;
    valCell.numFmt = k.numFmt;
    valCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: COLORS.slate900 } };
    valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.white } };
    valCell.alignment = { vertical: 'middle', horizontal: 'center' };
    valCell.border = THIN_BORDER;
  });

  // Min / Nominal Average / Max Premium Strip (Rows 17-19)
  const pStats = getPolicyPremiumStats(policy);
  wsResumo.getRow(17).height = 20;
  wsResumo.getRow(18).height = 24;
  const ampCols: Array<{ range: string; startCol: string; endCol: string; label: string; formula: string; result: number }> = [
    {
      range: 'B17:C17',
      startCol: 'B',
      endCol: 'C',
      label: 'Prémio Mínimo / Aderente',
      formula: `MIN(Aderentes!J${firstMemberRow}:J${lastMemberRow})`,
      result: pStats.minPremium,
    },
    {
      range: 'D17:E17',
      startCol: 'D',
      endCol: 'E',
      label: 'Prémio Médio Nominal / Aderente',
      formula: `AVERAGE(Aderentes!J${firstMemberRow}:J${lastMemberRow})`,
      result: pStats.averageNominalPerMember,
    },
    {
      range: 'F17:G17',
      startCol: 'F',
      endCol: 'G',
      label: 'Prémio Máximo / Aderente',
      formula: `MAX(Aderentes!J${firstMemberRow}:J${lastMemberRow})`,
      result: pStats.maxPremium,
    },
  ];
  ampCols.forEach((item) => {
    wsResumo.mergeCells(item.range);
    const lCell = wsResumo.getCell(`${item.startCol}17`);
    lCell.value = item.label;
    lCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: COLORS.slate500 } };
    lCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slate100 } };
    lCell.alignment = { vertical: 'middle', horizontal: 'center' };
    lCell.border = THIN_BORDER;
    wsResumo.getCell(`${item.endCol}17`).border = THIN_BORDER;

    wsResumo.mergeCells(`${item.startCol}18:${item.endCol}18`);
    const vCell = wsResumo.getCell(`${item.startCol}18`);
    vCell.value = { formula: item.formula, result: item.result };
    vCell.numFmt = AKZ_FORMAT;
    vCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: COLORS.slate900 } };
    vCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.white } };
    vCell.alignment = { vertical: 'middle', horizontal: 'center' };
    vCell.border = THIN_BORDER;
    wsResumo.getCell(`${item.endCol}18`).border = THIN_BORDER;
  });

  wsResumo.getRow(19).height = 12;
  let currentRow = 20;

  // Optional Billing Notice & Bank Coordinates (Apólice 24050)
  if (policy.billingNotice) {
    const bn = policy.billingNotice;
    wsResumo.getRow(currentRow).height = 24;
    wsResumo.mergeCells(`B${currentRow}:G${currentRow}`);
    const hBn = wsResumo.getCell(`B${currentRow}`);
    hBn.value = `NOTA DE PAGAMENTO ${bn.noticeNumber} (${bn.referenceCode}) & COORDENADAS BANCÁRIAS`;
    hBn.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.white } };
    hBn.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slate800 } };
    hBn.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    currentRow += 1;

    const bnPairs: Array<[string, string | number, string, string, boolean]> = [
      ['Nota / Referência', `${bn.noticeNumber} · ${bn.referenceCode}`, 'Instituição Bancária', bn.bankName, false],
      ['Período Facturado', `${formatDatePT(bn.periodStart)} a ${formatDatePT(bn.periodEnd)}`, 'Conta Bancária', bn.bankAccount, false],
      ['Data Emissão / Limite Pag.', `${formatDatePT(bn.issueDate)} / ${formatDatePT(bn.dueDate)}`, 'NIB', bn.nib, false],
      ['Prémio Simples', bn.simplePremium, 'IBAN', bn.iban, true],
      ['Encargos / IVA', `${bn.charges.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} AKZ (${bn.vat > 0 ? `IVA ${formatAKZ(bn.vat)}` : 'IVA 0,00 Isento'})`, 'SWIFT', bn.swift, false],
      ['Prémio Total a Pagar', bn.totalToPay, 'Agência / Unidades', `${bn.agency} · ${bn.unitCount} aderentes`, true],
    ];

    bnPairs.forEach(([k1, v1, k2, v2, isMoney], idx) => {
      const r = currentRow + idx;
      wsResumo.getRow(r).height = 20;
      const bg = idx % 2 === 0 ? COLORS.white : COLORS.slate50;

      const cB = wsResumo.getCell(`B${r}`);
      cB.value = k1;
      cB.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.slate700 } };
      cB.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cB.border = THIN_BORDER;
      cB.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

      wsResumo.mergeCells(`C${r}:D${r}`);
      const cC = wsResumo.getCell(`C${r}`);
      cC.value = v1;
      if (isMoney && typeof v1 === 'number') cC.numFmt = AKZ_FORMAT;
      cC.font = { name: 'Calibri', size: 10, bold: isMoney, color: { argb: COLORS.slate900 } };
      cC.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cC.border = THIN_BORDER;
      wsResumo.getCell(`D${r}`).border = THIN_BORDER;
      cC.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

      const cE = wsResumo.getCell(`E${r}`);
      cE.value = k2;
      cE.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.slate700 } };
      cE.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cE.border = THIN_BORDER;
      cE.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

      wsResumo.mergeCells(`F${r}:G${r}`);
      const cF = wsResumo.getCell(`F${r}`);
      cF.value = v2;
      cF.font = { name: 'Calibri', size: 10, color: { argb: COLORS.slate900 } };
      cF.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cF.border = THIN_BORDER;
      wsResumo.getCell(`G${r}`).border = THIN_BORDER;
      cF.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    });

    currentRow += bnPairs.length + 1;
  }

  // Gender Breakdown
  const genderHeaderRow = currentRow;
  wsResumo.getRow(genderHeaderRow).height = 24;
  wsResumo.mergeCells(`B${genderHeaderRow}:G${genderHeaderRow}`);
  const hGender = wsResumo.getCell(`B${genderHeaderRow}`);
  hGender.value = 'DISTRIBUIÇÃO POR GÉNERO (FÓRMULAS COUNTIF / SUMIF)';
  hGender.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.white } };
  hGender.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slate800 } };
  hGender.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  const genderColRow = genderHeaderRow + 1;
  const genderHeaders = ['Género', 'N.º Aderentes', '% do Grupo', 'Prémio Total Anual', 'Prémio Médio', '% do Prémio Total'];
  wsResumo.getRow(genderColRow).height = 22;
  ['B', 'C', 'D', 'E', 'F', 'G'].forEach((col, i) => {
    const c = wsResumo.getCell(`${col}${genderColRow}`);
    c.value = genderHeaders[i];
    c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.slate700 } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slate100 } };
    c.alignment = { vertical: 'middle', horizontal: i === 0 ? 'left' : 'right', indent: i === 0 ? 1 : 0 };
    c.border = THIN_BORDER;
  });

  const activeGenders: Array<'Masculino' | 'Feminino' | 'Não indicado'> = ['Masculino', 'Feminino'];
  if (members.some((m) => m.gender === 'Não indicado')) {
    activeGenders.push('Não indicado');
  }

  const firstGenderRow = genderColRow + 1;
  const lastGenderRow = firstGenderRow + activeGenders.length - 1;
  const genderTotalRow = lastGenderRow + 1;

  activeGenders.forEach((g, idx) => {
    const r = firstGenderRow + idx;
    wsResumo.getRow(r).height = 20;
    const gMembers = members.filter((m) => m.gender === g);
    const gSum = Math.round(gMembers.reduce((a, b) => a + b.annualPremium, 0) * 100) / 100;

    wsResumo.getCell(`B${r}`).value = g;
    wsResumo.getCell(`C${r}`).value = {
      formula: `COUNTIF(Aderentes!$E$${firstMemberRow}:$E$${lastMemberRow},"${g}")`,
      result: gMembers.length,
    };
    wsResumo.getCell(`D${r}`).value = {
      formula: `IF($C$${genderTotalRow}>0,C${r}/$C$${genderTotalRow},0)`,
      result: members.length > 0 ? gMembers.length / members.length : 0,
    };
    wsResumo.getCell(`E${r}`).value = {
      formula: `SUMIF(Aderentes!$E$${firstMemberRow}:$E$${lastMemberRow},"${g}",Aderentes!$J$${firstMemberRow}:$J$${lastMemberRow})`,
      result: gSum,
    };
    wsResumo.getCell(`F${r}`).value = {
      formula: `IF(C${r}>0,E${r}/C${r},0)`,
      result: gMembers.length > 0 ? gSum / gMembers.length : 0,
    };
    wsResumo.getCell(`G${r}`).value = {
      formula: `IF($E$${genderTotalRow}>0,E${r}/$E$${genderTotalRow},0)`,
      result: memberPremiumSum > 0 ? gSum / memberPremiumSum : 0,
    };

    wsResumo.getCell(`C${r}`).numFmt = '0';
    wsResumo.getCell(`D${r}`).numFmt = PERCENT_FORMAT;
    wsResumo.getCell(`E${r}`).numFmt = AKZ_FORMAT;
    wsResumo.getCell(`F${r}`).numFmt = AKZ_FORMAT;
    wsResumo.getCell(`G${r}`).numFmt = PERCENT_FORMAT;

    ['B', 'C', 'D', 'E', 'F', 'G'].forEach((col, cIdx) => {
      const cell = wsResumo.getCell(`${col}${r}`);
      cell.font = { name: 'Calibri', size: 10, color: { argb: COLORS.slate900 } };
      cell.border = THIN_BORDER;
      cell.alignment = { vertical: 'middle', horizontal: cIdx === 0 ? 'left' : 'right', indent: cIdx === 0 ? 1 : 0 };
    });
  });

  wsResumo.getRow(genderTotalRow).height = 22;
  wsResumo.getCell(`B${genderTotalRow}`).value = 'Total Geral';
  wsResumo.getCell(`C${genderTotalRow}`).value = { formula: `SUM(C${firstGenderRow}:C${lastGenderRow})`, result: members.length };
  wsResumo.getCell(`D${genderTotalRow}`).value = { formula: `SUM(D${firstGenderRow}:D${lastGenderRow})`, result: 1 };
  wsResumo.getCell(`E${genderTotalRow}`).value = { formula: `SUM(E${firstGenderRow}:E${lastGenderRow})`, result: memberPremiumSum };
  wsResumo.getCell(`F${genderTotalRow}`).value = {
    formula: `IF(C${genderTotalRow}>0,E${genderTotalRow}/C${genderTotalRow},0)`,
    result: members.length > 0 ? memberPremiumSum / members.length : 0,
  };
  wsResumo.getCell(`G${genderTotalRow}`).value = { formula: `SUM(G${firstGenderRow}:G${lastGenderRow})`, result: 1 };

  wsResumo.getCell(`C${genderTotalRow}`).numFmt = '0';
  wsResumo.getCell(`D${genderTotalRow}`).numFmt = PERCENT_FORMAT;
  wsResumo.getCell(`E${genderTotalRow}`).numFmt = AKZ_FORMAT;
  wsResumo.getCell(`F${genderTotalRow}`).numFmt = AKZ_FORMAT;
  wsResumo.getCell(`G${genderTotalRow}`).numFmt = PERCENT_FORMAT;

  ['B', 'C', 'D', 'E', 'F', 'G'].forEach((col, cIdx) => {
    const cell = wsResumo.getCell(`${col}${genderTotalRow}`);
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.slate900 } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slate100 } };
    cell.border = THIN_BORDER;
    cell.alignment = { vertical: 'middle', horizontal: cIdx === 0 ? 'left' : 'right', indent: cIdx === 0 ? 1 : 0 };
  });

  // Premium Tiers Breakdown
  const tiers = getPremiumTiers(members, policy.hasBirthDates, options.referenceDateIso);
  const tierHeaderRow = genderTotalRow + 2;
  wsResumo.getRow(tierHeaderRow - 1).height = 12;
  wsResumo.getRow(tierHeaderRow).height = 24;
  wsResumo.mergeCells(`B${tierHeaderRow}:G${tierHeaderRow}`);
  const hTiers = wsResumo.getCell(`B${tierHeaderRow}`);
  hTiers.value = policy.hasBirthDates
    ? 'ESCALÕES DE PRÉMIO ANUAL (POR FAIXA ETÁRIA)'
    : 'ESCALÕES DE TARIFA ANUAL IDENTIFICADOS';
  hTiers.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.white } };
  hTiers.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slate800 } };
  hTiers.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  const tierColRow = tierHeaderRow + 1;
  const tierHeaders = ['Escalão', 'Prémio Unitário Anual', 'N.º Aderentes', 'Total do Escalão', '% do Prémio Total', 'Equivalente Mensal / Pessoa'];
  wsResumo.getRow(tierColRow).height = 22;
  ['B', 'C', 'D', 'E', 'F', 'G'].forEach((col, i) => {
    const c = wsResumo.getCell(`${col}${tierColRow}`);
    c.value = tierHeaders[i];
    c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.slate700 } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slate100 } };
    c.alignment = { vertical: 'middle', horizontal: i === 0 ? 'left' : 'right', indent: i === 0 ? 1 : 0 };
    c.border = THIN_BORDER;
  });

  const firstTierRow = tierColRow + 1;
  const lastTierRow = Math.max(firstTierRow, firstTierRow + tiers.length - 1);
  const tierTotalRow = lastTierRow + 1;

  if (tiers.length === 0) {
    wsResumo.getRow(firstTierRow).height = 20;
    wsResumo.getCell(`B${firstTierRow}`).value = 'Sem aderentes registados';
    wsResumo.getCell(`C${firstTierRow}`).value = 0;
    wsResumo.getCell(`D${firstTierRow}`).value = 0;
    wsResumo.getCell(`E${firstTierRow}`).value = 0;
    wsResumo.getCell(`F${firstTierRow}`).value = 0;
    wsResumo.getCell(`G${firstTierRow}`).value = 0;
    ['B', 'C', 'D', 'E', 'F', 'G'].forEach((col, cIdx) => {
      const cell = wsResumo.getCell(`${col}${firstTierRow}`);
      cell.font = { name: 'Calibri', size: 10, color: { argb: COLORS.slate500 } };
      cell.border = THIN_BORDER;
      cell.alignment = { vertical: 'middle', horizontal: cIdx === 0 ? 'left' : 'right', indent: cIdx === 0 ? 1 : 0 };
    });
  } else {
    tiers.forEach((tier, idx) => {
      const r = firstTierRow + idx;
      wsResumo.getRow(r).height = 20;
      wsResumo.getCell(`B${r}`).value = tier.label;
      wsResumo.getCell(`C${r}`).value = tier.unitPremium;
      wsResumo.getCell(`D${r}`).value = {
        formula: `COUNTIF(Aderentes!$J$${firstMemberRow}:$J$${lastMemberRow},C${r})`,
        result: tier.count,
      };
      wsResumo.getCell(`E${r}`).value = {
        formula: `SUMIF(Aderentes!$J$${firstMemberRow}:$J$${lastMemberRow},C${r},Aderentes!$J$${firstMemberRow}:$J$${lastMemberRow})`,
        result: tier.totalPremium,
      };
      wsResumo.getCell(`F${r}`).value = {
        formula: `IF($E$${tierTotalRow}>0,E${r}/$E$${tierTotalRow},0)`,
        result: tier.sharePercent / 100,
      };
      wsResumo.getCell(`G${r}`).value = {
        formula: `C${r}/12`,
        result: tier.unitPremium / 12,
      };

      wsResumo.getCell(`C${r}`).numFmt = AKZ_FORMAT;
      wsResumo.getCell(`D${r}`).numFmt = '0';
      wsResumo.getCell(`E${r}`).numFmt = AKZ_FORMAT;
      wsResumo.getCell(`F${r}`).numFmt = PERCENT_FORMAT;
      wsResumo.getCell(`G${r}`).numFmt = AKZ_FORMAT;

      ['B', 'C', 'D', 'E', 'F', 'G'].forEach((col, cIdx) => {
        const cell = wsResumo.getCell(`${col}${r}`);
        cell.font = { name: 'Calibri', size: 10, color: { argb: COLORS.slate900 } };
        cell.border = THIN_BORDER;
        cell.alignment = { vertical: 'middle', horizontal: cIdx === 0 ? 'left' : 'right', indent: cIdx === 0 ? 1 : 0 };
      });
    });
  }

  wsResumo.getRow(tierTotalRow).height = 22;
  wsResumo.getCell(`B${tierTotalRow}`).value = 'Total dos Escalões';
  wsResumo.getCell(`C${tierTotalRow}`).value = '';
  wsResumo.getCell(`D${tierTotalRow}`).value = { formula: `SUM(D${firstTierRow}:D${lastTierRow})`, result: members.length };
  wsResumo.getCell(`E${tierTotalRow}`).value = { formula: `SUM(E${firstTierRow}:E${lastTierRow})`, result: memberPremiumSum };
  wsResumo.getCell(`F${tierTotalRow}`).value = { formula: `SUM(F${firstTierRow}:F${lastTierRow})`, result: members.length > 0 ? 1 : 0 };
  wsResumo.getCell(`G${tierTotalRow}`).value = '';

  wsResumo.getCell(`D${tierTotalRow}`).numFmt = '0';
  wsResumo.getCell(`E${tierTotalRow}`).numFmt = AKZ_FORMAT;
  wsResumo.getCell(`F${tierTotalRow}`).numFmt = PERCENT_FORMAT;

  ['B', 'C', 'D', 'E', 'F', 'G'].forEach((col, cIdx) => {
    const cell = wsResumo.getCell(`${col}${tierTotalRow}`);
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.slate900 } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slate100 } };
    cell.border = THIN_BORDER;
    cell.alignment = { vertical: 'middle', horizontal: cIdx === 0 ? 'left' : 'right', indent: cIdx === 0 ? 1 : 0 };
  });

  // Principal Coverages Snapshot
  const covSecStart = tierTotalRow + 2;
  wsResumo.getRow(covSecStart - 1).height = 12;
  wsResumo.getRow(covSecStart).height = 24;
  wsResumo.mergeCells(`B${covSecStart}:G${covSecStart}`);
  const hCovSnap = wsResumo.getCell(`B${covSecStart}`);
  hCovSnap.value = 'RESUMO DOS PRINCIPAIS LIMITES DE COBERTURA (LIGADOS À FOLHA COBERTURAS)';
  hCovSnap.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.white } };
  hCovSnap.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slate800 } };
  hCovSnap.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  const covSnapHeadRow = covSecStart + 1;
  wsResumo.getRow(covSnapHeadRow).height = 22;
  const covSnapHeaders = ['Cobertura Principal', 'Limite Capital', 'CoPagamento Rede+', 'Fora da Rede', 'Carência', 'Nota'];
  ['B', 'C', 'D', 'E', 'F', 'G'].forEach((col, i) => {
    const c = wsResumo.getCell(`${col}${covSnapHeadRow}`);
    c.value = covSnapHeaders[i];
    c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.slate700 } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slate100 } };
    c.alignment = { vertical: 'middle', horizontal: i === 0 || i === 5 ? 'left' : 'center', indent: i === 0 || i === 5 ? 1 : 0 };
    c.border = THIN_BORDER;
  });

  const principalCoverages = coverages.filter((c) => c.level === 'Principal' && c.category !== 'Outros Benefícios');
  principalCoverages.forEach((cov, idx) => {
    const r = covSnapHeadRow + 1 + idx;
    const covRowInSheet = 4 + cov.order;
    wsResumo.getRow(r).height = 20;

    wsResumo.getCell(`B${r}`).value = { formula: `Coberturas!E${covRowInSheet}`, result: cov.name };
    wsResumo.getCell(`C${r}`).value = { formula: `Coberturas!F${covRowInSheet}`, result: cov.limitLabel };
    wsResumo.getCell(`D${r}`).value = { formula: `Coberturas!G${covRowInSheet}`, result: cov.copayRedePlus };
    wsResumo.getCell(`E${r}`).value = { formula: `Coberturas!H${covRowInSheet}`, result: cov.outOfNetworkShare };
    wsResumo.getCell(`F${r}`).value = cov.waitingPeriod;
    wsResumo.getCell(`G${r}`).value = { formula: `Coberturas!I${covRowInSheet}`, result: cov.notes };

    ['B', 'C', 'D', 'E', 'F', 'G'].forEach((col, cIdx) => {
      const cell = wsResumo.getCell(`${col}${r}`);
      cell.font = { name: 'Calibri', size: 10, bold: cIdx === 0, color: { argb: COLORS.slate900 } };
      cell.border = THIN_BORDER;
      cell.alignment = {
        vertical: 'middle',
        horizontal: cIdx === 0 || cIdx === 5 ? 'left' : 'center',
        indent: cIdx === 0 || cIdx === 5 ? 1 : 0,
      };
    });
  });

  // =========================================================================
  // SHEET 2: ADERENTES (Structured Interactive Table + Data Validation)
  // =========================================================================
  const wsAderentes = wb.addWorksheet('Aderentes', {
    properties: { tabColor: { argb: COLORS.slate900 } },
    views: [{ state: 'frozen', ySplit: 4 }],
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  wsAderentes.columns = [
    { width: 6 },  // A: N.º
    { width: 34 }, // B: Nome
    { width: 17 }, // C: Data Nascimento
    { width: 10 }, // D: Idade
    { width: 15 }, // E: Sexo
    { width: 17 }, // F: Cód. Saúde
    { width: 16 }, // G: Data Entrada
    { width: 16 }, // H: Faixa Etária
    { width: 13 }, // I: Carência
    { width: 22 }, // J: Prémio Anual
    { width: 20 }, // K: Prémio Mensal
    { width: 14 }, // L: % do Total
  ];
  wsAderentes.getRow(1).height = 8;

  styleBanner(
    wsAderentes,
    'A2:L2',
    `LISTA NOMINAL DE ADERENTES — APÓLICE N.º ${meta.policyNumber} (${members.length} ADERENTES)`,
    'A3:L3',
    `${meta.insurer} | Tabela interativa com ordenação, filtros por coluna, validação de dados e cálculo dinâmico de prémios.`
  );

  const memberTableRows =
    members.length > 0
      ? members.map((m, idx) => {
          const r = firstMemberRow + idx;
          const age = calculateAge(m.birthDate, options.referenceDateIso);
          const hasBirth = m.birthDate !== null && age !== null;
          return [
            idx + 1,
            m.name,
            m.birthDate ? parseIsoDateUTC(m.birthDate) : null,
            hasBirth
              ? { formula: `INT(('Resumo Executivo'!$C$4-C${r})/365.25)`, result: age }
              : '—',
            m.gender,
            m.healthCode,
            parseIsoDateUTC(m.entryDate),
            hasBirth
              ? {
                  formula: `IF(D${r}<=30,"≤ 30 anos",IF(D${r}<=35,"31–35 anos",IF(D${r}<=40,"36–40 anos",IF(D${r}<=45,"41–45 anos","≥ 46 anos"))))`,
                  result: getAgeBracket(age),
                }
              : 'Sem data nasc.',
            m.waitingPeriod,
            m.annualPremium,
            { formula: `J${r}/12`, result: m.annualPremium / 12 },
            {
              formula: `IF(SUM($J$${firstMemberRow}:$J$${lastMemberRow})>0,J${r}/SUM($J$${firstMemberRow}:$J$${lastMemberRow}),0)`,
              result: memberPremiumSum > 0 ? m.annualPremium / memberPremiumSum : 0,
            },
          ];
        })
      : [
          [
            0,
            'Sem aderentes registados',
            null,
            '—',
            'Não indicado',
            '—',
            parseIsoDateUTC(meta.effectiveDate),
            'Sem data nasc.',
            'Não',
            0,
            0,
            0,
          ],
        ];

  wsAderentes.addTable({
    name: `TabelaAderentes_${safeTableSuffix}`,
    ref: 'A4',
    headerRow: true,
    totalsRow: true,
    style: {
      theme: 'TableStyleMedium2',
      showRowStripes: true,
    },
    columns: [
      { name: 'N.º', totalsRowLabel: 'Total', filterButton: true },
      { name: 'Nome do Aderente', totalsRowFunction: 'count', filterButton: true },
      { name: 'Data Nascimento', filterButton: true },
      policy.hasBirthDates
        ? { name: 'Idade', totalsRowFunction: 'average', filterButton: true }
        : { name: 'Idade', totalsRowLabel: '—', filterButton: true },
      { name: 'Sexo', filterButton: true },
      { name: 'Cód. Saúde', filterButton: true },
      { name: 'Data Entrada', filterButton: true },
      { name: 'Faixa Etária', filterButton: true },
      { name: 'Carência', filterButton: true },
      { name: 'Prémio Total Anual', totalsRowFunction: 'sum', filterButton: true },
      { name: 'Prémio Mensal Eq.', totalsRowFunction: 'sum', filterButton: true },
      { name: '% do Total', totalsRowFunction: 'sum', filterButton: true },
    ],
    rows: memberTableRows,
  });

  wsAderentes.getRow(4).height = 26;
  for (let r = firstMemberRow; r <= lastMemberRow + 1; r++) {
    wsAderentes.getRow(r).height = 21;
    wsAderentes.getCell(`A${r}`).alignment = { vertical: 'middle', horizontal: 'center' };
    wsAderentes.getCell(`B${r}`).alignment = { vertical: 'middle', horizontal: 'left' };
    wsAderentes.getCell(`C${r}`).numFmt = DATE_FORMAT;
    wsAderentes.getCell(`C${r}`).alignment = { vertical: 'middle', horizontal: 'center' };
    wsAderentes.getCell(`D${r}`).numFmt = policy.hasBirthDates ? (r <= lastMemberRow ? '0' : '0.0') : '@';
    wsAderentes.getCell(`D${r}`).alignment = { vertical: 'middle', horizontal: 'center' };
    wsAderentes.getCell(`E${r}`).alignment = { vertical: 'middle', horizontal: 'center' };
    wsAderentes.getCell(`F${r}`).alignment = { vertical: 'middle', horizontal: 'center' };
    wsAderentes.getCell(`G${r}`).numFmt = DATE_FORMAT;
    wsAderentes.getCell(`G${r}`).alignment = { vertical: 'middle', horizontal: 'center' };
    wsAderentes.getCell(`H${r}`).alignment = { vertical: 'middle', horizontal: 'center' };
    wsAderentes.getCell(`I${r}`).alignment = { vertical: 'middle', horizontal: 'center' };
    wsAderentes.getCell(`J${r}`).numFmt = AKZ_FORMAT;
    wsAderentes.getCell(`J${r}`).alignment = { vertical: 'middle', horizontal: 'right' };
    wsAderentes.getCell(`K${r}`).numFmt = AKZ_FORMAT;
    wsAderentes.getCell(`K${r}`).alignment = { vertical: 'middle', horizontal: 'right' };
    wsAderentes.getCell(`L${r}`).numFmt = PERCENT_FORMAT;
    wsAderentes.getCell(`L${r}`).alignment = { vertical: 'middle', horizontal: 'right' };

    if (r <= lastMemberRow) {
      wsAderentes.getCell(`E${r}`).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: ['"Masculino,Feminino,Não indicado"'],
      };
      wsAderentes.getCell(`I${r}`).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: ['"Sim,Não,Plano 144"'],
      };
    } else {
      wsAderentes.getRow(r).font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.slate900 } };
    }
  }

  if (options.includeConditionalFormatting) {
    const avgVal = members.length > 0 ? memberPremiumSum / members.length : 500000;
    const threshold = Math.round(avgVal * 1.15);
    wsAderentes.addConditionalFormatting({
      ref: `J${firstMemberRow}:J${lastMemberRow}`,
      rules: [
        {
          type: 'cellIs',
          operator: 'greaterThan',
          formulae: [threshold],
          priority: 1,
          style: {
            fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: COLORS.orange50 } },
            font: { bold: true, color: { argb: COLORS.orange700 } },
          },
        },
      ],
    });
  }

  // =========================================================================
  // SHEET 3: COBERTURAS (Structured Interactive Table)
  // =========================================================================
  const wsCoberturas = wb.addWorksheet('Coberturas', {
    properties: { tabColor: { argb: COLORS.blue700 } },
    views: [{ state: 'frozen', ySplit: 4 }],
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  wsCoberturas.columns = [
    { width: 8 },  // A: Ordem
    { width: 24 }, // B: Categoria
    { width: 15 }, // C: Tipo
    { width: 20 }, // D: Limite Numérico
    { width: 48 }, // E: Cobertura / Benefício
    { width: 24 }, // F: Limite Capital (Descrição)
    { width: 18 }, // G: CoPagamento Rede+
    { width: 22 }, // H: Comparticipação Fora Rede
    { width: 42 }, // I: Condições / Notas
  ];
  wsCoberturas.getRow(1).height = 8;

  styleBanner(
    wsCoberturas,
    'A2:I2',
    `PLANO DE COBERTURAS E SUB-LIMITES — ${meta.planName.toUpperCase()}`,
    'A3:I3',
    `Apólice N.º ${meta.policyNumber} (${meta.insurer}) · Filtre por Categoria ou Tipo para analisar limites de capital, co-pagamentos e carências.`
  );

  const coverageRows = coverages.map((c) => [
    c.order,
    c.category,
    c.level,
    c.numericLimit ?? null,
    c.name,
    c.limitLabel,
    c.copayRedePlus,
    c.outOfNetworkShare,
    c.notes,
  ]);

  wsCoberturas.addTable({
    name: `TabelaCoberturas_${safeTableSuffix}`,
    ref: 'A4',
    headerRow: true,
    totalsRow: false,
    style: {
      theme: 'TableStyleMedium9',
      showRowStripes: true,
    },
    columns: [
      { name: 'Ordem', filterButton: true },
      { name: 'Categoria', filterButton: true },
      { name: 'Tipo', filterButton: true },
      { name: 'Limite Numérico (AKZ)', filterButton: true },
      { name: 'Cobertura / Benefício', filterButton: true },
      { name: 'Limite Capital (Texto)', filterButton: true },
      { name: 'CoPagamento Rede+', filterButton: true },
      { name: 'Fora da Rede', filterButton: true },
      { name: 'Condições / Notas', filterButton: true },
    ],
    rows: coverageRows,
  });

  wsCoberturas.getRow(4).height = 26;
  const lastCovRow = 4 + coverages.length;
  for (let r = 5; r <= lastCovRow; r++) {
    const cov = coverages[r - 5];
    wsCoberturas.getRow(r).height = cov.name.length > 55 ? 30 : 21;
    wsCoberturas.getCell(`A${r}`).alignment = { vertical: 'middle', horizontal: 'center' };
    wsCoberturas.getCell(`B${r}`).alignment = { vertical: 'middle', horizontal: 'left' };
    wsCoberturas.getCell(`C${r}`).alignment = { vertical: 'middle', horizontal: 'center' };
    wsCoberturas.getCell(`D${r}`).numFmt = AKZ_FORMAT;
    wsCoberturas.getCell(`D${r}`).alignment = { vertical: 'middle', horizontal: 'right' };
    wsCoberturas.getCell(`E${r}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    wsCoberturas.getCell(`F${r}`).alignment = { vertical: 'middle', horizontal: 'right' };
    wsCoberturas.getCell(`G${r}`).alignment = { vertical: 'middle', horizontal: 'center' };
    wsCoberturas.getCell(`H${r}`).alignment = { vertical: 'middle', horizontal: 'center' };
    wsCoberturas.getCell(`I${r}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

    if (cov.level === 'Principal') {
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].forEach((col) => {
        wsCoberturas.getCell(`${col}${r}`).font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.slate900 } };
      });
    }
  }

  if (options.includeConditionalFormatting) {
    wsCoberturas.addConditionalFormatting({
      ref: `A5:I${lastCovRow}`,
      rules: [
        {
          type: 'expression',
          formulae: ['$C5="Principal"'],
          priority: 1,
          style: {
            fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: COLORS.orange50 } },
          },
        },
      ],
    });
  }

  // =========================================================================
  // SHEET 4: SIMULADOR DE CUSTOS (Interactive What-If Calculator)
  // =========================================================================
  if (options.includeSimulatorSheet && scenarios.length > 0) {
    const outPercentLabel = scenarios[0].outOfNetworkReimbursementPercent;
    const wsSim = wb.addWorksheet('Simulador de Custos', {
      properties: { tabColor: { argb: 'FF16A34A' } },
      views: [{ state: 'frozen', ySplit: 4 }],
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1 },
    });

    wsSim.columns = [
      { width: 36 },
      { width: 20 },
      { width: 28 },
      { width: 22 },
      { width: 18 },
      { width: 24 },
      { width: 24 },
      { width: 24 },
      { width: 25 },
      { width: 22 },
    ];
    wsSim.getRow(1).height = 8;

    styleBanner(
      wsSim,
      'A2:J2',
      `SIMULADOR INTERATIVO DE CUSTOS — APÓLICE ${meta.policyNumber} (REDE+ VS FORA DA REDE)`,
      'A3:J3',
      `Altere os valores na coluna D (células amarelas) para comparar co-pagamentos na Rede+ vs reembolso de ${outPercentLabel}% fora da rede.`
    );

    const simHeaders = [
      'Cenário / Cobertura',
      'Limite Aplicável (AKZ)',
      'Regra Rede+',
      'Despesa Estimada (AKZ)',
      'Estado do Limite',
      'Custo Beneficiário (Rede+)',
      'Pago Seguradora (Rede+)',
      `Reembolso Fora Rede (${outPercentLabel}%)`,
      'Custo Beneficiário (Fora Rede)',
      'Poupança na Rede+ (AKZ)',
    ];

    wsSim.getRow(4).height = 28;
    simHeaders.forEach((h, i) => {
      const col = String.fromCharCode(65 + i);
      const cell = wsSim.getCell(`${col}4`);
      cell.value = h;
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.white } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slate800 } };
      cell.alignment = { vertical: 'middle', horizontal: i === 0 || i === 2 ? 'left' : 'right', wrapText: true, indent: i === 0 || i === 2 ? 1 : 0 };
      cell.border = THIN_BORDER;
    });

    const simStartRow = 5;
    const simEndRow = simStartRow + scenarios.length - 1;
    const simTotalRow = simEndRow + 1;

    scenarios.forEach((sc, idx) => {
      const r = simStartRow + idx;
      wsSim.getRow(r).height = 22;
      const expense = options.simulatedExpenses[sc.id] ?? sc.defaultExpenseAKZ;
      const computed = calculateScenarioCost(sc, expense);

      wsSim.getCell(`A${r}`).value = sc.label;
      wsSim.getCell(`B${r}`).value = { formula: `Coberturas!D${sc.coverageRowRef}`, result: sc.limitAKZ };
      wsSim.getCell(`C${r}`).value = sc.copayRuleLabel;
      wsSim.getCell(`D${r}`).value = expense;
      wsSim.getCell(`E${r}`).value = {
        formula: `IF(D${r}<=B${r},"Dentro do Limite","Excede Limite")`,
        result: computed.withinLimit ? 'Dentro do Limite' : 'Excede Limite',
      };

      let redePlusFormula = `MAX(0,D${r}-B${r})`;
      if (sc.copayType === 'fixed') {
        redePlusFormula = `IF(D${r}<=0,0,MIN(D${r},${sc.copayValue})+MAX(0,D${r}-B${r}))`;
      } else if (sc.copayType === 'percent') {
        redePlusFormula = `IF(D${r}<=0,0,MIN(D${r},B${r})*${sc.copayValue / 100}+MAX(0,D${r}-B${r}))`;
      }

      wsSim.getCell(`F${r}`).value = { formula: redePlusFormula, result: computed.beneficiaryCostRedePlus };
      wsSim.getCell(`G${r}`).value = { formula: `D${r}-F${r}`, result: computed.insurerPaidRedePlus };
      wsSim.getCell(`H${r}`).value = {
        formula: `MIN(D${r},B${r})*${sc.outOfNetworkReimbursementPercent / 100}`,
        result: computed.reimbursementOutOfNetwork,
      };
      wsSim.getCell(`I${r}`).value = { formula: `D${r}-H${r}`, result: computed.beneficiaryCostOutOfNetwork };
      wsSim.getCell(`J${r}`).value = { formula: `I${r}-F${r}`, result: computed.savingsInRedePlus };

      ['B', 'D', 'F', 'G', 'H', 'I', 'J'].forEach((col) => {
        wsSim.getCell(`${col}${r}`).numFmt = AKZ_FORMAT;
      });

      for (let i = 0; i < 10; i++) {
        const col = String.fromCharCode(65 + i);
        const cell = wsSim.getCell(`${col}${r}`);
        cell.border = THIN_BORDER;
        if (col === 'D') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.amber100 } };
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.amber800 } };
        } else if (col === 'J') {
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.green800 } };
        } else {
          cell.font = { name: 'Calibri', size: 10, color: { argb: COLORS.slate900 } };
        }
        cell.alignment = {
          vertical: 'middle',
          horizontal: col === 'A' || col === 'C' ? 'left' : col === 'E' ? 'center' : 'right',
          indent: col === 'A' || col === 'C' ? 1 : 0,
        };
      }
    });

    wsSim.getRow(simTotalRow).height = 24;
    wsSim.getCell(`A${simTotalRow}`).value = 'TOTAL SIMULADO';
    wsSim.getCell(`B${simTotalRow}`).value = '';
    wsSim.getCell(`C${simTotalRow}`).value = '';
    wsSim.getCell(`E${simTotalRow}`).value = '';

    ['D', 'F', 'G', 'H', 'I', 'J'].forEach((col) => {
      const cell = wsSim.getCell(`${col}${simTotalRow}`);
      cell.value = { formula: `SUM(${col}${simStartRow}:${col}${simEndRow})` };
      cell.numFmt = AKZ_FORMAT;
    });

    for (let i = 0; i < 10; i++) {
      const col = String.fromCharCode(65 + i);
      const cell = wsSim.getCell(`${col}${simTotalRow}`);
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.slate900 } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slate100 } };
      cell.border = THIN_BORDER;
      cell.alignment = {
        vertical: 'middle',
        horizontal: col === 'A' ? 'left' : 'right',
        indent: col === 'A' ? 1 : 0,
      };
    }

    if (options.includeConditionalFormatting) {
      wsSim.addConditionalFormatting({
        ref: `E${simStartRow}:E${simEndRow}`,
        rules: [
          {
            type: 'containsText',
            operator: 'containsText',
            text: 'Excede',
            priority: 1,
            style: {
              fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: COLORS.red100 } },
              font: { bold: true, color: { argb: COLORS.red800 } },
            },
          },
          {
            type: 'containsText',
            operator: 'containsText',
            text: 'Dentro',
            priority: 2,
            style: {
              fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: COLORS.green100 } },
              font: { bold: true, color: { argb: COLORS.green800 } },
            },
          },
        ],
      });
    }
  }

  return wb;
}

// ===========================================================================
// CONSOLIDATED PORTFOLIO WORKBOOK (ALL 4 POLICIES · 168 ADERENTES)
// ===========================================================================
export async function buildPortfolioWorkbook(
  policies: InsurancePolicy[] = ALL_POLICIES,
  options: ExcelExportOptions
): Promise<ExcelJS.Workbook> {
  const stats = getPortfolioStats(policies);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Carteira de Apólices Espacie · Exportador Excel';
  wb.created = new Date();
  wb.modified = new Date();
  wb.calcProperties.fullCalcOnLoad = true;

  // Sheet 1: Resumo Carteira
  const wsResumo = wb.addWorksheet('Resumo Carteira', {
    properties: { tabColor: { argb: COLORS.orange600 } },
    views: [{ showGridLines: false }],
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1 },
  });

  wsResumo.columns = [
    { width: 3 },
    { width: 36 },
    { width: 18 },
    { width: 18 },
    { width: 24 },
    { width: 22 },
    { width: 18 },
    { width: 3 },
  ];
  wsResumo.getRow(1).height = 10;

  styleBanner(
    wsResumo,
    'B2:G2',
    'CARTEIRA DE SEGUROS DE SAÚDE ESPACIE — RESUMO CONSOLIDADO',
    'B3:G3',
    `${stats.totalPolicies} Apólices Activas | ${stats.totalMembers} Aderentes Totais | Aliança Seguros & A Mundial Seguros`
  );

  wsResumo.getRow(4).height = 24;
  wsResumo.getCell('B4').value = 'Data de Referência (Idades):';
  wsResumo.getCell('B4').font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.slate700 } };
  const refCell = wsResumo.getCell('C4');
  refCell.value = parseIsoDateUTC(options.referenceDateIso);
  refCell.numFmt = DATE_FORMAT;
  refCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.amber800 } };
  refCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.amber100 } };
  refCell.alignment = { vertical: 'middle', horizontal: 'center' };
  refCell.border = THIN_BORDER;

  wsResumo.mergeCells('D4:G4');
  wsResumo.getCell('D4').value = 'Indicadores globais ligados às folhas "Comparativo Apólices" e "Todos Aderentes".';
  wsResumo.getCell('D4').font = { name: 'Calibri', size: 9, italic: true, color: { argb: COLORS.slate500 } };
  wsResumo.getCell('D4').alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  wsResumo.getRow(5).height = 10;
  wsResumo.getRow(6).height = 24;
  wsResumo.mergeCells('B6:G6');
  const hKpi = wsResumo.getCell('B6');
  hKpi.value = 'INDICADORES CONSOLIDADOS DA CARTEIRA';
  hKpi.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.white } };
  hKpi.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.orange600 } };
  hKpi.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  const lastPolicyRow = 4 + policies.length;
  const allMembersCount = policies.reduce((a, p) => a + p.members.length, 0);
  const lastAllMemberRow = 4 + allMembersCount;

  const portKpis: Array<{ col: string; label: string; value: ExcelJS.CellValue; fmt: string }> = [
    {
      col: 'B',
      label: 'Apólices na Carteira',
      value: { formula: `COUNTA('Comparativo Apólices'!A5:A${lastPolicyRow})`, result: stats.totalPolicies },
      fmt: '0',
    },
    {
      col: 'C',
      label: 'Total de Aderentes',
      value: { formula: `SUM('Comparativo Apólices'!J5:J${lastPolicyRow})`, result: stats.totalMembers },
      fmt: '0',
    },
    {
      col: 'D',
      label: 'Volume Total Anual',
      value: { formula: `SUM('Comparativo Apólices'!L5:L${lastPolicyRow})`, result: stats.totalAnnualPremium },
      fmt: AKZ_FORMAT,
    },
    {
      col: 'E',
      label: 'Equivalente Mensal',
      value: { formula: 'D8/12', result: stats.totalMonthlyEquivalent },
      fmt: AKZ_FORMAT,
    },
    {
      col: 'F',
      label: 'Prémio Médio / Aderente',
      value: { formula: 'IF(C8>0,D8/C8,0)', result: stats.averagePremiumPerMember },
      fmt: AKZ_FORMAT,
    },
    {
      col: 'G',
      label: 'Registos Nominais',
      value: { formula: `COUNTA('Todos Aderentes'!F5:F${lastAllMemberRow})`, result: allMembersCount },
      fmt: '0',
    },
  ];

  wsResumo.getRow(7).height = 20;
  wsResumo.getRow(8).height = 28;
  portKpis.forEach((k) => {
    const l = wsResumo.getCell(`${k.col}7`);
    l.value = k.label;
    l.font = { name: 'Calibri', size: 9, bold: true, color: { argb: COLORS.slate500 } };
    l.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slate100 } };
    l.alignment = { vertical: 'middle', horizontal: 'center' };
    l.border = THIN_BORDER;

    const v = wsResumo.getCell(`${k.col}8`);
    v.value = k.value;
    v.numFmt = k.fmt;
    v.font = { name: 'Calibri', size: 12, bold: true, color: { argb: COLORS.slate900 } };
    v.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.white } };
    v.alignment = { vertical: 'middle', horizontal: 'center' };
    v.border = THIN_BORDER;
  });

  // Insurer Breakdown
  wsResumo.getRow(9).height = 12;
  wsResumo.getRow(10).height = 24;
  wsResumo.mergeCells('B10:G10');
  const hIns = wsResumo.getCell('B10');
  hIns.value = 'DISTRIBUIÇÃO POR SEGURADORA (FÓRMULAS COUNTIF / SUMIF)';
  hIns.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.white } };
  hIns.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slate800 } };
  hIns.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  wsResumo.getRow(11).height = 22;
  ['Seguradora', 'N.º Apólices', 'N.º Aderentes', 'Prémio Total Anual', 'Equiv. Mensal', '% da Carteira'].forEach((h, i) => {
    const col = String.fromCharCode(66 + i);
    const c = wsResumo.getCell(`${col}11`);
    c.value = h;
    c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.slate700 } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slate100 } };
    c.alignment = { vertical: 'middle', horizontal: i === 0 ? 'left' : 'right', indent: i === 0 ? 1 : 0 };
    c.border = THIN_BORDER;
  });

  const insStart = 12;
  const insEnd = insStart + stats.byInsurer.length - 1;
  const insTotalRow = insEnd + 1;

  stats.byInsurer.forEach((ins, idx) => {
    const r = insStart + idx;
    wsResumo.getRow(r).height = 20;
    wsResumo.getCell(`B${r}`).value = ins.insurer;
    wsResumo.getCell(`C${r}`).value = {
      formula: `COUNTIF('Comparativo Apólices'!$B$5:$B$${lastPolicyRow},B${r})`,
      result: ins.policyCount,
    };
    wsResumo.getCell(`D${r}`).value = {
      formula: `SUMIF('Comparativo Apólices'!$B$5:$B$${lastPolicyRow},B${r},'Comparativo Apólices'!$J$5:$J$${lastPolicyRow})`,
      result: ins.memberCount,
    };
    wsResumo.getCell(`E${r}`).value = {
      formula: `SUMIF('Comparativo Apólices'!$B$5:$B$${lastPolicyRow},B${r},'Comparativo Apólices'!$L$5:$L$${lastPolicyRow})`,
      result: ins.totalPremium,
    };
    wsResumo.getCell(`F${r}`).value = { formula: `E${r}/12`, result: ins.totalPremium / 12 };
    wsResumo.getCell(`G${r}`).value = {
      formula: `IF($E$${insTotalRow}>0,E${r}/$E$${insTotalRow},0)`,
      result: ins.sharePercent / 100,
    };

    wsResumo.getCell(`C${r}`).numFmt = '0';
    wsResumo.getCell(`D${r}`).numFmt = '0';
    wsResumo.getCell(`E${r}`).numFmt = AKZ_FORMAT;
    wsResumo.getCell(`F${r}`).numFmt = AKZ_FORMAT;
    wsResumo.getCell(`G${r}`).numFmt = PERCENT_FORMAT;

    ['B', 'C', 'D', 'E', 'F', 'G'].forEach((col, cIdx) => {
      const cell = wsResumo.getCell(`${col}${r}`);
      cell.font = { name: 'Calibri', size: 10, color: { argb: COLORS.slate900 } };
      cell.border = THIN_BORDER;
      cell.alignment = { vertical: 'middle', horizontal: cIdx === 0 ? 'left' : 'right', indent: cIdx === 0 ? 1 : 0 };
    });
  });

  wsResumo.getRow(insTotalRow).height = 22;
  wsResumo.getCell(`B${insTotalRow}`).value = 'Total da Carteira';
  wsResumo.getCell(`C${insTotalRow}`).value = { formula: `SUM(C${insStart}:C${insEnd})`, result: stats.totalPolicies };
  wsResumo.getCell(`D${insTotalRow}`).value = { formula: `SUM(D${insStart}:D${insEnd})`, result: stats.totalMembers };
  wsResumo.getCell(`E${insTotalRow}`).value = { formula: `SUM(E${insStart}:E${insEnd})`, result: stats.totalAnnualPremium };
  wsResumo.getCell(`F${insTotalRow}`).value = { formula: `E${insTotalRow}/12`, result: stats.totalMonthlyEquivalent };
  wsResumo.getCell(`G${insTotalRow}`).value = { formula: `SUM(G${insStart}:G${insEnd})`, result: 1 };
  wsResumo.getCell(`C${insTotalRow}`).numFmt = '0';
  wsResumo.getCell(`D${insTotalRow}`).numFmt = '0';
  wsResumo.getCell(`E${insTotalRow}`).numFmt = AKZ_FORMAT;
  wsResumo.getCell(`F${insTotalRow}`).numFmt = AKZ_FORMAT;
  wsResumo.getCell(`G${insTotalRow}`).numFmt = PERCENT_FORMAT;
  ['B', 'C', 'D', 'E', 'F', 'G'].forEach((col, cIdx) => {
    const cell = wsResumo.getCell(`${col}${insTotalRow}`);
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.slate900 } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slate100 } };
    cell.border = THIN_BORDER;
    cell.alignment = { vertical: 'middle', horizontal: cIdx === 0 ? 'left' : 'right', indent: cIdx === 0 ? 1 : 0 };
  });

  // Per-Policy Total, Min, Average, Max Breakdown on Resumo Carteira
  const polSecHeaderRow = insTotalRow + 2;
  wsResumo.getRow(polSecHeaderRow - 1).height = 12;
  wsResumo.getRow(polSecHeaderRow).height = 24;
  wsResumo.mergeCells(`B${polSecHeaderRow}:G${polSecHeaderRow}`);
  const hPolStats = wsResumo.getCell(`B${polSecHeaderRow}`);
  hPolStats.value = 'PRÉMIOS POR APÓLICE — TOTAL, MÍNIMO, MÉDIO E MÁXIMO';
  hPolStats.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.white } };
  hPolStats.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slate800 } };
  hPolStats.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  const polSecColRow = polSecHeaderRow + 1;
  wsResumo.getRow(polSecColRow).height = 22;
  ['Projeto · Apólice', 'Aderentes', 'Prémio Total (Apólice)', 'Mínimo (Aderente)', 'Médio (Total / Ader.)', 'Máximo (Aderente)'].forEach((h, i) => {
    const col = String.fromCharCode(66 + i);
    const c = wsResumo.getCell(`${col}${polSecColRow}`);
    c.value = h;
    c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.slate700 } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slate100 } };
    c.alignment = { vertical: 'middle', horizontal: i === 0 ? 'left' : 'right', indent: i === 0 ? 1 : 0 };
    c.border = THIN_BORDER;
  });

  const polStart = polSecColRow + 1;
  const polEnd = polStart + stats.byPolicy.length - 1;
  const polTotalRow = polEnd + 1;

  stats.byPolicy.forEach((ps, idx) => {
    const r = polStart + idx;
    const compRow = 5 + idx;
    wsResumo.getRow(r).height = 20;
    wsResumo.getCell(`B${r}`).value = `${ps.projectName} · Apólice ${ps.policyNumber}`;
    wsResumo.getCell(`C${r}`).value = { formula: `'Comparativo Apólices'!J${compRow}`, result: ps.memberCount };
    wsResumo.getCell(`D${r}`).value = { formula: `'Comparativo Apólices'!L${compRow}`, result: ps.totalPolicyPremium };
    wsResumo.getCell(`E${r}`).value = { formula: `'Comparativo Apólices'!P${compRow}`, result: ps.minPremium };
    wsResumo.getCell(`F${r}`).value = { formula: `'Comparativo Apólices'!M${compRow}`, result: ps.averagePolicyPerMember };
    wsResumo.getCell(`G${r}`).value = { formula: `'Comparativo Apólices'!R${compRow}`, result: ps.maxPremium };

    wsResumo.getCell(`C${r}`).numFmt = '0';
    wsResumo.getCell(`D${r}`).numFmt = AKZ_FORMAT;
    wsResumo.getCell(`E${r}`).numFmt = AKZ_FORMAT;
    wsResumo.getCell(`F${r}`).numFmt = AKZ_FORMAT;
    wsResumo.getCell(`G${r}`).numFmt = AKZ_FORMAT;

    ['B', 'C', 'D', 'E', 'F', 'G'].forEach((col, cIdx) => {
      const cell = wsResumo.getCell(`${col}${r}`);
      cell.font = { name: 'Calibri', size: 10, bold: cIdx === 0 || cIdx === 3, color: { argb: COLORS.slate900 } };
      cell.border = THIN_BORDER;
      cell.alignment = { vertical: 'middle', horizontal: cIdx === 0 ? 'left' : 'right', indent: cIdx === 0 ? 1 : 0 };
    });
  });

  wsResumo.getRow(polTotalRow).height = 22;
  wsResumo.getCell(`B${polTotalRow}`).value = 'Consolidado da Carteira';
  wsResumo.getCell(`C${polTotalRow}`).value = { formula: `SUM(C${polStart}:C${polEnd})`, result: stats.totalMembers };
  wsResumo.getCell(`D${polTotalRow}`).value = { formula: `SUM(D${polStart}:D${polEnd})`, result: stats.totalAnnualPremium };
  wsResumo.getCell(`E${polTotalRow}`).value = { formula: `MIN(E${polStart}:E${polEnd})`, result: stats.minMemberPremium };
  wsResumo.getCell(`F${polTotalRow}`).value = { formula: `IF(C${polTotalRow}>0,D${polTotalRow}/C${polTotalRow},0)`, result: stats.averagePremiumPerMember };
  wsResumo.getCell(`G${polTotalRow}`).value = { formula: `MAX(G${polStart}:G${polEnd})`, result: stats.maxMemberPremium };
  wsResumo.getCell(`C${polTotalRow}`).numFmt = '0';
  wsResumo.getCell(`D${polTotalRow}`).numFmt = AKZ_FORMAT;
  wsResumo.getCell(`E${polTotalRow}`).numFmt = AKZ_FORMAT;
  wsResumo.getCell(`F${polTotalRow}`).numFmt = AKZ_FORMAT;
  wsResumo.getCell(`G${polTotalRow}`).numFmt = AKZ_FORMAT;
  ['B', 'C', 'D', 'E', 'F', 'G'].forEach((col, cIdx) => {
    const cell = wsResumo.getCell(`${col}${polTotalRow}`);
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.slate900 } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slate100 } };
    cell.border = THIN_BORDER;
    cell.alignment = { vertical: 'middle', horizontal: cIdx === 0 ? 'left' : 'right', indent: cIdx === 0 ? 1 : 0 };
  });

  // Sheet 2: Comparativo Apólices
  const wsComp = wb.addWorksheet('Comparativo Apólices', {
    properties: { tabColor: { argb: COLORS.slate900 } },
    views: [{ state: 'frozen', ySplit: 4 }],
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1 },
  });

  wsComp.columns = [
    { width: 12 }, // A: Apólice
    { width: 24 }, // B: Seguradora
    { width: 34 }, // C: Tomador
    { width: 14 }, // D: NIF
    { width: 22 }, // E: Produto
    { width: 32 }, // F: Plano
    { width: 10 }, // G: Acta
    { width: 14 }, // H: Início / Efeito
    { width: 14 }, // I: Vencimento
    { width: 12 }, // J: Aderentes
    { width: 20 }, // K: Prémio Simples
    { width: 22 }, // L: Prémio Total Anual
    { width: 20 }, // M: Prémio Médio (Total / Ader.)
    { width: 20 }, // N: Limite Máximo
    { width: 16 }, // O: Projeto / Corresp.
    { width: 20 }, // P: Prémio Mínimo
    { width: 20 }, // Q: Média Nominal
    { width: 20 }, // R: Prémio Máximo
  ];
  wsComp.getRow(1).height = 8;
  styleBanner(
    wsComp,
    'A2:R2',
    'QUADRO COMPARATIVO DAS APÓLICES DE SAÚDE',
    'A3:R3',
    'Comparação contratual, projetos correspondentes, vigências, aderentes, prémios anuais (total, mínimo, médio e máximo) e capitais máximos.'
  );

  const compRows = policies.map((p, idx) => {
    const r = 5 + idx;
    const gl = getPolicyGlobalLimit(p);
    const ps = getPolicyPremiumStats(p);
    return [
      p.metadata.policyNumber,
      p.metadata.insurer,
      p.holder.name,
      p.holder.nif,
      p.metadata.product,
      p.metadata.planName,
      p.metadata.endorsementNumber,
      parseIsoDateUTC(p.metadata.effectiveDate),
      parseIsoDateUTC(p.metadata.expiryDate),
      p.members.length,
      p.metadata.simpleAnnualPremium ?? p.metadata.totalAnnualPremium,
      p.metadata.totalAnnualPremium,
      { formula: `IF(J${r}>0,L${r}/J${r},0)`, result: ps.averagePolicyPerMember },
      gl.numericLimit,
      p.projectName,
      ps.minPremium,
      ps.averageNominalPerMember,
      ps.maxPremium,
    ];
  });

  wsComp.addTable({
    name: 'TabelaComparativoApolices',
    ref: 'A4',
    headerRow: true,
    totalsRow: true,
    style: { theme: 'TableStyleMedium2', showRowStripes: true },
    columns: [
      { name: 'Apólice', totalsRowLabel: 'Total', filterButton: true },
      { name: 'Seguradora', totalsRowFunction: 'count', filterButton: true },
      { name: 'Tomador', filterButton: true },
      { name: 'NIF', filterButton: true },
      { name: 'Produto', filterButton: true },
      { name: 'Plano', filterButton: true },
      { name: 'Acta', filterButton: true },
      { name: 'Efeito', filterButton: true },
      { name: 'Vencimento', filterButton: true },
      { name: 'Aderentes', totalsRowFunction: 'sum', filterButton: true },
      { name: 'Prémio Simples (AKZ)', totalsRowFunction: 'sum', filterButton: true },
      { name: 'Prémio Total (AKZ)', totalsRowFunction: 'sum', filterButton: true },
      { name: 'Média / Aderente', totalsRowFunction: 'average', filterButton: true },
      { name: 'Limite Máximo (AKZ)', filterButton: true },
      { name: 'Projeto / Corresp.', filterButton: true },
      { name: 'Prémio Mínimo (AKZ)', totalsRowFunction: 'min', filterButton: true },
      { name: 'Média Nominal (AKZ)', totalsRowFunction: 'average', filterButton: true },
      { name: 'Prémio Máximo (AKZ)', totalsRowFunction: 'max', filterButton: true },
    ],
    rows: compRows,
  });

  wsComp.getRow(4).height = 26;
  for (let r = 5; r <= lastPolicyRow + 1; r++) {
    wsComp.getRow(r).height = 22;
    wsComp.getCell(`H${r}`).numFmt = DATE_FORMAT;
    wsComp.getCell(`I${r}`).numFmt = DATE_FORMAT;
    wsComp.getCell(`J${r}`).numFmt = '0';
    wsComp.getCell(`K${r}`).numFmt = AKZ_FORMAT;
    wsComp.getCell(`L${r}`).numFmt = AKZ_FORMAT;
    wsComp.getCell(`M${r}`).numFmt = AKZ_FORMAT;
    wsComp.getCell(`N${r}`).numFmt = AKZ_FORMAT;
    wsComp.getCell(`P${r}`).numFmt = AKZ_FORMAT;
    wsComp.getCell(`Q${r}`).numFmt = AKZ_FORMAT;
    wsComp.getCell(`R${r}`).numFmt = AKZ_FORMAT;
    if (r === lastPolicyRow + 1) {
      wsComp.getRow(r).font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.slate900 } };
    }
  }

  // Sheet 3: Todos Aderentes (168)
  const wsAll = wb.addWorksheet('Todos Aderentes', {
    properties: { tabColor: { argb: COLORS.blue700 } },
    views: [{ state: 'frozen', ySplit: 4 }],
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  wsAll.columns = [
    { width: 7 },  // A: N.º
    { width: 11 }, // B: Apólice
    { width: 24 }, // C: Seguradora
    { width: 32 }, // D: Tomador
    { width: 17 }, // E: Cód. Saúde
    { width: 34 }, // F: Nome
    { width: 15 }, // G: Nascimento
    { width: 10 }, // H: Idade
    { width: 15 }, // I: Sexo
    { width: 15 }, // J: Entrada
    { width: 10 }, // K: Plano
    { width: 22 }, // L: Prémio Anual
    { width: 20 }, // M: Mensal Eq.
  ];
  wsAll.getRow(1).height = 8;
  styleBanner(
    wsAll,
    'A2:M2',
    `BASE CONSOLIDADA DE ADERENTES (${allMembersCount} PESSOAS SEGURAS)`,
    'A3:M3',
    'Filtre por Apólice, Seguradora, Tomador ou Género para inspeccionar qualquer aderente da carteira.'
  );

  const allMemberRows: ExcelJS.CellValue[][] = [];
  let seq = 1;
  for (const p of policies) {
    for (const m of p.members) {
      const r = 4 + seq;
      const age = calculateAge(m.birthDate, options.referenceDateIso);
      const hasBirth = m.birthDate !== null && age !== null;
      allMemberRows.push([
        seq,
        p.metadata.policyNumber,
        p.metadata.insurer,
        p.holder.name,
        m.healthCode,
        m.name,
        m.birthDate ? parseIsoDateUTC(m.birthDate) : null,
        hasBirth ? { formula: `INT(('Resumo Carteira'!$C$4-G${r})/365.25)`, result: age } : '—',
        m.gender,
        parseIsoDateUTC(m.entryDate),
        m.plan,
        m.annualPremium,
        { formula: `L${r}/12`, result: m.annualPremium / 12 },
      ]);
      seq += 1;
    }
  }

  wsAll.addTable({
    name: 'TabelaTodosAderentes',
    ref: 'A4',
    headerRow: true,
    totalsRow: true,
    style: { theme: 'TableStyleMedium9', showRowStripes: true },
    columns: [
      { name: 'N.º', totalsRowLabel: 'Total', filterButton: true },
      { name: 'Apólice', filterButton: true },
      { name: 'Seguradora', filterButton: true },
      { name: 'Tomador', filterButton: true },
      { name: 'Cód. Saúde', filterButton: true },
      { name: 'Nome do Aderente', totalsRowFunction: 'count', filterButton: true },
      { name: 'Nascimento', filterButton: true },
      { name: 'Idade', totalsRowLabel: '—', filterButton: true },
      { name: 'Sexo', filterButton: true },
      { name: 'Data Entrada', filterButton: true },
      { name: 'Plano', filterButton: true },
      { name: 'Prémio Anual (AKZ)', totalsRowFunction: 'sum', filterButton: true },
      { name: 'Mensal Eq. (AKZ)', totalsRowFunction: 'sum', filterButton: true },
    ],
    rows: allMemberRows,
  });

  wsAll.getRow(4).height = 26;
  for (let r = 5; r <= lastAllMemberRow + 1; r++) {
    wsAll.getRow(r).height = 20;
    wsAll.getCell(`G${r}`).numFmt = DATE_FORMAT;
    wsAll.getCell(`J${r}`).numFmt = DATE_FORMAT;
    wsAll.getCell(`L${r}`).numFmt = AKZ_FORMAT;
    wsAll.getCell(`M${r}`).numFmt = AKZ_FORMAT;
    if (r === lastAllMemberRow + 1) {
      wsAll.getRow(r).font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.slate900 } };
    }
  }

  // Sheet 4: Coberturas Principais
  const wsCov = wb.addWorksheet('Coberturas Principais', {
    properties: { tabColor: { argb: 'FF16A34A' } },
    views: [{ state: 'frozen', ySplit: 4 }],
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  wsCov.columns = [
    { width: 11 }, // A: Apólice
    { width: 24 }, // B: Seguradora
    { width: 32 }, // C: Plano
    { width: 22 }, // D: Categoria
    { width: 32 }, // E: Cobertura Principal
    { width: 22 }, // F: Limite Capital
    { width: 18 }, // G: CoPagamento Rede+
    { width: 20 }, // H: Fora da Rede
    { width: 14 }, // I: Carência
    { width: 42 }, // J: Notas
  ];
  wsCov.getRow(1).height = 8;
  styleBanner(
    wsCov,
    'A2:J2',
    'QUADRO COMPARATIVO DE COBERTURAS PRINCIPAIS',
    'A3:J3',
    'Capitais, co-pagamentos na Rede+, comparticipação fora da rede e carências por apólice.'
  );

  const covRows: ExcelJS.CellValue[][] = [];
  for (const p of policies) {
    for (const c of p.coverages.filter((x) => x.level === 'Principal')) {
      covRows.push([
        p.metadata.policyNumber,
        p.metadata.insurer,
        p.metadata.planName,
        c.category,
        c.name,
        c.limitLabel,
        c.copayRedePlus,
        c.outOfNetworkShare,
        c.waitingPeriod,
        c.notes,
      ]);
    }
  }

  wsCov.addTable({
    name: 'TabelaCoberturasPrincipais',
    ref: 'A4',
    headerRow: true,
    totalsRow: false,
    style: { theme: 'TableStyleMedium2', showRowStripes: true },
    columns: [
      { name: 'Apólice', filterButton: true },
      { name: 'Seguradora', filterButton: true },
      { name: 'Plano', filterButton: true },
      { name: 'Categoria', filterButton: true },
      { name: 'Cobertura Principal', filterButton: true },
      { name: 'Limite Capital', filterButton: true },
      { name: 'CoPagamento Rede+', filterButton: true },
      { name: 'Fora da Rede', filterButton: true },
      { name: 'Carência', filterButton: true },
      { name: 'Condições / Notas', filterButton: true },
    ],
    rows: covRows,
  });

  wsCov.getRow(4).height = 26;
  for (let r = 5; r <= 4 + covRows.length; r++) {
    wsCov.getRow(r).height = 21;
  }

  return wb;
}

export async function exportPolicyWorkbookToBuffer(
  policy: InsurancePolicy,
  options: ExcelExportOptions
): Promise<Uint8Array> {
  const wb = await buildPolicyWorkbook(policy, options);
  const buffer = await wb.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

export async function exportPortfolioWorkbookToBuffer(
  policies: InsurancePolicy[],
  options: ExcelExportOptions
): Promise<Uint8Array> {
  const wb = await buildPortfolioWorkbook(policies, options);
  const buffer = await wb.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

function triggerDownload(bytes: Uint8Array, filename: string): string {
  const blob = new Blob([bytes.buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return filename;
}

export async function downloadPolicyWorkbook(
  policy: InsurancePolicy,
  options: ExcelExportOptions
): Promise<string> {
  const bytes = await exportPolicyWorkbookToBuffer(policy, options);
  const safeInsurer = policy.metadata.insurer.includes('Mundial') ? 'A_Mundial' : 'Alianca_Seguros';
  const filename = `Resumo_Apolice_${policy.metadata.policyNumber}_${safeInsurer}.xlsx`;
  return triggerDownload(bytes, filename);
}

export async function downloadPortfolioWorkbook(
  policies: InsurancePolicy[],
  options: ExcelExportOptions
): Promise<string> {
  const bytes = await exportPortfolioWorkbookToBuffer(policies, options);
  const filename = `Resumo_Consolidado_Apolices_Espacie.xlsx`;
  return triggerDownload(bytes, filename);
}
