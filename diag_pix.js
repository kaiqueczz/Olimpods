const https = require('https');

const ZUCKPAY_CLIENT_ID = 'sb_publishable_vF_WZOOcya33E4cr64mWkQ__B5QAhFc';
const ZUCKPAY_CLIENT_SECRET = 'sb_secret_cMcD4XPobEb4M7JREQTkeQ__j6rN4th';
const ZUCKPAY_AUTH = 'Basic ' + Buffer.from(`${ZUCKPAY_CLIENT_ID}:${ZUCKPAY_CLIENT_SECRET}`).toString('base64');

const payload = JSON.stringify({
    nome: 'Teste Antigravity',
    cpf: '12345678909',
    valor: 1.50,
    urlnoty: 'https://olimpomods.com.br/webhook/zuckpay'
});

const options = {
    hostname: 'zuckpay.com.br',
    port: 443,
    path: '/conta/v3/pix/qrcode',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': ZUCKPAY_AUTH,
        'Content-Length': Buffer.byteLength(payload),
    },
};

console.log('Testing ZuckPay Pix Generation...');
const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log(`Status Code: ${res.statusCode}`);
        console.log('Raw Response:', data);
        try {
            console.log('Parsed JSON:', JSON.parse(data));
        } catch (e) {
            console.log('Response is not JSON or is empty');
        }
    });
});

req.on('error', (e) => {
    console.error('HTTPS Request Error:', e.message);
});

req.write(payload);
req.end();
