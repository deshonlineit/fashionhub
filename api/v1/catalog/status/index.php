<?php
declare(strict_types=1);

$config = require dirname(__DIR__, 4) . '/includes/bootstrap.php';
fashionhub_api_require_method('GET');

try {
    $pdo = fashionhub_db($config);

    $products = (int) $pdo->query("SELECT COUNT(*) FROM fh_products WHERE status = 'published'")->fetchColumn();
    $categories = (int) $pdo->query("SELECT COUNT(*) FROM fh_categories WHERE is_active = 1")->fetchColumn();
    $images = (int) $pdo->query('SELECT COUNT(*) FROM fh_product_images')->fetchColumn();

    $latest = null;
    $tableExists = $pdo->query("SHOW TABLES LIKE 'fh_catalog_imports'")->fetchColumn();
    if ($tableExists !== false) {
        $latest = $pdo->query(
            'SELECT app_version, source_file, source_sha256, categories_count, products_count, images_count, imported_at
             FROM fh_catalog_imports ORDER BY id DESC LIMIT 1'
        )->fetch() ?: null;
    }

    fashionhub_api_json([
        'ok' => true,
        'version' => (string) ($config['app']['version'] ?? '0.2.0-dev'),
        'catalog' => [
            'products' => $products,
            'categories' => $categories,
            'images' => $images,
            'seeded' => is_array($latest),
            'latest_import' => $latest,
        ],
    ]);
} catch (PDOException $error) {
    $details = [];
    if (!empty($config['app']['debug'])) {
        $details['exception'] = $error->getMessage();
    }
    fashionhub_api_error('Catalog status query failed.', 503, $details);
}
