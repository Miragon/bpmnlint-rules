# Changelog

## [0.6.0](https://github.com/Miragon/bpmnlint-rules/compare/v0.5.0...v0.6.0) (2026-08-21)


### Features

* allow return flows in flow-connection-side rule ([#17](https://github.com/Miragon/bpmnlint-rules/issues/17)) ([9cb254c](https://github.com/Miragon/bpmnlint-rules/commit/9cb254c9d69bba4fa4accd808e2a41457bf48b84))
* **flow-target-alignment:** make exempt element types configurable ([#20](https://github.com/Miragon/bpmnlint-rules/issues/20)) ([9aa177b](https://github.com/Miragon/bpmnlint-rules/commit/9aa177bc7ef55d87a9ac8cdf2e28f330a7039209))

## [0.5.0](https://github.com/Miragon/bpmnlint-rules/compare/v0.4.0...v0.5.0) (2026-08-20)


### Features

* split recommended into recommended-for-modeling and -for-automation ([#13](https://github.com/Miragon/bpmnlint-rules/issues/13)) ([494c8bf](https://github.com/Miragon/bpmnlint-rules/commit/494c8bf86868cba614aeda184e2b7c730a8a7c4a))

## [0.4.0](https://github.com/Miragon/bpmnlint-rules/compare/v0.3.0...v0.4.0) (2026-08-20)


### ⚠ BREAKING CHANGES

* the default naming convention now expects a camelCase body after the type prefix. Consumers that enable the rule without an explicit `case` (e.g. via plugin:@miragon/rules/all) will see IDs with a PascalCase body reported. Set `"case": "PascalCase"` to keep the old behaviour.

### Features

* default element-id-naming case to camelCase ([#14](https://github.com/Miragon/bpmnlint-rules/issues/14)) ([0979480](https://github.com/Miragon/bpmnlint-rules/commit/0979480223e001eff4ebe8f7f62871387e618aca))

## [0.3.0](https://github.com/Miragon/bpmnlint-rules/compare/v0.2.0...v0.3.0) (2026-08-20)


### Features

* add flow-connection-side rule and add-bpmn-rule skill ([#9](https://github.com/Miragon/bpmnlint-rules/issues/9)) ([6a7b8fd](https://github.com/Miragon/bpmnlint-rules/commit/6a7b8fd9383b94dae0d1ab6c650e77c578a9bba3))
* add flow-target-alignment rule ([#12](https://github.com/Miragon/bpmnlint-rules/issues/12)) ([9966463](https://github.com/Miragon/bpmnlint-rules/commit/9966463752b934b8e31b6c0b791ed2d4cdfc5a2e))

## [0.2.0](https://github.com/Miragon/bpmnlint-rules/compare/v0.1.0...v0.2.0) (2026-08-20)


### Features

* initial @miragon/bpmnlint-plugin-rules package ([#1](https://github.com/Miragon/bpmnlint-rules/issues/1)) ([447978c](https://github.com/Miragon/bpmnlint-rules/commit/447978c2f8c628c5f145f2e7389bdca5f3752406))
