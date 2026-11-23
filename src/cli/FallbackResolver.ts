import { createRequire } from 'node:module';
import path from 'node:path';

import NodeResolver from 'bpmnlint/lib/resolver/node-resolver.js';

import { BundledResolver } from '../resolver/BundledResolver';
import type { Resolver } from '../resolver/Resolver';

/**
 * Resolves each rule package from the working directory's `node_modules` when it is installed
 * there, and from the rules bundled with this package otherwise.
 *
 * The choice depends only on whether the package is installed, never on whether a lookup works:
 * a project that installed `@miragon/bpmnlint-plugin-rules` gets exactly its pinned version, and
 * a rule that version lacks is an error, not a silent switch to the bundled copy. A project with
 * nothing installed, like a bare CI runner, gets the bundled rules and configs.
 */
export class FallbackResolver implements Resolver {
  constructor(
    private readonly installed: Resolver,
    private readonly bundled: Resolver,
    private readonly isInstalled: (pkg: string) => boolean,
  ) {}

  /**
   * The resolver for a working directory: bpmnlint's `NodeResolver` scoped to it, falling back to
   * {@link BundledResolver} per package.
   */
  static forDirectory(cwd: string): FallbackResolver {
    const requireFromCwd = createRequire(path.join(cwd, 'noop.js'));
    return new FallbackResolver(
      new NodeResolver({ require: requireFromCwd }),
      BundledResolver.create(),
      (pkg) => FallbackResolver.canResolve(requireFromCwd, pkg),
    );
  }

  resolveRule(pkg: string, ruleName: string): unknown {
    return this.resolverFor(pkg).resolveRule(pkg, ruleName);
  }

  resolveConfig(pkg: string, configName: string): unknown {
    return this.resolverFor(pkg).resolveConfig(pkg, configName);
  }

  private resolverFor(pkg: string): Resolver {
    return this.isInstalled(pkg) ? this.installed : this.bundled;
  }

  /**
   * Whether the package is installed: its `package.json` resolves, or exists but is not exported.
   */
  private static canResolve(requireFromCwd: NodeJS.Require, pkg: string): boolean {
    try {
      requireFromCwd.resolve(`${pkg}/package.json`);
      return true;
    } catch (error) {
      return (error as NodeJS.ErrnoException).code === 'ERR_PACKAGE_PATH_NOT_EXPORTED';
    }
  }
}
