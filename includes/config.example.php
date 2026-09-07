<?php
declare(strict_types=1);

/**
 * FashionHub local/default configuration template.
 *
 * Copy this file to includes/config.php for per-environment overrides.
 * Environment variables always take precedence over the local defaults below.
 */
return [
    'app' => [
        'name' => getenv('FASHIONHUB_APP_NAME') ?: 'FashionHub',
        'env' => getenv('FASHIONHUB_ENV') ?: 'local',
        'debug' => filter_var(getenv('FASHIONHUB_DEBUG') ?: '0', FILTER_VALIDATE_BOOL),
        'timezone' => getenv('FASHIONHUB_TIMEZONE') ?: 'Asia/Dhaka',
        'version' => trim((string) @file_get_contents(dirname(__DIR__) . '/VERSION')) ?: '0.1.0-dev',
    ],
    'database' => [
        'host' => getenv('FASHIONHUB_DB_HOST') ?: '127.0.0.1',
        'port' => (int) (getenv('FASHIONHUB_DB_PORT') ?: 3306),
        'name' => getenv('FASHIONHUB_DB_NAME') ?: 'fashionhub',
        'user' => getenv('FASHIONHUB_DB_USER') ?: 'root',
        'pass' => getenv('FASHIONHUB_DB_PASS') ?: '',
        'charset' => 'utf8mb4',
    ],
];
