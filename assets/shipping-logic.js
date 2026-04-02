/**
 * IGNITE — Advanced Shipping Logic
 * Realistic Carrier & Packaging Simulation
 * No external APIs required.
 */

window.ShippingCalculator = (function() {
    
    // Core Constants
    const POD_WEIGHT = 0.1; // kg
    const POD_DIM = { L: 5, W: 3, H: 2 }; // cm
    
    // Origin: São Paulo (Prefix 0)
    const ORIGIN = { lat: -23.5505, lon: -46.6333, prefix: "0" };

    // Regional Classification & Data
    const REGIONS_DATA = {
        "Sudeste": {
            prefixes: [0, 1, 2, 3],
            base: 12,
            distFactor: 1.2,
            deadlines: { PAC: [3, 6], SEDEX: [1, 3], LOGGI: [1, 2], JADLOG: [2, 4] }
        },
        "Nordeste": {
            prefixes: [4, 5],
            base: 18,
            distFactor: 1.8,
            deadlines: { PAC: [6, 12], SEDEX: [3, 6], LOGGI: [3, 7], JADLOG: [5, 9] }
        },
        "Norte": {
            prefixes: [6],
            base: 25,
            distFactor: 2.5,
            deadlines: { PAC: [8, 15], SEDEX: [4, 8], LOGGI: [5, 10], JADLOG: [7, 12] }
        },
        "Centro-Oeste": {
            prefixes: [7],
            base: 25,
            distFactor: 2.5,
            deadlines: { PAC: [5, 8], SEDEX: [2, 4], LOGGI: [2, 4], JADLOG: [4, 6] }
        },
        "Sul": {
            prefixes: [8, 9],
            base: 18,
            distFactor: 1.8,
            deadlines: { PAC: [4, 7], SEDEX: [2, 3], LOGGI: [2, 3], JADLOG: [3, 5] }
        }
    };

    // Simulated Coordinates for Distance (Prefix 1-digit)
    const PREFIX_COORDS = {
        0: { lat: -23.5505, lon: -46.6333 }, // SP
        1: { lat: -22.9068, lon: -43.1729 }, // RJ
        2: { lat: -20.3155, lon: -40.3128 }, // ES
        3: { lat: -19.9167, lon: -43.9345 }, // MG
        4: { lat: -12.9714, lon: -38.5124 }, // BA
        5: { lat: -8.0476, lon: -34.8770 },  // PE
        6: { lat: -3.1190, lon: -60.0217 },  // AM
        7: { lat: -15.7939, lon: -47.8828 }, // DF
        8: { lat: -25.4284, lon: -49.2733 }, // PR
        9: { lat: -30.0346, lon: -51.2177 }  // RS
    };

    const CARRIERS = [
        { id: 'PAC', name: 'Correios', type: 'PAC', multiplier: 1.0 },
        { id: 'SEDEX', name: 'Correios', type: 'SEDEX', multiplier: 1.4 },
        { id: 'LOGGI', name: 'Loggi', type: 'Express', multiplier: 1.2 },
        { id: 'JADLOG', name: 'Jadlog', type: 'E-commerce', multiplier: 0.95 }
    ];

    function haversine(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function getRegion(prefixDigit) {
        for (const [name, data] of Object.entries(REGIONS_DATA)) {
            if (data.prefixes.includes(prefixDigit)) return { name, ...data };
        }
        return { name: "Sudeste", ...REGIONS_DATA["Sudeste"] }; // Fallback
    }

    function calculateBox(quantity) {
        const side = Math.ceil(Math.sqrt(quantity));
        const L = side * POD_DIM.L;
        const W = side * POD_DIM.W;
        const layers = Math.ceil(quantity / (side * side));
        const H = Math.max(5, Math.ceil(layers / 2) * 5); // 5cm fits 2 layers of 2cm pods
        
        const totalWeight = quantity * POD_WEIGHT;
        const cubicWeight = (L * W * H) / 6000;
        const finalWeight = Math.max(totalWeight, cubicWeight);

        return { L, W, H, totalWeight, cubicWeight, finalWeight };
    }

    function formatDateRange(minDays, maxDays) {
        const today = new Date();
        
        function addBusinessDays(date, days) {
            let result = new Date(date);
            let count = 0;
            while (count < days) {
                result.setDate(result.getDate() + 1);
                if (result.getDay() !== 0 && result.getDay() !== 6) count++;
            }
            return result;
        }

        const dateMin = addBusinessDays(today, minDays);
        const dateMax = addBusinessDays(today, maxDays);

        const format = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        return {
            text: `Entre ${minDays} e ${maxDays} dias úteis`,
            range: `Entre ${format(dateMin)} e ${format(dateMax)}`
        };
    }

    /**
     * Main Calculation Function
     * @param {string} cep - 8 digit numeric string
     * @param {number} quantity - Total items
     * @returns {Array} List of shipping options
     */
    function calculate(cep, quantity) {
        if (!cep || cep.length < 5) return [];
        
        const prefixDigit = parseInt(cep.substring(0, 1));
        const region = getRegion(prefixDigit);
        const box = calculateBox(quantity);
        
        // Simulating Distance
        const destCoords = PREFIX_COORDS[prefixDigit] || PREFIX_COORDS[0];
        const distance = haversine(ORIGIN.lat, ORIGIN.lon, destCoords.lat, destCoords.lon);
        
        // Distance Category
        let distanceBase = region.base;
        let distanceMultiplier = region.distFactor;
        
        // "Mesmo Estado" logic (1st digit match)
        if (prefixDigit.toString() === ORIGIN.prefix) {
            distanceBase = 12;
            distanceMultiplier = 1.2;
        } else if (region.name === "Sudeste") {
            // Interestadual Sudeste
            distanceBase = 18;
            distanceMultiplier = 1.8;
        } else {
            // Longo (Norte, Nordeste, etc)
            distanceBase = 25;
            distanceMultiplier = 2.5;
        }

        const calculatedBase = distanceBase + (distanceMultiplier * (distance / 100));
        const freteBase = calculatedBase + (box.finalWeight * 8);

        const options = CARRIERS.map(carrier => {
            const finalPrice = (freteBase * carrier.multiplier) * 1.20;
            const deadline = region.deadlines[carrier.id] || [5, 10];
            const dates = formatDateRange(deadline[0], deadline[1]);

            return {
                id: carrier.id,
                carrier: carrier.name,
                type: carrier.type,
                price: parseFloat(finalPrice.toFixed(2)),
                deadlineDays: `${deadline[0]} a ${deadline[1]} dias úteis`,
                deadlineDate: dates.range,
                sortKey: finalPrice // Used for default sort (cheapest)
            };
        });

        // Sort by price (cheapest first)
        return options.sort((a, b) => a.price - b.price);
    }

    return {
        calculate,
        getBox: calculateBox
    };

})();
