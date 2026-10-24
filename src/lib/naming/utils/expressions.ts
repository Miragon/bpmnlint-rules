/**
 * Is this value an expression the engine resolves at runtime, FEEL (`=…`) or JUEL (`${…}`,
 * `#{…}`)? Such a value has no fixed name to check.
 */
export function isExpression(value: string): boolean {
  return value.startsWith('=') || value.includes('${') || value.includes('#{');
}
