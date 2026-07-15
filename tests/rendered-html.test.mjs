import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders the Atlas municipal budget dashboard", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Atlas GeoSales AI/i);
  assert.match(html, /Jalisco/);
  assert.match(html, /Presupuesto comercial/i);
  assert.match(html, /Hermes \+ Jarvis · GeoSales/i);
  assert.match(html, /Hermes está activo/i);
  assert.doesNotMatch(html, /Codex is working|Your site is taking shape|react-loading-skeleton/i);
});

test("serves browser CSS and JavaScript from the static asset binding", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("assets-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  let requestedPath = null;
  const response = await worker.fetch(
    new Request("http://localhost/assets/atlas-test.css"),
    {
      ASSETS: {
        fetch: async (request) => {
          requestedPath = new URL(request.url).pathname;
          return new Response(".atlas-shell{display:grid}", { headers: { "content-type": "text/css" } });
        },
      },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(requestedPath, "/assets/atlas-test.css");
  assert.match(response.headers.get("content-type") ?? "", /^text\/css/i);
  assert.match(await response.text(), /atlas-shell/);
});

test("serves the municipal GeoJSON used by the interactive map", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("geo-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  let requestedPath = null;
  const response = await worker.fetch(new Request("http://localhost/mexico-municipalities.geojson"), {
    ASSETS: { fetch: async (request) => { requestedPath = new URL(request.url).pathname; return new Response('{"type":"FeatureCollection","features":[]}', { headers: { "content-type": "application/geo+json" } }); } },
  }, { waitUntil() {}, passThroughOnException() {} });
  assert.equal(requestedPath, "/mexico-municipalities.geojson");
  assert.match(response.headers.get("content-type") ?? "", /geo\+json/i);
});

test("builds municipal paths from each feature geometry", async () => {
  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(pageSource, /geometryPath\(feature\.geometry\)/);
  assert.doesNotMatch(pageSource, /geometryPath\(feature\)\s*}/);
  assert.match(pageSource, /onClick=\{\(\) => zoomBy\(\.72\)\}/);
  assert.match(pageSource, /Compara Guadalajara contra Zapopan/);
  assert.match(pageSource, /setLayer\("Proyección"\)/);
});
