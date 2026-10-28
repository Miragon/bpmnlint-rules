# `@miragon/rules/c8-extension`

> This rule is an `error` in `plugin:@miragon/rules/camunda-8`, the Camunda 8 engine layer that `getDefaultLintConfig({ engine: 'c8' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 8 diagrams.

Reports zeebe extension content Camunda 8 refuses to deploy and camunda-compat does not check.

## Why

Camunda 8 validates the content of its zeebe extension elements when a file is deployed. A binding
type it does not know, a linked resource without a resource type, a conditional filter with a
variable event other than `create` and `update`, or a header key used twice makes it refuse the
whole file. These values are typed by hand or by a template, and the mistake only shows when the
deployment fails, often in a pipeline long after the model was changed.

## Scope

The rule looks at the zeebe extension elements Camunda 8 reads on each element of an executable
process (and on the messages it uses) and reports:

- a `bindingType` other than `deployment`, `latest` and `versionTag` on `zeebe:calledElement`,
  `zeebe:calledDecision`, `zeebe:formDefinition` and `zeebe:linkedResource`,
- `bindingType="versionTag"` without a `versionTag` where camunda-compat does not look: on a start
  event form, on a linked resource, a blank version tag, and on a second such element,
- a `zeebe:linkedResource` without `resourceType`,
- `variableEvents` of a `zeebe:conditionalFilter` other than `create` and `update`,
- a task header key twice in a header list camunda-compat skips (a second `zeebe:taskHeaders`, or
  the listeners of a second `zeebe:executionListeners`).

Mappings without target or source, a target that is no variable name, the output pair of
`zeebe:adHoc` and duplicate header keys in the first header list are left to camunda-compat.

## Examples

👎 Invalid: a linked resource without resource type

![A service task with a linked resource without resource type](./assets/c8-extension-invalid.svg)

👍 Valid: the linked resource names its resource type

![A service task with a complete linked resource](./assets/c8-extension-valid.svg)

The same, as XML. 👎 wrong:

```xml
<zeebe:linkedResources>
  <zeebe:linkedResource resourceId="chargeRobot" linkName="robot" />
</zeebe:linkedResources>
```

👍 right:

```xml
<zeebe:linkedResources>
  <zeebe:linkedResource resourceId="chargeRobot" linkName="robot" resourceType="RPA" />
</zeebe:linkedResources>
```

## Further reading

- [Camunda 8: Choosing the resource binding type](https://docs.camunda.io/docs/components/best-practices/modeling/choosing-the-resource-binding-type/): what `deployment`, `latest` and `versionTag` do.
- [Camunda 8: Conditional events](https://docs.camunda.io/docs/components/modeler/bpmn/conditional-events/): the variable filter of a condition.

## Related

- [`@miragon/rules/c7-extension`](./c7-extension.md): the extension content check for Camunda 7.
- [`@miragon/rules/c8-duplicate-extension`](./c8-duplicate-extension.md): two of an extension element Camunda 8 reads once.
