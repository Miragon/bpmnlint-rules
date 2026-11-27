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

## A boundary event covering its host's marker

<RulePair rule="boundary-event-marker-overlap" />

## An exclusive gateway without its marker

<RulePair rule="exclusive-gateway-marker-visible" />

## A label on a flow or too narrow for its words

<RulePair rule="label-placement" />

## An event or gateway label off its centre line

<RulePair rule="label-alignment" />

## A text annotation too small for its text

<RulePair rule="text-annotation-fit" />

The first eight are non-blocking layout hints at `warn` in both recommended presets, except the gateway
marker, which is an `error` in `recommended-for-modeling`. `label-alignment` and `text-annotation-fit` are off in
every preset and enabled by name. See
[Presets](../presets.md).
