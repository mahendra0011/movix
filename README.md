# BookMyScreen

Movie ticket booking platform built with HTML, CSS, Tailwind CSS, JavaScript, React, ReactBits-style components, Node, Express, MongoDB, Socket.IO, Redis-backed seat locking, Razorpay-ready payments, and Brevo HTTP API email hooks.

This project is JavaScript-only. It does not use TypeScript or Bun.

## Folder structure

```text
server/                 Express and MongoDB API
  config/               Environment config
  middleware/           JWT auth and async helpers
  models/               MongoDB/Mongoose models
  routes/               Auth, movies, shows, bookings, payments, admin APIs
  services/             Redis, email, ticket/QR/PDF, seat locks
  sockets/              Socket.IO realtime seat locking
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

2. Copy `.env.example` to `.env` and add your MongoDB, Redis, Razorpay, Google OAuth, and Brevo credentials.

3. Start the API:

   ```bash
   npm run dev:api
   ```

4. Start the React app in another terminal:

   ```bash
   npm run dev
   ```

The API can run in local mode without external credentials, then switches to MongoDB, Redis, Razorpay, Google OAuth, and Brevo when those environment variables are configured.

## Full-stack features

- JWT register/login, OTP verification, and Google OAuth credential verification
- Real-time seat locking with Socket.IO rooms
- Redis-backed locks when `REDIS_URL` is configured, local locks otherwise
- Razorpay order creation and signature verification when payment keys are configured
- QR code, PDF ticket, and invoice generation
- Brevo transactional email through the HTTP API using `BREVO_API_KEY`
- Admin dashboard with revenue, occupancy, and live system status
