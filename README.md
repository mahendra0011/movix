# BookMyScreen

Movie ticket booking demo built with HTML, CSS, Tailwind CSS, JavaScript, React, ReactBits-style components, Node, Express, MongoDB, Socket.IO, Redis-ready seat locking, and Brevo email hooks.

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

2. Copy `.env.example` to `.env` and update `MONGODB_URI` if needed.

3. Start the API:

   ```bash
   npm run dev:api
   ```

4. Start the React app in another terminal:

   ```bash
   npm run dev
   ```

The API falls back to in-memory demo data when MongoDB is not available, so the UI still runs while you set up the database.

## Full-stack features

- JWT register/login, OTP verification, and Google OAuth demo endpoint
- Real-time seat locking with Socket.IO rooms
- Redis-backed locks when `REDIS_URL` is configured, memory locks otherwise
- Mock payment flow that confirms bookings without gateway keys
- QR code, PDF ticket, and invoice generation
- Brevo email integration through `BREVO_API_KEY`
- Admin dashboard with revenue, occupancy, and live system status
