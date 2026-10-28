# `@miragon/rules/c8-feel-expression`

> This rule is an `error` in `plugin:@miragon/rules/camunda-8`, the Camunda 8 engine layer that `getDefaultLintConfig({ engine: 'c8' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 8 diagrams.

Reports a value Camunda 8 parses as FEEL at deploy that is no valid FEEL, and a static or JUEL value where Camunda 8 needs a FEEL expression.

## Why

Camunda 8 parses every value that starts with `=` as FEEL when the file is deployed. One slip (`&&` instead of `and`, `==` instead of `=`, a JUEL `${...}` from a Camunda 7 model, an unclosed bracket) and the engine refuses the whole file, so no process of it starts. Some places need FEEL in any case: a sequence flow condition, the completion condition of an ad-hoc sub-process, the condition of a conditional event, a `zeebe:script` expression, the `inputCollection` and `outputElement` of a multi-instance and the correlation key of a message. A static value there is refused as well. The message names the FEEL spelling of the slip, so the expression can be fixed without a deploy round trip.

## Scope

The rule checks the executable processes of a Camunda 8 diagram (the content of a transaction is left out, Camunda 8 refuses transactions as a whole) and the messages their events and receive tasks wait for. It parses the `=` values of the zeebe attributes Camunda 8 reads as FEEL (job type and retries, input and output mapping sources, multi-instance collections, called process and decision ids, scripts, correlation keys, assignments, schedules, priorities, ad-hoc collections), sequence flow conditions, completion conditions, conditional events, timers and the names of the messages and signals the file uses. Attributes Camunda 8 does not parse at deploy (an execution listener type, a header value) and extension elements Camunda 8 does not read where they sit are left alone. A completion condition of a multi-instance that is no FEEL is `c8-feel-completion-condition`.

## Examples

👎 Invalid: an input mapping with a JUEL `&&`

![A service task whose input mapping uses &&](./assets/c8-feel-expression-invalid.svg)

👍 Valid: the input mapping in FEEL

![A service task whose input mapping is valid FEEL](./assets/c8-feel-expression-valid.svg)

The same, as XML. 👎 wrong:

```xml
<zeebe:input source="=order.amount &amp;&amp; paid" target="amount" />
<bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">${amount &gt; 100}</bpmn:conditionExpression>
```

👍 right:

```xml
<zeebe:input source="=order.amount and paid" target="amount" />
<bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">=amount &gt; 100</bpmn:conditionExpression>
```

## Further reading

- [Camunda 8: FEEL expressions](https://docs.camunda.io/docs/components/modeler/feel/language-guide/feel-expressions-introduction/): the syntax Camunda 8 parses.
- [Camunda 8: Expressions](https://docs.camunda.io/docs/components/concepts/expressions/): which attributes take an expression.

## Related

- [`@miragon/rules/c8-feel-completion-condition`](./c8-feel-completion-condition.md): a multi-instance completion condition that is no FEEL.
