<?php
declare(strict_types=1);

$configPath = __DIR__ . '/config.php';
$templatePath = __DIR__ . '/config.example.php';

/** @var array<string,mixed> $fashionhubConfig */
$fashionhubConfig = require (is_file($configPath) ? $configPath : $templatePath);

date_default_timezone_set((string) ($fashionhubConfig['app']['timezone'] ?? 'Asia/Dhaka'));

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/api.php';

return $fashionhubConfig;
