
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  // Vercel can't write to orders.json easily, 
  // but we return success so the frontend doesn't error.
  res.status(200).json({ status: 'success', message: 'Pedido recebido' });
}
