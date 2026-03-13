# Mimi Tip Cards (Venmo/Cash App)

A single-QR app for tipping technicians.

## What this does
- Customer scans one QR code.
- Customer sees only the tip page with one large technician list.
- Customer selects technician and chooses Venmo or Cash App.
- Technician links can come directly from Google Sheet (online mode).

## Setup (Local)
1. Install dependencies:
   ```bash
   npm install
   ```
2. Put settings in `.env` (already prepared in this project).
3. Run the app:
   ```bash
   npm start
   ```
4. Open customer page: `http://localhost:4010`.
5. Open admin page for edits: `http://localhost:4010/admin`.

## Online Mode (Google Sheet + Static Hosting)
This is the recommended mode for customers scanning QR from anywhere.

1. Set your sheet CSV URL in:
   - `/Users/davidnguyen/Documents/Mimi Tip Cards/public/config.js`
2. Deploy `public/` as a static site (GitHub Pages is free).
3. Share that site URL via QR code.

In this mode:
- The customer page loads technicians directly from Google Sheet.
- No local server is required for customers.

## Auto Start On Mac Login/Startup
Use the provided LaunchAgent:

```bash
cp "/Users/davidnguyen/Documents/Mimi Tip Cards/ops/com.david.mimi-tipcards.plist" "$HOME/Library/LaunchAgents/"
launchctl unload "$HOME/Library/LaunchAgents/com.david.mimi-tipcards.plist" 2>/dev/null || true
launchctl load "$HOME/Library/LaunchAgents/com.david.mimi-tipcards.plist"
```

Now the app auto-starts at login/startup and stays running.
Logs:
- `/Users/davidnguyen/Documents/Mimi Tip Cards/logs/tipcards.out.log`
- `/Users/davidnguyen/Documents/Mimi Tip Cards/logs/tipcards.err.log`

## Google Sheets Mode (No paid hosting needed)
Use Google Sheets as your editable staff directory.

1. Create a Google Sheet with columns:
   - `id` (optional)
   - `name` (required)
   - `venmo` (optional)
   - `cashapp` (optional)
2. File -> Share -> Publish to web -> choose the sheet tab -> format `CSV`.
3. Copy the published CSV URL.
4. Set environment variable:
   - `GOOGLE_SHEET_CSV_URL=<your-published-csv-url>`
5. Start/deploy app.

How it works:
- Customer page reads technicians from Google Sheet.
- App becomes read-only for add/edit/remove API.
- Update staff by editing the Google Sheet directly.

Storage priority:
1. `GOOGLE_SHEET_CSV_URL` (read-only mode)
2. `DATABASE_URL` (PostgreSQL mode)
3. local file `data/technicians.json` (fallback)

## Edit technicians anytime
On the admin page (`/admin`):
- Use **Add Technician** to add a new person.
- Use **Save** on an existing row to update name/Venmo/Cash App.
- Use **Remove** to delete a technician.

## One QR code
Create one QR code pointing to your deployed app URL (example: `https://tips.yourbusiness.com`).
That single QR code works for all technicians.

Generate/update QR files with:
```bash
npm run qr -- https://YOUR-SERVICE.onrender.com
```
Output files:
- `/Users/davidnguyen/Documents/Mimi Tip Cards/public/qr/customer-tip-qr.png`
- `/Users/davidnguyen/Documents/Mimi Tip Cards/public/qr/customer-tip-qr.svg`
