export function expiryToISO(dateStr: string | null, timeStr: string | null): string | null {
  if (!dateStr || !timeStr) return null;
  const t = timeStr.split(':').length === 2 ? timeStr + ':00' : timeStr;
  const iso = `${dateStr}T${t}Z`;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}
