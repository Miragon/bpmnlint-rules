# `@miragon/rules/c8-implementation`

> This rule is an `error` in `plugin:@miragon/rules/camunda-8`, the Camunda 8 engine layer that `getDefaultLintConfig({ engine: 'c8' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 8 diagrams.

Reports a send task or a message throw event whose message has no name.

## Why

Camunda 8 refuses to deploy a file in which a send task, a message intermediate throw event or a message end event references a `bpmn:message` without a name, so no process of the file starts. camunda-compat checks the message name of catching elements (message catch events, receive tasks) only: the file passes its rules and fails at deploy.

## Scope

The rule looks at the send tasks and the message throw and end events of the executable processes of a Camunda 8 diagram and reports the element when its message has no `name` or an empty one. A name of white space deploys and is left alone, and so is an element without a message reference. The other implementation checks (a job without type, a script without result variable, a missing `zeebe:taskDefinition`) stay with camunda-compat.

## Examples

👎 Invalid: the message of a send task has no name

![A send task whose message has no name](./assets/c8-implementation-invalid.svg)

👍 Valid: the message has a name

![A send task whose message has a name](./assets/c8-implementation-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:message id="message_receiptSent" />
<bpmn:sendTask id="sendTask_sendReceipt" messageRef="message_receiptSent" />
```

👍 right:

```xml
<bpmn:message id="message_receiptSent" name="receiptSent" />
<bpmn:sendTask id="sendTask_sendReceipt" messageRef="message_receiptSent" />
```

## Further reading

- [Camunda 8: Send tasks](https://docs.camunda.io/docs/components/modeler/bpmn/send-tasks/): how Camunda 8 runs a send task.

## Related

- [`@miragon/rules/c8-message`](./c8-message.md): the messages Camunda 8 waits for.
