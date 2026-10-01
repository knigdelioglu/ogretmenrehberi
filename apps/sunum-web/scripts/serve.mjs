// dist/ klasörünü yerelde önizlemek için küçük statik sunucu (bağımlılıksız).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");
const port = Number(process.env.PORT || 5180);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".bin": "application/octet-stream",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml"
};

const tomlPath = path.resolve(distDir, "../../../netlify.toml");
const toml = fs.existsSync(tomlPath) ? fs.readFileSync(tomlPath, "utf8") : "";
const csp = /Content-Security-Policy = "([^"]+)"/.exec(toml)?.[1] ?? "";

if (!fs.existsSync(distDir)) {
  console.error("dist/ bulunamadı. Önce: npm run build");
  process.exit(1);
}

http
  .createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let file = path.join(distDir, urlPath === "/" ? "index.html" : urlPath);
    if (!file.startsWith(distDir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404, { "Cache-Control": "no-cache" });
      res.end("Dosya bulunamadı.");
      return;
    }
    res.writeHead(200, {
      "Content-Type": types[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-cache",
      // netlify.toml ile aynı güvenlik politikası: yerelde de aynı kısıtlarla denenir
      "Content-Security-Policy": csp
    });
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, "127.0.0.1", () => {
    console.log(`Sunum: http://127.0.0.1:${port}`);
  });
