const https = require('https');

const ZUCKPAY_CLIENT_ID = 'kaiquejucas3_6052315761';
const ZUCKPAY_CLIENT_SECRET = '13e8d60b1aebd51a1de6080ab6d1641c45b6671677dfc74b5da99f039929ca10';
const ZUCKPAY_AUTH = 'Basic ' + Buffer.from(`${ZUCKPAY_CLIENT_ID}:${ZUCKPAY_CLIENT_SECRET}`).toString('base64');

const payload = JSON.stringify({
    nome: 'Teste Antigravity',
    cpf: '12345678909',
    email: 'teste@olimpo.com',
    telefone: '11999999999',
    valor: 1.50,
    urlnoty: 'https://olimpoods.digital/webhook/zuckpay'
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
