<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("Catalog seeding is CLI-only.\n");
}

$config = require dirname(__DIR__) . '/includes/bootstrap.php';
$pdo = fashionhub_db($config);
$sourceFile = dirname(__DIR__) . '/data/home.json';

if (!is_file($sourceFile)) {
    fwrite(STDERR, "Missing source file: {$sourceFile}\n");
    exit(1);
}

try {
    $json = file_get_contents($sourceFile);
    if ($json === false) {
        throw new RuntimeException('Unable to read data/home.json.');
    }

    $source = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
    $products = is_array($source['products'] ?? null) ? $source['products'] : [];
    $categories = is_array($source['categories'] ?? null) ? $source['categories'] : [];

    if ($products === []) {
        throw new RuntimeException('No products were found in data/home.json.');
    }

    ensureCatalogV020Schema($pdo);

    $pdo->beginTransaction();

    $categoryIds = seedCategories($pdo, $categories, $products);
    $featuredIds = array_map('intval', (array) ($source['productGroups']['exclusive'] ?? []));
    $stats = seedProducts($pdo, $products, $categoryIds, $featuredIds);

    $importStmt = $pdo->prepare(
        'INSERT INTO fh_catalog_imports (app_version, source_file, source_sha256, categories_count, products_count, images_count)
         VALUES (:version, :source_file, :source_sha256, :categories_count, :products_count, :images_count)'
    );
    $importStmt->execute([
        ':version' => (string) ($config['app']['version'] ?? '0.2.0-dev'),
        ':source_file' => 'data/home.json',
        ':source_sha256' => hash('sha256', $json),
        ':categories_count' => count($categoryIds),
        ':products_count' => $stats['products'],
        ':images_count' => $stats['images'],
    ]);

    $pdo->commit();

    echo "FashionHub catalog seed complete.\n";
    echo "Version: " . (string) ($config['app']['version'] ?? '0.2.0-dev') . "\n";
    echo "Categories: " . count($categoryIds) . "\n";
    echo "Products: {$stats['products']}\n";
    echo "Images: {$stats['images']}\n";
    echo "Product IDs preserved from data/home.json.\n";
    echo "Run: php database/verify-catalog.php\n";
} catch (Throwable $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    fwrite(STDERR, "Catalog seed failed: {$error->getMessage()}\n");
    exit(1);
}

function ensureCatalogV020Schema(PDO $pdo): void
{
    $departmentExists = $pdo->query("SHOW COLUMNS FROM fh_products LIKE 'department'")->fetchColumn();
    if ($departmentExists === false) {
        $pdo->exec("ALTER TABLE fh_products ADD COLUMN department VARCHAR(120) NULL AFTER category_id");
        $pdo->exec("ALTER TABLE fh_products ADD KEY idx_fh_products_department_status (department, status)");
    }

    $featuresExists = $pdo->query("SHOW COLUMNS FROM fh_products LIKE 'features_json'")->fetchColumn();
    if ($featuresExists === false) {
        $pdo->exec("ALTER TABLE fh_products ADD COLUMN features_json LONGTEXT NULL AFTER description");
    }

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS fh_catalog_imports (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            app_version VARCHAR(40) NOT NULL,
            source_file VARCHAR(255) NOT NULL,
            source_sha256 CHAR(64) NOT NULL,
            categories_count INT UNSIGNED NOT NULL DEFAULT 0,
            products_count INT UNSIGNED NOT NULL DEFAULT 0,
            images_count INT UNSIGNED NOT NULL DEFAULT 0,
            imported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_fh_catalog_imports_imported (imported_at),
            KEY idx_fh_catalog_imports_hash (source_sha256)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );
}

/**
 * @param array<int,array<string,mixed>> $sourceCategories
 * @param array<int,array<string,mixed>> $products
 * @return array<string,int> category slug => database id
 */
function seedCategories(PDO $pdo, array $sourceCategories, array $products): array
{
    $definitions = [];
    $sort = 10;

    foreach ($sourceCategories as $category) {
        $name = trim((string) ($category['name'] ?? ''));
        if ($name === '') {
            continue;
        }
        $slug = slugify($name);
        $definitions[$slug] = [
            'name' => $name,
            'slug' => $slug,
            'image' => nullableString($category['image'] ?? null),
            'description' => 'Browse ' . $name . ' products at FashionHub.',
            'sort_order' => $sort,
        ];
        $sort += 10;
    }

    foreach ($products as $product) {
        $name = trim((string) ($product['category'] ?? ''));
        if ($name === '') {
            continue;
        }
        $slug = slugify($name);
        if (!isset($definitions[$slug])) {
            $definitions[$slug] = [
                'name' => $name,
                'slug' => $slug,
                'image' => null,
                'description' => 'Browse ' . $name . ' products at FashionHub.',
                'sort_order' => $sort,
            ];
            $sort += 10;
        }
    }

    $stmt = $pdo->prepare(
        'INSERT INTO fh_categories (name, slug, description, image, seo_title, seo_description, sort_order, is_active)
         VALUES (:name, :slug, :description, :image, :seo_title, :seo_description, :sort_order, 1)
         ON DUPLICATE KEY UPDATE
            id = LAST_INSERT_ID(id),
            name = VALUES(name),
            description = VALUES(description),
            image = COALESCE(VALUES(image), image),
            seo_title = VALUES(seo_title),
            seo_description = VALUES(seo_description),
            sort_order = VALUES(sort_order),
            is_active = 1'
    );

    $ids = [];
    foreach ($definitions as $definition) {
        $seoDescription = 'Shop ' . $definition['name'] . ' at FashionHub with secure checkout and fast delivery.';
        $stmt->execute([
            ':name' => $definition['name'],
            ':slug' => $definition['slug'],
            ':description' => $definition['description'],
            ':image' => $definition['image'],
            ':seo_title' => $definition['name'] . ' | FashionHub',
            ':seo_description' => $seoDescription,
            ':sort_order' => $definition['sort_order'],
        ]);
        $ids[$definition['slug']] = (int) $pdo->lastInsertId();
    }

    return $ids;
}

/**
 * @param array<int,array<string,mixed>> $products
 * @param array<string,int> $categoryIds
 * @param array<int,int> $featuredIds
 * @return array{products:int,images:int}
 */
function seedProducts(PDO $pdo, array $products, array $categoryIds, array $featuredIds): array
{
    $productStmt = $pdo->prepare(
        'INSERT INTO fh_products (
            id, category_id, department, sku, name, slug, product_type, status,
            short_description, description, features_json,
            regular_price, sale_price, manage_stock, stock_qty, stock_status,
            allow_backorders, featured, downloadable, download_file,
            main_image, badge, rating, review_count, seo_title, seo_description, published_at
        ) VALUES (
            :id, :category_id, :department, :sku, :name, :slug, :product_type, \'published\',
            :short_description, :description, :features_json,
            :regular_price, :sale_price, :manage_stock, :stock_qty, \'instock\',
            0, :featured, :downloadable, NULL,
            :main_image, :badge, :rating, :review_count, :seo_title, :seo_description, :published_at
        ) ON DUPLICATE KEY UPDATE
            category_id = VALUES(category_id),
            department = VALUES(department),
            sku = VALUES(sku),
            name = VALUES(name),
            slug = VALUES(slug),
            product_type = VALUES(product_type),
            status = \'published\',
            short_description = VALUES(short_description),
            description = VALUES(description),
            features_json = VALUES(features_json),
            regular_price = VALUES(regular_price),
            sale_price = VALUES(sale_price),
            manage_stock = VALUES(manage_stock),
            stock_qty = VALUES(stock_qty),
            stock_status = \'instock\',
            allow_backorders = 0,
            featured = VALUES(featured),
            downloadable = VALUES(downloadable),
            main_image = VALUES(main_image),
            badge = VALUES(badge),
            rating = VALUES(rating),
            review_count = VALUES(review_count),
            seo_title = VALUES(seo_title),
            seo_description = VALUES(seo_description),
            published_at = VALUES(published_at)'
    );

    $imageCheck = $pdo->prepare('SELECT id FROM fh_product_images WHERE product_id = :product_id AND image = :image LIMIT 1');
    $imageInsert = $pdo->prepare(
        'INSERT INTO fh_product_images (product_id, image, alt_text, sort_order)
         VALUES (:product_id, :image, :alt_text, 0)'
    );

    $seenSlugs = [];
    $productCount = 0;
    $imageCount = 0;

    foreach ($products as $index => $product) {
        $id = (int) ($product['id'] ?? 0);
        $name = trim((string) ($product['name'] ?? ''));
        if ($id < 1 || $name === '') {
            throw new RuntimeException('Every source product must contain a positive id and name.');
        }

        $slug = slugify($name);
        if (isset($seenSlugs[$slug]) && $seenSlugs[$slug] !== $id) {
            $slug .= '-' . $id;
        }
        $seenSlugs[$slug] = $id;

        $categorySlug = slugify((string) ($product['category'] ?? 'uncategorized'));
        $categoryId = $categoryIds[$categorySlug] ?? null;
        $type = ((string) ($product['type'] ?? 'physical')) === 'digital' ? 'digital' : 'physical';
        $currentPrice = max(0.0, (float) ($product['price'] ?? 0));
        $oldPrice = max(0.0, (float) ($product['oldPrice'] ?? 0));
        $regularPrice = $oldPrice > $currentPrice ? $oldPrice : $currentPrice;
        $salePrice = $oldPrice > $currentPrice ? $currentPrice : null;
        $description = trim((string) ($product['description'] ?? ''));
        $features = is_array($product['features'] ?? null) ? array_values($product['features']) : [];
        $mainImage = nullableString($product['image'] ?? null);
        $department = nullableString($product['department'] ?? null);
        $seoDescription = textLimit($description !== '' ? $description : $name . ' at FashionHub.', 300);
        $publishedAt = sprintf('2026-09-07 00:%02d:00', $index % 60);

        $productStmt->execute([
            ':id' => $id,
            ':category_id' => $categoryId,
            ':department' => $department,
            ':sku' => sprintf('FH-%04d', $id),
            ':name' => $name,
            ':slug' => $slug,
            ':product_type' => $type,
            ':short_description' => $description,
            ':description' => $description,
            ':features_json' => $features === [] ? null : json_encode($features, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            ':regular_price' => number_format($regularPrice, 2, '.', ''),
            ':sale_price' => $salePrice === null ? null : number_format($salePrice, 2, '.', ''),
            ':manage_stock' => $type === 'physical' ? 1 : 0,
            ':stock_qty' => $type === 'physical' ? 50 : 0,
            ':featured' => in_array($id, $featuredIds, true) ? 1 : 0,
            ':downloadable' => $type === 'digital' ? 1 : 0,
            ':main_image' => $mainImage,
            ':badge' => nullableString($product['badge'] ?? null),
            ':rating' => (float) ($product['rating'] ?? 0),
            ':review_count' => max(0, (int) ($product['reviews'] ?? 0)),
            ':seo_title' => textLimit($name . ' | FashionHub', 255),
            ':seo_description' => $seoDescription,
            ':published_at' => $publishedAt,
        ]);
        $productCount++;

        if ($mainImage !== null) {
            $imageCheck->execute([':product_id' => $id, ':image' => $mainImage]);
            if ($imageCheck->fetchColumn() === false) {
                $imageInsert->execute([
                    ':product_id' => $id,
                    ':image' => $mainImage,
                    ':alt_text' => $name,
                ]);
            }
            $imageCount++;
        }
    }

    return ['products' => $productCount, 'images' => $imageCount];
}

function slugify(string $value): string
{
    $value = trim($value);
    $value = str_replace(['&', "’", "'"], [' and ', '', ''], $value);
    if (function_exists('iconv')) {
        $converted = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
        if ($converted !== false) {
            $value = $converted;
        }
    }
    $value = strtolower($value);
    $value = preg_replace('/[^a-z0-9]+/', '-', $value) ?? '';
    $value = trim($value, '-');
    return $value !== '' ? $value : 'item';
}

/** @param mixed $value */
function nullableString($value): ?string
{
    $value = trim((string) ($value ?? ''));
    return $value === '' ? null : $value;
}

function textLimit(string $value, int $limit): string
{
    if (function_exists('mb_substr')) {
        return mb_substr($value, 0, $limit, 'UTF-8');
    }
    return substr($value, 0, $limit);
}
