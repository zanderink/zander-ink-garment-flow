# Zander Ink Garment Flow — v1

A separate, garment-specific Kanban workflow. This does not replace or modify your existing Trello or Production Board.

## Features

- Move job cards between editable stage columns; add stages; search jobs
- Job card includes artwork, email, address, notes, due date, production type, delivery
- Add as many garment/color rows as needed, each with optional XS–6XL sizes
- Ordered and received quantities per size; mark a size fully checked in or enter a partial received count
- Shared server with persistent JSON file, multi-device refresh approximately every 12 seconds
- JSON export and add-only import for backup
- Optional S&S catalog lookup (style and color) after credentials are configured; manually enter garments otherwise
- SanMar API integration not yet implemented; manually enter SanMar garments in this version

## Run locally

Install Node.js 20 or later. From this folder run `npm start`, then browse to http://localhost:8080 on the same computer. If the browser cannot connect, check your firewall. All changes persist in `data/board.json`.

## Deploy to Railway

1. Create a **new** private GitHub repository (do not replace your current Production Board repository).
2. Upload all project files, keeping `server.js`, `package.json`, and `Dockerfile` at root and `public/` inside.
3. In Railway, create a new service from the new repository. Use port 8080.
4. Attach a persistent volume mounted at `/app/data` and set a Railway variable `DATA_DIR=/app/data`. IMPORTANT: Set the volume before storing real orders, because non-volume files may be lost on redeploy.
5. Generate a Railway public service domain. Verify that jobs persist after reloading and a redeploy.
6. Do not share the URL widely if the board is running without access protection. The current app is password-free unless `BOARD_ACCESS_KEY` is configured; with this key set, browsers ask for the key once and remember it locally. You can use Railway's network access policies or other access controls instead.
7. Use the live website address on iPhone/iPad (Safari > Share > Add to Home Screen), Windows (Edge > Apps > Install), and shop TV.

### Optional S&S Activewear catalog integration

Set these variables privately in Railway:

- `SS_ACCOUNT_NUMBER` — your S&S account number
- `SS_API_KEY` — your S&S API key

Search from a garment entry, using a brand/style such as `Gildan 8000`, then select a color. An API result fills in supplier, brand, style, and color. The size/receiving grid stays editable. No order is placed with S&S.

Official API: https://api.ssactivewear.com/V2/Products.aspx

### SanMar

SanMar provides Web Services integrations (SOAP/PromoStandards), but access needs to be requested from `sanmarintegrations@sanmar.com`. This v1 intentionally avoids guessing product color/size availability from their live catalog. Choose SanMar as supplier and type style/color manually until the API connection is implemented.

### Important differences from Trello

- This is a new standalone app, not a clone of Trello internals or a live Trello mirror.
- It starts with empty cards and standard lists. Your existing Trello cards are not automatically migrated or synchronized.
- Each uploaded mockup is stored as a base64 string in the board JSON for simplicity. Keep photos below 4 MB. For a larger rollout, use dedicated image/object storage.
- Cards move by drag-and-drop on desktop browsers; on touch devices, open a card and change its **Order stage**.
- The server uses a single JSON file with serialized writes. Suitable for small-team initial use, not yet a full production-grade database with audit trail, roles, or multi-editor conflict resolution.

## Data privacy and backups

Back up `data/board.json` regularly, or export from the UI. Do not commit `data/board.json`, `.env`, or your supplier credentials to GitHub. If using a public URL without access control, anyone who knows it may access customer details and change jobs.

## V2 Trello-inspired card workspace

The V2 update includes the full list preset based on the supplied Trello screenshots, a Move Card dialog with destination and position, large cover artwork, multiple image attachments, job details, repeatable garment receiving grids, and a comments/activity feed. These records are stored within the same `data/board.json` file on your Garment Flow server. Existing V1 cards still load; missing fields default to empty.

This is a separate application from your live Trello and Zander Ink Production Board. Moving a card in Garment Flow changes only Garment Flow. A production-board handoff requires a separate, authenticated integration before it can be enabled safely.

### Important

The browser stores attachments as image data within the card record for this first version. For production use with many large mockups, move image storage to an object store or uploaded file volume before heavy use. API server remains the same apart from additional card fields and larger request limits.
