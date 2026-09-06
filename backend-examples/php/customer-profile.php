<?php
declare(strict_types=1);

session_start();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'Method not allowed']);
    exit;
}
if (!isset($_SESSION['fashionhub_customer']) || !is_array($_SESSION['fashionhub_customer'])) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'message' => 'Not logged in']);
    exit;
}

$payload = json_decode((string) file_get_contents('php://input'), true);
if (!is_array($payload)) $payload = [];
$customer = $_SESSION['fashionhub_customer'];
$allowed = [
    'first_name','last_name','display_name','email','phone','address','district','postcode',
    'shipping_first_name','shipping_last_name','shipping_address','shipping_district','shipping_postcode'
];
foreach ($allowed as $key) {
    if (array_key_exists($key, $payload)) $customer[$key] = trim((string)$payload[$key]);
}
if (($customer['first_name'] ?? '') === '' || ($customer['last_name'] ?? '') === '') {
    http_response_code(422);
    echo json_encode(['ok' => false, 'message' => 'First and last name are required']);
    exit;
}
if (!filter_var((string)($customer['email'] ?? ''), FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'message' => 'Enter a valid email address']);
    exit;
}
if (($customer['display_name'] ?? '') === '') $customer['display_name'] = trim(($customer['first_name'] ?? '') . ' ' . ($customer['last_name'] ?? ''));

$newPassword = (string)($payload['new_password'] ?? '');
if ($newPassword !== '' && strlen($newPassword) < 6) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'message' => 'New password must be at least 6 characters']);
    exit;
}

$_SESSION['fashionhub_customer'] = $customer;
if (isset($_SESSION['fashionhub_registered_user']) && is_array($_SESSION['fashionhub_registered_user'])) {
    $_SESSION['fashionhub_registered_user']['customer'] = $customer;
    if ($newPassword !== '') $_SESSION['fashionhub_registered_user']['password_hash'] = password_hash($newPassword, PASSWORD_DEFAULT);
}

echo json_encode(['ok' => true, 'customer' => $customer], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
