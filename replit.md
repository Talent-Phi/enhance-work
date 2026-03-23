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
- Competences: languages, licenses
- Experience: years, skills, start date, employment status
- Compensation: salary, pay type
- Meta: terms agreed, injector message read, resume filename

## Development

- Dev workflow runs both `node server.js` (API on port 3000) and `npm run dev` (Astro on port 5000)
- Vite proxy forwards `/api/*` requests from port 5000 to port 3000
- Frontend form in `ApplyModal.astro` posts to `/api/apply`

## Deployment

- Target: autoscale
- Build: `npm run build` (generates static files to `dist/`)
- Run: `node server.js` (serves static files + API on port 5000 via PORT env)
