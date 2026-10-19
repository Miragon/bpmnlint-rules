// Renders every rule's test fixtures (`test/fixtures/rules/<rule>/{valid,invalid}.bpmn`) to
// `docs/rules/assets/<rule>-<kind>.svg` with the bpmn-js viewer in headless Chromium, so the docs
// show exactly the models the tests lint. Camunda 7 models also show where Camunda 7 commits:
// `camunda-transaction-boundaries` draws HTML overlays, which `saveSVG()` leaves out, so each one is
// measured in the page and added as a red bar.
//
//   npm run docs:examples   (first run on a machine: npx playwright install chromium)

import { globSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import camundaModdle from 'camunda-bpmn-moddle/resources/camunda.json' with { type: 'json' };
import { build } from 'esbuild';
import { chromium } from 'playwright';

const FIXTURES = new URL('../../test/fixtures/rules/', import.meta.url);
const ASSETS = new URL('../rules/assets/', import.meta.url);
const STANDARDS_MODE_PAGE = '<!doctype html>';

const transactionBoundariesBundle = await build({
  entryPoints: [fileURLToPath(import.meta.resolve('camunda-transaction-boundaries/lib/index.js'))],
  bundle: true,
  format: 'iife',
  globalName: 'TransactionBoundaries',
  write: false,
});

async function renderInPage({ xml, camundaModdle }) {
  const { BpmnJS, TransactionBoundaries, document } = globalThis;
  document.body.replaceChildren();
  const viewer = new BpmnJS({
    container: document.body,
    additionalModules: [TransactionBoundaries.default],
    moddleExtensions: { camunda: camundaModdle },
  });
  await viewer.importXML(xml);
  const { svg } = await viewer.saveSVG();
  if (viewer.getDefinitions().get('modeler:executionPlatform') !== 'Camunda Platform') {
    return svg;
  }

  viewer.get('transactionBoundaries').show();
  const canvas = viewer.get('canvas');
  const { x, y, scale } = canvas.viewbox();
  const origin = canvas.getContainer().getBoundingClientRect();
  const bars = viewer
    .get('overlays')
    .get({ type: 'transaction-boundaries' })
    .filter(({ element }) => canvas.findRoot(element) === canvas.getRootElement())
    .map(({ htmlContainer }) => htmlContainer.firstElementChild.getBoundingClientRect())
    .map((bar) => ({
      x: Math.round(x + (bar.left - origin.left) / scale),
      y: Math.round(y + (bar.top - origin.top) / scale),
      width: Math.round(bar.width / scale),
      height: Math.round(bar.height / scale),
    }));

  const [svgX, svgY, svgWidth, svgHeight] = /viewBox="([^"]+)"/.exec(svg)[1].split(' ').map(Number);
  const left = Math.min(svgX, ...bars.map((bar) => bar.x));
  const top = Math.min(svgY, ...bars.map((bar) => bar.y));
  const width = Math.max(svgX + svgWidth, ...bars.map((bar) => bar.x + bar.width)) - left;
  const height = Math.max(svgY + svgHeight, ...bars.map((bar) => bar.y + bar.height)) - top;
  const rects = bars.map(
    (bar) =>
      `<rect class="transaction-boundary" x="${bar.x}" y="${bar.y}" width="${bar.width}" height="${bar.height}" fill="#ee0000"/>`,
  );
  return svg
    .replace(
      /width="[^"]+" height="[^"]+" viewBox="[^"]+"/,
      `width="${width}" height="${height}" viewBox="${left} ${top} ${width} ${height}"`,
    )
    .replace(/<\/svg>\s*$/, `${rects.join('')}</svg>`);
}

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(STANDARDS_MODE_PAGE);
await page.addScriptTag({
  path: fileURLToPath(import.meta.resolve('bpmn-js/dist/bpmn-viewer.production.min.js')),
});
await page.addScriptTag({ content: transactionBoundariesBundle.outputFiles[0].text });

for (const fixture of globSync('*/{valid,invalid}.bpmn', { cwd: FIXTURES })) {
  const xml = readFileSync(new URL(fixture, FIXTURES), 'utf8');
  const output = new URL(fixture.replace('/', '-').replace('.bpmn', '.svg'), ASSETS);
  writeFileSync(output, await page.evaluate(renderInPage, { xml, camundaModdle }));
  console.log(`writing ${fileURLToPath(output)}`);
}

await browser.close();
