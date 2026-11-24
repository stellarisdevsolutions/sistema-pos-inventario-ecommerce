export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  let text = String(value).replace(/[\r\n]+/g, " ");
  if (/^[ \f\v\u00a0]*[=+\-@\t]/.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replaceAll('"', '""')}"`;
}
