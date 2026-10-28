/** The candidate within a small edit distance of `name` (a quarter of its length), if any. */
export function closestName(name: string, candidates: string[]): string | undefined {
  const limit = Math.max(1, Math.floor(name.length / 4));
  let best: { candidate: string; distance: number } | undefined;
  for (const candidate of candidates) {
    const distance = editDistance(name.toLowerCase(), candidate.toLowerCase());
    if (distance <= limit && (!best || distance < best.distance)) {
      best = { candidate, distance };
    }
  }
  return best?.candidate;
}

function editDistance(source: string, target: string): number {
  const row = Array.from({ length: target.length + 1 }, (_entry, targetIndex) => targetIndex);
  for (let sourceIndex = 1; sourceIndex <= source.length; sourceIndex++) {
    let diagonal = row[0] ?? 0;
    row[0] = sourceIndex;
    for (let targetIndex = 1; targetIndex <= target.length; targetIndex++) {
      const above = row[targetIndex] ?? 0;
      const substitution = diagonal + (source[sourceIndex - 1] === target[targetIndex - 1] ? 0 : 1);
      row[targetIndex] = Math.min(above + 1, (row[targetIndex - 1] ?? 0) + 1, substitution);
      diagonal = above;
    }
  }
  return row[target.length] ?? 0;
}
