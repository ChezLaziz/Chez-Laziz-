// Export CSV lisible par un comptable — pas un dump technique.
//
// Choix d'encodage, pour qu'Excel (le tableur utilisé en Tunisie) ouvre le
// fichier correctement du premier coup :
//   - BOM UTF-8 en tête, sinon Excel lit les accents et l'arabe en mojibake ;
//   - séparateur point-virgule, car la virgule est le séparateur décimal des
//     prix en dinars ("69,9") et couperait les colonnes ;
//   - montants écrits en dinars, pas en millimes.

export const CSV_SEPARATOR = ";";
const BOM = "﻿";

/** Échappe une cellule : guillemets doublés, et mise entre guillemets dès
 * qu'elle contient un séparateur, un guillemet ou un saut de ligne.
 * Une cellule commençant par = + - @ est préfixée d'une apostrophe :
 * sans cela, un tableur l'interprète comme une formule (injection CSV). */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (s.includes('"') || s.includes(CSV_SEPARATOR) || /[\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvCell).join(CSV_SEPARATOR)];
  for (const row of rows) lines.push(row.map(csvCell).join(CSV_SEPARATOR));
  // CRLF : attendu par Excel sous Windows.
  return BOM + lines.join("\r\n") + "\r\n";
}

export function csvResponse(filename: string, body: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
