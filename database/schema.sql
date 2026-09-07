-- FashionHub catalog schema
-- Version: 0.1.0-dev
-- Target: MySQL 8.0+ / MariaDB 10.5+
-- Import this file into the database selected for FashionHub.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS fh_categories (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    parent_id BIGINT UNSIGNED NULL,
    name VARCHAR(160) NOT NULL,
    slug VARCHAR(190) NOT NULL,
    description TEXT NULL,
    image VARCHAR(500) NULL,
    seo_title VARCHAR(255) NULL,
    seo_description VARCHAR(320) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_fh_categories_slug (slug),
    KEY idx_fh_categories_parent (parent_id),
    KEY idx_fh_categories_active_sort (is_active, sort_order),
    CONSTRAINT fk_fh_categories_parent
        FOREIGN KEY (parent_id) REFERENCES fh_categories(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fh_products (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    category_id BIGINT UNSIGNED NULL,
    sku VARCHAR(120) NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(190) NOT NULL,
    product_type ENUM('physical','digital') NOT NULL DEFAULT 'physical',
    status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
    short_description TEXT NULL,
    description MEDIUMTEXT NULL,
    regular_price DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    sale_price DECIMAL(14,2) NULL,
    cost_price DECIMAL(14,2) NULL,
    manage_stock TINYINT(1) NOT NULL DEFAULT 1,
    stock_qty INT NOT NULL DEFAULT 0,
    stock_status ENUM('instock','outofstock','backorder') NOT NULL DEFAULT 'instock',
    allow_backorders TINYINT(1) NOT NULL DEFAULT 0,
    featured TINYINT(1) NOT NULL DEFAULT 0,
    downloadable TINYINT(1) NOT NULL DEFAULT 0,
    download_file VARCHAR(500) NULL,
    download_limit INT NULL,
    download_expiry_days INT NULL,
    main_image VARCHAR(500) NULL,
    badge VARCHAR(80) NULL,
    rating DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    review_count INT UNSIGNED NOT NULL DEFAULT 0,
    seo_title VARCHAR(255) NULL,
    seo_description VARCHAR(320) NULL,
    published_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_fh_products_slug (slug),
    UNIQUE KEY uq_fh_products_sku (sku),
    KEY idx_fh_products_category_status (category_id, status),
    KEY idx_fh_products_status_featured (status, featured),
    KEY idx_fh_products_type_status (product_type, status),
    KEY idx_fh_products_stock (stock_status, stock_qty),
    KEY idx_fh_products_published (published_at),
    FULLTEXT KEY ft_fh_products_search (name, short_description, description),
    CONSTRAINT fk_fh_products_category
        FOREIGN KEY (category_id) REFERENCES fh_categories(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fh_product_images (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_id BIGINT UNSIGNED NOT NULL,
    image VARCHAR(500) NOT NULL,
    alt_text VARCHAR(255) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_fh_product_images_product_sort (product_id, sort_order),
    CONSTRAINT fk_fh_product_images_product
        FOREIGN KEY (product_id) REFERENCES fh_products(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fh_attributes (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(120) NOT NULL,
    slug VARCHAR(120) NOT NULL,
    input_type ENUM('select','color','text') NOT NULL DEFAULT 'select',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_fh_attributes_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fh_attribute_terms (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    attribute_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(120) NOT NULL,
    slug VARCHAR(120) NOT NULL,
    value VARCHAR(120) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_fh_attribute_term_slug (attribute_id, slug),
    KEY idx_fh_attribute_terms_sort (attribute_id, sort_order),
    CONSTRAINT fk_fh_attribute_terms_attribute
        FOREIGN KEY (attribute_id) REFERENCES fh_attributes(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fh_product_attribute_terms (
    product_id BIGINT UNSIGNED NOT NULL,
    term_id BIGINT UNSIGNED NOT NULL,
    is_variation TINYINT(1) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    PRIMARY KEY (product_id, term_id),
    KEY idx_fh_product_attribute_terms_variation (product_id, is_variation, sort_order),
    CONSTRAINT fk_fh_product_attribute_terms_product
        FOREIGN KEY (product_id) REFERENCES fh_products(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_fh_product_attribute_terms_term
        FOREIGN KEY (term_id) REFERENCES fh_attribute_terms(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fh_product_variations (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_id BIGINT UNSIGNED NOT NULL,
    sku VARCHAR(120) NULL,
    regular_price DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    sale_price DECIMAL(14,2) NULL,
    stock_qty INT NOT NULL DEFAULT 0,
    stock_status ENUM('instock','outofstock','backorder') NOT NULL DEFAULT 'instock',
    image VARCHAR(500) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_fh_product_variations_sku (sku),
    KEY idx_fh_product_variations_product_active (product_id, is_active),
    CONSTRAINT fk_fh_product_variations_product
        FOREIGN KEY (product_id) REFERENCES fh_products(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fh_variation_terms (
    variation_id BIGINT UNSIGNED NOT NULL,
    term_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (variation_id, term_id),
    CONSTRAINT fk_fh_variation_terms_variation
        FOREIGN KEY (variation_id) REFERENCES fh_product_variations(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_fh_variation_terms_term
        FOREIGN KEY (term_id) REFERENCES fh_attribute_terms(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
