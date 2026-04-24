# Return Label Prepper

A browser-only web app for cropping a return label PDF/image and placing it onto common print-at-home package shipping label templates.

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
- Avery 8126 compatible half-sheet labels are the default template.
- The template catalog includes parcel-safe 4" x 6", half-sheet, 8" x 5", and full-page options.
- Template favorites and the last selected template are saved in browser storage.
- Export creates a printable PDF at 300 DPI using the selected template's page size.
