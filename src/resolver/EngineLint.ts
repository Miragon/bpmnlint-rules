import StaticResolver from 'bpmnlint/lib/resolver/static-resolver.js';

import type { BpmnlintConfig, ResolverEntries } from '../lib/bpmnlint-config';
import type { EngineLayer } from '../config/EngineLayer';
import type { Resolver } from './Resolver';

/**
 * Everything a host needs to lint for one engine, without the other engine's rules: a resolver
 * over camunda-compat's and Miragon's rules for it, and the config for an engine version.
 */
export class EngineLint {
  constructor(
    private readonly layer: EngineLayer,
    private readonly entries: ResolverEntries,
  ) {}

  /** A fresh bpmnlint resolver over this engine's rules and configs only. */
  createResolver(): Resolver {
    return new StaticResolver(this.entries) as Resolver;
  }

  /**
   * The engine layers for `version` (the latest when omitted): camunda-compat's config and
   * `plugin:@miragon/rules/camunda-<n>`, with the moddle extension their rules read.
   */
  lintConfig(version?: string): BpmnlintConfig {
    return this.layer.config(version);
  }
}
