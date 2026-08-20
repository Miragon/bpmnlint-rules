# Changelog

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
