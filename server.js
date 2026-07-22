import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const distDir = join(process.cwd(), "dist");

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

function resolveFile(url = "/") {
  const cleanPath = normalize(decodeURIComponent(url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
  const requestedPath = join(distDir, cleanPath);

  if (existsSync(requestedPath) && statSync(requestedPath).isFile()) {
    return requestedPath;
  }

  return join(distDir, "index.html");
}

function createStaticServer() {
  return createServer((request, response) => {
    const filePath = resolveFile(request.url);
    const contentType = mimeTypes[extname(filePath)] || "application/octet-stream";

    response.writeHead(200, {
      "Cache-Control": filePath.endsWith("index.html") ? "no-cache" : "public, max-age=31536000, immutable",
      "Content-Type": contentType
    });

    createReadStream(filePath).pipe(response);
  });
}

const ports = Array.from(new Set([process.env.PORT, "4173", "8080"].filter(Boolean).map(Number)));

ports.forEach((port) => {
  const server = createStaticServer();

  server.on("error", (error) => {
    if (error.code !== "EADDRINUSE") {
      console.error(`Static server failed on port ${port}`, error);
      process.exitCode = 1;
    }
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`Doinglight sales panel listening on port ${port}`);
  });
});
