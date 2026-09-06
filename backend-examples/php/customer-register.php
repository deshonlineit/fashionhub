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

$payload = json_decode((string) file_get_contents('php://input'), true);
if (!is_array($payload)) $payload = [];

$firstName = trim((string)($payload['first_name'] ?? ''));
$lastName = trim((string)($payload['last_name'] ?? ''));
$email = strtolower(trim((string)($payload['email'] ?? '')));
$phone = trim((string)($payload['phone'] ?? ''));
$address = trim((string)($payload['address'] ?? ''));
$district = trim((string)($payload['district'] ?? ''));
$postcode = trim((string)($payload['postcode'] ?? ''));
$password = (string)($payload['password'] ?? '');

if ($firstName === '' || $lastName === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || $phone === '' || $address === '' || $district === '') {
    http_response_code(422);
    echo json_encode(['ok' => false, 'message' => 'Complete all required customer fields']);
    exit;
}
if (strlen($password) < 6) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'message' => 'Password must be at least 6 characters']);
    exit;
}

$customer = [
    'id' => (int)($_SESSION['fashionhub_registered_user']['customer']['id'] ?? 2),
    'first_name' => $firstName,
    'last_name' => $lastName,
    'display_name' => trim($firstName . ' ' . $lastName),
    'email' => $email,
    'phone' => $phone,
    'address' => $address,
    'district' => $district,
    'postcode' => $postcode,
    'shipping_first_name' => trim((string)($payload['shipping_first_name'] ?? '')),
    'shipping_last_name' => trim((string)($payload['shipping_last_name'] ?? '')),
    'shipping_address' => trim((string)($payload['shipping_address'] ?? '')),
    'shipping_district' => trim((string)($payload['shipping_district'] ?? '')),
    'shipping_postcode' => trim((string)($payload['shipping_postcode'] ?? '')),
];

$_SESSION['fashionhub_registered_user'] = [
    'customer' => $customer,
    'password_hash' => password_hash($password, PASSWORD_DEFAULT),
];
$_SESSION['fashionhub_customer'] = $customer;

echo json_encode(['ok' => true, 'customer' => $customer], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
