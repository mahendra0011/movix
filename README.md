# moviex

Movie ticket booking platform built with HTML, CSS, Tailwind CSS, JavaScript, React, ReactBits-style components, Node, Express, MongoDB, Socket.IO booked-seat and notification updates, Razorpay-ready payments, and Brevo HTTP API email hooks.

This project is JavaScript-only. It does not use TypeScript or Bun.

## Folder structure

```text
server/                 Express and MongoDB API
  config/               Environment config
  middleware/           JWT auth and async helpers
  models/               MongoDB/Mongoose models
  routes/               Auth, movies, shows, bookings, payments, admin APIs
  services/             Email, ticket/QR/PDF, and booking helpers
  sockets/              Socket.IO booked-seat and notification updates
src/
  app/                  TanStack Router app routes and generated route tree
  features/
    booking/            Booking API client, seat layout, and booking domain data
    movies/             Movie API client, catalog data, and movie components
  shared/
    components/         Layout, ReactBits-style components, and reusable UI
    hooks/              Shared React hooks
    lib/                Shared utilities and error helpers
    services/           Cross-feature browser services
  router.jsx            React router setup
  server.js             TanStack Start server entry
  start.js              TanStack Start app entry
  styles.css            Tailwind CSS and global styles
```

## Run locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and add your MongoDB, Razorpay, and Brevo/Bravo API key credentials.

3. Start the API:

   ```bash
   npm run dev:api
   ```

4. Start the React app in another terminal:

   ```bash
   npm run dev
   ```

The API can run in local mode without external credentials, then switches to MongoDB, Razorpay, and Brevo when those environment variables are configured.

## Production deployment on Render

Create one Render Web Service for the API and one Render Static Site for the React frontend, or use the included `render.yaml` blueprint.

### Backend API service

- Service type: Web Service
- Runtime: Node
- Build Command: `npm ci`
- Start Command: `npm run start:api`
- Health Check Path: `/api/health`
- Required environment variables:
  - `MONGODB_URI`: MongoDB Atlas connection string
  - `MONGODB_DB`: `moviex`
  - `JWT_SECRET`: strong generated secret
  - `CLIENT_ORIGIN`: deployed frontend URL, for example `https://moviex-web.onrender.com`
  - `ADMIN_EMAIL`: first admin email
  - `ADMIN_PASSWORD`: strong first admin password
- Optional production integrations:
  - `PAYMENT_PROVIDER`: `razorpay`
  - `RAZORPAY_KEY_ID`
  - `RAZORPAY_KEY_SECRET`
  - `BRAVO_API_KEY` or `BREVO_API_KEY`
  - `BRAVO_FROM_EMAIL` or `BREVO_FROM_EMAIL`
  - `BRAVO_FROM_NAME` or `BREVO_FROM_NAME`

### Frontend static site

- Service type: Static Site
- Build Command: `npm ci --include=dev && npm run build`
- Publish Directory: `dist`
- Redirects/Rewrites rule: source `/*`, destination `/index.html`, action `Rewrite`
- Required environment variables:
  - `VITE_API_URL`: deployed API URL, for example `https://moviex-api.onrender.com`

Socket.IO uses `VITE_API_URL`, so no separate frontend socket URL is required.

Render Web Services must bind to the port from `PORT`. The API reads `PORT` first. The frontend is a static SPA, so it does not need a start command.

### Fix for "Publish directory does not exist"

Do not put `npm run web`, `npm run preview`, or any other command in Render's Publish Directory field. That field must be a folder path. For this project, use `dist`.

## Full-stack features

- JWT register/login, email OTP verification, and forgot-password OTP reset
- Socket.IO booked-seat updates for active show pages and navbar notifications
- Razorpay order creation and signature verification when payment keys are configured
- QR code, PDF ticket, and invoice generation
- Brevo transactional email through the HTTP API using `BRAVO_API_KEY` or `BREVO_API_KEY`
- Admin dashboard with revenue, occupancy, and live system status
