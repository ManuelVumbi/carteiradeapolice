import { ChangeEvent, DragEvent, useRef, useState } from 'react';
import { FileUp, Loader2, Sparkles } from 'lucide-react';
import { parsePolicyDocumentFile } from '../utils/documentApi';
import type { ExtractedPolicyPayload } from '../utils/policyImport';

interface PolicyFileDropzoneProps {
  title: string;
  description: string;
  existingPolicyContext?: string;
  autoApplyChecked?: boolean;
  onToggleAutoApply?: (checked: boolean) => void;
  autoApplyLabel?: string;
  compact?: boolean;
  onExtracted: (
    extracted: ExtractedPolicyPayload,
    fileName: string
  ) => void;
}

const ACCEPT_ATTR =
  '.pdf,.docx,.doc,.png,.jpg,.jpeg,.webp,.gif,.xlsx,.xls,.csv,.txt,application/pdf,image/*';

export function PolicyFileDropzone({
  title,
  description,
  existingPolicyContext,
  autoApplyChecked,
  onToggleAutoApply,
  autoApplyLabel = 'Actualizar sistema automaticamente após leitura',
  compact = false,
  onExtracted,
}: PolicyFileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsingFileName, setParsingFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processFile = async (file: File) => {
    setError(null);
    setIsParsing(true);
    setParsingFileName(file.name);
    try {
      const result = await parsePolicyDocumentFile(file, existingPolicyContext);
      onExtracted(result.extracted, result.fileName);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível processar o documento.'
      );
    } finally {
      setIsParsing(false);
      setParsingFileName(null);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void processFile(file);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && !isParsing) {
      void processFile(file);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!isParsing) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`rounded-xl border transition-colors ${
        isDragging
          ? 'border-cyan-500 bg-cyan-50/70 dark:bg-cyan-950/40'
          : 'border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-[#0D1526]'
      } ${compact ? 'p-3.5 sm:p-4' : 'p-4 sm:p-5'}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        onChange={handleFileChange}
        className="sr-only"
        aria-label={title}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400">
            {isParsing ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
              {isParsing
                ? `A extrair dados de "${parsingFileName}"...`
                : title}
            </p>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
              {isParsing
                ? 'A identificar apólice, seguradora, aderentes, prémios e coberturas automaticamente.'
                : description}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={isParsing}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <FileUp className="h-3.5 w-3.5" aria-hidden="true" />
          {isParsing ? 'A processar...' : 'Importar Ficheiro'}
        </button>
      </div>

      {onToggleAutoApply && typeof autoApplyChecked === 'boolean' && (
        <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-slate-800/80">
          <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoApplyChecked}
              disabled={isParsing}
              onChange={(e) => onToggleAutoApply(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 dark:bg-[#0B1120] text-cyan-600 focus:ring-cyan-500"
            />
            <span>{autoApplyLabel}</span>
          </label>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="mt-2.5 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 rounded-lg"
        >
          {error}
        </p>
      )}
    </div>
  );
}
