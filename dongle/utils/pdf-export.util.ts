/**
 * Export form submission data as a professionally formatted, print-ready PDF.
 *
 * Uses an HTML print document (browser Save as PDF) so logos/images render
 * correctly, page breaks are controlled via CSS, and output prints cleanly.
 */

import { CATEGORY_FORM_MAP } from "@/types/project";
import { FIELD_LABELS } from "@/utils/form-requirements.util";

export interface FormSubmissionExportData {
  name: string;
  primaryCategory: string;
  tags?: string[];
  description: string;
  websiteUrl: string;
  githubUrl?: string;
  logoUrl?: string;
  docsUrl?: string;
  auditReportUrl?: string;
  bugBountyUrl?: string;
  contractAddresses?: string[];
  submittedAt?: string;
  mode?: "create" | "edit";
  projectId?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function row(label: string, value: string | undefined, opts?: { multiline?: boolean }) {
  const display = value?.trim() ? escapeHtml(value.trim()) : "—";
  const valueClass = opts?.multiline ? "value multiline" : "value";
  return `
    <tr>
      <th>${escapeHtml(label)}</th>
      <td class="${valueClass}">${opts?.multiline ? display.replace(/\n/g, "<br/>") : display}</td>
    </tr>`;
}

function buildPrintHtml(data: FormSubmissionExportData): string {
  const categoryLabel =
    CATEGORY_FORM_MAP[data.primaryCategory] ?? data.primaryCategory ?? "—";
  const exportedAt = data.submittedAt ?? new Date().toISOString();
  const contracts = (data.contractAddresses ?? []).filter((c) => c.trim().length > 0);
  const tags = (data.tags ?? []).filter(Boolean);

  const logoBlock = data.logoUrl?.trim()
    ? `<div class="logo-wrap page-break-avoid">
         <img src="${escapeHtml(data.logoUrl.trim())}" alt="Project logo" class="logo" crossorigin="anonymous" />
         <p class="logo-caption">Project logo</p>
       </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Form Submission — ${escapeHtml(data.name || "Untitled")}</title>
  <style>
    @page { size: A4; margin: 18mm 16mm; }
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
      color: #18181b;
      line-height: 1.5;
      margin: 0;
      padding: 24px;
      background: #fff;
    }
    .sheet { max-width: 800px; margin: 0 auto; }
    header {
      border-bottom: 3px solid #2563eb;
      padding-bottom: 16px;
      margin-bottom: 24px;
      page-break-after: avoid;
    }
    .brand {
      font-size: 12px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #2563eb;
      font-weight: 700;
      margin: 0 0 8px;
    }
    h1 {
      font-size: 26px;
      margin: 0 0 6px;
      font-weight: 700;
    }
    .meta {
      font-size: 12px;
      color: #71717a;
      margin: 0;
    }
    h2 {
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #52525b;
      margin: 28px 0 12px;
      page-break-after: avoid;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      page-break-inside: auto;
    }
    tr { page-break-inside: avoid; page-break-after: auto; }
    th, td {
      text-align: left;
      vertical-align: top;
      padding: 10px 12px;
      border-bottom: 1px solid #e4e4e7;
      font-size: 13px;
    }
    th {
      width: 32%;
      color: #52525b;
      font-weight: 600;
      background: #fafafa;
    }
    td.value { color: #18181b; word-break: break-word; }
    td.multiline { white-space: pre-wrap; }
    .logo-wrap {
      margin: 16px 0 8px;
      text-align: center;
    }
    .logo {
      max-width: 160px;
      max-height: 160px;
      object-fit: contain;
      border: 1px solid #e4e4e7;
      border-radius: 12px;
      padding: 8px;
      background: #fafafa;
    }
    .logo-caption {
      font-size: 11px;
      color: #71717a;
      margin: 6px 0 0;
    }
    .tags { margin: 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 6px; }
    .tag {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 999px;
      background: #eff6ff;
      color: #1d4ed8;
      font-size: 12px;
      font-weight: 600;
    }
    .contracts code {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11px;
      word-break: break-all;
    }
    footer {
      margin-top: 36px;
      padding-top: 12px;
      border-top: 1px solid #e4e4e7;
      font-size: 11px;
      color: #a1a1aa;
      page-break-inside: avoid;
    }
    .actions {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
    }
    .actions button {
      font: inherit;
      font-size: 13px;
      font-weight: 600;
      padding: 8px 14px;
      border-radius: 8px;
      border: 1px solid #d4d4d8;
      background: #2563eb;
      color: #fff;
      cursor: pointer;
    }
    .actions button.secondary {
      background: #fff;
      color: #18181b;
    }
    .page-break-avoid { page-break-inside: avoid; }
    .page-break-before { page-break-before: always; }
    @media print {
      body { padding: 0; }
      .actions { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="actions">
      <button type="button" onclick="window.print()">Print / Save as PDF</button>
      <button type="button" class="secondary" onclick="window.close()">Close</button>
    </div>
    <header>
      <p class="brand">Dongle · Form Submission Export</p>
      <h1>${escapeHtml(data.name || "Untitled Project")}</h1>
      <p class="meta">
        Exported ${escapeHtml(exportedAt)}
        ${data.mode ? ` · Mode: ${escapeHtml(data.mode)}` : ""}
        ${data.projectId ? ` · Project ID: ${escapeHtml(data.projectId)}` : ""}
      </p>
    </header>

    ${logoBlock}

    <section class="page-break-avoid">
      <h2>Project details</h2>
      <table>
        ${row(FIELD_LABELS.primaryCategory, String(categoryLabel))}
        ${row(FIELD_LABELS.websiteUrl, data.websiteUrl)}
        ${row(FIELD_LABELS.description, data.description, { multiline: true })}
      </table>
    </section>

    <section class="page-break-avoid">
      <h2>Links &amp; media</h2>
      <table>
        ${row(FIELD_LABELS.githubUrl, data.githubUrl)}
        ${row(FIELD_LABELS.logoUrl, data.logoUrl)}
        ${row(FIELD_LABELS.docsUrl, data.docsUrl)}
        ${row(FIELD_LABELS.auditReportUrl, data.auditReportUrl)}
        ${row(FIELD_LABELS.bugBountyUrl, data.bugBountyUrl)}
      </table>
    </section>

    <section class="page-break-before">
      <h2>Tags</h2>
      ${
        tags.length
          ? `<ul class="tags">${tags.map((t) => `<li class="tag">${escapeHtml(t)}</li>`).join("")}</ul>`
          : `<p class="meta">No tags</p>`
      }
    </section>

    <section class="page-break-avoid">
      <h2>Contract addresses</h2>
      ${
        contracts.length
          ? `<table class="contracts">${contracts
              .map((c, i) => row(`Contract ${i + 1}`, c))
              .join("")}</table>`
          : `<p class="meta">None provided</p>`
      }
    </section>

    <footer>
      Generated by Dongle · Page breaks are optimized for A4 printing · Use your browser’s “Save as PDF” for a permanent copy.
    </footer>
  </div>
  <script>
    window.addEventListener("load", function () {
      // Give images a moment to load before optional auto-print is triggered by callers.
      window.__donglePdfReady = true;
    });
  </script>
</body>
</html>`;
}

/**
 * Opens a print-ready export window. Users can Print or Save as PDF.
 * Images (logo) are included when the URL is reachable.
 */
export function exportFormSubmissionToPdf(
  data: FormSubmissionExportData,
  options?: { autoPrint?: boolean },
): void {
  if (typeof window === "undefined") return;

  const html = buildPrintHtml(data);
  const win = window.open("", "_blank", "noopener,noreferrer,width=900,height=1000");
  if (!win) {
    // Popup blocked — fall back to downloading the HTML print document.
    downloadPrintableHtml(data);
    return;
  }

  win.document.open();
  win.document.write(html);
  win.document.close();

  if (options?.autoPrint) {
    const tryPrint = () => {
      try {
        win.focus();
        win.print();
      } catch {
        // ignore
      }
    };
    // Wait briefly for images
    setTimeout(tryPrint, 500);
  }
}

/** Download a printable HTML document (fallback when popups are blocked). */
export function downloadPrintableHtml(data: FormSubmissionExportData): void {
  if (typeof window === "undefined") return;
  const html = buildPrintHtml(data);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safeName = (data.name || "form-submission")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  link.href = url;
  link.download = `${safeName || "form-submission"}-export.html`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Convenience alias matching the download helpers used elsewhere in the app.
 * Opens the print/PDF export UI for the given submission payload.
 */
export function downloadFormSubmissionPdf(
  data: FormSubmissionExportData,
  options?: { autoPrint?: boolean },
): void {
  exportFormSubmissionToPdf(data, { autoPrint: options?.autoPrint ?? true });
}
