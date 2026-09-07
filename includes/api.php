<?php
declare(strict_types=1);

function fashionhub_api_headers(): void
{
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, max-age=0');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: same-origin');
}

function fashionhub_api_json(array $payload, int $status = 200): never
{
    http_response_code($status);
    fashionhub_api_headers();
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION);
    exit;
}

function fashionhub_api_error(string $message, int $status = 400, array $details = []): never
{
    fashionhub_api_json([
        'ok' => false,
        'error' => [
            'message' => $message,
            'details' => $details,
        ],
    ], $status);
}

function fashionhub_api_require_method(string ...$allowed): void
{
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    $allowed = array_map('strtoupper', $allowed);

    if (!in_array($method, $allowed, true)) {
        header('Allow: ' . implode(', ', $allowed));
        fashionhub_api_error('Method not allowed.', 405);
    }
}

function fashionhub_query_string(string $key, ?string $default = null): ?string
{
    if (!isset($_GET[$key])) {
        return $default;
    }

    $value = trim((string) $_GET[$key]);
    return $value === '' ? $default : $value;
}

function fashionhub_query_int(string $key, int $default, int $min, int $max): int
{
    $value = filter_input(INPUT_GET, $key, FILTER_VALIDATE_INT);
    if ($value === false || $value === null) {
        return $default;
    }

    return max($min, min($max, (int) $value));
}

function fashionhub_query_bool(string $key): ?bool
{
    if (!array_key_exists($key, $_GET)) {
        return null;
    }

    $value = filter_var($_GET[$key], FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE);
    return $value === null ? null : (bool) $value;
}

function fashionhub_like_escape(string $value): string
{
    return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value);
}
