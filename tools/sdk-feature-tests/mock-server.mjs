import http from "node:http";

/**
 * A scriptable mock ingest endpoint for exercising eventra-sdk's retry/backoff/
 * circuit-breaker/idempotency behavior against real HTTP round-trips.
 *
 * `behavior(requestIndex, body)` is called for each POST and must return one of:
 *   { status, body?, delayMs? }              -> respond normally after optional delay
 *   { destroy: true }                        -> destroy the socket (simulates a transport error)
 */
export function createMockServer(behavior) {
  const requests = [];
  let index = 0;

  const server = http.createServer((req, res) => {
    // CORS: needed only for the browser-driven suite (browser-run.mjs), which serves the
    // page and this mock endpoint from different origins/ports. No-op for the Node-side
    // fetch-based tests, which never send an Origin header or a preflight OPTIONS.
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", async () => {
      let parsed = null;
      try {
        parsed = JSON.parse(raw);
      } catch {
        // ignore
      }
      const reqIndex = index++;
      requests.push({ index: reqIndex, headers: req.headers, body: parsed, raw, at: Date.now() });
      const result = await behavior(reqIndex, parsed, req);

      if (result?.destroy) {
        req.socket.destroy();
        return;
      }
      if (result?.delayMs) {
        await new Promise((r) => setTimeout(r, result.delayMs));
      }
      const status = result?.status ?? 200;
      const payload = JSON.stringify(result?.body ?? { ok: status < 300 });
      res.writeHead(status, { "content-type": "application/json" });
      res.end(payload);
    });
  });

  return {
    server,
    requests,
    listen(port) {
      return new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
    },
    close() {
      return new Promise((resolve) => server.close(resolve));
    },
  };
}
