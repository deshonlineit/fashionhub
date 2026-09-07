<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("Catalog verification is CLI-only.\n");
}

$config = require dirname(__DIR__) . '/includes/bootstrap.php';
$pdo = fashionhub_db($config);
$sourceFile = dirname(__DIR__) . '/data/home.json';

try {
    $json = file_get_contents($sourceFile);
    if ($json === false) {
        throw new RuntimeException('Unable to read data/home.json.');
    }

    $source = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
    $sourceProducts = is_array($source['products'] ?? null) ? $source['products'] : [];
    $expectedIds = [];
    foreach ($sourceProducts as $product) {
        $id = (int) ($product['id'] ?? 0);
        if ($id > 0) {
            $expectedIds[$id] = $product;
        }
    }

    $dbProducts = $pdo->query(
        "SELECT id, name, regular_price, sale_price, main_image, category_id, product_type, status
         FROM fh_products
         WHERE status = 'published'
         ORDER BY id"
    )->fetchAll();

    $dbById = [];
    foreach ($dbProducts as $product) {
        $dbById[(int) $product['id']] = $product;
    }

    $problems = [];
    foreach ($expectedIds as $id => $sourceProduct) {
        if (!isset($dbById[$id])) {
            $problems[] = "Missing product ID {$id}: " . (string) ($sourceProduct['name'] ?? 'unknown');
            continue;
        }

        $row = $dbById[$id];
        $expectedName = trim((string) ($sourceProduct['name'] ?? ''));
        if ((string) $row['name'] !== $expectedName) {
            $problems[] = "Product {$id} name mismatch.";
        }

        $price = (float) ($sourceProduct['price'] ?? 0);
        $oldPrice = (float) ($sourceProduct['oldPrice'] ?? 0);
        $expectedRegular = $oldPrice > $price ? $oldPrice : $price;
        $expectedSale = $oldPrice > $price ? $price : null;

        if (abs((float) $row['regular_price'] - $expectedRegular) > 0.001) {
            $problems[] = "Product {$id} regular price mismatch.";
        }
        if ($expectedSale === null) {
            if ($row['sale_price'] !== null) {
                $problems[] = "Product {$id} should not have a sale price.";
            }
        } elseif ($row['sale_price'] === null || abs((float) $row['sale_price'] - $expectedSale) > 0.001) {
            $problems[] = "Product {$id} sale price mismatch.";
        }

        if (trim((string) ($sourceProduct['image'] ?? '')) !== '' && trim((string) ($row['main_image'] ?? '')) === '') {
            $problems[] = "Product {$id} main image missing.";
        }
        if ($row['category_id'] === null) {
            $problems[] = "Product {$id} category is missing.";
        }
    }

    $categoryCount = (int) $pdo->query('SELECT COUNT(*) FROM fh_categories WHERE is_active = 1')->fetchColumn();
    $imageCount = (int) $pdo->query('SELECT COUNT(*) FROM fh_product_images')->fetchColumn();
    $importCount = (int) $pdo->query('SELECT COUNT(*) FROM fh_catalog_imports')->fetchColumn();
    $latestImport = $pdo->query(
        'SELECT app_version, source_file, source_sha256, categories_count, products_count, images_count, imported_at
         FROM fh_catalog_imports ORDER BY id DESC LIMIT 1'
    )->fetch();

    echo "FashionHub catalog verification\n";
    echo "Application version: " . (string) ($config['app']['version'] ?? 'unknown') . "\n";
    echo "Source products: " . count($expectedIds) . "\n";
    echo "Published DB products: " . count($dbProducts) . "\n";
    echo "Active DB categories: {$categoryCount}\n";
    echo "Product images: {$imageCount}\n";
    echo "Import history rows: {$importCount}\n";

    if (is_array($latestImport)) {
        echo "Latest import: {$latestImport['app_version']} at {$latestImport['imported_at']}\n";
        echo "Source SHA-256: {$latestImport['source_sha256']}\n";
    }

    if (count($expectedIds) !== count($dbProducts)) {
        $problems[] = 'Published product count does not match the source product count.';
    }
    if ($categoryCount < 1) {
        $problems[] = 'No active categories found.';
    }
    if ($imageCount < count($expectedIds)) {
        $problems[] = 'Fewer product images than source products.';
    }
    if ($importCount < 1) {
        $problems[] = 'No catalog import history row found.';
    }

    if ($problems !== []) {
        echo "\nFAILED\n";
        foreach ($problems as $problem) {
            echo "- {$problem}\n";
        }
        exit(1);
    }

    echo "\nPASS: the database catalog matches data/home.json.\n";
    exit(0);
} catch (Throwable $error) {
    fwrite(STDERR, "Catalog verification failed: {$error->getMessage()}\n");
    exit(1);
}
