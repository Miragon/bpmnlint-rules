/**
 * One bpmnlint resolver over every rule and config this package bundles: the structural base
 * (`common`), both Camunda engine layers (`camunda-7`, `camunda-8`) and the Miragon rules.
 *
 * This is the single import that replaces the modeler's three hand-maintained resolver files. A
 * host wires it into a `bpmnlint` `Linter` — on its own for a zero-config default, or behind the
 * workspace's `NodeResolver` (so a project's own `.bpmnlintrc` still wins) via bpmnlint's
 * resolver-chaining. Everything resolves from bundled modules, so no `bpmnlint` install is needed
 * and it works offline.
 */
import StaticResolver from 'bpmnlint/lib/resolver/static-resolver';

import type { ResolverEntries } from '../lib/bpmnlint-config';
import type { Resolver } from './Resolver';

import { resolverEntries as commonEntries } from '../rules/common';
import { resolverEntries as camunda7Entries } from '../rules/camunda-7';
import { resolverEntries as camunda8Entries } from '../rules/camunda-8';
import { resolverEntries as miragonEntries } from '../rules/miragon';

/** The merged StaticResolver cache — exported so a consumer can compose or inspect it. */
export const bundledResolverEntries: ResolverEntries = {
  ...commonEntries,
  ...camunda7Entries,
  ...camunda8Entries,
  ...miragonEntries,
};

/** A fresh bpmnlint resolver backed by {@link bundledResolverEntries}. */
export function createBundledResolver(): Resolver {
  return new StaticResolver(bundledResolverEntries) as Resolver;
}
