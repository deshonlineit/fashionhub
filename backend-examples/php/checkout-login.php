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
$email = strtolower(trim((string)($payload['email'] ?? '')));
$password = (string)($payload['password'] ?? '');

$customer = null;

// Static demo account for the framework-free storefront prototype.
if ($email === 'customer@example.com' && $password === 'demo123') {
    $customer = [
        'id' => 1,
        'first_name' => 'FashionHub',
        'last_name' => 'Customer',
        'display_name' => 'FashionHub Customer',
        'email' => 'customer@example.com',
        'phone' => '01700000000',
        'address' => 'House 12, Road 7, Dhanmondi',
        'district' => 'Dhaka',
        'postcode' => '1209',
        'shipping_first_name' => 'FashionHub',
        'shipping_last_name' => 'Customer',
        'shipping_address' => 'House 12, Road 7, Dhanmondi',
        'shipping_district' => 'Dhaka',
        'shipping_postcode' => '1209',
    ];
}

// Accounts created during this prototype session can log back in as well.
$registered = $_SESSION['fashionhub_registered_user'] ?? null;
if (!$customer && is_array($registered)) {
    $registeredCustomer = $registered['customer'] ?? null;
    $hash = (string)($registered['password_hash'] ?? '');
    if (is_array($registeredCustomer)
        && strtolower((string)($registeredCustomer['email'] ?? '')) === $email
        && $hash !== ''
        && password_verify($password, $hash)) {
        $customer = $registeredCustomer;
    }
}

if (!$customer) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'message' => 'Invalid email or password']);
    exit;
}

$_SESSION['fashionhub_customer'] = $customer;

echo json_encode([
    'ok' => true,
    'customer' => $customer,
], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
