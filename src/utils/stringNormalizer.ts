export function normalizeString(str: string): string {
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function createUniqueKey(seller: string, price: number, title: string): string {
  const normalizedData = `${normalizeString(seller)}-${price}-${normalizeString(title)}`;
  return Buffer.from(normalizedData).toString('base64');
}