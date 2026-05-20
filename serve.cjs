const http = require("http");
const fs = require("fs");
const path = require("path");
const root = __dirname;
const port = 5173;
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};
http
  .createServer((req, res) => {
    res.setHeader("Cache-Control", "no-store");
    let url = decodeURIComponent(req.url.split("?")[0]);
    if (url === "/") url = "/index.html";
    const file = path.join(root, url);
    if (!file.startsWith(root)) {
      res.statusCode = 403;
      return res.end();
    }
    fs.readFile(file, (err, buf) => {
      if (err) {
        res.statusCode = 404;
        return res.end(String(err.code));
      }
      res.setHeader(
        "Content-Type",
        types[path.extname(file)] || "application/octet-stream",
      );
      res.end(buf);
    });
  })
  .listen(port, () => console.log("listening on", port));
