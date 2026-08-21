export function buildCode(prefix, fiscalYear, sequence, width = 4) {
  return `${prefix}-${fiscalYear}-${String(sequence).padStart(width, '0')}`;
}
