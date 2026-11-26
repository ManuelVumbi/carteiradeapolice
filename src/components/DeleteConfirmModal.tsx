import { AlertTriangle, Trash2, X } from 'lucide-react';
import { InsurancePolicy } from '../data/types';
import { formatAKZ } from '../data/policies';

interface DeleteConfirmModalProps {
  policy: InsurancePolicy | null;
  onCancel: () => void;
  onConfirm: (policyId: string) => void;
}

export function DeleteConfirmModal({
  policy,
  onCancel,
  onConfirm,
}: DeleteConfirmModalProps) {
  if (!policy) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-black/75 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-policy-title"
    >
      <div className="w-full max-w-md bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden">
        <div className="h-1.5 w-full bg-red-500" />
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-red-100 dark:bg-red-950/70 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="delete-policy-title" className="text-base font-bold text-slate-900 dark:text-white">
                Eliminar Apólice N.º {policy.metadata.policyNumber}?
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {policy.projectName} · {policy.metadata.insurer}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancelar eliminação"
            className="rounded-lg p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="px-6 py-3 text-xs text-slate-600 dark:text-slate-300 space-y-2">
          <p>
            Esta ação remove a apólice <strong className="text-slate-900 dark:text-white">{policy.shortLabel}</strong> ({policy.members.length} aderentes · {formatAKZ(policy.metadata.totalAnnualPremium)}) da carteira e recalcula todos os totais, mínimos, médios e máximos automaticamente.
          </p>
          <p className="text-slate-500 dark:text-slate-400">
            Pode restaurar as 4 apólices originais a qualquer momento através do botão &ldquo;Repor Originais&rdquo;.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 px-6 py-4 bg-slate-50 dark:bg-[#0D1526] border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(policy.id)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Confirmar Eliminação
          </button>
        </div>
      </div>
    </div>
  );
}
