# `@miragon/rules/c7-complex-gateway`

> This rule is `an error` in `plugin:@miragon/rules/camunda-7`, the Camunda 7 engine layer that `getDefaultLintConfig({ engine: 'c7' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 7 diagrams.

Reports a complex gateway that a sequence flow connects.

## Why

Camunda 7 does not run complex gateways. A file in which a sequence flow enters or leaves one is
refused at deploy ("invalid destination" or "invalid source" of the sequence flow), so a split
modeled with a complex gateway stops the deployment of the whole process.

## Scope

The rule looks at the complex gateways of executable processes (not inside ad-hoc sub-processes)
and reports each one with an incoming or outgoing sequence flow. A complex gateway that nothing
connects deploys and is left alone.

## Examples

👎 Invalid: the decision is a complex gateway

![A complex gateway between approval and payment](./assets/c7-complex-gateway-invalid.svg)

👍 Valid: the decision is an exclusive gateway

![An exclusive gateway between approval and payment](./assets/c7-complex-gateway-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:complexGateway id="gateway_orderApproved" default="flow_rejected" />
```

👍 right:

```xml
<bpmn:exclusiveGateway id="gateway_orderApproved" default="flow_rejected" />
```

## Further reading

- [Camunda 7: Gateways](https://docs.camunda.org/manual/latest/reference/bpmn20/#gateways): the gateway types Camunda 7 runs.

## Related

- [`@miragon/rules/c7-ad-hoc-sub-process`](./c7-ad-hoc-sub-process.md): another element Camunda 7 refuses once it is connected.
