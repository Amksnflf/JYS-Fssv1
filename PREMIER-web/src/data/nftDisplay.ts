import type { NftCollection, NftItem } from '@/api/nft';

export function mergeCollections(rows: NftCollection[]) {
  return rows;
}

export function mergeItems(rows: NftItem[]) {
  return rows;
}

export function collectionTheme(name?: string) {
  const n = (name ?? '').toLowerCase();
  if (n.includes('mgland')) return 'bg-[#3038b8]';
  if (n.includes('other') || n.includes('sanctum')) return 'bg-[#111111]';
  if (n.includes('sandbox')) return 'bg-[#087a9f]';
  if (n.includes('wolf')) return 'bg-[#666666]';
  if (n.includes('bitcoin') || n.includes('wrapped')) return 'bg-[#b05b06]';
  if (n.includes('cube')) return 'bg-[#202020]';
  if (n.includes('god')) return 'bg-[#72bce8]';
  if (n.includes('pudgy')) return 'bg-[#d5e4df]';
  if (n.includes('delta')) return 'bg-[#050505]';
  if (n.includes('heroes')) return 'bg-[#4ea861]';
  if (n.includes('aiorbit')) return 'bg-[#111111]';
  return 'bg-[#c94f3f]';
}

export function formatCompactCount(value?: number) {
  if (!value) return '0';
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return String(value);
}

export function makeCollectionItems(collection: NftCollection | undefined, rows: NftItem[]) {
  const merged = mergeItems(rows).filter((item) => !collection || item.collectionId === collection.id);
  return merged;
}

export function parseTraits(attributesJson?: string) {
  if (!attributesJson) return [];
  try {
    const rows = JSON.parse(attributesJson) as Array<{ type?: string; value?: string; percent?: string }>;
    return rows.filter((item) => item.type && item.value);
  } catch {
    return [];
  }
}
