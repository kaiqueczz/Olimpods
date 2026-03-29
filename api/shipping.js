
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { cep, weight } = req.body;
    const CEP_DESTINO = (cep || '').replace(/\D/g, '');
    const peso = parseFloat(weight) || 1;

    if (!CEP_DESTINO || CEP_DESTINO.length !== 8) {
      return res.status(400).json({ status: 'error', message: 'CEP inválido' });
    }

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

    const CEP_COORDS_2 = {
        '01': { lat: -23.5505, lon: -46.6333 }, '04': { lat: -23.6100, lon: -46.6600 },
        '05': { lat: -23.5300, lon: -46.7100 }, '08': { lat: -23.5200, lon: -46.4800 },
        '13': { lat: -22.9056, lon: -47.0608 }, '14': { lat: -21.1767, lon: -47.8208 },
        '20': { lat: -22.9068, lon: -43.1729 }, '30': { lat: -19.9167, lon: -43.9345 },
        '40': { lat: -12.9714, lon: -38.5124 }, '50': { lat: -8.0476, lon: -34.8770 },
        '60': { lat: -3.7172, lon: -38.5433 },  '63': { lat: -6.3600, lon: -39.2800 },
        '70': { lat: -15.7939, lon: -47.8828 }, '80': { lat: -25.4284, lon: -49.2733 },
        '90': { lat: -30.0346, lon: -51.2177 },
    };

    function haversineKm(lat1, lon1, lat2, lon2) {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    const prefix2 = CEP_DESTINO.substring(0, 2);
    const prefix1 = CEP_DESTINO.substring(0, 1);
    const destCoords = CEP_COORDS_2[prefix2] || CEP_COORDS[prefix1] || { lat: -15.7939, lon: -47.8828 };

    const km = haversineKm(ORIGIN.lat, ORIGIN.lon, destCoords.lat, destCoords.lon);

    // Formulas optimized for "Fixed + (Distance * Rate)"
    const pacPrice = Math.min(35 + (km * 0.05) + (peso * 2), 160);
    const sedexPrice = Math.min(55 + (km * 0.07) + (peso * 2), 250);
    const loggiPrice = Math.min(80 + (km * 0.04), 180);
    const jadlogPrice = Math.min(95 + (km * 0.05), 230);

    const pacDays = Math.max(5, Math.min(15, Math.round(km / 250)));
    const sedexDays = Math.max(2, Math.min(8, Math.round(km / 500)));

    const options = [
      { name: 'PAC', price: parseFloat(pacPrice.toFixed(2)), deadline: `${pacDays} dias úteis`, group: 'Correios' },
      { name: 'SEDEX', price: parseFloat(sedexPrice.toFixed(2)), deadline: `${sedexDays} dias úteis`, group: 'Correios' },
      { name: 'Loggi', price: parseFloat(loggiPrice.toFixed(2)), deadline: '8 dias úteis', group: 'Transportadoras' },
      { name: 'Jadlog', price: parseFloat(jadlogPrice.toFixed(2)), deadline: '10 dias úteis', group: 'Transportadoras' },
    ];

    res.status(200).json({ status: 'success', options });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}
