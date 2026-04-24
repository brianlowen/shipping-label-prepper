# Return Label Prepper

A browser-only web app for cropping a return label PDF/image and placing it onto an Avery 8126 two-up shipping label sheet.

## Run

```bash
npm install
npm run dev
```

Then open `http://127.0.0.1:5173/`.

## Build

```bash
npm run build
```

## Notes

- Files are processed locally in the browser.
- PDF uploads use the first page in v1.
- Avery 8126 is built in as a US Letter sheet with top and bottom half-sheet slots.
- Export creates a printable US Letter PDF at 300 DPI.
