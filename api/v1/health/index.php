<?php
declare(strict_types=1);

$config = require dirname(__DIR__, 3) . '/includes/bootstrap.php';
fashionhub_api_require_method('GET');

try {
    $pdo = fashionhub_db($config);
    $pdo->query('SELECT 1');

    $tableCheck = $pdo->query("SHOW TABLES LIKE 'fh_products'")->fetchColumn();

    fashionhub_api_json([
        'ok' => true,
        'service' => 'fashionhub-api',
        'version' => (string) ($config['app']['version'] ?? '0.2.0-dev'),
        'environment' => (string) ($config['app']['env'] ?? 'local'),
        'database' => [
            'connected' => true,
            'catalog_schema' => $tableCheck !== false,
        ],
        'time' => gmdate('c'),
    ]);
} catch (Throwable $error) {
    $details = [];
    if (!empty($config['app']['debug'])) {
        $details['exception'] = $error->getMessage();
    }

    fashionhub_api_error('Database unavailable.', 503, $details);
}
