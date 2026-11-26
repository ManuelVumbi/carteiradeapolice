import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_POLICIES, POLICY_29980 } from '../data/policyData';
import {
  INITIAL_MEDICAL_CERTIFICATES,
  addYearsToIsoDate,
  buildMedicalCertificateAlerts,
  buildPolicyAlerts,
  classifyAlertSeverity,
  computeDaysRemaining,
  deleteMedicalCertificate,
  formatDaysRemainingLabel,
  summarizeAlerts,
  upsertMedicalCertificate,
} from './expirationAlerts';

test('computeDaysRemaining and classifyAlertSeverity classify expired, critical, warning, and valid accurately', () => {
  assert.equal(computeDaysRemaining('2026-11-09', '2026-11-26'), -17);
  assert.equal(classifyAlertSeverity(-17, 60), 'expired');

  assert.equal(computeDaysRemaining('2026-12-04', '2026-11-26'), 8);
  assert.equal(classifyAlertSeverity(8, 60), 'critical');

  assert.equal(computeDaysRemaining('2027-01-05', '2026-11-26'), 40);
  assert.equal(classifyAlertSeverity(40, 60), 'warning');

  assert.equal(computeDaysRemaining('2027-07-14', '2026-11-26'), 230);
  assert.equal(classifyAlertSeverity(230, 60), 'valid');

  assert.equal(formatDaysRemainingLabel(-17), 'Expirado há 17 dias');
  assert.equal(formatDaysRemainingLabel(0), 'Expira hoje');
  assert.equal(formatDaysRemainingLabel(40), '40 dias restantes');
});

test('buildPolicyAlerts identifies expired Work Accident 29980 and expiring Paenal 5671605', () => {
  const alerts = buildPolicyAlerts(ALL_POLICIES, '2026-11-26', 60);
  assert.equal(alerts.length, 5);
  assert.equal(alerts[0].policyNumber, '29980');
  assert.equal(alerts[0].severity, 'expired');
  assert.equal(alerts[0].daysRemaining, -17);

  const paenal = alerts.find((a) => a.policyNumber === '5671605');
  assert.ok(paenal);
  assert.equal(paenal.severity, 'warning');
  assert.equal(paenal.daysRemaining, 40);
});

test('medical certificates CRUD, renewal, and policy member sync update summary counts', () => {
  const policyAlerts = buildPolicyAlerts(ALL_POLICIES, '2026-11-26', 60);
  const certAlerts = buildMedicalCertificateAlerts(
    INITIAL_MEDICAL_CERTIFICATES,
    ALL_POLICIES,
    '2026-11-26',
    60
  );
  const summary = summarizeAlerts(policyAlerts, certAlerts);
  assert.equal(summary.policyUrgentCount, 2);
  assert.equal(summary.certificateUrgentCount, 5);
  assert.equal(summary.urgentCount, 7);

  // Renew expired certificate by +1 year
  const expiredCert = INITIAL_MEDICAL_CERTIFICATES[0];
  const renewed = {
    ...expiredCert,
    issueDate: '2026-11-26',
    expiryDate: addYearsToIsoDate(expiredCert.expiryDate, 1),
  };
  assert.equal(renewed.expiryDate, '2027-11-18');

  const updatedList = upsertMedicalCertificate(INITIAL_MEDICAL_CERTIFICATES, renewed);
  const updatedAlerts = buildMedicalCertificateAlerts(updatedList, ALL_POLICIES, '2026-11-26', 60);
  assert.equal(
    updatedAlerts.find((a) => a.certificate.id === expiredCert.id)?.severity,
    'valid'
  );

  // Sync member-level medical certificate
  const polWithCert = {
    ...POLICY_29980,
    members: POLICY_29980.members.map((m, idx) =>
      idx === 0
        ? {
            ...m,
            medicalCertificateNumber: 'MEM-AT-001',
            medicalCertificateExpiry: '2026-12-01',
            medicalCertificateStatus: 'Apto' as const,
          }
        : m
    ),
  };
  const syncedAlerts = buildMedicalCertificateAlerts(
    updatedList,
    [polWithCert],
    '2026-11-26',
    60
  );
  const memAlert = syncedAlerts.find((a) => a.certificate.certificateNumber === 'MEM-AT-001');
  assert.ok(memAlert);
  assert.equal(memAlert.severity, 'critical');

  const afterDelete = deleteMedicalCertificate(updatedList, renewed.id);
  assert.equal(afterDelete.length, INITIAL_MEDICAL_CERTIFICATES.length - 1);
});
