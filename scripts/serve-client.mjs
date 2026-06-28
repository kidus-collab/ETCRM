import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const root = join(process.cwd(), "client", "dist");
const port = Number(process.env.CLIENT_PORT || 5173);

const contentTypes = {
  ".css": "text/css",
  ".html": "text/html",
  ".js": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml"
};

function resolveFile(url) {
  const safePath = normalize(decodeURIComponent(url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
  const requested = join(root, safePath === "/" ? "index.html" : safePath);

  if (existsSync(requested) && statSync(requested).isFile()) return requested;
  return join(root, "index.html");
}

createServer((req, res) => {
  const file = resolveFile(req.url || "/");
  res.setHeader("Content-Type", contentTypes[extname(file)] || "application/octet-stream");
  createReadStream(file)
    .on("error", () => {
      res.statusCode = 500;
      res.end("Unable to read file");
    })
    .pipe(res);
}).listen(port, "127.0.0.1", () => {
  console.log(`ETCRM client running on http://127.0.0.1:${port}`);
});
