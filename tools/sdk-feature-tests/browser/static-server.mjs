import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Serves the tools/sdk-feature-tests directory root, so /browser/index.html
// and /node_modules/@eventra_dev/eventra-sdk/dist/index.mjs both resolve.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const TYPES = {
  ".html": "text/html",
  ".mjs": "application/javascript",
  ".js": "application/javascript",
  ".json": "application/json",
};

export function createStaticServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath);
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403);
      res.end();
      return;
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("not found: " + urlPath);
        return;
      }
      const ext = path.extname(filePath);
      res.writeHead(200, { "content-type": TYPES[ext] ?? "application/octet-stream" });
      res.end(data);
    });
  });
  return {
    server,
    listen(port) {
      return new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
    },
    close() {
      return new Promise((resolve) => server.close(resolve));
    },
  };
}
