# `@miragon/rules/c7-listener`

> This rule is `an error` in `plugin:@miragon/rules/camunda-7`, the Camunda 7 engine layer that `getDefaultLintConfig({ engine: 'c7' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 7 diagrams.

Reports an execution or task listener Camunda 7 refuses to deploy.

## Why

A listener runs code when its element starts, ends or changes state. The Camunda 7 engines parse
every listener when the file is deployed and refuse the whole file when one has no implementation
(`class`, `expression`, `delegateExpression` or a script), no event or an event they do not know, a
script without `scriptFormat`, or, for a timeout task listener, no timer or no id. One forgotten
listener blocks every other change in the same deployment.

## Scope

The rule checks every `camunda:executionListener` and `camunda:taskListener` the engines read where
it sits. Execution listeners take the events start and end (any event on a sequence flow, where the
engines read take); task listeners take create, assignment, complete, update, delete and timeout.
The rule checks the elements of executable processes; non-executable processes and the content of ad-hoc sub-processes are skipped, as the engines skip them. A finding on an event definition or loop is reported on its flow node.

## Examples

👎 Invalid: an execution listener without implementation

![A service task with an execution listener without implementation](./assets/c7-listener-invalid.svg)

👍 Valid: the listener has a delegate expression

![A service task with an execution listener that has a delegate expression](./assets/c7-listener-valid.svg)

The same, as XML. 👎 wrong:

```xml
<camunda:executionListener event="start" />
```

👍 right:

```xml
<camunda:executionListener event="start" delegateExpression="${auditListener}" />
```

## Further reading

- [Camunda 7: Delegation code](https://docs.camunda.org/manual/latest/user-guide/process-engine/delegation-code/): execution and task listeners and their events.

## Related

- [`@miragon/rules/c7-extension`](./c7-extension.md): fields of a listener without value.
- [`@miragon/rules/c8-listener`](./c8-listener.md): the listener check for Camunda 8.
