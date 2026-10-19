// Renders every rule's example models to SVG for the docs.
//
// Each rule ships a `valid.bpmn` / `invalid.bpmn` pair under `test/fixtures/rules/<rule>/` (the
// same models the `examples.spec.ts` test lints). This script turns each into
// `docs/rules/assets/<rule>-<kind>.svg`, so the pictures in the docs are generated from the exact
// files the tests verify, never hand-drawn and never out of sync.
//
// Each model is opened with the bpmn-js viewer in a headless Chromium and exported via `saveSVG()`.
// A Camunda 7 model (`modeler:executionPlatform="Camunda Platform"`) also shows where Camunda 7
// commits: the `camunda-transaction-boundaries` extension draws its boundaries as HTML overlays,
// which `saveSVG()` leaves out, so each one is measured in the page and added as a red bar.
//
//   npm run docs:examples   (first run on a machine: npx playwright install chromium)

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FIXTURES = path.join(ROOT, 'test', 'fixtures', 'rules');
const ASSETS = path.join(ROOT, 'docs', 'rules', 'assets');
const BOUNDARY_COLOR = '#ee0000';
const CAMUNDA_7_PLATFORM = 'Camunda Platform';

const VIEWER = fileURLToPath(import.meta.resolve('bpmn-js/dist/bpmn-viewer.production.min.js'));
const CAMUNDA_MODDLE = JSON.parse(
  readFileSync(
    fileURLToPath(import.meta.resolve('camunda-bpmn-moddle/resources/camunda.json')),
    'utf8',
  ),
);

async function bundleTransactionBoundaries() {
  const result = await build({
    entryPoints: [
      fileURLToPath(import.meta.resolve('camunda-transaction-boundaries/lib/index.js')),
    ],
    bundle: true,
    format: 'iife',
    globalName: 'TransactionBoundaries',
    write: false,
    logLevel: 'warning',
  });
  return result.outputFiles[0].text;
}

/** Runs in the page: renders the model and returns its SVG plus every boundary bar's box. */
async function renderInPage({ xml, camundaModdle, camunda7Platform }) {
  const { BpmnJS, TransactionBoundaries, document } = globalThis;
  const viewer = new BpmnJS({
    container: document.body,
    additionalModules: [TransactionBoundaries.default],
    moddleExtensions: { camunda: camundaModdle },
  });
  await viewer.importXML(xml);
  const { svg } = await viewer.saveSVG();

  if (viewer.getDefinitions().get('modeler:executionPlatform') !== camunda7Platform) {
    return { svg, boxes: [] };
  }

  viewer.get('transactionBoundaries').show();

  const canvas = viewer.get('canvas');
  const viewbox = canvas.viewbox();
  const origin = canvas.getContainer().getBoundingClientRect();
  const boxes = viewer
    .get('overlays')
    .get({ type: 'transaction-boundaries' })
    .map(({ htmlContainer }) => {
      const bar = htmlContainer.firstElementChild.getBoundingClientRect();
      return {
        x: Math.round(viewbox.x + (bar.left - origin.left) / viewbox.scale),
        y: Math.round(viewbox.y + (bar.top - origin.top) / viewbox.scale),
        width: Math.round(bar.width / viewbox.scale),
        height: Math.round(bar.height / viewbox.scale),
      };
    });

  return { svg, boxes };
}

function enclosingViewBox(viewBox, boxes) {
  const [x, y, width, height] = viewBox.split(' ').map(Number);
  const left = Math.min(x, ...boxes.map((box) => box.x));
  const top = Math.min(y, ...boxes.map((box) => box.y));
  const right = Math.max(x + width, ...boxes.map((box) => box.x + box.width));
  const bottom = Math.max(y + height, ...boxes.map((box) => box.y + box.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function drawBoundaries(svg, boxes) {
  if (!boxes.length) {
    return svg;
  }

  const frame = enclosingViewBox(/viewBox="([^"]+)"/.exec(svg)[1], boxes);
  const bars = boxes
    .map(
      (box) =>
        `<rect class="transaction-boundary" x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" fill="${BOUNDARY_COLOR}"/>`,
    )
    .join('');

  return svg
    .replace(/width="[^"]+" height="[^"]+" viewBox="[^"]+"/, () =>
      [
        `width="${frame.width}"`,
        `height="${frame.height}"`,
        `viewBox="${frame.x} ${frame.y} ${frame.width} ${frame.height}"`,
      ].join(' '),
    )
    .replace(/<\/svg>\s*$/, `${bars}</svg>`);
}

mkdirSync(ASSETS, { recursive: true });

const rules = readdirSync(FIXTURES, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

console.log(`Rendering ${rules.length * 2} example model(s) to ${path.relative(ROOT, ASSETS)}/ …`);

const transactionBoundaries = await bundleTransactionBoundaries();
const browser = await chromium.launch();

try {
  for (const rule of rules) {
    for (const kind of ['valid', 'invalid']) {
      const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
      await page.setContent('<!doctype html><html><body></body></html>');
      await page.addStyleTag({ content: 'html, body { margin: 0; height: 100%; }' });
      await page.addScriptTag({ path: VIEWER });
      await page.addScriptTag({ content: transactionBoundaries });

      const xml = readFileSync(path.join(FIXTURES, rule, `${kind}.bpmn`), 'utf8');
      const { svg, boxes } = await page.evaluate(renderInPage, {
        xml,
        camundaModdle: CAMUNDA_MODDLE,
        camunda7Platform: CAMUNDA_7_PLATFORM,
      });

      const output = path.join(ASSETS, `${rule}-${kind}.svg`);
      writeFileSync(output, drawBoundaries(svg, boxes));
      console.log(`writing ${output}`);
      await page.close();
    }
  }
} finally {
  await browser.close();
}
