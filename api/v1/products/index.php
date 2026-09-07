<?php
declare(strict_types=1);

$config = require dirname(__DIR__, 3) . '/includes/bootstrap.php';
fashionhub_api_require_method('GET');

try {
    $pdo = fashionhub_db($config);

    $id = fashionhub_query_int('id', 0, 0, PHP_INT_MAX);
    $slug = fashionhub_query_string('slug');
    $category = fashionhub_query_string('category');
    $type = fashionhub_query_string('type');
    $search = fashionhub_query_string('search');
    $featured = fashionhub_query_bool('featured');
    $page = fashionhub_query_int('page', 1, 1, 1000000);
    $limit = fashionhub_query_int('limit', 24, 1, 100);
    $offset = ($page - 1) * $limit;

    $where = ["p.status = 'published'"];
    $params = [];

    if ($id > 0) {
        $where[] = 'p.id = :id';
        $params[':id'] = $id;
    }
    if ($slug !== null) {
        $where[] = 'p.slug = :slug';
        $params[':slug'] = $slug;
    }
    if ($category !== null) {
        $where[] = 'c.slug = :category';
        $params[':category'] = $category;
    }
    if ($type !== null && in_array($type, ['physical', 'digital'], true)) {
        $where[] = 'p.product_type = :type';
        $params[':type'] = $type;
    }
    if ($featured !== null) {
        $where[] = 'p.featured = :featured';
        $params[':featured'] = $featured ? 1 : 0;
    }
    if ($search !== null) {
        $where[] = '(p.name LIKE :search OR p.short_description LIKE :search OR p.sku LIKE :search)';
        $params[':search'] = '%' . $search . '%';
    }

    $whereSql = implode(' AND ', $where);

    $countSql = "SELECT COUNT(*)
        FROM fh_products p
        LEFT JOIN fh_categories c ON c.id = p.category_id
        WHERE {$whereSql}";
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($params);
    $total = (int) $countStmt->fetchColumn();

    $sql = "SELECT
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
            p.created_at,
            p.updated_at,
            c.name AS category_name,
            c.slug AS category_slug
        FROM fh_products p
        LEFT JOIN fh_categories c ON c.id = p.category_id
        WHERE {$whereSql}
        ORDER BY p.featured DESC, COALESCE(p.published_at, p.created_at) DESC, p.id DESC
        LIMIT :limit OFFSET :offset";

    $stmt = $pdo->prepare($sql);
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll();

    $imagesByProduct = [];
    $productIds = array_map(static fn(array $row): int => (int) $row['id'], $rows);
    if ($productIds !== []) {
        $placeholders = implode(',', array_fill(0, count($productIds), '?'));
        $imageStmt = $pdo->prepare("SELECT product_id, image, alt_text, sort_order
            FROM fh_product_images
            WHERE product_id IN ({$placeholders})
            ORDER BY product_id, sort_order, id");
        foreach ($productIds as $index => $productId) {
            $imageStmt->bindValue($index + 1, $productId, PDO::PARAM_INT);
        }
        $imageStmt->execute();
        foreach ($imageStmt->fetchAll() as $imageRow) {
            $imagesByProduct[(int) $imageRow['product_id']][] = [
                'image' => $imageRow['image'],
                'alt' => $imageRow['alt_text'],
                'sort_order' => (int) $imageRow['sort_order'],
            ];
        }
    }

    $products = array_map(static function (array $row) use ($imagesByProduct): array {
        $regular = (float) $row['regular_price'];
        $sale = $row['sale_price'] !== null ? (float) $row['sale_price'] : null;
        $price = ($sale !== null && $sale >= 0 && $sale < $regular) ? $sale : $regular;
        $stockQty = (int) $row['stock_qty'];
        $stockStatus = (string) $row['stock_status'];
        $features = [];
        if (is_string($row['features_json']) && $row['features_json'] !== '') {
            $decoded = json_decode($row['features_json'], true);
            if (is_array($decoded)) {
                $features = array_values(array_filter($decoded, 'is_string'));
            }
        }

        return [
            'id' => (int) $row['id'],
            'sku' => $row['sku'],
            'name' => $row['name'],
            'slug' => $row['slug'],
            'department' => $row['department'],
            'type' => $row['product_type'],
            'short_description' => $row['short_description'],
            'description' => $row['description'],
            'features' => $features,
            'price' => $price,
            'regular_price' => $regular,
            'sale_price' => $sale,
            'stock' => [
                'manage' => (bool) $row['manage_stock'],
                'quantity' => $stockQty,
                'status' => $stockStatus,
                'allow_backorders' => (bool) $row['allow_backorders'],
                'available' => $stockStatus === 'instock' && (!(bool) $row['manage_stock'] || $stockQty > 0),
            ],
            'featured' => (bool) $row['featured'],
            'downloadable' => (bool) $row['downloadable'],
            'badge' => $row['badge'],
            'rating' => (float) $row['rating'],
            'reviews' => (int) $row['review_count'],
            'image' => $row['main_image'],
            'gallery' => $imagesByProduct[(int) $row['id']] ?? [],
            'category' => $row['category_id'] === null ? null : [
                'id' => (int) $row['category_id'],
                'name' => $row['category_name'],
                'slug' => $row['category_slug'],
            ],
            'seo' => [
                'title' => $row['seo_title'],
                'description' => $row['seo_description'],
            ],
            'published_at' => $row['published_at'],
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at'],
        ];
    }, $rows);

    if (($id > 0 || $slug !== null) && $products === []) {
        fashionhub_api_error('Product not found.', 404);
    }

    if ($id > 0 || $slug !== null) {
        fashionhub_api_json([
            'ok' => true,
            'data' => $products[0],
        ]);
    }

    fashionhub_api_json([
        'ok' => true,
        'data' => $products,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'pages' => (int) ceil($total / $limit),
        ],
    ]);
} catch (PDOException $error) {
    $details = [];
    if (!empty($config['app']['debug'])) {
        $details['exception'] = $error->getMessage();
    }
    fashionhub_api_error('Catalog database query failed.', 503, $details);
}
