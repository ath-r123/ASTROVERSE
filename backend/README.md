# Astroverse Backend

## Start locally

1. Copy `.env.example` to `.env`.
2. Add your MongoDB Atlas connection string and a long `JWT_SECRET`.
3. Run `npm install`.
4. Run `npm run dev`.

The API starts on `http://localhost:5000`. Check it at `GET /api/health`.

## Main routes

- `POST /api/auth/register` and `POST /api/auth/login`
- `GET /api/astrologers`, `POST /api/astrologers/profile`
- `GET/POST /api/reviews`
- `POST /api/sessions`, `POST /api/sessions/waitlist`, `GET /api/sessions/mine`
- `POST /api/calculations`, `GET /api/calculations/mine`

Protected requests must include `Authorization: Bearer YOUR_JWT_TOKEN`.

This backend provides persistence and authentication. The existing frontend can be connected with `fetch()` once the API is running.
