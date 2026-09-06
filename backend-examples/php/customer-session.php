<?php
declare(strict_types=1);

session_start();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

echo json_encode([
    'ok' => true,
    'logged_in' => isset($_SESSION['fashionhub_customer']) && is_array($_SESSION['fashionhub_customer']),
    'customer' => $_SESSION['fashionhub_customer'] ?? null,
], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
