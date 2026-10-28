# `@miragon/rules/c8-schema`

> This rule is an `error` in `plugin:@miragon/rules/camunda-8`, the Camunda 8 engine layer that `getDefaultLintConfig({ engine: 'c8' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 8 diagrams.

Reports attributes without a namespace prefix that the BPMN schema does not define, extension elements on `bpmn:definitions`, and ids that are no XML NCName.

## Why

Camunda 8 validates every file against the BPMN XML schema before it deploys it. An attribute such as `priority="high"` on a service task (a Camunda 7 habit, or a vendor attribute written without its prefix), extension elements directly on `bpmn:definitions` and an id with a colon all fail that validation, and the engine refuses the whole file. Modelers and bpmn-moddle read such a file without complaint, so the problem surfaces only at deploy.

## Scope

The rule checks the whole Camunda 8 diagram, the diagram interchange included, not only the executable processes. It reports every unprefixed attribute the moddle does not know on a BPMN or DI element (on the flow node or flow that owns a nested element, such as an event definition or a condition), non-empty `bpmn:extensionElements` on `bpmn:definitions`, and every id that is no NCName. Prefixed vendor attributes are left to `c8-unknown-attribute` and `c8-foreign-content`. Schema problems the moddle tree does not show (the child order, references to ids the file lacks, booleans that are no `true` or `false`) are out of reach for a lint rule.

## Examples

👎 Invalid: an unprefixed `priority` attribute on a service task

![A service task with an unprefixed priority attribute](./assets/c8-schema-invalid.svg)

👍 Valid: the service task without it

![A service task without unknown attributes](./assets/c8-schema-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:serviceTask id="serviceTask_chargeCard" priority="high" />
<bpmn:task id="task:review" />
```

👍 right:

```xml
<bpmn:serviceTask id="serviceTask_chargeCard" />
<bpmn:task id="task_review" />
```

## Further reading

- [OMG: BPMN 2.0 XML schema](https://www.omg.org/spec/BPMN/2.0/): the schema Camunda 8 validates a file against.

## Related

- [`@miragon/rules/c8-unknown-attribute`](./c8-unknown-attribute.md): zeebe attributes Camunda 8 does not know.
- [`@miragon/rules/c8-foreign-content`](./c8-foreign-content.md): Camunda 7 content in a Camunda 8 diagram.
