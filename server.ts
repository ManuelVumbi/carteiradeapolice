import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mammoth from 'mammoth';
import ExcelJS from 'exceljs';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  MAX_UPLOAD_BYTES,
  getFileExtension,
  htmlTablesToStructuredText,
  isSupportedPolicyFile,
} from './src/utils/documentFormat.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = (process.env.GEMINI_API_KEY ?? '').trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const POLICY_EXTRACTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    policyCategory: {
      type: Type.STRING,
      description:
        'Categoria da apólice: "saude" para seguro de saúde ou "acidente_trabalho" para seguro de acidentes de trabalho.',
    },
    projectName: {
      type: Type.STRING,
      description:
        'Nome curto do projeto ou cliente associado (ex: Dietsmann, SPIE, Total, Paenal, Acidentes Trabalho). Vazio se não indicado.',
    },
    policyNumber: {
      type: Type.STRING,
      description: 'Número da apólice principal (ex: 27279, 24050, 5423633, 5671605, 29980).',
    },
    endorsementNumber: {
      type: Type.STRING,
      description: 'Número da acta, recibo ou endosso (ex: 11.0, 35.0, P2026.648).',
    },
    insurer: {
      type: Type.STRING,
      description: 'Nome da seguradora (ex: Aliança Seguros, A Mundial Seguros, S.A.).',
    },
    product: {
      type: Type.STRING,
      description: 'Ramo ou produto do seguro (ex: Saúde Grupo, Acidentes Trabalho - Prémio Variável).',
    },
    planName: {
      type: Type.STRING,
      description: 'Nome ou código do plano contratado.',
    },
    effectiveDate: {
      type: Type.STRING,
      description: 'Data de efeito / início da vigência em formato YYYY-MM-DD.',
    },
    expiryDate: {
      type: Type.STRING,
      description: 'Data de vencimento / fim da vigência em formato YYYY-MM-DD.',
    },
    startDate: {
      type: Type.STRING,
      description: 'Data de início original da apólice em formato YYYY-MM-DD.',
    },
    renewalDate: {
      type: Type.STRING,
      description: 'Data de renovação em formato YYYY-MM-DD.',
    },
    duration: {
      type: Type.STRING,
      description: 'Duração do contrato (ex: Anual, Mensal, Ano e Seguintes).',
    },
    billingFrequency: {
      type: Type.STRING,
      description: 'Fraccionamento (Anual, Semestral, Trimestral, Mensal ou Único).',
    },
    globalLimitAKZ: {
      type: Type.NUMBER,
      description: 'Limite máximo global anual ou massa salarial total em AKZ (número puro sem símbolos).',
    },
    totalAnnualPremiumAKZ: {
      type: Type.NUMBER,
      description:
        'Prémio total da apólice em AKZ (número puro, incluindo encargos/IVA se presentes).',
    },
    workAccidentReferenceMonth: {
      type: Type.STRING,
      description: 'Mês de referência da relação de Acidentes de Trabalho (ex: Setembro 2026), se aplicável.',
    },
    payrollOnshoreAKZ: {
      type: Type.NUMBER,
      description: 'Massa salarial total Onshore em AKZ (se aplicável).',
    },
    payrollOffshoreAKZ: {
      type: Type.NUMBER,
      description: 'Massa salarial total Offshore em AKZ (se aplicável).',
    },
    onshoreCount: {
      type: Type.NUMBER,
      description: 'Número de colaboradores Onshore (se aplicável).',
    },
    offshoreCount: {
      type: Type.NUMBER,
      description: 'Número de colaboradores Offshore (se aplicável).',
    },
    holderName: {
      type: Type.STRING,
      description: 'Nome completo do Tomador do Seguro / empresa segurada.',
    },
    holderNif: {
      type: Type.STRING,
      description: 'NIF do Tomador do Seguro.',
    },
    holderAddress: {
      type: Type.STRING,
      description: 'Morada do Tomador do Seguro.',
    },
    holderPhone: {
      type: Type.STRING,
      description: 'Telefone do Tomador do Seguro.',
    },
    holderEmail: {
      type: Type.STRING,
      description: 'Email do Tomador do Seguro.',
    },
    members: {
      type: Type.ARRAY,
      description: 'Lista nominal de aderentes / trabalhadores identificados no documento.',
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: 'Nome completo do aderente ou trabalhador.' },
          birthDate: {
            type: Type.STRING,
            description: 'Data de nascimento em YYYY-MM-DD ou vazio.',
          },
          gender: {
            type: Type.STRING,
            description: 'Masculino, Feminino ou Não indicado.',
          },
          healthCode: {
            type: Type.STRING,
            description: 'Código de saúde ou número de cartão do aderente.',
          },
          entryDate: {
            type: Type.STRING,
            description: 'Data de entrada / inclusão em YYYY-MM-DD ou vazio.',
          },
          annualPremium: {
            type: Type.NUMBER,
            description: 'Prémio anual individual do aderente em AKZ.',
          },
          waitingPeriod: {
            type: Type.STRING,
            description: 'Sim ou Não para período de carência.',
          },
          workMode: {
            type: Type.STRING,
            description: 'Regime de trabalho para Acidentes de Trabalho: Onshore ou Offshore.',
          },
          role: {
            type: Type.STRING,
            description: 'Função ou cargo profissional (ex: Tubista, Electricista, Soldador).',
          },
          baseSalaryAKZ: {
            type: Type.NUMBER,
            description: 'Salário base mensal em AKZ para Acidentes de Trabalho.',
          },
          medicalCertificateExpiry: {
            type: Type.STRING,
            description: 'Data de validade do atestado médico ocupacional em YYYY-MM-DD, se constar.',
          },
        },
        required: ['name'],
      },
    },
    coverages: {
      type: Type.ARRAY,
      description: 'Tabela de coberturas, capitais e copagamentos extraídos.',
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING, description: 'Categoria da cobertura.' },
          item: { type: Type.STRING, description: 'Nome da cobertura ou benefício.' },
          limitText: { type: Type.STRING, description: 'Texto do capital / limite.' },
          numericLimit: {
            type: Type.NUMBER,
            description: 'Valor numérico do limite em AKZ se aplicável.',
          },
          copayInNetwork: { type: Type.STRING, description: 'Copagamento dentro da rede.' },
          copayOutOfNetwork: { type: Type.STRING, description: 'Copagamento fora da rede.' },
          notes: { type: Type.STRING, description: 'Observações breves.' },
        },
        required: ['item', 'limitText'],
      },
    },
    summaryNote: {
      type: Type.STRING,
      description: 'Resumo curto em português do que foi extraído do documento.',
    },
  },
};

function resolveImageMime(ext: string, providedMime: string): string {
  const mime = (providedMime || '').toLowerCase();
  if (mime.startsWith('image/')) return mime;
  switch (ext) {
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    default:
      return 'image/jpeg';
  }
}

async function extractExcelText(buffer: Buffer): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const parts: string[] = [];

  workbook.eachSheet((sheet) => {
    parts.push(`=== Folha: ${sheet.name} ===`);
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const values = Array.isArray(row.values) ? row.values.slice(1) : [];
      const line = values
        .map((cell) => {
          if (cell === null || cell === undefined) return '';
          if (typeof cell === 'object' && 'result' in cell) {
            return String((cell as { result?: unknown }).result ?? '');
          }
          if (typeof cell === 'object' && 'text' in cell) {
            return String((cell as { text?: unknown }).text ?? '');
          }
          return String(cell);
        })
        .map((s) => s.replace(/\s+/g, ' ').trim())
        .join(' | ');
      if (line.replace(/\|/g, '').trim().length > 0) {
        parts.push(line);
      }
    });
  });

  return parts.join('\n');
}

async function extractTextForOfficeOrTextFile(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  const ext = getFileExtension(fileName);
  const mime = (mimeType || '').toLowerCase();

  if (ext === '.docx' || mime.includes('wordprocessingml')) {
    const htmlResult = await mammoth.convertToHtml({ buffer });
    const structured = htmlTablesToStructuredText(htmlResult.value);
    if (structured.trim().length > 0) return structured;
    const rawResult = await mammoth.extractRawText({ buffer });
    return rawResult.value;
  }

  if (ext === '.doc') {
    // Check if an uploaded .doc is actually OOXML (.docx zip signature PK)
    if (buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4b) {
      const htmlResult = await mammoth.convertToHtml({ buffer });
      return htmlTablesToStructuredText(htmlResult.value);
    }
    const asText = buffer.toString('utf8');
    if (asText.includes('{\\rtf')) {
      return asText.replace(/\\[a-z]+\d*\s?/gi, ' ').replace(/[{}]/g, ' ');
    }
    throw new Error(
      'O formato binário antigo (.doc) não é suportado diretamente. Guarde o documento Word como .docx ou PDF e tente novamente.'
    );
  }

  if (ext === '.xlsx' || ext === '.xls' || mime.includes('spreadsheetml')) {
    if (ext === '.xls' && !(buffer[0] === 0x50 && buffer[1] === 0x4b)) {
      throw new Error(
        'O formato binário antigo (.xls) não é suportado diretamente. Guarde como .xlsx, .csv ou PDF.'
      );
    }
    return extractExcelText(buffer);
  }

  return buffer.toString('utf8');
}

function isRetryableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /429|500|502|503|504|RESOURCE_EXHAUSTED|UNAVAILABLE|fetch failed/i.test(msg);
}

async function generateWithRetry(
  ai: GoogleGenAI,
  params: Parameters<GoogleGenAI['models']['generateContent']>[0]
) {
  const delays = [1000, 2200];
  let lastError: unknown;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (err) {
      lastError = err;
      if (attempt < delays.length && isRetryableError(err)) {
        await new Promise((r) => setTimeout(r, delays[attempt]));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

function mapGeminiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (/PERMISSION_DENIED|API_KEY_INVALID|403|401/i.test(raw)) {
    return {
      status: 403,
      message:
        'Chave da API Gemini inválida ou sem permissão. Verifique Settings > Secrets no painel.',
    };
  }
  if (/RESOURCE_EXHAUSTED|429/i.test(raw)) {
    return {
      status: 429,
      message:
        'Limite de pedidos da API Gemini excedido temporariamente. Tente novamente dentro de instantes.',
    };
  }
  if (/UNAVAILABLE|503|high demand|overloaded/i.test(raw)) {
    return {
      status: 503,
      message:
        'O serviço de leitura documental está temporariamente sobrecarregado. Aguarde alguns segundos e tente novamente.',
    };
  }
  if (/NOT_FOUND|404/i.test(raw)) {
    return {
      status: 502,
      message: 'Modelo Gemini indisponível ou não encontrado.',
    };
  }
  return {
    status: 500,
    message: 'Não foi possível interpretar o documento neste momento. Tente novamente.',
  };
}

interface ParseRequestBody {
  fileName?: unknown;
  mimeType?: unknown;
  base64Data?: unknown;
  existingPolicyContext?: unknown;
}

async function startServer() {
  const app = express();

  // Mount JSON parser strictly under /api so Vite middleware stays untouched
  app.use('/api', express.json({ limit: '25mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/parse-policy-document', async (req, res) => {
    try {
      const body = (req.body ?? {}) as ParseRequestBody;
      const fileName = typeof body.fileName === 'string' ? body.fileName.trim() : '';
      const mimeType = typeof body.mimeType === 'string' ? body.mimeType.trim() : '';
      const rawBase64 = typeof body.base64Data === 'string' ? body.base64Data.trim() : '';
      const existingContext =
        typeof body.existingPolicyContext === 'string'
          ? body.existingPolicyContext.slice(0, 4000)
          : '';

      if (!fileName || !rawBase64) {
        return res.status(400).json({
          error: 'Envie um ficheiro válido (nome e conteúdo em base64 são obrigatórios).',
        });
      }

      if (!isSupportedPolicyFile(fileName, mimeType)) {
        return res.status(400).json({
          error:
            'Formato não suportado. Utilize PDF, Word (.docx), Imagem (PNG, JPG, WEBP), Excel (.xlsx) ou CSV/TXT.',
        });
      }

      const cleanBase64 = rawBase64.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');

      if (buffer.length === 0) {
        return res.status(400).json({ error: 'O ficheiro enviado está vazio.' });
      }
      if (buffer.length > MAX_UPLOAD_BYTES) {
        return res.status(413).json({
          error: 'O ficheiro excede o limite máximo permitido de 15 MB.',
        });
      }

      const ai = getGeminiClient();
      if (!ai) {
        return res.status(503).json({
          error:
            'A chave GEMINI_API_KEY não está configurada no servidor. Configure-a em Settings > Secrets.',
        });
      }

      const ext = getFileExtension(fileName);
      const isPdf = ext === '.pdf' || mimeType.toLowerCase() === 'application/pdf';
      const isImage =
        ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext) ||
        mimeType.toLowerCase().startsWith('image/');

      const contextInstruction = existingContext
        ? `\nContexto da carteira/apólice actual (use apenas se o documento for um aditamento, aviso de cobrança ou atualização parcial): ${existingContext}`
        : '';

      const promptText = [
        'Analise este documento de seguro de saúde (Condições Particulares, Acta, Aviso de Cobrança, Listagem de Aderentes, documento Word, imagem digitalizada ou folha Excel).',
        'Extraia todos os dados estruturados da apólice com máxima precisão em Português (Angola / Kwanza AKZ).',
        'Regras obrigatórias:',
        '1) Converta valores monetários angolanos (ex: 7.499.545,85 AKZ) para número decimal padrão (7499545.85).',
        '2) Converta datas para YYYY-MM-DD (ex: 15-07-2026 -> 2026-07-15).',
        '3) Se houver uma tabela/lista de pessoas seguras ou aderentes, extraia TODOS os aderentes com o respetivo nome e prémio anual individual.',
        '4) Se houver tabela de coberturas/benefícios, extraia até 15 principais itens/categorias de cobertura com capitais e copagamentos.',
        '5) Para campos ausentes no documento, devolva string vazia "" ou omita números.',
        `Nome do ficheiro: ${fileName}${contextInstruction}`,
      ].join('\n');

      const parts: Array<
        | { text: string }
        | { inlineData: { mimeType: string; data: string } }
      > = [];

      if (isPdf) {
        parts.push({
          inlineData: {
            mimeType: 'application/pdf',
            data: cleanBase64,
          },
        });
        parts.push({ text: promptText });
      } else if (isImage) {
        parts.push({
          inlineData: {
            mimeType: resolveImageMime(ext, mimeType),
            data: cleanBase64,
          },
        });
        parts.push({ text: promptText });
      } else {
        let extractedDocText = '';
        try {
          extractedDocText = await extractTextForOfficeOrTextFile(
            buffer,
            fileName,
            mimeType
          );
        } catch (parseErr) {
          const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
          return res.status(400).json({ error: msg });
        }

        if (!extractedDocText.trim()) {
          return res.status(400).json({
            error:
              'Não foi possível extrair texto legível deste documento. Se for uma digitalização em imagem, envie como PDF ou PNG/JPG.',
          });
        }

        parts.push({
          text: `${promptText}\n\n--- CONTEÚDO DO DOCUMENTO (${fileName}) ---\n${extractedDocText.slice(0, 120000)}`,
        });
      }

      const response = await generateWithRetry(ai, {
        model: 'gemini-4-hydrogen',
        contents: { parts },
        config: {
          systemInstruction:
            'És um especialista em processamento documental de apólices de seguros em Angola. Devolve apenas JSON válido conforme o esquema definido.',
          responseMimeType: 'application/json',
          responseSchema: POLICY_EXTRACTION_SCHEMA,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const rawJson = (response.text ?? '').trim();
      if (!rawJson) {
        return res.status(502).json({
          error: 'O modelo não devolveu dados estruturados para este documento.',
        });
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawJson);
      } catch {
        return res.status(502).json({
          error: 'A resposta estruturada do documento veio num formato inválido.',
        });
      }

      return res.json({
        extracted: parsed,
        fileName,
      });
    } catch (err) {
      const mapped = mapGeminiError(err);
      return res.status(mapped.status).json({ error: mapped.message });
    }
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Espacie Policy Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
