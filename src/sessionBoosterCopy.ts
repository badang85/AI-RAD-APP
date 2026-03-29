/**
 * Booster copy derived from the live session (targets + intentions), not generic RNG templates.
 */

const STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'from', 'with', 'this', 'that', 'are', 'was', 'were', 'been', 'have', 'has', 'had', 'not', 'but', 'what', 'when', 'who', 'how', 'all', 'can', 'will', 'just', 'into', 'than', 'then', 'too', 'very',
  'de', 'la', 'el', 'en', 'y', 'o', 'un', 'una', 'uno', 'que', 'con', 'por', 'para', 'sin', 'sobre', 'entre', 'hacia', 'desde', 'mi', 'tu', 'su', 'sus', 'los', 'las', 'del', 'al', 'se', 'es', 'son', 'no', 'lo', 'le', 'les', 'como', 'más', 'mas', 'muy', 'todo', 'toda', 'hay', 'ya', 'algo', 'ser', 'fue', 'sido', 'tan', 'cada', 'mis', 'tus', 'nos', 'les'
]);

/** FNV-1a hash of session text — ties sigil / booster to current intentions */
export function hashSessionText(witnesses: { text: string }[], trends: { text: string }[]): number {
  const s = [...witnesses.map(w => w.text), ...trends.map(t => t.text)].join('\n');
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function tokenize(text: string): string[] {
  const n = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  return n
    .split(/[^a-záéíóúñü0-9]+/u)
    .filter(w => w.length > 2 && !STOP.has(w));
}

export function sanitizeSnippet(s: string, max: number): string {
  const t = s.replace(/\s+/g, ' ').trim();
  if (!t) return '';
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const clean = lastSpace > max >> 1 ? cut.slice(0, lastSpace) : cut;
  return clean + '…';
}

function pickPrimary(texts: string[]): string {
  const t = texts.map(s => s.trim()).filter(Boolean);
  if (t.length === 0) return '';
  return t.reduce((a, b) => (b.length > a.length ? b : a), t[0]);
}

/**
 * Builds booster title / witness / trend lines from session fields.
 * Prioritizes intention (trends) for the “boost” line; targets anchor the witness line.
 */
export function buildBoosterLabels(
  witnesses: { text: string }[],
  trends: { text: string }[],
  seed: number
): { title: string; witness: string; trend: string } {
  const wTexts = witnesses.map(w => w.text.trim()).filter(Boolean);
  const tTexts = trends.map(t => t.text.trim()).filter(Boolean);

  const primaryWitness = pickPrimary(wTexts);
  const primaryTrend = pickPrimary(tTexts);

  const intentionTokens = tokenize(tTexts.join(' '));
  const targetTokens = tokenize(wTexts.join(' '));

  const prefixes = [
    'Nóodo',
    'Puente σ',
    'Canal Ω',
    'Matriz',
    'Relay ψ',
    'Línea λ',
    'Ancla',
    'Vector',
    'Bucle χ'
  ];
  const pre = prefixes[seed % prefixes.length];

  if (!primaryWitness && !primaryTrend) {
    return {
      title: `${pre} · campo vacío`,
      witness: 'Objetivo · escribe un target en el panel',
      trend: 'Intención · describe qué quieres amplificar'
    };
  }

  let title: string;
  if (intentionTokens.length >= 2) {
    title = `${pre} · ${intentionTokens[0]} ${intentionTokens[1]}`;
  } else if (intentionTokens.length === 1) {
    title = `${pre} · ${intentionTokens[0]}`;
  } else if (primaryTrend) {
    const words = primaryTrend.split(/\s+/).slice(0, 3).join(' ');
    title = `${pre} · ${sanitizeSnippet(words, 32)}`;
  } else if (targetTokens.length) {
    title = `${pre} · ${targetTokens[0]}${targetTokens[1] ? ` ${targetTokens[1]}` : ''}`;
  } else {
    title = `${pre} · ${sanitizeSnippet(primaryWitness, 28)}`;
  }
  title = title.slice(0, 46);

  const witness = primaryWitness
    ? sanitizeSnippet(primaryWitness, 80)
    : primaryTrend
      ? 'Sin target escrito — booster sigue tu intención'
      : '—';

  const trend = primaryTrend
    ? sanitizeSnippet(primaryTrend, 84)
    : primaryWitness
      ? `Refuerzo alineado a: ${sanitizeSnippet(primaryWitness, 72)}`
      : '—';

  return {
    title: title.trim(),
    witness,
    trend: trend.trim()
  };
}
