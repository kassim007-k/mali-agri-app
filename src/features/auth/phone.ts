export function normalizePhoneNumber(input: string): string | null {
  const compact = input.trim().replace(/[\s()-]/g, '');
  if (!/^\+?\d+$/.test(compact)) return null;
  if (compact.startsWith('+')) {
    return /^\+[1-9]\d{7,14}$/.test(compact) ? compact : null;
  }
  if (compact.startsWith('00')) {
    const international = `+${compact.slice(2)}`;
    return /^\+[1-9]\d{7,14}$/.test(international) ? international : null;
  }

  const digits = compact.replace(/\D/g, '');
  if (/^\d{8}$/.test(digits)) return `+223${digits}`;
  if (/^223\d{8}$/.test(digits)) return `+${digits}`;
  return null;
}
