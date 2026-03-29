
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ZUCKPAY_CLIENT_ID = 'kaiquejucas3_6052315761';
  const ZUCKPAY_CLIENT_SECRET = '13e8d60b1aebd51a1de6080ab6d1641c45b6671677dfc74b5da99f039929ca10';
  const ZUCKPAY_AUTH = 'Basic ' + Buffer.from(`${ZUCKPAY_CLIENT_ID}:${ZUCKPAY_CLIENT_SECRET}`).toString('base64');

  try {
    const response = await fetch('https://zuckpay.com.br/conta/v3/pix/qrcode', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': ZUCKPAY_AUTH
      },
      body: JSON.stringify(req.body)
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}
