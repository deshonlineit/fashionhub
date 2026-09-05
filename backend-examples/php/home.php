<?php
declare(strict_types=1);

// Demo API endpoint using the bundled JSON contract.
// Replace the file read with your PDO/MySQL queries when connecting real data.

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Accept, Content-Type');
header('Cache-Control: public, max-age=300, stale-while-revalidate=60');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed'], JSON_UNESCAPED_SLASHES);
    exit;
}

$file = dirname(__DIR__, 2) . '/data/home.json';
if (!is_file($file) || !is_readable($file)) {
    http_response_code(500);
    echo json_encode(['error' => 'Homepage data is unavailable'], JSON_UNESCAPED_SLASHES);
    exit;
}

$body = file_get_contents($file);
if ($body === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Unable to read homepage data'], JSON_UNESCAPED_SLASHES);
    exit;
}

$etag = '"' . hash('sha256', $body) . '"';
header('ETag: ' . $etag);

if (trim($_SERVER['HTTP_IF_NONE_MATCH'] ?? '') === $etag) {
    http_response_code(304);
    exit;
}

echo $body;
