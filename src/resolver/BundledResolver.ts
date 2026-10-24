/**
 * One bpmnlint resolver over every rule and config this package bundles: the structural base
 * (`common`), the latest Camunda 7 and 8 engine layers (`camunda-7`, `camunda-8`) and the Miragon
 * rules.
 *
 * This is the single import that replaces the modeler's three hand-maintained resolver files. A
 * host wires it into a `bpmnlint` `Linter` — on its own for a zero-config default, or behind the
 * workspace's `NodeResolver` (so a project's own `.bpmnlintrc` still wins) via bpmnlint's
 * resolver-chaining. Everything resolves from bundled modules, so no `bpmnlint` install is needed
 * and it works offline.
 */
import StaticResolver from 'bpmnlint/lib/resolver/static-resolver.js';

import type { ResolverEntries } from '../lib/bpmnlint-config';
import type { Resolver } from './Resolver';

import { resolverEntries as commonEntries } from '../rules/common';
import { resolverEntries as camunda7Entries } from '../rules/camunda-7';
import { resolverEntries as camunda8Entries } from '../rules/camunda-8';
import { resolverEntries as miragonEntries } from '../rules/miragon';

/**
 * The bpmnlint resolver over {@link BundledResolver.entries}.
 *
 * Of camunda-compat's configs it carries only the latest per engine: `camunda-platform-7-24` and
 * `camunda-cloud-8-10`. To lint against an older engine version in Node, chain bpmnlint's
 * `NodeResolver` behind it, so `plugin:camunda-compat/camunda-cloud-8-5` and the like resolve from
 * the installed `bpmnlint-plugin-camunda-compat`. The README's Camunda engine rules section shows
 * how.
 */
export class BundledResolver {
  /** The merged StaticResolver cache — exported so a consumer can compose or inspect it. */
  static readonly entries: ResolverEntries = {
    ...commonEntries,
    ...camunda7Entries,
    ...camunda8Entries,
    ...miragonEntries,
  };

  /** A fresh bpmnlint resolver backed by {@link BundledResolver.entries}. */
  static create(this: void): Resolver {
    return new StaticResolver(BundledResolver.entries) as Resolver;
  }
}
