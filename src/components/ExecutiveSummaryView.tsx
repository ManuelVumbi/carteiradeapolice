import { Pencil, Trash2 } from 'lucide-react';
import {
  calculateAge,
  formatAKZ,
  formatDatePT,
  getPolicyGlobalLimit,
  getPolicyPremiumStats,
  getPremiumTiers,
} from '../data/policies';
import { InsurancePolicy } from '../data/types';
import { getPolicyAccent } from '../utils/policyAccents';
import { SheetTabId } from './Sidebar';

interface ExecutiveSummaryViewProps {
  policy: InsurancePolicy;
  policyIndex: number;
  referenceDateIso: string;
  onNavigateSheet: (tab: SheetTabId) => void;
  onEditPolicy: (policy: InsurancePolicy) => void;
  onRequestDeletePolicy: (policy: InsurancePolicy) => void;
}

export function ExecutiveSummaryView({
  policy,
  policyIndex,
  referenceDateIso,
  onNavigateSheet,
  onEditPolicy,
  onRequestDeletePolicy,
}: ExecutiveSummaryViewProps) {
  const { holder, metadata, coverages, members, billingNotice, notes } = policy;
  const accent = getPolicyAccent(policy, policyIndex);
  const tiers = getPremiumTiers(members, policy.hasBirthDates, referenceDateIso);
  const premiumStats = getPolicyPremiumStats(policy);
  const memberPremiumSum = premiumStats.nominalMemberSum;
  const avgPremium = premiumStats.averagePolicyPerMember;

  const validAges = members
    .map((m) => calculateAge(m.birthDate, referenceDateIso))
    .filter((a): a is number => a !== null);
  const avgAge =
    validAges.length > 0
      ? validAges.reduce((acc, a) => acc + a, 0) / validAges.length
      : null;

  const maleMembers = members.filter((m) => m.gender === 'Masculino');
  const femaleMembers = members.filter((m) => m.gender === 'Feminino');
  const unspecifiedMembers = members.filter((m) => m.gender === 'Não indicado');
  const maleSum = maleMembers.reduce((a, b) => a + b.annualPremium, 0);
  const femaleSum = femaleMembers.reduce((a, b) => a + b.annualPremium, 0);
  const unspecifiedSum = unspecifiedMembers.reduce((a, b) => a + b.annualPremium, 0);

  const globalLimit = getPolicyGlobalLimit(policy);

  const principalCoverages = coverages.filter(
    (c) => c.level === 'Principal' && c.category !== 'Outros Benefícios'
  );

  const hasSimpleDiff =
    Math.abs(memberPremiumSum - metadata.totalAnnualPremium) >= 0.05;

  return (
    <div className="space-y-6">
      {/* Header Summary Strip */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className={`text-xs font-semibold ${accent.textAccent}`}>
            {policy.projectName} · {metadata.insurer} · {metadata.product} · {metadata.documentType}
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white text-balance">
            Resumo da Apólice N.º {metadata.policyNumber} ({policy.projectName})
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
            <span>{metadata.planName}</span>
            <span aria-hidden="true">·</span>
            <span>Acta N.º {metadata.endorsementNumber}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              Vigência {formatDatePT(metadata.effectiveDate)} a{' '}
              {formatDatePT(metadata.expiryDate)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="text-xs text-slate-600 dark:text-slate-400 mr-1">
            Ref. idades:{' '}
            <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
              {formatDatePT(referenceDateIso)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onEditPolicy(policy)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            Actualizar Apólice
          </button>
          <button
            type="button"
            onClick={() => onRequestDeletePolicy(policy)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/80 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors whitespace-nowrap"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Eliminar
          </button>
        </div>
      </div>

      {/* 4-column KPI strip with multi-color top bars */}
      <section aria-label="Indicadores principais da apólice" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800/90 rounded-xl overflow-hidden">
          <div className="h-1 w-full bg-cyan-500" />
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Prémio Total Anual</p>
            <p className="mt-2 text-xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
              {formatAKZ(metadata.totalAnnualPremium)}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              Equiv. {formatAKZ(metadata.totalAnnualPremium / 12)} / mês
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800/90 rounded-xl overflow-hidden">
          <div className="h-1 w-full bg-blue-500" />
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total de Aderentes</p>
            <p className="mt-2 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white whitespace-nowrap">
              {members.length} aderentes
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {policy.hasBirthDates
                ? `${maleMembers.length} Masc. · ${femaleMembers.length} Fem.${
                    unspecifiedMembers.length > 0 ? ` · ${unspecifiedMembers.length} N/D` : ''
                  }`
                : 'Nota de pagamento (sem género)'}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800/90 rounded-xl overflow-hidden">
          <div className="h-1 w-full bg-emerald-500" />
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Prémio Médio / Aderente</p>
            <p className="mt-2 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white whitespace-nowrap">
              {formatAKZ(avgPremium)}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {avgAge !== null
                ? `Idade média do grupo: ${avgAge.toFixed(1)} anos`
                : 'Idades não discriminadas na nota'}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800/90 rounded-xl overflow-hidden">
          <div className="h-1 w-full bg-violet-500" />
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Limite Máximo Global</p>
            <p className="mt-2 text-xl font-bold font-mono tabular-nums text-violet-700 dark:text-violet-400 whitespace-nowrap">
              {formatAKZ(globalLimit.numericLimit)}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Fraccionamento {metadata.billingFrequency} · {metadata.duration}
            </p>
          </div>
        </div>
      </section>

      {/* Min / Average / Max Member Premium Strip */}
      <section aria-label="Amplitude de prémios por aderente" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800/90 rounded-xl overflow-hidden">
          <div className="h-1 w-full bg-rose-500" />
          <div className="p-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Prémio Mínimo / Aderente</p>
            <p className="mt-1.5 text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white whitespace-nowrap">
              {formatAKZ(premiumStats.minPremium)}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              {premiumStats.zeroCount > 0
                ? `${premiumStats.zeroCount} isentos · Mín. >0: ${formatAKZ(premiumStats.minNonZeroPremium)}`
                : 'Menor tarifa individual da apólice'}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800/90 rounded-xl overflow-hidden">
          <div className="h-1 w-full bg-amber-500" />
          <div className="p-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Prémio Médio (Apólice vs Nominal)</p>
            <p className="mt-1.5 text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white whitespace-nowrap">
              {formatAKZ(premiumStats.averagePolicyPerMember)}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              {hasSimpleDiff
                ? `Média nominal: ${formatAKZ(premiumStats.averageNominalPerMember)}`
                : 'Coincide com a média nominal dos aderentes'}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800/90 rounded-xl overflow-hidden">
          <div className="h-1 w-full bg-red-500" />
          <div className="p-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Prémio Máximo / Aderente</p>
            <p className="mt-1.5 text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white whitespace-nowrap">
              {formatAKZ(premiumStats.maxPremium)}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Maior tarifa individual da apólice
            </p>
          </div>
        </div>
      </section>

      {/* Policy notes when present */}
      {notes && notes.length > 0 && (
        <section className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800/90 rounded-xl p-4 text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
          <p className="font-semibold text-slate-900 dark:text-white">Notas Documentais da Apólice</p>
          <ul className="list-disc pl-4 space-y-1">
            {notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
          {hasSimpleDiff && (
            <p className="text-slate-600 dark:text-slate-400 pt-1 font-mono tabular-nums">
              Soma nominal dos aderentes: {formatAKZ(memberPremiumSum)} · Prémio Simples:{' '}
              {metadata.simpleAnnualPremium ? formatAKZ(metadata.simpleAnnualPremium) : '—'} · Total Apólice:{' '}
              {formatAKZ(metadata.totalAnnualPremium)}
            </p>
          )}
        </section>
      )}

      {/* Billing Notice & Bank Coordinates (Apólice 24050) */}
      {billingNotice && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800/90 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800/90 bg-slate-50/70 dark:bg-[#0E1628]">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Nota de Pagamento {billingNotice.noticeNumber} ({billingNotice.referenceCode})
              </h2>
            </div>
            <dl className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
              <div className="grid grid-cols-3 gap-4 px-5 py-2.5">
                <dt className="text-slate-500 dark:text-slate-400 font-medium">Período Facturado</dt>
                <dd className="col-span-2 font-mono tabular-nums text-slate-900 dark:text-slate-100">
                  {formatDatePT(billingNotice.periodStart)} a {formatDatePT(billingNotice.periodEnd)}
                </dd>
              </div>
              <div className="grid grid-cols-3 gap-4 px-5 py-2.5">
                <dt className="text-slate-500 dark:text-slate-400 font-medium">Emissão / Limite Pag.</dt>
                <dd className="col-span-2 font-mono tabular-nums text-slate-900 dark:text-slate-100">
                  {formatDatePT(billingNotice.issueDate)} · Limite: {formatDatePT(billingNotice.dueDate)}
                </dd>
              </div>
              <div className="grid grid-cols-3 gap-4 px-5 py-2.5">
                <dt className="text-slate-500 dark:text-slate-400 font-medium">Prémio Simples</dt>
                <dd className="col-span-2 font-mono tabular-nums text-slate-900 dark:text-slate-100">
                  {formatAKZ(billingNotice.simplePremium)}
                </dd>
              </div>
              <div className="grid grid-cols-3 gap-4 px-5 py-2.5">
                <dt className="text-slate-500 dark:text-slate-400 font-medium">Encargos / IVA</dt>
                <dd className="col-span-2 font-mono tabular-nums text-slate-900 dark:text-slate-100">
                  {formatAKZ(billingNotice.charges)} · IVA {formatAKZ(billingNotice.vat)} (Isento)
                </dd>
              </div>
              <div className="grid grid-cols-3 gap-4 px-5 py-2.5 bg-emerald-50/50 dark:bg-emerald-950/30">
                <dt className="text-emerald-900 dark:text-emerald-300 font-semibold">Total a Pagar</dt>
                <dd className="col-span-2 font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                  {formatAKZ(billingNotice.totalToPay)} ({billingNotice.unitCount} unidades)
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800/90 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800/90 bg-slate-50/70 dark:bg-[#0E1628]">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Coordenadas Bancárias para Pagamento
              </h2>
            </div>
            <dl className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
              <div className="grid grid-cols-3 gap-4 px-5 py-2.5">
                <dt className="text-slate-500 dark:text-slate-400 font-medium">Banco</dt>
                <dd className="col-span-2 font-semibold text-slate-900 dark:text-white">{billingNotice.bankName}</dd>
              </div>
              <div className="grid grid-cols-3 gap-4 px-5 py-2.5">
                <dt className="text-slate-500 dark:text-slate-400 font-medium">Conta Bancária</dt>
                <dd className="col-span-2 font-mono tabular-nums text-slate-900 dark:text-slate-100">
                  {billingNotice.bankAccount}
                </dd>
              </div>
              <div className="grid grid-cols-3 gap-4 px-5 py-2.5">
                <dt className="text-slate-500 dark:text-slate-400 font-medium">NIB</dt>
                <dd className="col-span-2 font-mono tabular-nums text-slate-900 dark:text-slate-100">
                  {billingNotice.nib}
                </dd>
              </div>
              <div className="grid grid-cols-3 gap-4 px-5 py-2.5">
                <dt className="text-slate-500 dark:text-slate-400 font-medium">IBAN</dt>
                <dd className="col-span-2 font-mono tabular-nums text-slate-900 dark:text-slate-100">
                  {billingNotice.iban}
                </dd>
              </div>
              <div className="grid grid-cols-3 gap-4 px-5 py-2.5">
                <dt className="text-slate-500 dark:text-slate-400 font-medium">SWIFT / Agência</dt>
                <dd className="col-span-2 font-mono tabular-nums text-slate-900 dark:text-slate-100">
                  {billingNotice.swift} · {billingNotice.agency}
                </dd>
              </div>
            </dl>
          </div>
        </section>
      )}

      {/* Tomador do Seguro + Dados da Apólice */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800/90 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800/90 bg-slate-50/70 dark:bg-[#0E1628]">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Tomador do Seguro</h2>
          </div>
          <dl className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
            <div className="grid grid-cols-3 gap-4 px-5 py-3">
              <dt className="text-slate-500 dark:text-slate-400 font-medium">Nome</dt>
              <dd className="col-span-2 font-semibold text-slate-900 dark:text-white">{holder.name}</dd>
            </div>
            <div className="grid grid-cols-3 gap-4 px-5 py-3">
              <dt className="text-slate-500 dark:text-slate-400 font-medium">NIF</dt>
              <dd className="col-span-2 font-mono tabular-nums text-slate-900 dark:text-slate-100">{holder.nif}</dd>
            </div>
            <div className="grid grid-cols-3 gap-4 px-5 py-3">
              <dt className="text-slate-500 dark:text-slate-400 font-medium">Morada</dt>
              <dd className="col-span-2 text-slate-900 dark:text-slate-200">{holder.address}</dd>
            </div>
            <div className="grid grid-cols-3 gap-4 px-5 py-3">
              <dt className="text-slate-500 dark:text-slate-400 font-medium">Telefone</dt>
              <dd className="col-span-2 font-mono tabular-nums text-slate-900 dark:text-slate-100">{holder.phone}</dd>
            </div>
            <div className="grid grid-cols-3 gap-4 px-5 py-3">
              <dt className="text-slate-500 dark:text-slate-400 font-medium">Email</dt>
              <dd className="col-span-2 text-slate-900 dark:text-slate-200 break-all">{holder.email}</dd>
            </div>
            <div className="grid grid-cols-3 gap-4 px-5 py-3">
              <dt className="text-slate-500 dark:text-slate-400 font-medium">
                {holder.clientNumber ? 'Cliente / Agente' : 'Agente Produtor'}
              </dt>
              <dd className="col-span-2 font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {holder.clientNumber
                  ? `${holder.clientNumber} · ${holder.producerAgent}`
                  : holder.producerAgent}
              </dd>
            </div>
          </dl>
        </div>

        <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800/90 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800/90 bg-slate-50/70 dark:bg-[#0E1628]">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Dados da Apólice</h2>
          </div>
          <dl className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
            <div className="grid grid-cols-3 gap-4 px-5 py-3">
              <dt className="text-slate-500 dark:text-slate-400 font-medium">Apólice / Acta</dt>
              <dd className="col-span-2 font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                N.º {metadata.policyNumber} · Acta {metadata.endorsementNumber}
              </dd>
            </div>
            <div className="grid grid-cols-3 gap-4 px-5 py-3">
              <dt className="text-slate-500 dark:text-slate-400 font-medium">Plano Contratado</dt>
              <dd className="col-span-2 font-medium text-slate-900 dark:text-white">{metadata.planName}</dd>
            </div>
            <div className="grid grid-cols-3 gap-4 px-5 py-3">
              <dt className="text-slate-500 dark:text-slate-400 font-medium">Data de Início</dt>
              <dd className="col-span-2 font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {formatDatePT(metadata.startDate)}
              </dd>
            </div>
            <div className="grid grid-cols-3 gap-4 px-5 py-3">
              <dt className="text-slate-500 dark:text-slate-400 font-medium">Data Efeito</dt>
              <dd className="col-span-2 font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {formatDatePT(metadata.effectiveDate)}
              </dd>
            </div>
            <div className="grid grid-cols-3 gap-4 px-5 py-3">
              <dt className="text-slate-500 dark:text-slate-400 font-medium">Vencimento / Renovação</dt>
              <dd className="col-span-2 font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {formatDatePT(metadata.expiryDate)} / {formatDatePT(metadata.renewalDate)}
              </dd>
            </div>
            <div className="grid grid-cols-3 gap-4 px-5 py-3">
              <dt className="text-slate-500 dark:text-slate-400 font-medium">
                {metadata.territorialScope ? 'Âmbito / Fracc.' : 'Duração / Fracc.'}
              </dt>
              <dd className="col-span-2 text-slate-900 dark:text-slate-200">
                {metadata.territorialScope
                  ? metadata.territorialScope
                  : `${metadata.duration} · ${metadata.billingFrequency}`}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Tiers & Gender Tables */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800/90 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800/90 bg-slate-50/70 dark:bg-[#0E1628]">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Escalões de Prémio Anual Identificados ({tiers.length})
            </h2>
            <button
              type="button"
              onClick={() => onNavigateSheet('aderentes')}
              className={`text-xs font-medium hover:underline whitespace-nowrap ${accent.textAccent}`}
            >
              Ver ou gerir aderentes →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800/90 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/40 dark:bg-[#141F36]">
                  <th className="py-2.5 px-4 whitespace-nowrap">Escalão</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Prémio Unitário</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Aderentes</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Total Anual</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {tiers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 px-4 text-center text-xs text-slate-500 dark:text-slate-400">
                      Nenhum aderente registado nesta apólice.
                    </td>
                  </tr>
                ) : (
                  tiers.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/70 dark:hover:bg-[#16223B] transition-colors">
                      <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                        {t.label}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {formatAKZ(t.unitPremium)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {t.count}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-xs font-medium text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                        {formatAKZ(t.totalPremium)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {t.sharePercent.toFixed(1)}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 dark:border-slate-800/90 bg-slate-50 dark:bg-[#0E1628] font-semibold text-slate-900 dark:text-white text-xs">
                  <td className="py-2.5 px-4">Total Nominal</td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">—</td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">{members.length}</td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                    {formatAKZ(memberPremiumSum)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                    {members.length > 0 ? '100.0%' : '0.0%'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800/90 rounded-xl overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800/90 bg-slate-50/70 dark:bg-[#0E1628]">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Distribuição por Género</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800/90 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/40 dark:bg-[#141F36]">
                    <th className="py-2.5 px-4 whitespace-nowrap">Género</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Qtd.</th>
                    <th className="py-2.5 px-4 text-right whitespace-nowrap">Prémio Anual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  <tr>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                      Masculino
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-xs text-slate-900 dark:text-slate-200 whitespace-nowrap">
                      {maleMembers.length} ({members.length > 0 ? ((maleMembers.length / members.length) * 100).toFixed(0) : 0}%)
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                      {formatAKZ(maleSum)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                      Feminino
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-xs text-slate-900 dark:text-slate-200 whitespace-nowrap">
                      {femaleMembers.length} ({members.length > 0 ? ((femaleMembers.length / members.length) * 100).toFixed(0) : 0}%)
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                      {formatAKZ(femaleSum)}
                    </td>
                  </tr>
                  {unspecifiedMembers.length > 0 && (
                    <tr>
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                        Não indicado
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-xs text-slate-900 dark:text-slate-200 whitespace-nowrap">
                        {unspecifiedMembers.length} ({((unspecifiedMembers.length / members.length) * 100).toFixed(0)}%)
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                        {formatAKZ(unspecifiedSum)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-5 border-t border-slate-200 dark:border-slate-800/90 bg-slate-50/60 dark:bg-[#0E1628] text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
            <p className="font-semibold text-slate-900 dark:text-white">Automatização no Excel</p>
            <p>
              Todos os totais e médias desta apólice são exportados para Excel com fórmulas{' '}
              <code className="font-mono text-cyan-700 dark:text-cyan-400">SUM</code>,{' '}
              <code className="font-mono text-cyan-700 dark:text-cyan-400">COUNTIF</code> e{' '}
              <code className="font-mono text-cyan-700 dark:text-cyan-400">SUMIF</code> ligadas à folha Aderentes.
            </p>
          </div>
        </div>
      </section>

      {/* Principal Coverages Overview */}
      <section className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800/90 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800/90 bg-slate-50/70 dark:bg-[#0E1628]">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Principais Limites e Regras de Cobertura ({metadata.planName})
          </h2>
          <button
            type="button"
            onClick={() => onNavigateSheet('coberturas')}
            className={`text-xs font-medium hover:underline whitespace-nowrap ${accent.textAccent}`}
          >
            Ver todas as {coverages.length} linhas →
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800/90 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/40 dark:bg-[#141F36]">
                <th className="py-2.5 px-5">Cobertura</th>
                <th className="py-2.5 px-4 text-right">Limite Capital</th>
                <th className="py-2.5 px-4 text-center">CoPagamento Rede+</th>
                <th className="py-2.5 px-4 text-center">Fora da Rede</th>
                <th className="py-2.5 px-5">Nota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {principalCoverages.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-[#16223B] transition-colors">
                  <td className="py-2.5 px-5 font-medium text-slate-900 dark:text-white">{c.name}</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums font-medium text-cyan-700 dark:text-cyan-400">
                    {c.limitLabel}
                  </td>
                  <td className="py-2.5 px-4 text-center font-mono tabular-nums text-slate-700 dark:text-slate-300">
                    {c.copayRedePlus}
                  </td>
                  <td className="py-2.5 px-4 text-center font-mono tabular-nums text-slate-700 dark:text-slate-300">
                    {c.outOfNetworkShare}
                  </td>
                  <td className="py-2.5 px-5 text-slate-600 dark:text-slate-400">{c.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
