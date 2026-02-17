<?php
// ============================================================
// api/ai_proxy.php — Secure Proxy for OpenAI API
// Hides the API key from the frontend and GitHub
// ============================================================

require_once __DIR__ . '/../includes/config.php';

// Optional: Require authentication to prevent unauthorized usage
// requireLogin(); 

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed. Use POST.'], 405);
}

$data = getJsonBody();
if (empty($data['messages'])) {
    jsonResponse(['error' => 'Messages are required'], 400);
}

$apiKey = OPENAI_API_KEY;
if (!$apiKey || $apiKey === 'your_openai_key_here') {
    jsonResponse(['error' => 'OpenAI API key is not configured on the server.'], 500);
}

// Prepare the request to OpenAI
$url = 'https://api.openai.com/v1/chat/completions';
$headers = [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $apiKey
];

// Clean up the input data to only send what's needed to OpenAI
$payload = [
    'model' => $data['model'] ?? 'gpt-4o-mini',
    'messages' => $data['messages'],
    'temperature' => $data['temperature'] ?? 0.3,
    'response_format' => $data['response_format'] ?? null,
];

// Use cURL to forward the request
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

// Some XAMPP installations need this if they don't have CA certificates set up correctly
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($error) {
    jsonResponse(['error' => 'cURL Error: ' . $error], 500);
}

// Exit with the same HTTP code and JSON body as OpenAI
http_response_code($httpCode);
header('Content-Type: application/json; charset=utf-8');
echo $response;
exit;
