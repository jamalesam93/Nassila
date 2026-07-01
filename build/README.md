# Build icons

`electron-builder.yml` points to `build/icon.png` on all targets.

Source artwork is **`build/nassila-icon.svg`**. Rasterize it to the PNG Electron uses:

```bash
npm run icon:raster
```

This runs `sharp` + `to-ico` (`npm install`) and writes:

- `build/icon.png` (512×512)
- `build/icon.ico` (multi-size; **use this on Windows** for title bar + taskbar in dev)

`npm run dev` / `npm run build` call `scripts/ensure-icon.mjs` first. Icons are also copied to `out/main/assets/` for the main process bundle.
