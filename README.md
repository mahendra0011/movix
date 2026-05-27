# moviex

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

2. Copy `.env.example` to `.env` and add your MongoDB, Redis, Razorpay, and Brevo credentials.

3. Start the API:

   ```bash
   npm run dev:api
   ```

4. Start the React app in another terminal:

   ```bash
   npm run dev
   ```

The API can run in local mode without external credentials, then switches to MongoDB, Redis, Razorpay, and Brevo when those environment variables are configured.

## Production deployment on Render

This app uses TanStack Start SSR, so the frontend is not a Render Static Site. Create two Render Web Services, or use the included `render.yaml` blueprint.

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
  - `REDIS_URL`: Redis/Key Value URL for cross-instance seat locks
  - `PAYMENT_PROVIDER`: `razorpay`
  - `RAZORPAY_KEY_ID`
  - `RAZORPAY_KEY_SECRET`
  - `BREVO_API_KEY`
  - `BREVO_FROM_EMAIL`
  - `BREVO_FROM_NAME`

### Frontend web service

- Service type: Web Service
- Runtime: Node
- Build Command: `npm ci && npm run build`
- Start Command: `HOST=0.0.0.0 npm run start:web`
- Health Check Path: `/`
- Required environment variables:
  - `VITE_API_URL`: deployed API URL, for example `https://moviex-api.onrender.com`
  - `VITE_SOCKET_URL`: same API URL for Socket.IO, for example `https://moviex-api.onrender.com`

Render Web Services must bind to the port from `PORT`. The API reads `PORT` first, and the frontend Nitro server uses Render's `PORT` at runtime.

### Fix for "Publish directory does not exist"

Do not put `npm run preview -- --host 0.0.0.0` in Render's Publish Directory field. That field is only for Static Sites. For this project, use the frontend Web Service commands above. If you intentionally convert the frontend to a static SPA later, the publish directory would be `dist/client`, but the current SSR build requires a Node service.

## Full-stack features

- JWT register/login, email OTP verification, and forgot-password OTP reset
- Real-time seat locking with Socket.IO rooms
- Redis-backed locks when `REDIS_URL` is configured, local locks otherwise
- Razorpay order creation and signature verification when payment keys are configured
- QR code, PDF ticket, and invoice generation
- Brevo transactional email through the HTTP API using `BREVO_API_KEY`
- Admin dashboard with revenue, occupancy, and live system status
