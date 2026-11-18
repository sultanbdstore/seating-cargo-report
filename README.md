# Seating Cargo Report

Upload your regular cargo Excel (`.xlsx` / `.xls` / `.csv`) or paste rows, pick a month, and get:
the **management email draft**, **executive breakdown tables**, **charts**, the full **10-column log**, and an **Excel workbook with the charts embedded**.

Everything runs in the browser — no server, no account, your data never leaves the device.

## The original tool is untouched
`index.html` is your **v4 Audit-Verified** file **byte-for-byte**, plus exactly two added lines:
1. `<link rel="manifest" …>` in the `<head>` (so the phone can install it as an app)
2. `<script src="extras.js"></script>` before `</body>` (loads the add-ons below)

All new features live in `extras.js`. Delete that one line and you are back to the original.

## Added features (in `extras.js`)
| # | Feature | What it does |
|---|---|---|
| 6 | **Data Quality Check** | Flags duplicate truck on the same date, blank truck/amount/purpose/vendor/unit/contact, invalid Bangladeshi mobile numbers (e.g. lost leading `0`), unreadable dates, cargo-out before cargo-in, stay-days that don't match the dates, cargo still holding (no out date), and vendor per-day rates that differ from the usual. Each issue shows the `SL` (log row) and the **Excel Row** from your worksheet. |
| 7 | **Month-wise Comparison** | When the sheet has 2+ months: trips, stay days, cost, average per trip, and % change vs previous month, with a cost chart, plus a check that all months add up to the raw sheet bill total (works with v4's audit totals). |
| 8 | **Quick Share & Export** | *Copy WhatsApp Summary* · *Download Summary Image (PNG)* for management · *Download Log (CSV)* · *Print / Save as PDF*. |
| – | **Log search box** | Filters the 10-column log instantly (truck, vendor, buyer, date…). |
| – | **Installable & offline** | PWA (`manifest.webmanifest`, `sw.js`). After the first online visit the app and its chart/Excel libraries are cached and work offline. |

## Publish on GitHub Pages
1. Create a new repository (e.g. `seating-cargo-report`) and upload **all files in this folder** (`.github` and `.nojekyll` included). `index.html` must be at the repository root.
2. **Settings → Pages → Source: GitHub Actions** (or *Deploy from branch → main / root*).
3. Open `https://<username>.github.io/seating-cargo-report/` in **Chrome** → ⋮ → *Install app* / *Add to Home screen*.

Use a separate repository for each app so Chrome does not show "already installed".

## Icons
`icons/logo-192.png`, `logo-512.png`, `logo-512-maskable.png` are generated placeholders. Replace them with your own files **using the same names** (keep the main picture inside the centre ~80% for the maskable one).

## Updating
After editing any file, bump `VERSION` in `sw.js` (e.g. `cargo-v2`) so phones pick up the change. If an old version shows, wait 1–2 minutes for the Actions run, then reload.

## Notes
- First visit needs internet (libraries load from jsDelivr); later visits work offline.
- Header detection, merged-date fill-down, total-row skipping, reconciliation and the Excel `=SUM()` export are v4's own logic (unchanged); the add-on reads the same records — the checks only *report*, they never change your data.

MIT License
