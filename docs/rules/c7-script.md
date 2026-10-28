# `@miragon/rules/c7-script`

> This rule is `an error` in `plugin:@miragon/rules/camunda-7`, the Camunda 7 engine layer that `getDefaultLintConfig({ engine: 'c7' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 7 diagrams.

Reports a script task with neither a script nor `camunda:resource`.

## Why

A script task runs an inline `bpmn:script` or the external script named by `camunda:resource`.
With neither, Camunda 7 refuses the file, so a placeholder script task stops the whole deployment.
camunda-compat does not check it.

## Scope

The rule looks at every script task. A script that holds only whitespace counts as none.
Only executable processes are checked, and nothing inside an ad-hoc sub-process, which the engines skip with its content.

## Examples

👎 Invalid: a script task without a script

![A script task without a script](./assets/c7-script-invalid.svg)

👍 Valid: the script task carries an inline script

![The script task carries an inline script](./assets/c7-script-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:scriptTask id="scriptTask_chargeCard" name="Charge card" scriptFormat="groovy" />
```

👍 right:

```xml
<bpmn:scriptTask id="scriptTask_chargeCard" name="Charge card" scriptFormat="groovy">
  <bpmn:script>execution.setVariable("cardCharged", true)</bpmn:script>
</bpmn:scriptTask>
```

## Further reading

- [Camunda 7: Script task](https://docs.camunda.org/manual/latest/reference/bpmn20/tasks/script-task/): inline and external scripts.

## Related

- [`@miragon/rules/c7-implementation`](./c7-implementation.md): tasks without an implementation.
