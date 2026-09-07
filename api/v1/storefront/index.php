<?php
declare(strict_types=1);

$config = require dirname(__DIR__, 3) . '/includes/bootstrap.php';
fashionhub_api_require_method('GET');

try {
    $pdo = fashionhub_db($config);
    $sourceFile = dirname(__DIR__, 3) . '/data/home.json';
    if (!is_file($sourceFile)) {
        throw new RuntimeException('Storefront merchandising source is missing.');
    }

    $sourceJson = file_get_contents($sourceFile);
    if ($sourceJson === false) {
        throw new RuntimeException('Unable to read storefront merchandising source.');
    }

    $storefront = json_decode($sourceJson, true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($storefront)) {
        throw new RuntimeException('Invalid storefront merchandising source.');
    }

    $productRows = $pdo->query(
        "SELECT
            p.id,
            p.category_id,
            p.department,
            p.sku,
            p.name,
            p.slug,
            p.product_type,
            p.short_description,
            p.description,
            p.features_json,
            p.regular_price,
            p.sale_price,
            p.manage_stock,
            p.stock_qty,
            p.stock_status,
            p.allow_backorders,
            p.featured,
            p.downloadable,
            p.main_image,
            p.badge,
            p.rating,
            p.review_count,
            p.seo_title,
            p.seo_description,
            p.published_at,
            c.name AS category_name,
            c.slug AS category_slug
        FROM fh_products p
        LEFT JOIN fh_categories c ON c.id = p.category_id
        WHERE p.status = 'published'
        ORDER BY p.id ASC"
    )->fetchAll();

    if ($productRows === []) {
        throw new RuntimeException('The catalog contains no published products. Run the catalog seed first.');
    }

    $productIds = array_map(static fn(array $row): int => (int) $row['id'], $productRows);
    $imagesByProduct = [];
    if ($productIds !== []) {
        $placeholders = implode(',', array_fill(0, count($productIds), '?'));
        $imageStmt = $pdo->prepare(
            "SELECT product_id, image, alt_text, sort_order
             FROM fh_product_images
             WHERE product_id IN ({$placeholders})
             ORDER BY product_id, sort_order, id"
        );
        foreach ($productIds as $index => $productId) {
            $imageStmt->bindValue($index + 1, $productId, PDO::PARAM_INT);
        }
        $imageStmt->execute();
        foreach ($imageStmt->fetchAll() as $imageRow) {
            $imagesByProduct[(int) $imageRow['product_id']][] = [
                'image' => (string) $imageRow['image'],
                'alt' => $imageRow['alt_text'],
                'sort_order' => (int) $imageRow['sort_order'],
            ];
        }
    }

    $products = [];
    foreach ($productRows as $row) {
        $regular = (float) $row['regular_price'];
        $sale = $row['sale_price'] !== null ? (float) $row['sale_price'] : null;
        $hasSale = $sale !== null && $sale >= 0 && $sale < $regular;
        $features = [];
        if (!empty($row['features_json'])) {
            $decoded = json_decode((string) $row['features_json'], true);
            if (is_array($decoded)) {
                $features = array_values(array_filter(array_map('strval', $decoded), static fn(string $value): bool => trim($value) !== ''));
            }
        }

        $productId = (int) $row['id'];
        $categoryName = trim((string) ($row['category_name'] ?? '')) ?: 'Uncategorized';
        $department = trim((string) ($row['department'] ?? '')) ?: $categoryName;
        $image = trim((string) ($row['main_image'] ?? ''));
        $description = trim((string) ($row['description'] ?? ''));
        if ($description === '') {
            $description = trim((string) ($row['short_description'] ?? ''));
        }

        $products[] = [
            'id' => $productId,
            'sku' => $row['sku'],
            'slug' => (string) $row['slug'],
            'name' => (string) $row['name'],
            'category' => $categoryName,
            'categorySlug' => (string) ($row['category_slug'] ?? ''),
            'department' => $department,
            'type' => (string) $row['product_type'],
            'price' => $hasSale ? $sale : $regular,
            'oldPrice' => $hasSale ? $regular : null,
            'regularPrice' => $regular,
            'salePrice' => $hasSale ? $sale : null,
            'rating' => (float) $row['rating'],
            'reviews' => (int) $row['review_count'],
            'badge' => $row['badge'],
            'image' => $image,
            'gallery' => $imagesByProduct[$productId] ?? [],
            'description' => $description,
            'features' => $features,
            'featured' => (bool) $row['featured'],
            'downloadable' => (bool) $row['downloadable'],
            'stock' => [
                'manage' => (bool) $row['manage_stock'],
                'quantity' => (int) $row['stock_qty'],
                'status' => (string) $row['stock_status'],
                'allowBackorders' => (bool) $row['allow_backorders'],
            ],
            'seo' => [
                'title' => $row['seo_title'],
                'description' => $row['seo_description'],
            ],
            'publishedAt' => $row['published_at'],
        ];
    }

    $categoryRows = $pdo->query(
        "SELECT
            c.id,
            c.name,
            c.slug,
            c.image,
            c.seo_title,
            c.seo_description,
            c.sort_order,
            COUNT(p.id) AS product_count
         FROM fh_categories c
         LEFT JOIN fh_products p ON p.category_id = c.id AND p.status = 'published'
         WHERE c.is_active = 1
         GROUP BY c.id, c.name, c.slug, c.image, c.seo_title, c.seo_description, c.sort_order
         ORDER BY c.sort_order ASC, c.name ASC"
    )->fetchAll();

    $categories = array_map(static fn(array $row): array => [
        'id' => (string) $row['slug'],
        'databaseId' => (int) $row['id'],
        'name' => (string) $row['name'],
        'slug' => (string) $row['slug'],
        'count' => (int) $row['product_count'],
        'image' => $row['image'],
        'seo' => [
            'title' => $row['seo_title'],
            'description' => $row['seo_description'],
        ],
    ], $categoryRows);

    $ids = array_map(static fn(array $product): int => (int) $product['id'], $products);
    $idSet = array_fill_keys($ids, true);

    $popular = $products;
    usort($popular, static function (array $a, array $b): int {
        return [$b['reviews'], $b['rating'], $b['id']] <=> [$a['reviews'], $a['rating'], $a['id']];
    });

    $flash = array_values(array_filter($products, static fn(array $product): bool => $product['oldPrice'] !== null && (float) $product['oldPrice'] > (float) $product['price']));
    usort($flash, static function (array $a, array $b): int {
        $aDiscount = ((float) $a['oldPrice'] - (float) $a['price']) / max(1.0, (float) $a['oldPrice']);
        $bDiscount = ((float) $b['oldPrice'] - (float) $b['price']) / max(1.0, (float) $b['oldPrice']);
        return $bDiscount <=> $aDiscount;
    });

    $new = $products;
    usort($new, static fn(array $a, array $b): int => strcmp((string) ($b['publishedAt'] ?? ''), (string) ($a['publishedAt'] ?? '')) ?: ($b['id'] <=> $a['id']));

    $digital = array_values(array_filter($products, static fn(array $product): bool => $product['type'] === 'digital'));
    $exclusive = array_values(array_filter($products, static fn(array $product): bool => !empty($product['featured'])));
    if ($exclusive === []) {
        $exclusive = array_slice($popular, 0, 8);
    }

    $storefront['products'] = $products;
    $storefront['categories'] = $categories;
    $storefront['productGroups'] = [
        'popular' => array_column(array_slice($popular, 0, 18), 'id'),
        'flash' => array_column(array_slice($flash, 0, 16), 'id'),
        'new' => array_column(array_slice($new, 0, 18), 'id'),
        'digital' => array_column(array_slice($digital, 0, 18), 'id'),
        'exclusive' => array_column(array_slice($exclusive, 0, 12), 'id'),
    ];

    if (isset($storefront['departments']) && is_array($storefront['departments'])) {
        foreach ($storefront['departments'] as &$department) {
            $departmentId = strtolower(trim((string) ($department['id'] ?? '')));
            $departmentProducts = array_values(array_filter(
                $products,
                static fn(array $product): bool => strtolower((string) $product['department']) === $departmentId
            ));
            if ($departmentProducts !== []) {
                $department['products'] = array_column(array_slice($departmentProducts, 0, 8), 'id');
            } elseif (isset($department['products']) && is_array($department['products'])) {
                $department['products'] = array_values(array_filter(array_map('intval', $department['products']), static fn(int $id): bool => isset($idSet[$id])));
            }
        }
        unset($department);
    }

    if (isset($storefront['bestsellers']) && is_array($storefront['bestsellers'])) {
        foreach ($storefront['bestsellers'] as &$group) {
            if (isset($group['products']) && is_array($group['products'])) {
                $group['products'] = array_values(array_filter(array_map('intval', $group['products']), static fn(int $id): bool => isset($idSet[$id])));
            }
        }
        unset($group);
    }

    if (isset($storefront['heroes']) && is_array($storefront['heroes'])) {
        foreach ($storefront['heroes'] as &$hero) {
            if (!isset($hero['float']) || !is_array($hero['float'])) {
                continue;
            }
            $hero['float'] = array_values(array_filter($hero['float'], static function (array $item) use ($idSet): bool {
                return isset($idSet[(int) ($item['productId'] ?? 0)]);
            }));
        }
        unset($hero);
    }

    $storefront['_meta'] = [
        'source' => 'mysql',
        'version' => (string) ($config['app']['version'] ?? '0.3.0-dev'),
        'products' => count($products),
        'categories' => count($categories),
        'generatedAt' => gmdate('c'),
    ];

    fashionhub_api_json([
        'ok' => true,
        'data' => $storefront,
    ]);
} catch (Throwable $error) {
    $details = [];
    if (!empty($config['app']['debug'])) {
        $details['exception'] = $error->getMessage();
    }
    fashionhub_api_error('Unable to build storefront catalog payload.', 503, $details);
}
