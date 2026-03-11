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
const ZUCKPAY_CLIENT_ID = 'sb_publishable_vF_WZOOcya33E4cr64mWkQ__B5QAhFc';
const ZUCKPAY_CLIENT_SECRET = 'sb_secret_cMcD4XPobEb4M7JREQTkeQ__j6rN4th';
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
    if (req.method === 'GET' && pathname === '/api/location') {
        console.log('🌍 Fetching location...');
        https.get('https://ipapi.co/json/', (apiRes) => {
            let data = '';
            apiRes.on('data', chunk => data += chunk);
            apiRes.on('end', () => {
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
                res.end(data);
            });
        }).on('error', (err) => {
            res.writeHead(500);
            res.end(JSON.stringify({ status: 'error', message: err.message }));
        });
        return;
    }

    if (req.method === 'POST' && pathname === '/api/newsletter') {
        const body = await readBody(req);
        let email;
        try {
            const data = JSON.parse(body);
            email = data.email;
        } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', message: 'E-mail inválido' }));
            return;
        }

        console.log(`📧 Newsletter: Novo lead cadastrado -> ${email}`);

        // Aqui você integraria com Resend, SendGrid, etc.
        // Por enquanto, simulamos o sucesso.
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'success',
            message: 'Bem-vindo à família Olimpo! Você receberá nossas novidades em breve.'
        }));
        return;
    }

    // ── AUTH ROUTES ──
    const USERS_FILE = path.join(STATIC_DIR, 'users.json');

    function getUsers() {
        if (!fs.existsSync(USERS_FILE)) return [];
        try {
            return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        } catch (e) { return []; }
    }

    function saveUsers(users) {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 4));
    }

    if (req.method === 'GET' && pathname === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'online', message: 'Servidor Olimpo Ignite ativo!' }));
        return;
    }

    if (req.method === 'POST' && pathname === '/api/auth/signup') {
        const body = await readBody(req);
        let userData;
        try {
            userData = JSON.parse(body);
        } catch (e) {
            res.writeHead(400); res.end(JSON.stringify({ status: 'error', message: 'Dados inválidos' }));
            return;
        }

        const users = getUsers();
        if (users.find(u => u.email === userData.email)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', message: 'Este e-mail já está cadastrado.' }));
            return;
        }

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const newUser = {
            ...userData,
            verified: false,
            verificationCode: verificationCode,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        saveUsers(users);

        console.log('');
        console.log('📱 [WHATSAPP/SMS SIMULADO]');
        console.log(`Para: ${userData.phone}`);
        console.log(`Mensagem: Seu código de acesso Olimpo Pods é: ${verificationCode}`);
        console.log('────────────────────────────────────────');
        console.log('📧 [E-MAIL SIMULADO]');
        console.log(`Para: ${userData.email}`);
        console.log(`Assunto: Seu código de verificação Olimpo Pods`);
        console.log(`Código: ${verificationCode}`);
        console.log('════════════════════════════════════════');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', message: 'Cadastro realizado! Enviamos o código para seu e-mail e celular.' }));
        return;
    }

    if (req.method === 'POST' && pathname === '/api/auth/verify') {
        const body = await readBody(req);
        const { email, code } = JSON.parse(body);
        const users = getUsers();
        const user = users.find(u => u.email === email);

        if (user && user.verificationCode === code) {
            user.verified = true;
            delete user.verificationCode;
            saveUsers(users);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'success', message: 'Conta verificada com sucesso! Bem-vindo.' }));
        } else {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', message: 'Código de verificação incorreto.' }));
        }
        return;
    }

    if (req.method === 'POST' && pathname === '/api/auth/login') {
        const body = await readBody(req);
        const { email, password } = JSON.parse(body);
        const users = getUsers();
        const user = users.find(u => u.email === email && u.password === password);

        if (!user) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', message: 'E-mail ou senha incorretos.' }));
        } else if (!user.verified) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', message: 'Por favor, verifique seu e-mail antes de logar.' }));
        } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'success',
                message: 'Login realizado!',
                user: { name: user.fullname, email: user.email }
            }));
        }
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
