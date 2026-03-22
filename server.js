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

    // ── SHIPPING ROUTES ──
    if (req.method === 'POST' && pathname === '/api/shipping') {
        const body = await readBody(req);
        let shippingData;
        try {
            shippingData = JSON.parse(body);
        } catch (e) {
            res.writeHead(400); res.end(JSON.stringify({ status: 'error', message: 'Dados de frete inválidos' }));
            return;
        }

        const { calcularPrecoPrazo } = require('correios-brasil');

        // CEP de Origem Fixo (CEP da Empresa Central) 
        const CEP_ORIGEM = '01001000'; // Exemplo CEP SP Centro, trocar se necessário
        const CEP_DESTINO = shippingData.cep.replace(/\D/g, '');

        if (!CEP_DESTINO || CEP_DESTINO.length !== 8) {
            res.writeHead(400); res.end(JSON.stringify({ status: 'error', message: 'CEP de destino inválido' }));
            return;
        }

        // Correios Args Setup
        // format: 1 is Box
        const correiosArgsPac = {
            sCepOrigem: CEP_ORIGEM,
            sCepDestino: CEP_DESTINO,
            nVlPeso: shippingData.weight || '1',
            nCdFormato: '1',
            nVlComprimento: '20',
            nVlAltura: '20',
            nVlLargura: '20',
            nCdServico: ['04510'], // PAC
            nVlDiametro: '0',
        };

        const correiosArgsSedex = {
            ...correiosArgsPac,
            nCdServico: ['04014'], // SEDEX
        };

        console.log(`🚚 Calculando frete para CEP: ${CEP_DESTINO}`);

        try {
            const [pacResult, sedexResult] = await Promise.all([
                calcularPrecoPrazo(correiosArgsPac),
                calcularPrecoPrazo(correiosArgsSedex)
            ]);

            const options = [];

            if (pacResult && pacResult[0] && pacResult[0].Valor) {
                options.push({
                    name: 'PAC',
                    price: parseFloat(pacResult[0].Valor.replace(',', '.')),
                    deadline: `${pacResult[0].PrazoEntrega} dias úteis`
                });
            }

            if (sedexResult && sedexResult[0] && sedexResult[0].Valor) {
                options.push({
                    name: 'SEDEX',
                    price: parseFloat(sedexResult[0].Valor.replace(',', '.')),
                    deadline: `${sedexResult[0].PrazoEntrega} dias úteis`
                });
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'success', options }));
        } catch (err) {
            console.error('Erro Correios API:', err);
            res.writeHead(500); res.end(JSON.stringify({ status: 'error', message: 'Erro na integração com os Correios' }));
        }

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

    // ── ADMIN & ORDERS ROUTES ──
    const ORDERS_FILE = path.join(STATIC_DIR, 'orders.json');

    function getOrders() {
        if (!fs.existsSync(ORDERS_FILE)) return [];
        try {
            return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
        } catch (e) { return []; }
    }

    function saveOrders(orders) {
        fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 4));
    }

    if (req.method === 'POST' && pathname === '/api/orders/new') {
        const body = await readBody(req);
        let orderData;
        try {
            orderData = JSON.parse(body);
        } catch (e) {
            res.writeHead(400); res.end(JSON.stringify({ status: 'error', message: 'Dados inválidos' }));
            return;
        }

        const orders = getOrders();
        // Prevent duplicates
        if (!orders.find(o => o.id === orderData.id)) {
            orders.push(orderData);
            saveOrders(orders);
            console.log(`📦 Novo pedido recebido #${orderData.id}`);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success' }));
        return;
    }

    if (req.method === 'GET' && pathname === '/api/admin/data') {
        let products = [];
        try {
            const PRODUCTS_FILE = path.join(STATIC_DIR, 'products.json');
            if (fs.existsSync(PRODUCTS_FILE)) {
                products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
            }
        } catch(e) {}

        const payload = {
            status: 'success',
            users: getUsers(),
            orders: getOrders(),
            products: products
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(payload));
        return;
    }

    if (req.method === 'POST' && pathname === '/api/admin/dispatch') {
        const body = await readBody(req);
        const { orderId, trackingCode } = JSON.parse(body);
        const orders = getOrders();
        const order = orders.find(o => o.id === orderId);

        if (!order) {
            res.writeHead(404); res.end(JSON.stringify({ status: 'error', message: 'Pedido não encontrado' }));
            return;
        }

        // Mark as dispatched
        order.status = 'Enviado';
        saveOrders(orders);

        // Nodemailer Setup
        const nodemailer = require('nodemailer');
        
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                // To DO: Replace with real credentials inside server.js or .env
                user: 'SEU_EMAIL_AQUI@gmail.com',
                pass: 'SUA_SENHA_DE_APP_AQUI'
            }
        });

        const customerFirstName = (order.customer?.name || 'Cliente').split(' ')[0];

        const mailOptions = {
            from: 'Olimpo Pods Ignite <noreply@olimpopodsignite.com>',
            to: order.customer?.email,
            subject: `Seu pedido #${order.id} foi Despachado! 🚀`,
            html: `
                <div style="font-family: Arial, sans-serif; color: #222; max-width: 600px; margin: 0 auto; background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #eee;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h2 style="color: #ff0b55; text-transform: uppercase;">Pedido Despachado!</h2>
                    </div>
                    <p style="font-size: 16px;">Olá <strong>${customerFirstName}</strong>,</p>
                    <p style="font-size: 15px; color: #555; line-height: 1.5;">O seu pedido <strong>#${order.id}</strong> foi completamente separado, embalado e está a caminho! Aqui está o seu código de rastreamento para você acompanhar a entrega:</p>
                    
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center; border: 2px dashed #ddd;">
                        <p style="margin: 0; font-size: 14px; color: #888; text-transform: uppercase;">CÓDIGO DE RASTREIO</p>
                        <p style="margin: 10px 0 0 0; font-size: 28px; font-weight: 900; color: #000; letter-spacing: 2px;">${trackingCode}</p>
                    </div>

                    <p style="font-size: 14px; color: #777;">Você pode rastrear essa remessa diretamente no site da transportadora responsável ou dos Correios.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                    <p style="font-size: 12px; color: #999; text-align: center;">Olimpo Pods | Obrigado pela preferência e confiança.</p>
                </div>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log(`✉️  E-mail de rastreio Enviado para ${order.customer?.email}`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'success', message: 'E-mail enviado e status do pedido atualizado!' }));
        } catch (err) {
            console.error('Erro NodeMailer:', err);
            // Updates locally, but alerts frontend about credentials
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'success', message: 'Separado com sucesso! Mas o e-mail falhou por causa das credenciais não configuradas (Gmail).' }));
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
