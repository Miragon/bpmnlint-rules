# `@miragon/rules/c7-history-time-to-live`

> This rule is `an error` in `plugin:@miragon/rules/camunda-7`, the Camunda 7 engine layer that `getDefaultLintConfig({ engine: 'c7' })` adds next to camunda-compat. It is **off** in both `recommended-for-*` layers and an `error` in `plugin:@miragon/rules/all`. It only checks Camunda 7 diagrams.

Reports a `camunda:historyTimeToLive` that is not a number of days.

## Why

Camunda 7 reads `camunda:historyTimeToLive` as a number of days, written as `180` or as `P180D`.
Any other value, such as a duration in hours (`PT5H`) or `180d`, makes the engine refuse the file
when it is deployed, although the attribute looks set. camunda-compat only reports a missing value,
so a wrong one passes it and fails at deploy.

## Scope

The rule reads `camunda:historyTimeToLive` on every executable process and reports a value that is
not a whole number of days (optionally with a leading `+`) or `P<n>D`, or that is larger than 2147483647. A missing or empty value is left to camunda-compat's `history-time-to-live`. Non-executable
processes are not checked.

## Examples

👎 Invalid: a history time to live of `180d`

![A history time to live of `180d`](./assets/c7-history-time-to-live-invalid.svg)

👍 Valid: a history time to live of 180 days

![A history time to live of 180 days](./assets/c7-history-time-to-live-valid.svg)

The same, as XML. 👎 wrong:

```xml
<bpmn:process id="orderPayment" isExecutable="true" camunda:historyTimeToLive="180d" />
```

👍 right:

```xml
<bpmn:process id="orderPayment" isExecutable="true" camunda:historyTimeToLive="180" />
```

## Further reading

- [Camunda 7: History cleanup](https://docs.camunda.org/manual/latest/user-guide/process-engine/history/history-cleanup/): how the time to live is read and applied.

## Related

- [`@miragon/rules/c7-attribute-value`](./c7-attribute-value.md): other attribute values the engines refuse.
