# Movix

Movix is a full-stack movie ticket booking platform for browsing movies, discovering coming-soon releases, selecting seats, booking tickets, managing theaters, and running admin/owner workflows.

The app uses MongoDB for application data and Cloudinary for media assets. Movie posters, backdrops, and cast photos are stored as Cloudinary URLs in MongoDB, so the frontend can render media directly from saved records.

## Features

- Movie discovery, search, wishlist, and coming-soon pages
- Movie detail pages with posters, backdrops, trailers, cast, reviews, and show listings
- Theater and show browsing by city
- Seat selection with real-time booked-seat updates through Socket.IO
- Booking confirmation with QR code, PDF ticket, and invoice support
- JWT authentication with login, register, email OTP verification, and password reset
- User dashboard for profile and booking history
- Owner dashboard for theater/show management workflows
- Admin dashboard with users, theaters, revenue, occupancy, and system status
- Razorpay-ready payment integration
- Brevo/Bravo email hooks for transactional email
- Cloudinary upload/migration support for app media

## Tech Stack

- **Frontend:** React 18, Vite, TanStack Router, TanStack Query, Redux Toolkit
- **UI:** Tailwind CSS, Radix UI, Lucide React, custom ReactBits-style components
- **Backend:** Node.js, Express, Socket.IO
- **Database:** MongoDB with Mongoose
- **Media:** Cloudinary
- **Auth:** JWT, bcrypt
- **Payments:** Razorpay-ready API flow
- **Tickets:** PDFKit and QR code generation

## Project Structure

```text
BookMyScreen/
  server/
    config/             Environment parsing and validation
    data/               Static review seed helpers used by the API
    middleware/         Auth, async handling, rate limiting, headers
    models/             Mongoose models
    routes/             Auth, movies, shows, bookings, payments, admin, owner APIs
    services/           Database, email, Cloudinary, tickets, seats, notifications
    sockets/            Socket.IO seat and notification channels
    index.js            Express API entry

  src/
    app/                TanStack Router routes and app store
    features/           Feature modules for auth, movies, booking, owner, admin
    shared/             Shared UI, hooks, utilities, services
    main.jsx            Static Vite client entry
    router.jsx          Router setup
    styles.css          Tailwind and global styles

  scripts/
    create-spa-route-fallbacks.mjs
    migrate-images-cloudinary.mjs
```

## Requirements

- Node.js `22.12.0` or compatible Node 22+
- npm
- MongoDB database
- Cloudinary account for real media upload/storage

The expected Node version is also pinned in `.node-version`.

## Environment Variables

Create a `.env` file from `.env.example`.

```bash
cp .env.example .env
```

API_PORT=4000
CLIENT_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/movix
MONGODB_DB=movix
ALLOW_MEMORY_STORE=false
JWT_SECRET=change-me-in-production
BRAVO_API_KEY=
BRAVO_FROM_EMAIL=
BRAVO_FROM_NAME=movix
PAYMENT_PROVIDER=local
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
CLOUDINARY_URL=cloudinary://your_api_key:your_api_secret@your_cloud_name
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
ADMIN_EMAIL=
ADMIN_PASSWORD=change-this-password
VITE_API_URL=http://localhost:4000

## Local Development

Install dependencies:

```bash
npm install
```

Start the API:

```bash
npm run dev:api
```

Start the frontend in another terminal:

```bash
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:5173`
- API: `http://localhost:4000`
- Health check: `http://localhost:4000/api/health`

## Available Scripts

| Command                      | Description                             |
| ---------------------------- | --------------------------------------- |
| `npm run dev`                | Start Vite frontend dev server          |
| `npm run dev:api`            | Start Express API server                |
| `npm run build`              | Build static frontend into `dist`       |
| `npm run build:ssr`          | Run Vite SSR build                      |
| `npm run build:dev`          | Build in development mode               |
| `npm run renderbuild`        | Render-friendly clean install and build |
| `npm run start:api`          | Start the Express API                   |
| `npm run preview`            | Preview the built frontend              |
| `npm run migrate:cloudinary` | Upload/migrate image URLs to Cloudinary |
| `npm run lint`               | Run ESLint                              |
| `npm run format`             | Format project files with Prettier      |

## Data And Media Flow

- MongoDB stores users, theaters, movies, shows, bookings, reviews, and cast records.
- Cloudinary stores image files such as posters, backdrops, cast photos, and uploaded media.
- MongoDB records store Cloudinary URLs, not image binaries.
- The frontend reads movie/show/cast data from the API, then renders Cloudinary URLs from those records.

This means Cloudinary can hold the images, but MongoDB still needs the matching URL saved in each movie/show/cast document.

## Build

Run:

```bash
npm run build
```

The static frontend output is generated in:

```text
dist/
```

`dist/` is ignored by Git and should be generated during deployment.

## Deployment Notes

The project can be deployed as:

- an Express API service for `server/index.js`
- a static frontend built from Vite output in `dist`

Recommended frontend build command:

```bash
npm ci --include=dev && npm run build
```

Recommended frontend publish directory:

```text
dist
```

Recommended backend start command:

```bash
npm run start:api
```

In production, provide persistent `MONGODB_URI`, `JWT_SECRET`, and `CLIENT_ORIGIN`. The API intentionally avoids silently using disposable memory storage unless `ALLOW_MEMORY_STORE=true` is explicitly set.

## Notes For Contributors

- This project is JavaScript-only. It does not use TypeScript or Bun.
- Keep generated folders such as `dist`, `.tanstack`, logs, and temp files out of commits.
- Keep media in Cloudinary and save only stable Cloudinary URLs in MongoDB.
- Prefer real verified cast/media data over placeholder or fake values.
