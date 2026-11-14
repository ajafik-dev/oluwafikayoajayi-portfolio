# Oluwafikayo Ajayi — portfolio

Personal site for [oluwafikayoajayi.com](https://oluwafikayoajayi.com) (Cloudflare DNS, Netlify static hosting).

One-page home (`index.html`) with a work list at `work.html`. The contact form posts to a Google Apps Script web app, which emails you and appends a row to a Google Sheet.

## Preview locally

```bash
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080).

## Deploy

Point Netlify at this repo. Canonical URLs use the apex domain `https://oluwafikayoajayi.com/`. `www` is redirected to apex in `netlify.toml` (also configure the same redirect in Cloudflare if www is proxied there).

The old `portfolio_detail.html` placeholder redirects to `work.html`.

## Contact form (Google Apps Script)

The browser posts `first_name`, `last_name`, `email`, `subject`, `message`, and honeypot `bot-field` to the web app URL in `scripts/config.js`. After honeypot and validation checks, the script emails the owner and appends a row (`Timestamp`, `Name`, `Email`, `Subject`, `Message`) to a Google Sheet. Keep `TO_EMAIL` as `YOUR_EMAIL@example.com` and `SHEET_ID` as `YOUR_SHEET_ID` in git; set the real values via Script properties (or locally in the Apps Script editor, not in this repo).

If `SHEET_ID` is still a placeholder or empty, the script logs a warning and skips the Sheet write. Email still sends.

1. Open [script.google.com](https://script.google.com) → New project. Rename it (for example `portfolio-contact`).
2. Replace the default `Code.gs` with [google-apps-script/Code.gs](google-apps-script/Code.gs).
3. Set the recipient: replace `YOUR_EMAIL@example.com` in `TO_EMAIL` at the top of `Code.gs`, **or** Project Settings → Script properties → add `TO_EMAIL`. The script property wins if both are set.
4. Create a blank [Google Sheet](https://sheets.google.com). Copy the spreadsheet ID from the URL (`https://docs.google.com/spreadsheets/d/`**`SHEET_ID`**`/edit`).
5. Set the Sheet: replace `YOUR_SHEET_ID` in `SHEET_ID` at the top of `Code.gs`, **or** Project Settings → Script properties → add `SHEET_ID`. The script property wins if both are set.
   - Optional: Script property or constant `SHEET_NAME` (default `Submissions`). If that tab is missing, the script creates it and writes a header row once.
   - Share the Sheet with the Google account that runs the script (Editor access). Same account as the Apps Script project is already fine.
6. Deploy → New deployment → gear icon → **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
7. Authorize the Gmail/Mail and Spreadsheet scopes when Google asks.
8. Copy the web app URL (`https://script.google.com/macros/s/…/exec`).
9. Paste it into `scripts/config.js` as `googleScriptWebAppUrl` (optional override: `data-script-url` on the form in `index.html`).
10. Redeploy the site on Netlify so the config change is live.

After later edits to `Code.gs`, use Deploy → Manage deployments → Edit → **New version**. A `/exec` health check: open the URL in a browser; you should see `{"ok":true,"service":"portfolio-contact"}`.
