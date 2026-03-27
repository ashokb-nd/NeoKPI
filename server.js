#!/usr/bin/env node
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { URL } from "node:url";

const PORT = Number(process.env.PORT || 8090);
let dataDir = process.env.ALERT_DATA_DIR || path.join(os.homedir(), "neokpi");
const STATIC_DIR = path.resolve(".");
const MARKR_EDGE_DIR = path.resolve("markrEdge");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".mp4": "video/mp4",
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Request body too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function sanitizeAlertId(value) {
  if (!value || typeof value !== "string") return null;
  if (value.includes("/") || value.includes("\\") || value.includes("..")) return null;
  return value.trim();
}

function streamVideo(req, res, filePath, stat) {
  const range = req.headers.range;
  if (!range) {
    res.writeHead(200, {
      "Content-Type": "video/mp4",
      "Content-Length": stat.size,
      "Accept-Ranges": "bytes",
    });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  const match = range.match(/bytes=(\d+)-(\d*)/);
  if (!match) {
    res.writeHead(416);
    res.end();
    return;
  }

  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : stat.size - 1;

  if (start >= stat.size || end >= stat.size || start > end) {
    res.writeHead(416, { "Content-Range": `bytes */${stat.size}` });
    res.end();
    return;
  }

  res.writeHead(206, {
    "Content-Type": "video/mp4",
    "Content-Length": end - start + 1,
    "Content-Range": `bytes ${start}-${end}/${stat.size}`,
    "Accept-Ranges": "bytes",
  });

  fs.createReadStream(filePath, { start, end }).pipe(res);
}

function getAlertDirs() {
  if (!fs.existsSync(dataDir)) return [];
  return fs
    .readdirSync(dataDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function getAlertSummary(alertId) {
  const alertDir = path.join(dataDir, alertId);
  const files = fs.readdirSync(alertDir, { withFileTypes: true });
  const videos = files
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".mp4"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const metadataPath = path.join(alertDir, "metadata.txt");
  const metadataExists = fs.existsSync(metadataPath);
  const metadataPreview = metadataExists
    ? fs.readFileSync(metadataPath, "utf8").slice(0, 400)
    : "";

  return {
    alertId,
    videos,
    hasMetadata: metadataExists,
    metadataPreview,
  };
}

function handleApi(req, res, urlObj) {
  if (urlObj.pathname === "/api/data-dir" && req.method === "POST") {
    return readJsonBody(req)
      .then((payload) => {
        const nextDir = typeof payload.dataDir === "string" ? payload.dataDir.trim() : "";
        if (!nextDir) return sendJson(res, 400, { error: "dataDir is required" });

        const resolved = path.resolve(nextDir);
        if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
          return sendJson(res, 400, { error: "Directory does not exist" });
        }

        dataDir = resolved;
        return sendJson(res, 200, { ok: true, dataDir });
      })
      .catch((err) => sendJson(res, 400, { error: err.message }));
  }

  if (urlObj.pathname === "/api/alerts") {
    const alerts = getAlertDirs().map((alertId) => getAlertSummary(alertId));
    return sendJson(res, 200, {
      dataDir,
      count: alerts.length,
      alerts,
    });
  }

  const detailMatch = urlObj.pathname.match(/^\/api\/alerts\/([^/]+)$/);
  if (detailMatch) {
    const alertId = sanitizeAlertId(decodeURIComponent(detailMatch[1]));
    if (!alertId) return sendJson(res, 400, { error: "Invalid alert id" });

    const alertDir = path.join(dataDir, alertId);
    if (!fs.existsSync(alertDir)) {
      return sendJson(res, 404, { error: "Alert directory not found" });
    }

    const summary = getAlertSummary(alertId);
    const metadataPath = path.join(alertDir, "metadata.txt");
    const metadataText = summary.hasMetadata ? fs.readFileSync(metadataPath, "utf8") : "";

    return sendJson(res, 200, {
      ...summary,
      metadataText,
      videoUrls: summary.videos.map((name) => `/data/${encodeURIComponent(alertId)}/${encodeURIComponent(name)}`),
    });
  }

  sendJson(res, 404, { error: "Not found" });
}

function serveStatic(res, pathname) {
  const isAlertDebugRoute = pathname === "/alert-debug" || pathname.startsWith("/alert-debug/");
  const requested = pathname === "/" || isAlertDebugRoute ? "/index.html" : pathname;
  const safePath = path.normalize(requested).replace(/^\.\.(\/|\\|$)+/, "");
  const filePath = path.join(STATIC_DIR, safePath);

  if (!filePath.startsWith(STATIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const mimeType = MIME_TYPES[ext] || "application/octet-stream";
  const data = fs.readFileSync(filePath);
  res.writeHead(200, {
    "Content-Type": mimeType,
    "Content-Length": data.length,
  });
  res.end(data);
}

function serveData(req, res, urlObj) {
  const match = urlObj.pathname.match(/^\/data\/([^/]+)\/([^/]+)$/);
  if (!match) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const alertId = sanitizeAlertId(decodeURIComponent(match[1]));
  const fileName = decodeURIComponent(match[2]);

  if (!alertId || !fileName || fileName.includes("/") || fileName.includes("..") || fileName.includes("\\")) {
    res.writeHead(400);
    res.end("Invalid path");
    return;
  }

  const filePath = path.join(dataDir, alertId, fileName);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404);
    res.end("File not found");
    return;
  }

  const stat = fs.statSync(filePath);
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".mp4") {
    return streamVideo(req, res, filePath, stat);
  }

  const mimeType = MIME_TYPES[ext] || "application/octet-stream";
  res.writeHead(200, {
    "Content-Type": mimeType,
    "Content-Length": stat.size,
  });
  fs.createReadStream(filePath).pipe(res);
}

function serveMarkrEdgeModule(res, pathname) {
  const requestedPath = decodeURIComponent(pathname.replace(/^\/markrEdge\//, ""));
  const safePath = path.normalize(requestedPath).replace(/^\.\.(\/|\\|$)+/, "");
  const filePath = path.join(MARKR_EDGE_DIR, safePath);

  if (!filePath.startsWith(MARKR_EDGE_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const mimeType = MIME_TYPES[ext] || "application/octet-stream";
  const data = fs.readFileSync(filePath);
  res.writeHead(200, {
    "Content-Type": mimeType,
    "Content-Length": data.length,
  });
  res.end(data);
}

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);

  if (urlObj.pathname.startsWith("/markrEdge/")) {
    return serveMarkrEdgeModule(res, urlObj.pathname);
  }

  if (urlObj.pathname.startsWith("/api/")) {
    return handleApi(req, res, urlObj);
  }

  if (urlObj.pathname.startsWith("/data/")) {
    return serveData(req, res, urlObj);
  }

  return serveStatic(res, urlObj.pathname);
});

server.listen(PORT, () => {
  console.log(`Mock alert site running at http://localhost:${PORT}`);
  console.log(`Loading alert data from: ${dataDir}`);
});
