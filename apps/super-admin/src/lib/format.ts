/** "PUBLISHED" -> "Published", "PARTIALLY_REFUNDED" -> "Partially refunded". */
export function statusLabel(status: string | null | undefined): string {
  if (!status) return "";
  const words = String(status).toLowerCase().replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
