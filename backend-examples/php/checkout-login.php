<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'Method not allowed']);
    exit;
}

$payload = json_decode((string) file_get_contents('php://input'), true);
$email = strtolower(trim((string)($payload['email'] ?? '')));
$password = (string)($payload['password'] ?? '');

// Static demo account for the framework-free storefront prototype.
// Replace this block with your real customer lookup + password_hash/password_verify flow.
if ($email !== 'customer@example.com' || $password !== 'demo123') {
    http_response_code(401);
    echo json_encode(['ok' => false, 'message' => 'Invalid email or password']);
    exit;
}

echo json_encode([
    'ok' => true,
    'customer' => [
        'id' => 1,
        'first_name' => 'FashionHub',
        'last_name' => 'Customer',
        'email' => 'customer@example.com',
        'phone' => '01700000000',
        'address' => 'House 12, Road 7, Dhanmondi',
        'district' => 'Dhaka',
        'postcode' => '1209'
    ]
], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
