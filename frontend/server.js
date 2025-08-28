import express from 'express';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Handle all routes by serving index.html (for SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// HTTPS configuration
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'certs', 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'certs', 'cert.pem'))
};

const port = 5173;

https.createServer(httpsOptions, app).listen(port, () => {
  console.log(`HTTPS Server running at https://localhost:${port}`);
});
