# `@miragon/rules/c7-input-output`

> This rule is `an error` in `plugin:@miragon/rules/camunda-7`, the Camunda 7 engine layer that `getDefaultLintConfig({ engine: 'c7' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 7 diagrams.

Reports `camunda:inputOutput` where Camunda 7 refuses input or output mappings.

## Why

Input and output mappings copy variables into and out of an activity's scope. The Camunda 7
engines refuse to deploy a file with a mapping on a start event, a boundary event, a gateway or an
event sub-process, and with output parameters on an end event or a multi-instance activity. The
modeler offers the mapping tab on these elements all the same, so the file looks complete until
the deployment fails.

## Scope

The rule looks at every flow node of an executable process that carries `camunda:inputOutput`.
Input mappings on end events and mappings on other activities are left alone.
The rule checks the elements of executable processes; non-executable processes and the content of ad-hoc sub-processes are skipped, as the engines skip them. A finding on an event definition or loop is reported on its flow node.

## Examples

👎 Invalid: the input mapping sits on the start event

![A start event with an input mapping](./assets/c7-input-output-invalid.svg)

👍 Valid: the mapping sits on the service task

![A service task with an input mapping](./assets/c7-input-output-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:startEvent id="startEvent_orderReceived">
  <bpmn:extensionElements>
    <camunda:inputOutput>
      <camunda:inputParameter name="amount">${order.amount}</camunda:inputParameter>
    </camunda:inputOutput>
  </bpmn:extensionElements>
</bpmn:startEvent>
```

👍 right:

```xml
<bpmn:serviceTask id="serviceTask_chargeCard">
  <bpmn:extensionElements>
    <camunda:inputOutput>
      <camunda:inputParameter name="amount">${order.amount}</camunda:inputParameter>
    </camunda:inputOutput>
  </bpmn:extensionElements>
</bpmn:serviceTask>
```

## Further reading

- [Camunda 7: Input/output variable mapping](https://docs.camunda.org/manual/latest/user-guide/process-engine/variables/#input-output-variable-mapping): where mappings are supported.

## Related

- [`@miragon/rules/c7-extension`](./c7-extension.md): parameters without name.
