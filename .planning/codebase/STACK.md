# Technology Stack

**Analysis Date:** 2026-03-13

## Languages

**Primary:**
- JavaScript (ES6+) - Used in both frontend and backend

**Secondary:**
- N/A

## Runtime

**Environment:**
- Node.js (development/backend runtime)
- Browser (frontend runtime)

**Package Manager:**
- npm
- Lockfiles: `package-lock.json` present in both `frontend/` and `backend/`

## Frameworks

**Core (Backend):**
- Express 5.2.1 - Web application framework
- Mongoose 9.3.0 - MongoDB ODM

**Core (Frontend):**
- React 19.2.4 - UI library
- React Router 7.13.1 - Client-side routing

**Real-time Communication:**
- Socket.io 4.8.3 (server)
- Socket.io-client 4.8.3 (client)

**Testing:**
- @testing-library/react 16.3.2
- @testing-library/jest-dom 6.9.1
- @testing-library/user-event 13.5.0

**Build/Dev:**
- react-scripts 5.0.1 (frontend build tooling)
- nodemon 3.1.14 (backend auto-restart)

## Key Dependencies

**Authentication & Security:**
- jsonwebtoken 9.0.3 - JWT token generation/verification
- bcryptjs 3.0.3 - Password hashing
- express-validator 7.3.1 - Input validation
- validator 13.15.26 - Additional validation utilities
- cors 2.8.6 - Cross-origin resource sharing

**HTTP & API:**
- axios 1.13.6 - HTTP client (frontend)
- express (backend framework)

**UI & UX:**
- react-hot-toast 2.6.0 - Toast notifications
- web-vitals 2.1.4 - Performance metrics

**Database:**
- mongoose 9.3.0 - MongoDB object modeling

## Configuration

**Environment:**
- Backend uses `dotenv` 17.3.1 for environment configuration
- Configuration file: `backend/.env`
- Required environment variables (from code):
  - `MONGO_URI` - MongoDB connection string
  - `JWT_SECRET` - Secret key for JWT signing
  - `JWT_EXPIRE` - Token expiration (optional, defaults to 7d)
  - `PORT` - Server port (optional, defaults to 5000)
  - `CLIENT_URL` - Frontend URL for CORS

**Build:**
- Frontend: Create React App configuration via `react-scripts`
- Browser targets defined in `frontend/package.json` (browserslist)
- No TypeScript configuration detected (tsconfig.json not found)

## Platform Requirements

**Development:**
- Node.js
- MongoDB (local or remote instance)
- npm for dependency management

**Production:**
- Node.js server
- MongoDB database
- Build frontend: `npm run build` in frontend directory

---

*Stack analysis: 2026-03-13*
