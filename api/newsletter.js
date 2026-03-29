
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  res.status(200).json({ status: 'success', message: 'Assinatura confirmada!' });
}
