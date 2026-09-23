# One Stop Rental App

React and Vite real estate investment calculator. Run `npm install` and `npm run dev` for local work; `npm run build` generates the static `dist/` folder.

The public app is served by the Raleigh NC Guide GitHub Pages site at `/calculator/`. Vite uses `base: '/calculator/'` so generated assets resolve from that folder.

## Investor lead intake

The first visit requires name, email, phone, and contact consent. The optional Raleigh investing contact request sends an immediate email to `benjamin.carver@exprealty.com`. A timestamp in `localStorage` skips the gate on later visits from the same browser.

Investor leads go only to the separate **INVESTOR MASTER LEAD SHEET**. The standalone Google Apps Script source is `scripts/investor-lead-apps-script.gs`; it is bound to that sheet and deployed as a Web app. Set `VITE_INVESTOR_LEAD_ENDPOINT` to the Web app `/exec` URL when building. The gate stays locked if the endpoint is missing or does not acknowledge a saved lead.

The header and footer booking buttons go to the investor-specific `/invest/` booking page. The floating help widget offers short Q&A for the selected calculator tab and a non-live message form. Questions use the same Apps Script endpoint, append to the separate investor sheet with submission type, calculator tab, and message, and send an email alert to `benjamin.carver@exprealty.com`.

To publish updates, build this repository and copy the contents of `dist/` into the main website repository's `calculator/` directory, then commit and push that website repository's `main` branch. GitHub Pages serves from its root directory. Keep the source code in this repository; `dist/` is a generated artifact.
