import {
  MAX_UPLOAD_BYTES,
  isSupportedPolicyFile,
} from './documentFormat';
import type { ExtractedPolicyPayload } from './policyImport';

export interface ParsedDocumentResponse {
  extracted: ExtractedPolicyPayload;
  fileName: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Não foi possível ler o ficheiro selecionado.'));
    reader.readAsDataURL(file);
  });
}

export async function parsePolicyDocumentFile(
  file: File,
  existingPolicyContext?: string
): Promise<ParsedDocumentResponse> {
  if (!isSupportedPolicyFile(file.name, file.type)) {
    throw new Error(
      `O formato de "${file.name}" não é suportado. Utilize PDF, Word (.docx), Imagem (PNG, JPG, WEBP), Excel (.xlsx) ou CSV/TXT.`
    );
  }
  if (file.size <= 0) {
    throw new Error(`O ficheiro "${file.name}" está vazio.`);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(
      `O ficheiro "${file.name}" ultrapassa o limite máximo de 15 MB.`
    );
  }

  const base64Data = await fileToBase64(file);
  const response = await fetch('/api/parse-policy-document', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type,
      base64Data,
      existingPolicyContext: existingPolicyContext ?? '',
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    extracted?: ExtractedPolicyPayload;
    fileName?: string;
    error?: string;
  };

  if (!response.ok || !payload.extracted) {
    throw new Error(
      payload.error ||
        `Erro (${response.status}) ao processar o documento "${file.name}".`
    );
  }

  return {
    extracted: payload.extracted,
    fileName: payload.fileName || file.name,
  };
}
