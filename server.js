/**
 * OLIMPO PODS IGNITE — Servidor Local
 * 
 * Zero dependências externas! Usa apenas módulos nativos do Node.js.
 * Serve arquivos estáticos + proxy para a API ZuckPay (evita CORS).
 * 
 * USO: node server.js
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

// ── Configurações ──
const PORT = 3000;
const STATIC_DIR = __dirname;

// ── ZuckPay Credentials ──
const ZUCKPAY_CLIENT_ID = 'kaiquejucas3_6052315761';
const ZUCKPAY_CLIENT_SECRET = '13e8d60b1aebd51a1de6080ab6d1641c45b6671677dfc74b5da99f039929ca10';
const ZUCKPAY_AUTH = 'Basic ' + Buffer.from(`${ZUCKPAY_CLIENT_ID}:${ZUCKPAY_CLIENT_SECRET}`).toString('base64');

// ── MIME Types ──
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.mp4': 'video/mp4',
};

// ── Helper: Read request body ──
function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => resolve(body));
        req.on('error', reject);
    });
}

// ── Helper: Proxy request to ZuckPay ──
function proxyToZuckPay(targetUrl, payload, res) {
    const parsed = new URL(targetUrl);

    const options = {
        hostname: parsed.hostname,
        port: 443,
        path: parsed.pathname + parsed.search,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': ZUCKPAY_AUTH,
            'User-Agent': 'OlimpoPods/2.0 (Node.js)',
            'Content-Length': Buffer.byteLength(payload),
        },
    };

    const proxyReq = https.request(options, (proxyRes) => {
        let data = '';
        proxyRes.on('data', chunk => data += chunk);
        proxyRes.on('end', () => {
            console.log(`   ↳ ZuckPay HTTP ${proxyRes.statusCode} | Response: ${data.substring(0, 200)}`);

            // Always return valid JSON to the browser
            let jsonResponse;
            try {
                jsonResponse = JSON.parse(data);
            } catch (e) {
                // ZuckPay returned non-JSON (HTML error page, text, etc.)
                jsonResponse = {
                    status: 'error',
                    http_code: proxyRes.statusCode,
                    message: `API Error ${proxyRes.statusCode}`,
                    raw: data.substring(0, 500)
                };
            }

            // If ZuckPay returned an error status, ensure it's marked as error
            if (proxyRes.statusCode >= 400 && !jsonResponse.status) {
                jsonResponse.status = 'error';
                jsonResponse.http_code = proxyRes.statusCode;
            }

            res.writeHead(200, {
                'Content-Type': 'application/json; charset=utf-8',
                'Access-Control-Allow-Origin': '*',
            });
            res.end(JSON.stringify(jsonResponse));
        });
    });

    proxyReq.on('error', (err) => {
        console.error('❌ Proxy error:', err.message);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'error',
            message: 'Conexão com ZuckPay falhou: ' + err.message
        }));
    });

    // Timeout de 45 segundos
    proxyReq.setTimeout(45000, () => {
        proxyReq.destroy();
        res.writeHead(504, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'error',
            message: 'Timeout: ZuckPay não respondeu em 45 segundos'
        }));
    });

    proxyReq.write(payload);
    proxyReq.end();
}

// ── Main Server ──
const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = decodeURIComponent(parsedUrl.pathname);

    // ── CORS Preflight ──
    if (req.method === 'OPTIONS') {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        });
        res.end();
        return;
    }

    // ── API Routes (Proxy) ──
    if (req.method === 'POST' && pathname === '/api/pix/qrcode') {
        // Generate PIX QR Code
        const body = await readBody(req);
        console.log('🔄 PIX QRCode request...');
        proxyToZuckPay('https://zuckpay.com.br/conta/v3/pix/qrcode', body, res);
        return;
    }

    if (req.method === 'POST' && pathname.startsWith('/api/pix/status/')) {
        // Check payment status
        const orderId = pathname.replace('/api/pix/status/', '');
        const body = await readBody(req);
        console.log('🔍 PIX Status check for:', orderId);
        proxyToZuckPay(`https://zuckpay.com.br/conta/v3/pix/status/${orderId}`, body, res);
        return;
    }

    if (req.method === 'GET' && pathname === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'online', message: 'Servidor Olimpo Ignite ativo!' }));
        return;
    }

    // ── Static File Serving ──
    let filePath = pathname === '/' ? '/index.html' : pathname;
    filePath = path.join(STATIC_DIR, filePath);

    // Security: prevent directory traversal
    if (!filePath.startsWith(STATIC_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end('<h1>404 — Arquivo não encontrado</h1>');
            } else {
                res.writeHead(500);
                res.end('Erro interno do servidor');
            }
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log('');
    console.log('══════════════════════════════════════════════════');
    console.log('   🔥  OLIMPO PODS IGNITE — SERVIDOR ATIVO  🔥  ');
    console.log('══════════════════════════════════════════════════');
    console.log('');
    console.log(`   🌐 Site:  http://localhost:${PORT}`);
    console.log(`   📡 API:   http://localhost:${PORT}/api/pix/qrcode`);
    console.log('');
    console.log('   Para parar: Ctrl+C ou feche esta janela');
    console.log('══════════════════════════════════════════════════');
    console.log('');

    // Auto-open browser
    const { exec } = require('child_process');
    exec(`open http://localhost:${PORT}`);
});
