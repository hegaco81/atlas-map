import assert from "node:assert/strict";
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
  assert.match(html, /Guadalajara/);
  assert.doesNotMatch(html, /Codex is working|Your site is taking shape|react-loading-skeleton/i);
});
