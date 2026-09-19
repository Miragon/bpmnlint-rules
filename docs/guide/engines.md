# Camunda 7 / 8 engines

A model can pass every structural check and still fail at deploy, because the engine needs
properties plain BPMN does not know. The Camunda 7 and Camunda 8 deployability rules are bundled, so
there is nothing extra to install.

## What it looks like

The first run lints a Camunda 8 service task without a task definition. The second run lints the
same model after adding `zeebe:taskDefinition`. Both outputs come from the bundled rules at build
time.

<DeployTerminals />

## Switch it on

<!--@include: ../../README.md#engines-->
