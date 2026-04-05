const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve(process.argv[2] || "dist");
const port = Number(process.argv[3] || 8081);
const host = process.argv[4] || "127.0.0.1";

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
};

function sendFile(filePath, response) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.statusCode = 500;
      response.end("Internal Server Error");
      return;
    }

    response.statusCode = 200;
    response.setHeader(
      "Content-Type",
      MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream",
    );
    response.end(data);
  });
}

http
  .createServer((request, response) => {
    const requestPath = decodeURIComponent((request.url || "/").split("?")[0]);
    const relativePath = requestPath === "/" ? "/index.html" : requestPath;
    const candidatePath = path.resolve(root, `.${relativePath}`);
    const safePath = candidatePath.startsWith(root) ? candidatePath : root;

    fs.stat(safePath, (error, stats) => {
      if (!error && stats.isFile()) {
        sendFile(safePath, response);
        return;
      }

      sendFile(path.join(root, "index.html"), response);
    });
  })
  .listen(port, host, () => {
    console.log(`Serving ${root} at http://${host}:${port}`);
  });
