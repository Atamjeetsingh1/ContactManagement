# External Integrations

**Analysis Date:** 2026-03-13

## APIs & External Services

**Real-time Communication:**
- Socket.io - Bidirectional real-time communication
  - Implementation: Socket.io 4.8.3
  - Used for: Chat messaging, typing indicators, user presence
  - Connection: `http://localhost:5000` (default) or `process.env.REACT_APP_API_URL`

**Note:** No external third-party APIs detected. All backend services are self-hosted.

## Data Storage

**Databases:**
- MongoDB
  - Connection: `MONGO_URI` environment variable
  - Default: `mongodb://localhost:27017/contact_manager`
  - Client: Mongoose 9.3.0 ODM
  - Models: User, Contact, Message

**File Storage:**
- Local filesystem only (no cloud storage)
- User avatars stored as string URLs (not uploaded)

**Caching:**
- None detected (in-memory rate limiter only)

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based authentication
  - Implementation: `jsonwebtoken` library
  - Token storage: localStorage on client
  - Token header: `Authorization: Bearer <token>`
  - Token expiration: Configurable via `JWT_EXPIRE` (default: 7 days)
  - Password hashing: bcryptjs with salt rounds 12

**User Roles:**
- `provider` - Service provider role
- `customer` - Customer role

## Monitoring & Observability

**Error Tracking:**
- None detected (console logging only)

**Logs:**
- Console logging via `console.log`, `console.error`
- Socket events logged to server console

## CI/CD & Deployment

**Hosting:**
- Not detected (no Dockerfile, docker-compose, or cloud configs)

**CI Pipeline:**
- None detected (no GitHub Actions, CI configs, or deployment scripts)

## Environment Configuration

**Required env vars:**
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `CLIENT_URL` - Frontend origin for CORS (default: `http://localhost:3000`)

**Optional env vars:**
- `PORT` - Server port (default: 5000)
- `JWT_EXPIRE` - Token expiration time (default: 7d)
- `REACT_APP_API_URL` - Backend API URL (frontend, default: `http://localhost:5000/api`)

**Secrets location:**
- `backend/.env` file

## Webhooks & Callbacks

**Incoming:**
- None detected (no webhook endpoints)

**Outgoing:**
- None detected (no outgoing webhooks)

## API Endpoints Summary

**Authentication** (`/api/auth`):
- POST `/api/auth/signup` - Register new user
- POST `/api/auth/login` - Login user
- GET `/api/auth/me` - Get current user
- PUT `/api/auth/update-profile` - Update profile
- PUT `/api/auth/change-password` - Change password

**Contacts** (`/api/contacts`):
- GET `/api/contacts` - List contacts
- GET `/api/contacts/:id` - Get single contact
- POST `/api/contacts` - Create contact
- PUT `/api/contacts/:id` - Update contact
- DELETE `/api/contacts/:id` - Delete contact
- DELETE `/api/contacts` - Bulk delete
- PATCH `/api/contacts/:id/favorite` - Toggle favorite
- GET `/api/contacts/stats` - Get contact statistics

**Chat** (`/api/chat`):
- GET `/api/chat/users` - Get chat users
- GET `/api/chat/messages/:roomId` - Get messages for room

**Socket.io Events:**
- `join_room` - Join a chat room
- `send_message` - Send a message
- `receive_message` - Receive a message
- `typing` / `stop_typing` - Typing indicators

---

*Integration audit: 2026-03-13*
