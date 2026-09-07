<?php
declare(strict_types=1);

$config = require dirname(__DIR__, 3) . '/includes/bootstrap.php';
fashionhub_api_require_method('GET');

try {
    $pdo = fashionhub_db($config);

    $slug = fashionhub_query_string('slug');
    $tree = fashionhub_query_bool('tree') ?? false;

    $where = ['c.is_active = 1'];
    $params = [];
    if ($slug !== null) {
        $where[] = 'c.slug = :slug';
        $params[':slug'] = $slug;
    }

    $sql = "SELECT
            c.id,
            c.parent_id,
            c.name,
            c.slug,
            c.description,
            c.image,
            c.seo_title,
            c.seo_description,
            c.sort_order,
            c.created_at,
            c.updated_at,
            COUNT(p.id) AS product_count
        FROM fh_categories c
        LEFT JOIN fh_products p
          ON p.category_id = c.id
         AND p.status = 'published'
        WHERE " . implode(' AND ', $where) . "
        GROUP BY c.id
        ORDER BY c.sort_order, c.name";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    $categories = array_map(static fn(array $row): array => [
        'id' => (int) $row['id'],
        'parent_id' => $row['parent_id'] === null ? null : (int) $row['parent_id'],
        'name' => $row['name'],
        'slug' => $row['slug'],
        'description' => $row['description'],
        'image' => $row['image'],
        'product_count' => (int) $row['product_count'],
        'sort_order' => (int) $row['sort_order'],
        'seo' => [
            'title' => $row['seo_title'],
            'description' => $row['seo_description'],
        ],
        'created_at' => $row['created_at'],
        'updated_at' => $row['updated_at'],
    ], $rows);

    if ($slug !== null) {
        if ($categories === []) {
            fashionhub_api_error('Category not found.', 404);
        }
        fashionhub_api_json(['ok' => true, 'data' => $categories[0]]);
    }

    if ($tree) {
        $byParent = [];
        foreach ($categories as $categoryRow) {
            $key = $categoryRow['parent_id'] === null ? 0 : $categoryRow['parent_id'];
            $byParent[$key][] = $categoryRow;
        }

        $buildTree = static function (int $parentId) use (&$buildTree, &$byParent): array {
            $nodes = [];
            foreach ($byParent[$parentId] ?? [] as $categoryRow) {
                $categoryRow['children'] = $buildTree((int) $categoryRow['id']);
                $nodes[] = $categoryRow;
            }
            return $nodes;
        };

        $categories = $buildTree(0);
    }

    fashionhub_api_json([
        'ok' => true,
        'data' => $categories,
        'count' => count($categories),
    ]);
} catch (PDOException $error) {
    $details = [];
    if (!empty($config['app']['debug'])) {
        $details['exception'] = $error->getMessage();
    }
    fashionhub_api_error('Category database query failed.', 503, $details);
}
