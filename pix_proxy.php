<?php
/**
 * PIX Proxy for ZuckPay API & ViaCEP
 * Handles external requests to avoid CORS issues and secure credentials.
 * 
 * v2.0 — Robust version with retry, proper headers, and diagnostics.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// =========================================
// Credentials (stored server-side only)
// =========================================
$clientId     = 'sb_publishable_vF_WZOOcya33E4cr64mWkQ__B5QAhFc';
$clientSecret = 'sb_secret_cMcD4XPobEb4M7JREQTkeQ__j6rN4th';


// =========================================
// GET — Simple healthcheck
// =========================================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode(['status' => 'online', 'message' => 'Proxy Olimpo v2.0 conectado.']);
    exit;
}

// =========================================
// POST — Process action
// =========================================
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid JSON input']);
    exit;
}

$action = isset($input['action']) ? $input['action'] : 'qrcode';

// =========================================
// Action: Location (IP-based lookup)
// =========================================
if ($action === 'location') {
    // We use ip-api.com (free) to get location for the visitor
    $url = "http://ip-api.com/json/";
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    $response = curl_exec($ch);
    echo $response;
    curl_close($ch);
    exit;
}

// =========================================
// Action: ViaCEP (address lookup)
// =========================================
if ($action === 'viacep') {
    $cep = preg_replace('/[^0-9]/', '', $input['cep']);
    $url = "https://viacep.com.br/ws/{$cep}/json/";

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_USERAGENT, 'OlimpoPods/2.0');
    $response = curl_exec($ch);

    if (curl_errno($ch)) {
        echo json_encode(['status' => 'error', 'message' => 'CEP lookup failed: ' . curl_error($ch)]);
    } else {
        echo $response;
    }
    curl_close($ch);
    exit;
}

// =========================================
// Action: Generate PIX QR Code
// =========================================
if ($action === 'qrcode') {
    $url = 'https://zuckpay.com.br/conta/v3/pix/qrcode';

    // Payload follows ZuckPay docs exactly — credentials go in the header only
    $payload = json_encode([
        'nome'    => $input['nome'],
        'cpf'     => preg_replace('/[^0-9]/', '', $input['cpf']),
        'valor'   => (float) $input['valor'],
        'urlnoty' => isset($input['urlnoty']) ? $input['urlnoty'] : ''
    ]);

    $result = zuckpay_request($url, $payload, $clientId, $clientSecret);
    echo json_encode($result);
    exit;
}

// =========================================
// Action: Check payment status
// =========================================
if ($action === 'status') {
    $orderId = preg_replace('/[^a-zA-Z0-9_\-]/', '', $input['id']);
    $url     = 'https://zuckpay.com.br/conta/v3/pix/status/' . $orderId;

    $payload = json_encode([
        'client_id'     => $clientId,
        'client_secret' => $clientSecret
    ]);

    $result = zuckpay_request($url, $payload, $clientId, $clientSecret);
    echo json_encode($result);
    exit;
}

// =========================================
// Action: Save Order (Admin Sync)
// =========================================
if ($action === 'save_order') {
    $order = $input['order'];
    $file = 'orders.json';
    
    $current = [];
    if (file_exists($file)) {
        $json = file_get_contents($file);
        $current = json_decode($json, true) ?: [];
    }
    
    // Avoid duplicates
    $exists = false;
    foreach ($current as $o) {
        if ($o['id'] == $order['id']) { $exists = true; break; }
    }
    
    if (!$exists) {
        $current[] = $order;
        file_put_contents($file, json_encode($current, JSON_PRETTY_PRINT));
    }
    
    echo json_encode(['status' => 'success', 'message' => 'Order saved']);
    exit;
}

// =========================================
// Action: Newsletter
// =========================================
if ($action === 'newsletter') {
    $email = $input['email'];
    file_put_contents('newsletter.txt', $email . PHP_EOL, FILE_APPEND);
    echo json_encode(['status' => 'success']);
    exit;
}

// Unknown action
http_response_code(400);
echo json_encode(['status' => 'error', 'message' => 'Unknown action: ' . $action]);
exit;


// =============================================================
// HELPER: Robust ZuckPay request with retries & proper headers
// =============================================================
function zuckpay_request($url, $jsonPayload, $clientId, $clientSecret, $maxRetries = 3) {
    $authHeader = 'Authorization: Basic ' . base64_encode("$clientId:$clientSecret");

    for ($attempt = 1; $attempt <= $maxRetries; $attempt++) {
        $ch = curl_init($url);

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $jsonPayload,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'Accept: application/json',
                $authHeader
            ],
            // Proper User-Agent (prevents CDN/WAF blocks)
            CURLOPT_USERAGENT      => 'OlimpoPods/2.0 (PHP/' . PHP_VERSION . ')',
            // SSL: disable verification for localhost XAMPP (no local certs)
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => 0,
            // Timeouts: generous for slow API
            CURLOPT_CONNECTTIMEOUT => 15,
            CURLOPT_TIMEOUT        => 45,
            // Follow redirects if any
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS      => 3,
            // Force IPv4 (avoids IPv6 routing issues on some networks)
            CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr  = curl_error($ch);
        $curlErrNo = curl_errno($ch);
        curl_close($ch);

        // CURL-level error (timeout, DNS, connection refused)
        if ($curlErrNo !== 0) {
            // Retry on transient errors (timeout, connection reset, DNS temp failure)
            $retryable = in_array($curlErrNo, [
                CURLE_OPERATION_TIMEDOUT,   // 28
                CURLE_COULDNT_CONNECT,      // 7
                CURLE_COULDNT_RESOLVE_HOST, // 6
                CURLE_GOT_NOTHING,          // 52
                CURLE_RECV_ERROR,           // 56
                CURLE_SEND_ERROR,           // 55
            ]);

            if ($retryable && $attempt < $maxRetries) {
                sleep(2 * $attempt); // Backoff: 2s, 4s, 6s
                continue;
            }

            return [
                'status'   => 'error',
                'message'  => "Conexão falhou após $attempt tentativa(s): $curlErr",
                'curl_code' => $curlErrNo,
                'attempt'  => $attempt
            ];
        }

        // HTTP-level error (4xx, 5xx)
        if ($httpCode >= 400) {
            // Retry on server errors (500, 502, 503, 504) and 404 (could be transient CDN issue)
            $retryableHttp = ($httpCode >= 500 || $httpCode === 404);

            if ($retryableHttp && $attempt < $maxRetries) {
                sleep(2 * $attempt);
                continue;
            }

            $decoded = json_decode($response, true);
            return [
                'status'    => 'error',
                'http_code' => $httpCode,
                'message'   => isset($decoded['message']) ? $decoded['message'] : "ZuckPay retornou HTTP $httpCode",
                'attempt'   => $attempt,
                'debug'     => substr($response, 0, 300)
            ];
        }

        // Success — try to parse JSON
        $decoded = json_decode($response, true);
        if ($decoded === null && json_last_error() !== JSON_ERROR_NONE) {
            // Got a non-JSON response (HTML page, etc.) — retry
            if ($attempt < $maxRetries) {
                sleep(2 * $attempt);
                continue;
            }
            return [
                'status'  => 'error',
                'message' => 'ZuckPay retornou uma resposta inválida (não-JSON)',
                'attempt' => $attempt,
                'debug'   => substr($response, 0, 300)
            ];
        }

        // Valid JSON response from ZuckPay
        return $decoded;
    }

    // Should not reach here, but just in case
    return ['status' => 'error', 'message' => 'Falha inesperada após todas as tentativas'];
}
