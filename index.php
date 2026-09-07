<?php
declare(strict_types=1);

$template = __DIR__ . '/index.html';
$html = is_file($template) ? file_get_contents($template) : false;

if ($html === false) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'FashionHub homepage template is unavailable.';
    exit;
}

$needle = '<script src="assets/js/app.js"></script>';
$replacement = '<script src="assets/js/home-storefront-bridge.js?v=0.3.0-dev"></script>' . "\n  " . $needle;

if (str_contains($html, $needle)) {
    $html = str_replace($needle, $replacement, $html, $count);
}

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');
echo $html;
