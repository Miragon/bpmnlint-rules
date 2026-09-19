const diagramUrls = import.meta.glob<string>('../../rules/assets/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
});

export function diagramUrl(ruleName: string, kind: 'valid' | 'invalid'): string {
  return diagramUrls[`../../rules/assets/${ruleName}-${kind}.svg`] ?? '';
}
