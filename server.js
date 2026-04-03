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
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');

// ── Configurações ──
const PORT = 3001;
const STATIC_DIR = __dirname;

// ── ZuckPay Credentials ──
const ZUCKPAY_CLIENT_ID = 'kaiquejucas3_6052315761';
const ZUCKPAY_CLIENT_SECRET = '13e8d60b1aebd51a1de6080ab6d1641c45b6671677dfc74b5da99f039929ca10';
const ZUCKPAY_AUTH = 'Basic ' + Buffer.from(`${ZUCKPAY_CLIENT_ID}:${ZUCKPAY_CLIENT_SECRET}`).toString('base64');

// ── Ensure PDF directory exists ──
const PDF_DIR = path.join(STATIC_DIR, 'orders_pdf');
if (!fs.existsSync(PDF_DIR)) {
    fs.mkdirSync(PDF_DIR, { recursive: true });
}


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
    '.pdf': 'application/pdf',
};

// ── Nodemailer Transporter ──
// IMPORTANTE: O usuário deve configurar estas credenciais no arquivo local
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'SEU_EMAIL_AQUI@gmail.com',
        pass: 'SUA_SENHA_DE_APP_AQUI'
    }
});

function getOlimpoEmailWrapper(title, content) {
    return `
    <div style="background-color: #050505; padding: 40px 10px; font-family: Arial, Helvetica, sans-serif; color: #ffffff; margin: 0;">
        <div style="max-width: 560px; margin: 0 auto; background: #0a0a0a; border-radius: 16px; border: 1px solid #1a1a1a; overflow: hidden;">
            <!-- Header: Text-only, no logo -->
            <div style="padding: 35px 20px 25px; text-align: center; border-bottom: 1px solid #1a1a1a;">
                 <div style="font-size: 26px; font-weight: 900; letter-spacing: 5px; color: #ffffff; text-transform: uppercase;">
                    <span style="color: #ff0b55;">OLIMPO</span> PODS
                 </div>
            </div>
            <!-- Body -->
            <div style="padding: 40px 30px;">
                <h2 style="color: #ff0b55; font-size: 18px; text-transform: uppercase; letter-spacing: 2px; margin-top: 0; margin-bottom: 25px; text-align: center; font-weight: 800;">${title}</h2>
                <div style="font-size: 15px; line-height: 1.7; color: #cccccc;">
                    ${content}
                </div>
            </div>
            <!-- Footer -->
            <div style="padding: 25px; text-align: center; background: #080808; font-size: 11px; color: #555; border-top: 1px solid #1a1a1a;">
                <p style="margin: 0;">&copy; 2026 Olimpo Pods. Todos os direitos reservados.</p>
                <p style="margin: 5px 0 0; color: #444;">CNPJ 57.220.134/0001-35</p>
            </div>
        </div>
    </div>`;
}

async function sendOlimpoEmail(to, subject, title, htmlContent) {
    const mailOptions = {
        from: '"Olimpo Pods" <noreply@olimpopodsignite.com>',
        to,
        subject,
        html: getOlimpoEmailWrapper(title, htmlContent)
    };
    try {
        await transporter.sendMail(mailOptions);
        console.log(`✉️  E-mail enviado para: ${to}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Erro no envio de e-mail:', error);
        return { success: false, error };
    }
}

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
    let pathname = decodeURIComponent(parsedUrl.pathname);
    
    // Standardize: remove trailing slash for comparison
    if (pathname.length > 1 && pathname.endsWith('/')) {
        pathname = pathname.slice(0, -1);
    }
    
    // Explicitly use pathname for static files
    const staticPathname = parsedUrl.pathname;

    // Log API requests
    if (pathname.startsWith('/api')) {
        console.log(`[API REQUEST] ${req.method} ${pathname}`);
    }


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

    const LEADS_FILE = path.join(STATIC_DIR, 'leads.json');

    function getLeads() {
        if (!fs.existsSync(LEADS_FILE)) return [];
        try {
            return JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
        } catch (e) { return []; }
    }

    function saveLeads(leads) {
        fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 4));
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

        // Save to leads.json
        const leads = getLeads();
        if (!leads.find(l => l.email === email)) {
            leads.push({
                email,
                type: 'newsletter',
                createdAt: new Date().toISOString()
            });
            saveLeads(leads);
        }

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

        const CEP_DESTINO = (shippingData.cep || '').replace(/\D/g, '');
        const peso = parseFloat(shippingData.weight) || 1; // kg

        if (!CEP_DESTINO || CEP_DESTINO.length !== 8) {
            res.writeHead(400); res.end(JSON.stringify({ status: 'error', message: 'CEP de destino inválido' }));
            return;
        }

        // ── CEP Prefix → Approximate Coordinates (lat, lon) ──
        // Origin: São Paulo Centro (CEP 01001-000)
        const ORIGIN = { lat: -23.5505, lon: -46.6333 };

        const CEP_COORDS = {
            '0': { lat: -23.5505, lon: -46.6333 },  // SP Capital
            '1': { lat: -22.9068, lon: -43.1729 },  // RJ Capital
            '2': { lat: -22.9068, lon: -43.1729 },  // RJ / ES
            '3': { lat: -19.9167, lon: -43.9345 },  // MG
            '4': { lat: -12.9714, lon: -38.5124 },  // BA / SE
            '5': { lat: -8.0476, lon: -34.8770 },   // PE / AL / PB / RN
            '6': { lat: -3.7172, lon: -38.5433 },   // CE / PI / MA / PA
            '7': { lat: -15.7939, lon: -47.8828 },  // DF / GO / TO
            '8': { lat: -25.4284, lon: -49.2733 },  // PR / SC
            '9': { lat: -30.0346, lon: -51.2177 },  // RS
        };

        // Sub-prefix refinement for more accuracy
        const CEP_COORDS_2 = {
            '01': { lat: -23.5505, lon: -46.6333 }, // SP Centro
            '04': { lat: -23.6100, lon: -46.6600 }, // SP Sul
            '05': { lat: -23.5300, lon: -46.7100 }, // SP Oeste
            '08': { lat: -23.5200, lon: -46.4800 }, // SP Leste
            '13': { lat: -22.9056, lon: -47.0608 }, // Campinas
            '14': { lat: -21.1767, lon: -47.8208 }, // Ribeirão Preto
            '15': { lat: -20.8113, lon: -49.3758 }, // São José Rio Preto
            '17': { lat: -22.3246, lon: -49.0871 }, // Bauru
            '19': { lat: -22.1256, lon: -51.3863 }, // Presidente Prudente
            '20': { lat: -22.9068, lon: -43.1729 }, // RJ Centro
            '21': { lat: -22.8500, lon: -43.3000 }, // RJ Norte
            '22': { lat: -22.9700, lon: -43.1900 }, // RJ Sul
            '24': { lat: -22.8833, lon: -43.1036 }, // Niterói
            '29': { lat: -20.3222, lon: -40.3381 }, // Vitória / ES
            '30': { lat: -19.9167, lon: -43.9345 }, // BH
            '35': { lat: -19.4500, lon: -44.2500 }, // MG Interior
            '38': { lat: -18.9188, lon: -48.2768 }, // Uberlândia
            '40': { lat: -12.9714, lon: -38.5124 }, // Salvador
            '49': { lat: -10.9091, lon: -37.0677 }, // Aracaju
            '50': { lat: -8.0476, lon: -34.8770 },  // Recife
            '57': { lat: -9.6658, lon: -35.7353 },  // Maceió
            '58': { lat: -7.1195, lon: -34.8450 },  // João Pessoa
            '59': { lat: -5.7945, lon: -35.2110 },  // Natal
            '60': { lat: -3.7172, lon: -38.5433 },  // Fortaleza
            '63': { lat: -6.3600, lon: -39.2800 },  // CE Interior (Iguatu)
            '64': { lat: -5.0892, lon: -42.8019 },  // Teresina
            '65': { lat: -2.5297, lon: -44.2825 },  // São Luís
            '66': { lat: -1.4558, lon: -48.5024 },  // Belém
            '69': { lat: -3.1190, lon: -60.0217 },  // Manaus
            '70': { lat: -15.7939, lon: -47.8828 }, // Brasília
            '72': { lat: -15.8500, lon: -48.0500 }, // DF Entorno
            '74': { lat: -16.6869, lon: -49.2648 }, // Goiânia
            '77': { lat: -10.1689, lon: -48.3317 }, // Palmas
            '78': { lat: -15.5960, lon: -56.0966 }, // Cuiabá
            '79': { lat: -20.4697, lon: -54.6201 }, // Campo Grande
            '80': { lat: -25.4284, lon: -49.2733 }, // Curitiba
            '85': { lat: -24.9554, lon: -53.4560 }, // Cascavel PR
            '86': { lat: -23.3045, lon: -51.1696 }, // Londrina
            '87': { lat: -23.4205, lon: -51.9333 }, // Maringá
            '88': { lat: -27.5954, lon: -48.5480 }, // Florianópolis
            '89': { lat: -26.3044, lon: -48.8487 }, // Joinville
            '90': { lat: -30.0346, lon: -51.2177 }, // Porto Alegre
            '95': { lat: -29.1681, lon: -51.1794 }, // Caxias do Sul
        };

        // Haversine formula to calculate distance in km
        function haversineKm(lat1, lon1, lat2, lon2) {
            const R = 6371;
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat / 2) ** 2 +
                      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                      Math.sin(dLon / 2) ** 2;
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        }

        // ── Advanced Integrated Shipping ──
        const qty = Math.ceil(peso / 0.1) || 1; // Reconstruct quantity from weight (approx)
        const prefixDigit = parseInt(CEP_DESTINO.substring(0, 1));
        
        // Packaging Logic (Same as frontend)
        const side = Math.ceil(Math.sqrt(qty));
        const L = side * 5;
        const W = side * 3;
        const layers = Math.ceil(qty / (side * side));
        const H = Math.max(5, Math.ceil(layers / 2) * 5);
        const cubicWeight = (L * W * H) / 6000;
        const totalWeight = qty * 0.1;
        const finalWeight = Math.max(totalWeight, cubicWeight);

        // Distance Simulation
        const prefix2 = CEP_DESTINO.substring(0, 2);
        const destCoords = CEP_COORDS_2[prefix2] || CEP_COORDS[prefixDigit] || { lat: -15.7939, lon: -47.8828 };
        const km = haversineKm(ORIGIN.lat, ORIGIN.lon, destCoords.lat, destCoords.lon);

        // Base Rules
        let distanceBase = 25;
        let distanceMultiplier = 2.5;

        if (prefixDigit === parseInt(ORIGIN.prefix)) {
            distanceBase = 12;
            distanceMultiplier = 1.2;
        } else if ([0, 1, 2, 3].includes(prefixDigit)) {
            distanceBase = 18;
            distanceMultiplier = 1.8;
        }

        const calculatedBase = distanceBase + (distanceMultiplier * (km / 100));
        const freteBase = calculatedBase + (finalWeight * 8);

        const options = [
            { name: 'PAC', price: parseFloat((freteBase * 1.0 * 1.2).toFixed(2)), deadline: '5 dias úteis', group: 'Correios' },
            { name: 'SEDEX', price: parseFloat((freteBase * 1.4 * 1.2).toFixed(2)), deadline: '2 dias úteis', group: 'Correios' },
            { name: 'Loggi', price: parseFloat((freteBase * 1.2 * 1.2).toFixed(2)), deadline: '3 dias úteis', group: 'Transportadoras' },
            { name: 'Jadlog', price: parseFloat((freteBase * 0.95 * 1.2).toFixed(2)), deadline: '4 dias úteis', group: 'Transportadoras' },
        ];

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', options }));
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

        // Envio Real do E-mail Profissional
        const emailBody = `
            <p style="text-align: center; color: #ffffff; font-size: 16px; margin: 0 0 5px;">Obrigado por criar sua conta.</p>
            <p style="text-align: center; color: #999999; font-size: 14px; margin: 0 0 30px;">Use o código abaixo para verificar seu acesso:</p>
            
            <div style="background: #1a0a12; border: 2px solid #ff0b55; padding: 28px; border-radius: 16px; text-align: center; margin: 0 0 25px;">
                <span style="font-size: 40px; font-weight: 900; color: #ff0b55; letter-spacing: 10px; font-family: monospace;">${verificationCode}</span>
            </div>
            
            <p style="font-size: 12px; color: #666; text-align: center; margin: 0;">Este código expira em <strong style="color: #999;">30 minutos</strong>. Se não solicitou, ignore.</p>
        `;

        await sendOlimpoEmail(userData.email, "Verifique sua conta — Olimpo Pods", "CÓDIGO DE SEGURANÇA", emailBody);

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
            res.end(JSON.stringify({ status: 'error', message: 'Conta ainda não verificada. Por favor, verifique seu e-mail.' }));
        } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'success', user: { name: user.fullname, email: user.email } }));
        }
        return;
    }

    // ── Forgot Password Request ──
    if (req.method === 'POST' && pathname === '/api/auth/forgot-password') {
        const body = await readBody(req);
        const { email } = JSON.parse(body);
        const users = getUsers();
        const user = users.find(u => u.email === email);

        if (!user) {
            // Unify response for security (don't leak if email exists)
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'success', message: 'Se o e-mail existir em nossa base, um link foi enviado.' }));
            return;
        }

        const recoveryCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.recoveryCode = recoveryCode;
        user.recoveryExpires = Date.now() + (30 * 60 * 1000); // 30 min
        saveUsers(users);

        const emailBody = `
            <p style="text-align: center;">Olá <strong>${user.fullname || user.name}</strong>,</p>
            <p style="text-align: center; color: #ccc;">Recebemos uma solicitação de recuperação de senha para sua conta Olimpo. Use o código abaixo para redefinir sua credencial:</p>
            
            <div style="background: rgba(255, 255, 255, 0.05); border: 2px solid rgba(255, 11, 85, 0.5); padding: 30px; border-radius: 20px; text-align: center; margin: 30px 0;">
                <span style="font-size: 42px; font-weight: 900; color: #ff0b55; letter-spacing: 8px;">${recoveryCode}</span>
            </div>
            
            <p style="font-size: 13px; color: #666; text-align: center;">Se você não solicitou a recuperação, recomendamos que altere sua senha por segurança e ignore este aviso.</p>
        `;

        await sendOlimpoEmail(user.email, "Recuperação de Senha — Olimpo Pods", "RECUPERAR ACESSO", emailBody);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', message: 'E-mail enviado!' }));
        return;
    }

    // ── Reset Password Submit ──
    if (req.method === 'POST' && pathname === '/api/auth/reset-password') {
        const body = await readBody(req);
        const { email, code, newPassword } = JSON.parse(body);
        const users = getUsers();
        const user = users.find(u => u.email === email);

        if (!user || user.recoveryCode !== code || Date.now() > user.recoveryExpires) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', message: 'Código inválido ou expirado.' }));
            return;
        }

        user.password = newPassword;
        delete user.recoveryCode;
        delete user.recoveryExpires;
        saveUsers(users);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', message: 'Senha alterada com sucesso!' }));
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

            // AUTOMATION: Generate PDF immediately
            try {
                const pdfPath = path.join(PDF_DIR, `Orcamento_${orderData.id}.pdf`);
                generateOrderPDF(orderData, pdfPath);
                console.log(`📄 PDF gerado automaticamente: ${pdfPath}`);
            } catch (err) {
                console.error('❌ Erro na automação do PDF:', err.message);
            }
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success' }));
        return;
    }

    if (req.method === 'GET' && pathname === '/api/admin/data') {
        const adminPass = req.headers['x-admin-password'];
        if (adminPass !== 'olimpo2026') {
            res.writeHead(401); res.end(JSON.stringify({ status: 'error', message: 'Acesso negado' }));
            return;
        }

        let products = [];

        try {
            const PRODUCTS_FILE = path.join(STATIC_DIR, 'products.json');
            if (fs.existsSync(PRODUCTS_FILE)) {
                products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
            }
        } catch(e) {}

        // Merge users and newsletter leads
        const allUsers = getUsers(); // Account signups
        const newsletterLeads = getLeads(); // Newsletter signups
        
        // Convert newsletter format to match user table if needed
        const combinedLeads = [
            ...allUsers,
            ...newsletterLeads.map(l => ({
                fullname: 'Newsletter Lead',
                email: l.email,
                phone: '---',
                verified: true,
                createdAt: l.createdAt
            }))
        ];

        const payload = {
            status: 'success',
            users: combinedLeads,
            orders: getOrders(),
            products: products
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(payload));
        return;
    }

    if (req.method === 'POST' && pathname === '/api/admin/products/stock') {
        const adminPass = req.headers['x-admin-password'];
        if (adminPass !== 'olimpo2026') {
            res.writeHead(401); res.end(JSON.stringify({ status: 'error', message: 'Acesso negado' }));
            return;
        }

        const body = await readBody(req);
        const { productId, stock } = JSON.parse(body);
        
        const PRODUCTS_FILE = path.join(STATIC_DIR, 'products.json');
        try {
            const products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
            const product = products.find(p => p.id === productId);
            if (product) {
                product.stock = parseInt(stock);
                fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 4));
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'success', message: 'Estoque atualizado!' }));
            } else {
                res.writeHead(404); res.end(JSON.stringify({ status: 'error', message: 'Produto não encontrado' }));
            }
        } catch(e) {
            res.writeHead(500); res.end(JSON.stringify({ status: 'error', message: 'Erro ao salvar estoque' }));
        }
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

        const customerFirstName = (order.customer?.name || 'Cliente').split(' ')[0];

        const emailBody = `
            <p>Olá <strong>${customerFirstName}</strong>,</p>
            <p style="color: #ccc;">O seu pedido <strong>#${order.id}</strong> já está com a transportadora e a caminho do destino. Prepare o seu setup!</p>
            
            <div style="background: rgba(255, 255, 255, 0.03); padding: 30px; border-radius: 20px; margin: 30px 0; text-align: center; border: 1px solid rgba(255, 255, 255, 0.05);">
                <p style="margin: 0; font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">CÓDIGO DE RASTREAMENTO</p>
                <p style="margin: 0; font-size: 32px; font-weight: 800; color: #00ff88; letter-spacing: 3px; font-family: monospace;">${trackingCode}</p>
            </div>

            <div style="text-align: center; margin-top: 20px;">
                <a href="https://www.rastreacao.com.br/?p=${trackingCode}" style="background: #ff0b55; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 50px; font-weight: 700; display: inline-block; text-transform: uppercase; letter-spacing: 1px;">Rastrear Agora</a>
            </div>
            
            <p style="font-size: 13px; color: #666; text-align: center; margin-top: 40px;">Grandes vapores demandam grandes responsabilidades. Aproveite!</p>
        `;

        const mailResult = await sendOlimpoEmail(
            order.customer?.email, 
            `Seu pedido #${order.id} foi DESPACHADO! 🚀`, 
            "PRODUTO EM TRÂNSITO", 
            emailBody
        );

        if (mailResult.success) {
            console.log(`✉️  E-mail de rastreio Enviado para ${order.customer?.email}`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'success', message: 'E-mail enviado e status do pedido atualizado!' }));
        } else {
            console.error('Erro NodeMailer no admin/dispatch:', mailResult.error);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'success', message: 'Separado com sucesso! Mas o e-mail falhou (Credenciais não configuradas).' }));
        }
        return;
    }

    if (req.method === 'POST' && pathname.startsWith('/api/orders/') && pathname.endsWith('/pay')) {
        const orderId = pathname.split('/')[3];
        const orders = getOrders();
        const order = orders.find(o => o.id === orderId);
        if (order) {
            order.status = 'Pago';
            saveOrders(orders);
            
            // PDF is already generated on creation, but we could regenerate if needed
            const pdfPath = path.join(PDF_DIR, `Orcamento_${orderId}.pdf`);
            generateOrderPDF(order, pdfPath);
            
            console.log(`✅ Pedido #${orderId} marcado como PAGO.`);
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success' }));
        return;
    }

    /**
     * Unified PDF Generation: Premium, Brand-Aware Invoice
     */
    function generateOrderPDF(order, filePathOrStream) {
        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        
        if (typeof filePathOrStream === 'string') {
            doc.pipe(fs.createWriteStream(filePathOrStream));
        } else {
            doc.pipe(filePathOrStream);
        }

        const RED = '#ff0b55';

        // --- Header Section ---
        const logoPath = path.join(STATIC_DIR, 'assets/logo-ignite.png');
        if (fs.existsSync(logoPath)) {
            try { doc.image(logoPath, 35, 30, { height: 40 }); } catch(e) {}
        }
        
        doc.fillColor(RED).font('Helvetica-Bold').fontSize(22).text('ORÇAMENTO', 420, 35);
        doc.fillColor('#444').fontSize(10).font('Helvetica').text(`Pedido #${order.id.substring(0, 8).toUpperCase()}`, 420, 60);

        // Header Boxes
        doc.rect(30, 85, 535, 75).stroke('#eee');
        doc.fillColor('#000').fontSize(10).font('Helvetica-Bold');
        doc.text('DADOS DO CLIENTE', 40, 95);
        doc.font('Helvetica').fontSize(10);
        doc.text(`Nome: ${order.customer?.name || 'Não informado'}`, 40, 112);
        doc.text(`Tel: ${order.customer?.phone || 'Não informado'}`, 40, 126);
        doc.text(`E-mail: ${order.customer?.email || '---'}`, 40, 140);
        
        doc.font('Helvetica-Bold').text('ENTREGA', 320, 95);
        doc.font('Helvetica').fontSize(9);
        const ship = order.shipping || {};
        doc.text(`Agência: ${order.agency || '---'}`, 320, 112);
        doc.text(`CEP: ${ship.cep || '---'}`, 320, 124);
        doc.text(`Bairro: ${ship.neighborhood || '---'}`, 320, 136);
        doc.text(`Rua; Número: ${ship.address || '---'}, ${ship.number || '---'}`, 320, 148);

        // --- Table Section ---
        const tableTop = 180;
        doc.rect(30, tableTop, 535, 20).fillAndStroke(RED, RED);
        doc.fillColor('#fff').fontSize(9).font('Helvetica-Bold');
        
        const cols = { img: 35, product: 85, qty: 320, unit: 380, price: 440, sub: 500 };
        doc.text('PRODUTO', cols.product, tableTop + 6);
        doc.text('QTD', cols.qty, tableTop + 6);
        doc.text('UNIT.', cols.price, tableTop + 6);
        doc.text('SUBTOTAL', cols.sub, tableTop + 6);

        // Brand Grouping Logic
        const brandMap = {};
        (order.items || []).forEach(item => {
            const nameLower = item.name.toLowerCase();
            let brand = "OUTROS";
            if(nameLower.includes("ignite")) brand = "IGNITE";
            else if(nameLower.includes("elf") || nameLower.includes("bc5000")) brand = "ELF BAR";
            else if(nameLower.includes("lost")) brand = "LOST MARY";
            else if(nameLower.includes("waka")) brand = "WAKA";
            else if(nameLower.includes("geek")) brand = "GEEK BAR";

            if(!brandMap[brand]) brandMap[brand] = [];
            brandMap[brand].push(item);
        });

        let y = tableTop + 20;
        for (const [brand, items] of Object.entries(brandMap)) {
            // Brand Title Row
            doc.rect(30, y, 535, 18).fill('#f9f9f9');
            doc.fillColor(RED).font('Helvetica-Bold').fontSize(10).text(brand, 40, y + 5);
            y += 18;

            items.forEach((item) => {
                const rowHeight = 45;
                if (y > 750) { doc.addPage(); y = 50; } // Basic pagination
                
                doc.rect(30, y, 535, rowHeight).stroke('#eee');
                
                // Image
                if (item.image) {
                    const imgPath = path.join(STATIC_DIR, item.image);
                    if (fs.existsSync(imgPath)) {
                        try { doc.image(imgPath, cols.img, y + 5, { height: 35 }); } catch(e) {}
                    }
                }

                doc.fillColor('#000').font('Helvetica').fontSize(9);
                doc.text(item.name, cols.product, y + 15, { width: 220 });
                doc.text(item.flavor || '---', cols.product, y + 26, { width: 220, color: '#888' });
                
                doc.text(item.quantity || item.qty, cols.qty, y + 18);
                const price = parseFloat(item.price);
                doc.text(`R$ ${price.toFixed(2)}`, cols.price, y + 18);
                doc.text(`R$ ${(price * (item.quantity || item.qty)).toFixed(2)}`, cols.sub, y + 18);
                
                y += rowHeight;
            });
        }

        // --- Note ---
        y += 20;
        if (y > 750) { doc.addPage(); y = 50; }
        doc.fontSize(10).fillColor('#666').font('Helvetica-Oblique').text('Observação: Confira os itens no ato da entrega.', 30, y);

        // --- Footer ---
        doc.fontSize(8).fillColor('#aaa').font('Helvetica');
        const footerY = 780;
        doc.text('Olimpo Pods Ignite — O melhor do vapor na palma da sua mão.', 30, footerY, { align: 'center', width: 535 });
        doc.text('Este documento é um orçamento e não possui valor fiscal.', 30, footerY + 12, { align: 'center', width: 535 });

        doc.end();
    }

    if (req.method === 'GET' && pathname.startsWith('/api/orders/') && pathname.endsWith('/pdf')) {
        const orderId = pathname.split('/')[3];
        const orders = getOrders();
        const order = orders.find(o => o.id === orderId);

        if (!order) {
            res.writeHead(404); res.end(JSON.stringify({ status: 'error', message: 'Pedido não encontrado' }));
            return;
        }

        console.log(`📄 Streaming PDF para o pedido #${orderId}`);
        
        res.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="Orcamento_${orderId}.pdf"`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Access-Control-Allow-Origin': '*'
        });
        generateOrderPDF(order, res);
        return;
    }

    // ── Static File Serving ──
    let filePath = (staticPathname === '/' || !staticPathname) ? 'index.html' : staticPathname.replace(/^\//, '');
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
