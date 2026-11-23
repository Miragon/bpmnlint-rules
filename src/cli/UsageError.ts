/**
 * A mistake in how the CLI was called or configured (bad flag, unreadable config, unknown rule).
 * The CLI reports it and exits with code 2, distinct from 1 for "the models have errors".
 */
export class UsageError extends Error {
  override readonly name = 'UsageError';
}
