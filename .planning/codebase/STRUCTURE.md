# Codebase Structure

**Analysis Date:** 2026-03-13

## Directory Layout

```
testpro/
├── backend/                    # Express.js API server
│   ├── models/                 # Mongoose schemas
│   ├── routes/                 # API route handlers
│   ├── middleware/             # Express middleware
│   ├── server.js               # Entry point
│   ├── package.json
│   └── .env                    # Environment config (not committed)
├── frontend/                   # React SPA
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── context/             # React context (state)
│   │   ├── pages/               # Page components
│   │   ├── services/             # API/Socket services
│   │   ├── App.js                # Router setup
│   │   ├── index.js              # Entry point
│   │   └── *.css                 # Global styles
│   ├── public/                 # Static assets
│   ├── build/                  # Production build output
│   ├── package.json
│   └── .env                    # Environment config
└── .planning/                  # GSD planning docs
    └── codebase/               # Codebase analysis docs
```

## Directory Purposes

**Backend:**
- Purpose: REST API server with WebSocket support
- Contains: Express server, Mongoose models, routes, middleware

**Backend/models:**
- Purpose: MongoDB schema definitions
- Contains: `User.js`, `Contact.js`, `Message.js`
- Key files: `User.js` (authentication), `Contact.js` (contact management), `Message.js` (chat messages)

**Backend/routes:**
- Purpose: HTTP endpoint handlers
- Contains: `auth.js` (signup, login, profile), `contacts.js` (CRUD), `chat.js` (users, messages)
- Key files: Each file handles a resource domain

**Backend/middleware:**
- Purpose: Cross-cutting request processing
- Contains: `authMiddleware.js` (JWT verification, role authorization)

**Frontend/src:**
- Purpose: React application source
- Contains: All client-side code

**Frontend/src/components:**
- Purpose: Reusable UI components
- Contains: `ContactCard.js`, `ContactModal.js` + CSS files

**Frontend/src/pages:**
- Purpose: Route-level page components
- Contains: `Login.js`, `Signup.js`, `Dashboard.js`, `ChatUsers.jsx`, `Chat.jsx` + CSS

**Frontend/src/services:**
- Purpose: External communication
- Contains: `api.js` (Axios HTTP client), `socket.js` (Socket.io client)

**Frontend/src/context:**
- Purpose: React context providers
- Contains: `AuthContext.js` (authentication state)

## Key File Locations

**Entry Points:**
- `backend/server.js`: Backend server startup
- `frontend/src/index.js`: React app bootstrap
- `frontend/src/App.js`: React Router setup

**Configuration:**
- `backend/package.json`: Backend dependencies and scripts
- `frontend/package.json`: Frontend dependencies and scripts
- `backend/.env`: Mongo URI, JWT secret, port (not committed)
- `frontend/.env`: API URL (not committed)

**Core Logic:**
- `backend/models/User.js`: User schema with password hashing and JWT
- `backend/routes/auth.js`: Authentication endpoints
- `backend/routes/contacts.js`: Contact CRUD
- `backend/routes/chat.js`: Chat endpoints
- `frontend/src/services/api.js`: HTTP client wrapper

**State Management:**
- `frontend/src/context/AuthContext.js`: Auth state provider

## Naming Conventions

**Files:**
- JavaScript: camelCase (e.g., `authMiddleware.js`, `contactCard.js`)
- JSX components: PascalCase (e.g., `Login.js`, `Chat.jsx`)
- CSS: Match component name (e.g., `ContactCard.css`)

**Directories:**
- All lowercase, plural (e.g., `routes/`, `components/`, `pages/`)

**API Endpoints:**
- RESTful: `/api/auth`, `/api/contacts`, `/api/chat`
- Plural nouns for collections

## Where to Add New Code

**New Backend Feature:**
- Route handler: `backend/routes/<feature>.js`
- Model (if needed): `backend/models/<Entity>.js`
- Mount in `server.js`: `app.use('/api/<feature>', require('./routes/<feature>'))`

**New Frontend Feature:**
- New page: `frontend/src/pages/<PageName>.js`
- New component: `frontend/src/components/<ComponentName>.js`
- New service: `frontend/src/services/<serviceName>.js`
- Add route in `frontend/src/App.js`

**New Component:**
- Create `frontend/src/components/<Name>.js` and `<Name>.css`
- Import in parent page/component

**Utilities:**
- Shared helpers: Consider adding `backend/utils/` or `frontend/src/utils/`

## Special Directories

**Frontend/build:**
- Purpose: Production build output
- Generated: Yes (by `npm run build`)
- Committed: Yes (deployed static files)

**Frontend/public:**
- Purpose: Static assets served as-is
- Contains: `index.html`, manifest, icons

**Backend/node_modules:**
- Purpose: Installed dependencies
- Generated: Yes (by `npm install`)
- Committed: No (.gitignore)

**Frontend/node_modules:**
- Purpose: Installed dependencies
- Generated: Yes (by `npm install`)
- Committed: No (.gitignore)

---

*Structure analysis: 2026-03-13*
