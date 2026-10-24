#!/usr/bin/env bash
# Builds the model on the docs home page and renders it: an invoice approval drawn with bpmn-cli,
# then one generated id put in (Activity_0049ryx), so the plugin reports exactly that.
# Writes docs/public/shots/landing-invoice.svg (cropped to the start of the flow), its dark variant
# landing-invoice-dark.svg, and prints the lint output the page quotes. Run from the repo root after `npm run build`.
set -euo pipefail

BPMN="npx -y @miragon/bpmn-cli@0.8.0"
OUT=docs/public/shots
# Inside the repo, so bpmn-cli names new ids after the .bpmnlintrc (userTask_checkInvoice).
WORK=$(mktemp -d "$PWD/.landing-demo.XXXX")
trap 'rm -rf "$WORK"' EXIT

$BPMN new "$WORK/invoice.bpmn" --name Invoice >/dev/null
$BPMN apply "$WORK/invoice.bpmn" - >/dev/null <<'OPS'
[
  { "op": "add", "kind": "startEvent", "name": "Invoice received", "as": "$start" },
  { "op": "add", "kind": "exclusiveGateway", "after": "$start", "as": "$merge" },
  { "op": "add", "kind": "userTask", "name": "Check invoice", "after": "$merge", "as": "$check" },
  { "op": "add", "kind": "exclusiveGateway", "name": "Approved?", "after": "$check", "as": "$approved" },
  { "op": "add", "kind": "userTask", "name": "Pay invoice", "after": "$approved", "flowName": "Yes", "as": "$pay" },
  { "op": "add", "kind": "endEvent", "name": "Invoice paid", "after": "$pay" },
  { "op": "add", "kind": "userTask", "name": "Request correction", "after": "$approved", "flowName": "No", "as": "$fix" },
  { "op": "connect", "source": "$fix", "target": "$merge" }
]
OPS
$BPMN route "$WORK/invoice.bpmn" flow_requestCorrectionToAfterInvoiceReceived --exit right --entry bottom >/dev/null
# The router leaves a 15px stub; flow-connection-side asks for 20px, so the loop runs 30px out.
sed -i.bak -e 's/<di:waypoint x="671" y="260" \/>/<di:waypoint x="686" y="260" \/>/' \
  -e 's/<di:waypoint x="671" y="315" \/>/<di:waypoint x="686" y="335" \/>/' \
  -e 's/<di:waypoint x="201" y="315" \/>/<di:waypoint x="201" y="335" \/>/' "$WORK/invoice.bpmn"

sed 's/userTask_checkInvoice/Activity_0049ryx/g' "$WORK/invoice.bpmn" > "$WORK/landing.bpmn"
npx bpmnlint "$WORK/landing.bpmn" || true

# The page shows the start of the flow; the crop cuts only through flows, never a label.
$BPMN render "$WORK/landing.bpmn" -o "$WORK/landing.svg" >/dev/null
sed -E '1s/ width="[0-9.]+" height="[0-9.]+" viewBox="[^"]*"/ viewBox="40 62 500 150"/' "$WORK/landing.svg" > "$OUT/landing-invoice.svg"
# The dark variant swaps the two colours bpmn-cli draws with for the dark roles of the docs kit:
# lines and labels in the text colour, shapes and canvas in the colour of the page.
sed -e 's/#22242a/#FFFFFF/g' -e 's/#ffffff/#1D1D1D/g' "$OUT/landing-invoice.svg" > "$OUT/landing-invoice-dark.svg"
