# Almaty Alatau Map

Offline-capable 3D map of the Almaty mountains with RU/EN language switching.

## GitHub Pages

1. Open the repository **Settings → Pages**.
2. Set **Source** to **Deploy from a branch**.
3. Choose branch `main` and folder `/ (root)`, then save.
4. The site will be available at:

   https://insarerdosov62-source.github.io/almaty-alatau-map/

The app uses relative `./` paths, so it works both at the domain root and at a repository subpath.

## Notes

- All map assets are inlined into `index.html`.
- `sw.js` caches the app shell as `map-v2`.
- The weather widget keeps the last successful forecast in `localStorage` and shows it with an `offline • time` caption when offline.
- When installed to the iOS Home Screen, launch it once while online so Safari can populate the standalone service worker cache.
