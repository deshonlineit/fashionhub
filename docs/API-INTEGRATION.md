# API integration

The frontend renders the complete homepage from one response. The bundled contract is:

`data/home.json`

Keep the same top-level keys when the data comes from PHP, Laravel or another backend:

- `store`
- `navigation`
- `categoryTree`
- `heroes`
- `categories`
- `products`
- `groups`
- `departments`
- `bestsellers`
- `reviews`
- `blogs`
- `social`

## Switch to the included PHP endpoint

Edit `assets/js/config.js`:

```js
window.FASHIONHUB_API_BASE = 'backend-examples/php';
window.FASHIONHUB_HOME_ENDPOINT = 'home.php';
```

The example endpoint includes JSON headers, an ETag and short browser caching. Replace its file read with PDO/MySQL queries while keeping the response shape identical to `data/home.json`.

## Laravel endpoint

Route:

```php
use App\Http\Controllers\Storefront\HomeController;
use Illuminate\Support\Facades\Route;

Route::get('/storefront/home', HomeController::class);
```

Controller outline:

```php
<?php

namespace App\Http\Controllers\Storefront;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

final class HomeController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $payload = Cache::remember('storefront.home.v1', 300, function (): array {
            // Query products, categories, offers, reviews and posts here.
            // Transform them to the same structure as data/home.json.
            return json_decode(
                file_get_contents(public_path('storefront/data/home.json')),
                true,
                512,
                JSON_THROW_ON_ERROR
            );
        });

        return response()->json($payload)
            ->setPublic()
            ->setMaxAge(300);
    }
}
```

Then configure:

```js
window.FASHIONHUB_API_BASE = '/api/storefront';
window.FASHIONHUB_HOME_ENDPOINT = 'home';
```

## Production optimization

After the real API is stable, you may remove this fallback line from `index.html` to save the extra demo payload:

```html
<script src="data/home-data.js"></script>
```

Keep cache headers or ETags enabled on the API. Images are already local WebP files, and no external font, framework, icon library or runtime dependency is loaded.
