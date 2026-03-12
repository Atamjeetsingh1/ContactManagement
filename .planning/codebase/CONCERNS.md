# Codebase Concerns

**Analysis Date:** 2026-03-13

## Tech Debt

**Missing Test Coverage:**
- Issue: No meaningful tests exist in the codebase
- Files: `frontend/src/App.test.js` (template test that doesn't work), no backend tests
- Impact: Any code change could break functionality without detection
- Fix approach: Add Jest/Vitest setup for both frontend and backend with unit and integration tests

**No HTTP Rate Limiting:**
- Issue: Rate limiting only exists for Socket.io messages, not REST API endpoints
- Files: `backend/server.js` (lines 46-62), `backend/routes/auth.js`
- Impact: Login/signup endpoints vulnerable to brute force attacks
- Fix approach: Add express-rate-limit middleware for auth endpoints

**In-Memory Rate Limiting:**
- Issue: Socket rate limiter uses in-memory Map which doesn't scale
- Files: `backend/server.js` (lines 46-62)
- Impact: Doesn't work in multi-server deployments, state not shared
- Fix approach: Use Redis for distributed rate limiting

**Regex Injection in Search:**
- Issue: User search input directly used in MongoDB $regex without sanitization
- Files: `backend/routes/contacts.js` (lines 28-35)
- Impact: Potential ReDoS (Regex Denial of Service) attacks, slow queries
- Fix approach: Validate search input length, use MongoDB text search instead

**No Token Revocation:**
- Issue: JWT tokens cannot be invalidated; no logout endpoint
- Files: `backend/models/User.js` (line 59), `backend/routes/auth.js`
- Impact: Compromised tokens remain valid until expiration (7 days default)
- Fix approach: Implement token blacklist or use short-lived access tokens with refresh tokens

**No Password Reset:**
- Issue: No password reset/forgot password functionality
- Files: `backend/routes/auth.js`
- Impact: Users locked out if they forget password with no recovery option
- Fix approach: Add forgot-password and reset-password endpoints with email tokens

**No Email Verification:**
- Issue: Users can sign up without verifying email address
- Files: `backend/routes/auth.js`, `backend/models/User.js`
- Impact: Fake accounts can be created, no identity verification
- Fix approach: Add email verification flow with confirmation tokens

**No Database Indexes:**
- Issue: No explicit indexes defined for frequently queried fields
- Files: `backend/models/Contact.js`, `backend/models/Message.js`
- Impact: Slow queries as data grows (especially on user, category, isFavorite, roomId)
- Fix approach: Add compound indexes for common query patterns

## Security Considerations

**LocalStorage for Tokens:**
- Risk: JWT stored in localStorage vulnerable to XSS attacks
- Files: `frontend/src/context/AuthContext.js` (lines 14, 40, 48), `frontend/src/services/api.js` (line 14)
- Current mitigation: None
- Recommendations: Use httpOnly secure cookies for token storage

**Missing CORS Configuration:**
- Risk: CORS allows credentials from allowed origin but no strict domain validation
- Files: `backend/server.js` (lines 134-137)
- Current mitigation: Uses environment variable for origin
- Recommendations: Validate origin against allowed list explicitly

**No Request Logging:**
- Risk: No audit trail for API access
- Files: `backend/server.js`
- Current mitigation: Console.log only
- Recommendations: Add Morgan or similar logging middleware

**Outdated Dependencies:**
- Risk: react-scripts 5.0.1 has known vulnerabilities
- Files: `frontend/package.json` (line 15)
- Current mitigation: None
- Recommendations: Migrate to Vite or update to latest react-scripts

**Express 5 Beta:**
- Risk: Using beta version (^5.2.1) in production
- Files: `backend/package.json` (line 18)
- Current mitigation: None
- Recommendations: Wait for stable release or use Express 4.x

## Performance Bottlenecks

**Large Contact Queries:**
- Problem: No pagination limit enforcement on GET /contacts (defaults to 50 but user-controlled)
- Files: `backend/routes/contacts.js` (line 22)
- Cause: Users can request limit=10000 causing memory issues
- Improvement path: Cap maximum limit server-side

**No Message Cleanup:**
- Problem: Messages never deleted, database grows unbounded
- Files: `backend/models/Message.js`, `backend/routes/chat.js`
- Cause: No retention policy
- Improvement path: Add auto-delete for old messages or archiving

**N+1 Query Potential:**
- Problem: Chat users endpoint returns all users without filtering
- Files: `backend/routes/chat.js` (lines 13-30)
- Cause: Could return thousands of users on large platform
- Improvement path: Add pagination to chat users endpoint

## Fragile Areas

**Socket Connection Race Condition:**
- Why fragile: Frontend may call getSocket() before connectSocket() completes
- Files: `frontend/src/services/socket.js`, `frontend/src/pages/Chat.jsx`
- Safe modification: Ensure socket is connected before emitting events
- Test coverage: None

**Auth State Sync:**
- Why fragile: Token in localStorage can become stale; no refresh mechanism
- Files: `frontend/src/context/AuthContext.js`
- Safe modification: Add token refresh on 401 responses
- Test coverage: None

**Role Authorization Logic:**
- Why fragile: Role checks scattered in routes; easy to miss
- Files: `backend/routes/contacts.js`, `backend/routes/chat.js`
- Safe modification: Centralize role checks in middleware
- Test coverage: None

## Scaling Limits

**In-Memory Rate Limiter:**
- Current capacity: Single server only
- Limit: Doesn't persist across restarts, doesn't share state
- Scaling path: Replace with Redis-based solution

**MongoDB Connection:**
- Current capacity: Single connection string
- Limit: No connection pooling configuration
- Scaling path: Implement Mongoose connection pooling settings

**Socket.io Memory:**
- Current capacity: All socket data in memory
- Limit: Will grow with concurrent connections
- Scaling path: Use Redis adapter for socket.io for multi-server

## Dependencies at Risk

**react-scripts (5.0.1):**
- Risk: Deprecated Create React App, no longer actively maintained
- Impact: Security vulnerabilities, no updates
- Migration plan: Migrate to Vite for faster builds and active maintenance

**Express 5 (^5.2.1):**
- Risk: Beta version being used in production
- Impact: Potential bugs, breaking changes
- Migration plan: Wait for stable release or downgrade to 4.x

**Socket.io-client (^4.8.3):**
- Risk: Version mismatch potential with server
- Impact: Connection issues
- Migration plan: Ensure server/client versions aligned

## Missing Critical Features

**Missing Features:**
- Password reset functionality
- Email verification
- Account lockout after failed login attempts
- Two-factor authentication
- Session management (multiple devices)
- Activity logging/audit trail
- API versioning

## Test Coverage Gaps

**Backend API:**
- What's not tested: All routes (auth, contacts, chat)
- Files: `backend/routes/*.js`
- Risk: Authentication bypass, validation failures, data corruption
- Priority: High

**Frontend Components:**
- What's not tested: All components (ContactCard, ContactModal, Chat, etc.)
- Files: `frontend/src/components/*.js`, `frontend/src/pages/*.jsx`
- Risk: UI bugs, state management issues
- Priority: High

**Authentication Flow:**
- What's not tested: Login, signup, token refresh, logout
- Files: `frontend/src/context/AuthContext.js`, `backend/routes/auth.js`
- Risk: Auth state bugs, token handling issues
- Priority: High

**WebSocket Communication:**
- What's not tested: Socket events, reconnection, message delivery
- Files: `backend/server.js`, `frontend/src/services/socket.js`
- Risk: Lost messages, connection failures
- Priority: Medium

---

*Concerns audit: 2026-03-13*
