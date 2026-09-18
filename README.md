# Bidzy

A real-time cricket player auction platform. An admin runs a live auction one player at a time; team accounts connect and place bids against a countdown timer, and every connected client sees the current player, price and highest bidder update live.

## Features

- **Live auction sessions** — one active player at a time, with current price, countdown timer and highest bidder tracked server-side
- **Real-time bidding** — bids broadcast to all connected clients over Socket.IO
- **Player catalogue** — name, role (batsman / bowler / all-rounder / wicketkeeper), country, base price and career stats (matches, runs, average, strike rate, wickets, economy)
- **Sets** — players grouped into ordered sets so the auction runs in a defined sequence
- **Role-based access** — admins create players and control the auction; team accounts can only bid
- **Auth** — JWT authentication with bcrypt-hashed passwords
- **Bulk import** — create players in bulk rather than one at a time

## Tech stack

| Layer | Used |
| --- | --- |
| Frontend | React (Vite), React Router, Tailwind CSS, Axios |
| Backend | Node.js, Express |
| Database | MongoDB (Mongoose) |
| Real-time | Socket.IO |
| Auth | JSON Web Tokens, bcryptjs |

## API

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Public | Register a user |
| `POST` | `/api/auth/login` | Public | Log in and receive a token |
| `GET` | `/api/players` | Authenticated | List players |
| `POST` | `/api/players` | Admin | Create a player |
| `POST` | `/api/players/bulk` | Admin | Create players in bulk |
| `PATCH` | `/api/players/:id` | Admin | Update a player |
| `GET` | `/api/sets` | Authenticated | List sets |
| `POST` | `/api/sets` | Admin | Create a set |
| `PATCH` | `/api/sets/reorder` | Admin | Reorder sets |
| `GET` | `/api/auction` | Authenticated | Get the current auction state |
| `POST` | `/api/auction/start` | Admin | Start the auction |
| `POST` | `/api/auction/bid` | Team | Place a bid |

## Project structure

```
client/          React frontend (Vite)
server/
  config/        Database and Socket.IO setup
  controllers/   Request handlers
  middleware/    JWT verification and role checks
  models/        User, Player, Set, AuctionSession, Bid
  routes/        Express routes
  server.js      Entry point
```

## Running locally

Requires Node.js and a MongoDB connection string.

```bash
# Backend
cd server
npm install
npm run dev          # starts on PORT, default 5000

# Frontend
cd client
npm install
npm run dev
```

Create `server/.env`:

```
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret
```

## Status

The backend API and data models are complete. The React frontend is still being built out — login is in place and the auction screens are in progress.
