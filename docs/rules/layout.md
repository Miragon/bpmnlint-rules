# Layout rules

Crossings, slopes and flows through a shape live only in the DI coordinates. The XML diff looks
clean, the rendered diagram knots, and no structural rule sees it. These rules decide on waypoints
and bounds, never on guesswork.

## A flow routed through an unrelated shape

<RulePair rule="flow-through-element" />

## Two flows crossing

<RulePair rule="flow-crossing" />

## A flow docked onto the wrong side

<RulePair rule="flow-connection-side" />

## A target drawn off the row

<RulePair rule="flow-target-alignment" />

## A flow that runs diagonally

<RulePair rule="flow-orthogonal" />

All five are non-blocking layout hints at `warn` in both recommended presets. See
[Presets](../presets.md).
