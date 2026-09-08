// ===========================================
// TRAMI ESPAÑA - Exportar trámite a PDF (expo-print)
// ===========================================
// Genera un PDF con el resumen del trámite (requisitos, documentación,
// pasos y enlaces oficiales) usando expo-print y lo comparte/guarda con
// expo-sharing. Ambos módulos se cargan de forma diferida.

import { Linking, Platform } from 'react-native';

type PrintModule = typeof import('expo-print');
type SharingModule = typeof import('expo-sharing');

let Print: PrintModule | null = null;
let Sharing: SharingModule | null = null;
try {
  // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
  Print = require('expo-print') as PrintModule;
} catch { /* no disponible */ }
try {
  // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
  Sharing = require('expo-sharing') as SharingModule;
} catch { /* no disponible */ }

export interface ProcedurePdfSectionItem {
  title: string;
  description?: string | null;
  isRequired?: boolean;
}

export interface ProcedurePdfInput {
  title: string;
  scope?: string | null;
  community?: string | null;
  cost?: string | null;
  duration?: string | null;
  source?: string | null;
  sourceUrl?: string | null;
  description?: string | null;
  requirements?: ProcedurePdfSectionItem[];
  documents?: ProcedurePdfSectionItem[];
  steps?: ProcedurePdfSectionItem[];
  links?: Array<{ title: string; url: string }>;
}

export type PdfExportResult = 'shared' | 'opened' | 'failed';

/** Escapa entidades HTML para el contenido dinámico. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderList(items: ProcedurePdfSectionItem[] | undefined): string {
  if (!items || items.length === 0) {
    return '<p class="empty">No hay información disponible.</p>';
  }
  return items
    .map(
      (item) => `
        <li>
          <strong>${escapeHtml(item.title)}</strong>${
            item.isRequired ? ' <span class="req">Obligatorio</span>' : ''
          }
          ${item.description ? `<div class="desc">${escapeHtml(item.description)}</div>` : ''}
        </li>`
    )
    .join('');
}

function renderLinks(links: Array<{ title: string; url: string }> | undefined): string {
  if (!links || links.length === 0) {
    return '<p class="empty">Sin enlaces oficiales.</p>';
  }
  return links
    .map(
      (link) =>
        `<li><strong>${escapeHtml(link.title)}</strong><div class="desc">${escapeHtml(
          link.url
        )}</div></li>`
    )
    .join('');
}

function buildProcedureHtml(input: ProcedurePdfInput): string {
  const generatedAt = new Date().toLocaleString('es-ES');
  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, sans-serif; color: #0f172a; padding: 28px; }
        h1 { font-size: 22px; margin: 0 0 4px; color: #1e40af; }
        .meta { font-size: 11px; color: #64748b; margin-bottom: 18px; }
        .badge { display: inline-block; background: #eff6ff; color: #1e40af; border-radius: 6px; padding: 3px 10px; font-size: 11px; font-weight: 700; margin-right: 6px; }
        h2 { font-size: 15px; text-transform: uppercase; letter-spacing: 1px; color: #2563eb; border-bottom: 2px solid #eff6ff; padding-bottom: 6px; margin-top: 26px; }
        ul { padding-left: 18px; }
        li { margin-bottom: 10px; font-size: 13px; line-height: 1.45; }
        .desc { color: #475569; margin-top: 2px; }
        .req { background: #fef2f2; color: #b91c1c; font-size: 10px; padding: 1px 6px; border-radius: 4px; font-weight: 700; }
        .empty { color: #94a3b8; font-size: 12px; font-style: italic; }
        .footer { margin-top: 34px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
        p.summary { font-size: 13px; color: #334155; line-height: 1.55; }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(input.title)}</h1>
      <div class="meta">Generado por Trami España el ${escapeHtml(generatedAt)}</div>
      <div>
        ${input.scope ? `<span class="badge">${escapeHtml(input.scope)}</span>` : ''}
        ${input.community ? `<span class="badge">${escapeHtml(input.community)}</span>` : ''}
        ${input.cost ? `<span class="badge">Coste: ${escapeHtml(input.cost)}</span>` : ''}
        ${input.duration ? `<span class="badge">Duración: ${escapeHtml(input.duration)}</span>` : ''}
      </div>
      ${input.description ? `<p class="summary">${escapeHtml(input.description)}</p>` : ''}
      <h2>Requisitos</h2>
      <ul>${renderList(input.requirements)}</ul>
      <h2>Documentación necesaria</h2>
      <ul>${renderList(input.documents)}</ul>
      <h2>Pasos a seguir</h2>
      <ul>${renderList(input.steps)}</ul>
      <h2>Enlaces oficiales</h2>
      <ul>${renderLinks(input.links)}</ul>
      <div class="footer">
        Trami España es un servicio independiente y no está afiliado a ninguna administración pública.
        ${input.sourceUrl ? `<br/>Fuente oficial: ${escapeHtml(input.sourceUrl)}` : ''}
      </div>
    </body>
  </html>`;
}

/**
 * Genera el PDF del trámite y lo abre con el menú de compartir del
 * sistema (Guardar en archivos, Enviar por correo, WhatsApp...).
 * En Android sin proveedor de share cae a abrir el archivo con Linking.
 * Nota: printToFileAsync (SDK 50) no acepta fileName; el nombre final lo
 * asigna el sistema al guardar desde el menú de compartir.
 */
export async function exportProcedureToPdf(input: ProcedurePdfInput): Promise<PdfExportResult> {
  if (!Print) return 'failed';
  try {
    const { uri } = await Print.printToFileAsync({
      html: buildProcedureHtml(input),
    });

    if (Sharing && (await Sharing.isAvailableAsync())) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Exportar trámite a PDF',
        UTI: 'com.adobe.pdf',
      });
      return 'shared';
    }

    await Linking.openURL(Platform.OS === 'android' ? `file://${uri}` : uri);
    return 'opened';
  } catch {
    return 'failed';
  }
}

