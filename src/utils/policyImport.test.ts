import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_POLICIES } from '../data/policies.ts';
import {
  findMatchingPolicy,
  htmlTablesToStructuredText,
  isSupportedPolicyFile,
  mergeExtractedIntoDraft,
  normalizeDateISO,
} from './policyImport.ts';

test('htmlTablesToStructuredText preserves Word table rows and columns cleanly', () => {
  const html =
    '<h1>Apólice 88901</h1><table><tr><th>Nome</th><th>Prémio</th></tr><tr><td>João Silva</td><td>450000</td></tr></table>';
  const text = htmlTablesToStructuredText(html);
  assert.ok(text.includes('Apólice 88901'));
  assert.ok(text.includes('Nome | Prémio'));
  assert.ok(text.includes('João Silva | 450000'));
});

test('normalizeDateISO handles DD-MM-YYYY, DD/MM/YYYY and ISO strings', () => {
  assert.equal(normalizeDateISO('15-07-2026'), '2026-07-15');
  assert.equal(normalizeDateISO('04/09/2026'), '2026-09-04');
  assert.equal(normalizeDateISO('2027-07-14'), '2027-07-14');
  assert.equal(normalizeDateISO('invalid'), '');
});

test('findMatchingPolicy matches existing policy by policyNumber or projectName', () => {
  const byNumber = findMatchingPolicy({ policyNumber: ' 27279 ' }, ALL_POLICIES);
  assert.equal(byNumber?.id, '27279');

  const byProject = findMatchingPolicy({ projectName: 'spie' }, ALL_POLICIES);
  assert.equal(byProject?.id, '24050');

  const noMatch = findMatchingPolicy({ policyNumber: '999999', projectName: 'Nova' }, ALL_POLICIES);
  assert.equal(noMatch, undefined);
});

test('mergeExtractedIntoDraft updates existing policy fields without wiping untouched metadata', () => {
  const { draft, extractedCoverages, fieldsUpdated } = mergeExtractedIntoDraft(
    {
      policyNumber: '27279',
      endorsementNumber: '12.0',
      totalAnnualPremiumAKZ: 8100000,
      members: [
        { name: 'Ana Paula', annualPremium: 4100000, gender: 'Feminino' },
        { name: 'Bruno Neto', annualPremium: 4000000, gender: 'Masculino' },
      ],
    },
    'edit',
    ALL_POLICIES.length,
    ALL_POLICIES[0]
  );

  // Preserved original projectName and holder NIF
  assert.equal(draft.projectName, 'Dietsmann');
  assert.equal(draft.holderNif, ALL_POLICIES[0].holder.nif);
  // Updated endorsement, total, and members
  assert.equal(draft.endorsementNumber, '12.0');
  assert.equal(draft.members.length, 2);
  assert.equal(draft.autoComputeTotalFromMembers, true);
  assert.equal(draft.totalAnnualPremiumAKZ, '8100000');
  assert.equal(extractedCoverages, null);
  assert.ok(fieldsUpdated.includes('2 aderente(s)'));
});

test('mergeExtractedIntoDraft creates new policy draft and infers projectName from holder when missing', () => {
  const { draft, extractedCoverages } = mergeExtractedIntoDraft(
    {
      policyNumber: '99120',
      insurer: 'ENSA Seguros',
      planName: 'Plano Executivo',
      holderName: 'Sonangol Pesquisa & Produção, S.A.',
      totalAnnualPremiumAKZ: 1500000,
      members: [
        { name: 'Pedro Kiala', annualPremium: 650000, birthDate: '10-05-1988' },
        { name: 'Maria Costa', annualPremium: 700000, birthDate: '1991-02-20' },
      ],
      coverages: [
        {
          category: 'Internamento',
          item: 'Hospitalização',
          limitText: '20.000.000,00 AKZ',
          numericLimit: 20000000,
          copayInNetwork: '10 %',
          copayOutOfNetwork: '40 %',
        },
      ],
    },
    'create',
    4
  );

  assert.equal(draft.projectName, 'Sonangol');
  assert.equal(draft.policyNumber, '99120');
  assert.equal(draft.members[0].birthDate, '1988-05-10');
  assert.equal(draft.members[1].birthDate, '1991-02-20');
  // Since document total (1,500,000) differs from member sum (1,350,000), preserve exact invoice total
  assert.equal(draft.autoComputeTotalFromMembers, false);
  assert.equal(draft.totalAnnualPremiumAKZ, '1500000');
  assert.equal(extractedCoverages?.length, 1);
});

test('isSupportedPolicyFile accepts PDF, Word, Images, Excel, and rejects executables', () => {
  assert.equal(isSupportedPolicyFile('apolice.pdf', 'application/pdf'), true);
  assert.equal(isSupportedPolicyFile('contrato.docx', ''), true);
  assert.equal(isSupportedPolicyFile('foto.png', 'image/png'), true);
  assert.equal(isSupportedPolicyFile('lista.xlsx', ''), true);
  assert.equal(isSupportedPolicyFile('malware.exe', 'application/x-msdownload'), false);
});
