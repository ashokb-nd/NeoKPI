#!/usr/bin/env node
/**
 * Simple Node.js HTTP server for testing UIManager
 * Usage: node test-server.js [port]
 * Default port: 8080
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = process.argv[2] || 8080;

// MIME types for different file extensions
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);
  let pathname = parsedUrl.pathname;
  
  // Default to index.html if accessing root
  if (pathname === '/') {
    pathname = '/test-ui.html';
  }
  
  const filePath = path.join(__dirname, pathname);
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = mimeTypes[ext] || 'application/octet-stream';
  
  // Add CORS headers for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', mimeType);
  
  // Handle OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Check if file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      res.writeHead(404);
      res.end('404 - File Not Found');
      console.log(`❌ 404: ${pathname}`);
      return;
    }
    
    // Read and serve the file
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('500 - Internal Server Error');
        console.log(`❌ 500: ${err.message}`);
        return;
      }
      
      res.writeHead(200);
      res.end(data);
      console.log(`✅ ${req.method} ${pathname} (${mimeType})`);
    });
  });
});

server.listen(port, () => {
  console.log('🚀 Test server running!');
  console.log(`📂 Serving from: ${__dirname}`);
  console.log(`🔗 Open: http://localhost:${port}/test-ui.html`);
  console.log('Press Ctrl+C to stop\n');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`❌ Port ${port} is already in use. Try a different port:`);
    console.log(`   node test-server.js ${port + 1}`);
  } else {
    console.log('❌ Server error:', err.message);
  }
});

process.on('SIGINT', () => {
  console.log('\n👋 Server stopped');
  process.exit(0);
});
