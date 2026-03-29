
export default async function handler(req, res) {
  try {
    const response = await fetch('http://ip-api.com/json/');
    const data = await response.json();
    
    // Add CORS headers just in case
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}
