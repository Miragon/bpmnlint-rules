# Camunda 7 / 8 engines

A model can pass every structural check and still fail at deploy, because the engine needs
properties plain BPMN does not know. The Camunda 7 and Camunda 8 deployability rules are bundled, so
there is nothing extra to install.

## What it looks like

The first run lints a Camunda 8 service task without a task definition. The second run lints the
same model after adding `zeebe:taskDefinition`. Both outputs come from the bundled rules at build
time.

<DeployTerminals />

## Switch it on

Deploying to a Camunda engine? Add its deployability layer (bundled — no separate install) to your
`extends`. These rules read engine-specific properties, so bpmnlint must also parse them with the
matching moddle extension — pick the config for your engine below.

**The `moddleExtensions` line is not optional.** Without it the parser doesn't recognize the engine
namespace, so those properties are invisible to the rules — they then report false findings (for
example a service task flagged as missing its task definition even though it has one). A modeler loads
the moddle already; it's the bare `npx bpmnlint` CLI that needs this line. Prefer to skip the wiring?
The programmatic `getDefaultLintConfig({ engine })` below sets up both the layer and its moddle
extension for you.

### Camunda 7

```json
{
  "extends": [
    "bpmnlint:recommended",
    "plugin:@miragon/rules/recommended-for-automation",
    "plugin:camunda-compat/camunda-platform-7-24"
  ],
  "moddleExtensions": {
    "camunda": "camunda-bpmn-moddle/resources/camunda.json"
  }
}
```

### Camunda 8 (Zeebe)

```json
{
  "extends": [
    "bpmnlint:recommended",
    "plugin:@miragon/rules/recommended-for-automation",
    "plugin:camunda-compat/camunda-cloud-8-11"
  ],
  "moddleExtensions": {
    "zeebe": "zeebe-bpmn-moddle/resources/zeebe.json"
  }
}
```

### Older engine versions

Both examples name the config for the latest engine version. camunda-compat ships one config per
version, from `camunda-platform-7-19` and `camunda-cloud-1-0` on: put your engine's version in the
name, for example `plugin:camunda-compat/camunda-cloud-8-7`. The rules then check against that
version. A <code v-pre>{{secrets.X}}</code> reference, for example, is only reported as legacy from 8.10 on.

The bundled resolver, `createBundledResolver()`, carries every one of these configs and the rules
they reference. A host that has only the bundle, such as a browser modeler, needs nothing installed
to lint against an older version.

In code, pass the version the diagram targets, its `modeler:executionPlatformVersion`, to
`getDefaultLintConfig`:

```ts
getDefaultLintConfig({ engine: 'c8', engineVersion: '8.7.0' });
// extends […, 'plugin:camunda-compat/camunda-cloud-8-7']
```

Without a version, with one that is not `<major>.<minor>…`, or with one camunda-compat has no
config for, the latest config applies.
