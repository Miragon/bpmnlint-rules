# CI & programmatic API

## In CI

<!--@include: ../../README.md#ci-->

Only findings at `error` fail the run. The two recommended presets report Miragon findings at `warn`,
so extend `plugin:@miragon/rules/all` when the gate should block on them. See
[Presets](../presets.md).

## Programmatic API

<!--@include: ../../README.md#programmatic-->
