# Naming rules

An element id is not diagram-internal. Process tests assert against it, and Operate or Cockpit label
incidents with it. A generated token such as `Activity_0049ryx` tells nobody which step it is, and it
churns on every regeneration.

Two rules keep ids chosen and consistent. Flip each example between the reported and the clean
model; the findings are the real output of the rule on that model.

## Ids generated rather than chosen

<RulePair rule="no-generated-ids" />

## Ids off the naming convention

<RulePair rule="element-id-naming" />

Both rules are `off` while modeling and switch on once a process is wired up for execution. See
[Presets](../presets.md).
