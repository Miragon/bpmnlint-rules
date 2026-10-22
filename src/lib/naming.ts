/**
 * The public `naming` namespace: element-id conventions, value schemes for topics and message
 * names, and the cases both share. Each part lives in its own `naming-*` module; rules import the
 * part they use, consumers import this barrel.
 */
export * from './naming-cases';
export * from './naming-ids';
export * from './naming-values';
