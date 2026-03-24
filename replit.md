# enhance-work

Astro 6 site for Enhance.work — a platform connecting aesthetic professionals with clinics in South Florida.

## Stack

- **Framework**: Astro 6 (frontend)
- **Backend**: Express.js API server
- **Database**: PostgreSQL (Replit built-in)
- **Language**: TypeScript / JavaScript
- **Runtime**: Node.js 22

## Structure

- `src/pages/` - Astro page routes
- `src/sections/` - Page section components (Hero, CTA, Gateway, etc.)
- `src/components/` - Reusable UI components (Nav, ApplyModal, StatCard)
- `src/layouts/` - Layout wrappers
- `src/styles/` - Global styles
- `public/` - Static assets (images, fonts)
- `server.js` - Express API server (handles form submissions)
- `uploads/` - Uploaded resume files

## Database

PostgreSQL table `applications` stores form submissions with fields:
- Personal info: role, name, gender, DOB, email, phone
- Location: address, state, city, zip
- Competences: language (1-5) + levels, licenses
- Experience: years, skills, start date, employment status
- Compensation: salary, pay type
- Meta: terms agreed, injector message read, resume filename

## Google Sheets Integration

- Module: `googleSheets.js` — uses Google Service Account to append rows
- Spreadsheet ID: `1IZfyGQ196Guw-vh7aHZwG-v1zV889tVaRwV72gQjXlY`
- Service account email: `enhance-work-sheets@gen-lang-client-0217514915.iam.gserviceaccount.com`
- Credentials stored in `GOOGLE_SHEETS_CREDENTIALS` env var (JSON)
- Each form submission appends a row to Sheet1 with all application fields
- Headers auto-written on first init if missing

## Tracking & Analytics

- **Meta Pixel**: ID `322421330936674`, loaded in `BaseLayout.astro`
- **Meta CAPI**: Server-side endpoint `/api/meta-capi` in `server.js`; token stored as `META_CAPI_TOKEN` secret
- **Deduplication**: Pixel (browser) and CAPI (server) share the same `event_id` per event; Meta deduplicates automatically
- **Events tracked**: `PageView` (every page load), `CompleteRegistration` (on successful form submission with hashed PII)
- **Test mode**: Controlled by `META_CAPI_TEST_CODE` env var (development only); when empty, events go to production
- **GTM**: Container `GTM-ND2BNFV5`
- **Microsoft Clarity**: ID `svywuv9yv3`

## Development

- Dev workflow runs both `node server.js` (API on port 3000) and `npm run dev` (Astro on port 5000)
- Vite proxy forwards `/api/*` requests from port 5000 to port 3000
- Frontend form in `ApplyModal.astro` and `ApplyForm.astro` posts to `/api/apply`

## Deployment

- Target: autoscale
- Build: `npm run build` (generates static files to `dist/`)
- Run: `node server.js` (serves static files + API on port 5000 via PORT env)
