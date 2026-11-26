import { X, Download } from 'lucide-react';

interface ExportConfigModalProps {
  open: boolean;
  onClose: () => void;
  scopeTitle: string;
  isPortfolio: boolean;
  referenceDateIso: string;
  onChangeReferenceDate: (dateIso: string) => void;
  includeSimulatorSheet: boolean;
  onToggleSimulatorSheet: (value: boolean) => void;
  includeConditionalFormatting: boolean;
  onToggleConditionalFormatting: (value: boolean) => void;
  onExportNow: () => void;
  isExporting: boolean;
}

export function ExportConfigModal({
  open,
  onClose,
  scopeTitle,
  isPortfolio,
  referenceDateIso,
  onChangeReferenceDate,
  includeSimulatorSheet,
  onToggleSimulatorSheet,
  includeConditionalFormatting,
  onToggleConditionalFormatting,
  onExportNow,
  isExporting,
}: ExportConfigModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-black/75 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-config-title"
    >
      <div className="w-full max-w-lg bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden">
        <div className="h-1.5 w-full bg-emerald-500" />
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 id="export-config-title" className="text-base font-semibold text-slate-900 dark:text-white">
              Configurar Ficheiro Excel (.xlsx)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{scopeTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar configuração de exportação"
            className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-500"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-sm">
          <div>
            <label htmlFor="ref-date-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Data de referência para cálculo automático de idades
            </label>
            <input
              id="ref-date-input"
              type="date"
              value={referenceDateIso}
              onChange={(e) => {
                if (e.target.value) onChangeReferenceDate(e.target.value);
              }}
              className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              No Excel esta célula fica editável na primeira folha (C4) para recalcular idades dinamicamente.
            </p>
          </div>

          {!isPortfolio && (
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSimulatorSheet}
                  onChange={(e) => onToggleSimulatorSheet(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-slate-600 dark:bg-[#0B1120] text-cyan-600 focus:ring-cyan-500"
                />
                <span>
                  <span className="block font-medium text-slate-900 dark:text-white">
                    Incluir folha interativa Simulador de Custos
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    Adiciona a 4.ª folha com células editáveis para simular despesas na Rede+ vs Fora da Rede.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeConditionalFormatting}
                  onChange={(e) => onToggleConditionalFormatting(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-slate-600 dark:bg-[#0B1120] text-cyan-600 focus:ring-cyan-500"
                />
                <span>
                  <span className="block font-medium text-slate-900 dark:text-white">
                    Incluir formatação condicional automática
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    Destaca prémios elevados, coberturas principais e alertas de excesso de limite no simulador.
                  </span>
                </span>
              </label>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-[#0E1628] border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 whitespace-nowrap"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              onExportNow();
              onClose();
            }}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 disabled:opacity-60 whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Gerar e Transferir (.xlsx)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
