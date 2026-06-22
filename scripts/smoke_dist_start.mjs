import assert from "node:assert/strict";

const serverModule = await import("../dist/src/server.js");
const server = await serverModule.startHttpServer(0, "127.0.0.1");

try {
  const address = server.address();
  assert.ok(address && typeof address === "object", "expected bound TCP address");

  const response = await fetch(`http://127.0.0.1:${address.port}/healthz`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.deepEqual(body.tools, ["classify_civic_issue", "draft_civic_report"]);

  console.log(`Dist start smoke OK: http://127.0.0.1:${address.port}/healthz`);
} finally {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
