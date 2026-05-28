# Build icons

`electron-builder.yml` points to `build/icon.png` on all targets.

Source artwork is **`build/nassila-icon.svg`**. Rasterize it to the PNG Electron uses:

```bash
npm run icon:raster
```

This runs `sharp` (`npm install`) and writes `build/icon.png` (512×512).

Windows installers use `dist/.icon-ico/icon.ico` (generated during build). The unpacked `Nassila.exe` icon is applied in `scripts/win-after-pack.mjs` because `signAndEditExecutable: false` skips electron-builder’s built-in rcedit step (avoids code-sign tooling issues).
