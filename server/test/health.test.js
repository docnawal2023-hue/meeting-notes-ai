const assert = require("node:assert/strict");
const { once } = require("node:events");
const { describe, it } = require("node:test");
const app = require("../src/app");

describe("GET /api/health", () => {
  it("returns the API health status", async (t) => {
    const server = app.listen(0);
    await once(server, "listening");
    t.after(
      () =>
        new Promise((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        })
    );

    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/health`);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok" });
  });
});
