# Architecture

**Analysis Date:** 2026-03-13

## Pattern Overview

**Overall:** REST API + Real-time WebSocket with Client-Side Rendering

**Key Characteristics:**
- Backend: Express.js REST API with Socket.io for real-time messaging
- Frontend: React SPA (Create React App) with React Router
- Database: MongoDB with Mongoose ODM
- Authentication: JWT-based with Bearer token strategy
- Role-based access control (provider vs customer roles)

## Layers

**Backend Layer:**
- Purpose: API server and WebSocket hub
- Location: `backend/`
- Contains: Express server, Socket.io, routes, models, middleware
- Depends on: Express, Mongoose, Socket.io, JWT, bcrypt
- Used by: Frontend client

**Routes Layer:**
- Purpose: Handle HTTP endpoints
- Location: `backend/routes/`
- Contains: `auth.js`, `contacts.js`, `chat.js`
- Depends on: Models, middleware
- Used by: Express server

**Models Layer:**
- Purpose: MongoDB schema definitions and business logic
- Location: `backend/models/`
- Contains: `User.js`, `Contact.js`, `Message.js`
- Depends on: Mongoose
- Used by: Routes

**Middleware Layer:**
- Purpose: Authentication and authorization
- Location: `backend/middleware/`
- Contains: `authMiddleware.js` (JWT verification, role checks)
- Depends on: JWT, User model
- Used by: Routes

**Frontend Services Layer:**
- Purpose: API communication and Socket connection
- Location: `frontend/src/services/`
- Contains: `api.js` (Axios), `socket.js` (Socket.io client)
- Depends on: axios, socket.io-client
- Used by: Pages and components

**Frontend Context Layer:**
- Purpose: Global state management for authentication
- Location: `frontend/src/context/`
- Contains: `AuthContext.js`
- Used by: App, protected routes

**Frontend Pages Layer:**
- Purpose: Page-level components
- Location: `frontend/src/pages/`
- Contains: Login, Signup, Dashboard, Chat, ChatUsers

**Frontend Components Layer:**
- Purpose: Reusable UI components
- Location: `frontend/src/components/`
- Contains: ContactCard, ContactModal

## Data Flow

**Authentication Flow:**
1. User submits credentials to `/api/auth/login`
2. Backend validates, returns JWT token
3. Frontend stores token in localStorage
4. Subsequent requests include `Authorization: Bearer <token>`
5. `authMiddleware.js` verifies token on each protected request

**Contact Management Flow:**
1. User interacts with Dashboard page
2. Dashboard calls `contactsAPI` methods (axios wrapper)
3. Request goes to `/api/contacts` endpoints
4. Route validates JWT, checks role authorization
5. Mongoose operations on Contact collection
6. Response sent back to frontend

**Real-time Chat Flow:**
1. User navigates to Chat page
2. `socket.js` connects with JWT in auth object
3. Server's Socket.io middleware verifies token
4. User joins room via `socket.emit('join_room', roomId)`
5. Messages sent via `socket.emit('send_message')`
6. Server validates, saves to MongoDB, broadcasts via `io.to(roomId)`
7. Client receives via `socket.on('receive_message')`

## Key Abstractions

**JWT Authentication:**
- Token generated in User model method `getSignedJwtToken()`
- Token verified in auth middleware
- Token attached to requests via axios interceptor
- Socket connection uses token in auth handshake

**Role-Based Access:**
- Two roles: `provider` and `customer`
- `authorizeRoles()` middleware restricts routes
- Customers can only chat with providers (enforced in chat route)

**Room-based Messaging:**
- Room IDs: `{userId1}_{userId2}` (sorted pair)
- Both users must be part of the room to send/receive
- Messages persisted in MongoDB

**Contact Filtering:**
- Search by name, email, phone, company
- Filter by category, favorites
- Sort by various fields with pagination

## Entry Points

**Backend Entry:**
- Location: `backend/server.js`
- Triggers: `node server.js` or `npm run dev`
- Responsibilities: Express app setup, Socket.io setup, MongoDB connection, route mounting, middleware setup, server startup

**Frontend Entry:**
- Location: `frontend/src/index.js`
- Triggers: `npm start` (react-scripts)
- Responsibilities: React DOM rendering, App component mounting

**Frontend Router:**
- Location: `frontend/src/App.js`
- Responsibilities: Route definitions, protected route wrappers (ProtectedRoute, RoleRoute, PublicRoute)

## Error Handling

**Backend Strategy:**
- Express error middleware catches all errors
- Returns JSON with `{ success: false, message: ... }`
- Status codes: 400 (validation), 401 (auth), 403 (forbidden), 404 (not found), 500 (server)

**Frontend Strategy:**
- Axios response interceptor handles 401 (auto logout + redirect)
- react-hot-toast for user notifications
- Loading states during async operations

## Cross-Cutting Concerns

**Logging:**
- Console logging in backend for errors and events
- No structured logging framework

**Validation:**
- express-validator for request body validation
- Mongoose schema validation for models

**Authentication:**
- JWT in Authorization header
- Token also passed via Socket.io handshake auth object
- Password hashing with bcryptjs

---

*Architecture analysis: 2026-03-13*
