# Coding Conventions

**Analysis Date:** 2026-03-13

## Naming Patterns

**Files:**
- React components: PascalCase (e.g., `Login.js`, `Chat.jsx`, `ContactCard.js`)
- Context providers: PascalCase (e.g., `AuthContext.js`)
- Services/utilities: camelCase (e.g., `api.js`, `socket.js`)
- CSS modules: Match component name (e.g., `Login.js` + `Login.css`)
- Backend routes/models: camelCase (e.g., `auth.js`, `User.js`)

**Functions:**
- React hooks: `use` prefix (e.g., `useAuth`, `useCallback`)
- Regular functions: camelCase (e.g., `sendMessage`, `getRoomId`)
- Helper functions: camelCase (e.g., `sendTokenResponse`)

**Variables:**
- camelCase (e.g., `form`, `errors`, `isAuthenticated`)
- State variables: descriptive nouns (e.g., `loading`, `messages`, `input`)

**Types:**
- React components: PascalCase exports (default export)
- Constants: SCREAMING_SNAKE_CASE for section dividers in code

## Code Style

**Formatting:**
- Tool: Prettier (via react-scripts default)
- Indentation: 2 spaces
- Line endings: LF (Unix-style)

**Linting:**
- Tool: ESLint (react-scripts default `react-app` config)
- Config location: `package.json` `eslintConfig` field
- Key rules: React best practices from `react-app` preset

## Import Organization

**Order in frontend files:**
1. React imports (`import React from 'react'`)
2. Third-party libraries (`import { Link } from 'react-router-dom'`)
3. Context/providers (`import { useAuth } from '../context/AuthContext'`)
4. Services (`import { authAPI } from '../services/api'`)
5. Components/pages (`import Login from './pages/Login'`)
6. CSS/styles (`import './App.css'`)

**Example from `frontend/src/App.js`:**
```javascript
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import './App.css';
```

**Path aliases:** None configured - relative paths used throughout

## Error Handling

**Frontend (React):**
- Form validation: Custom `validate()` function returning error object
- API errors: try/catch with `err.response?.data?.message` extraction
- Display: `react-hot-toast` for notifications (`toast.success()`, `toast.error()`)
- State: `errors` object in component state for form validation

**Example from `frontend/src/pages/Login.js`:**
```javascript
const validate = () => {
  const e = {};
  if (!form.email) e.email = 'Email is required';
  else if (!/\S+@\S+\.\S+/.test(form.email) e.email = 'Invalid email';
  if (!form.password) e.password = 'Password is required';
  return e;
};
```

**Backend (Express):**
- Validation: `express-validator` middleware with chainable validators
- Errors: try/catch blocks with `console.error()` logging
- Response format: `{ success: boolean, message: string, data? }`
- Global error handler: Express middleware at end of chain

**Example from `backend/routes/auth.js`:**
```javascript
const errors = validationResult(req);
if (!errors.isEmpty()) {
  return res.status(400).json({
    success: false,
    message: errors.array()[0].msg,
    errors: errors.array()
  });
}
```

## Logging

**Framework:** `console` (no external logger)

**Patterns:**
- Backend: `console.log()` for startup/connection, `console.error()` for errors
- Frontend: Minimal logging, relies on `react-hot-toast` for user feedback

**Examples from `backend/server.js`:**
```javascript
console.log('✅ MongoDB Connected');
console.log(`🚀 Server running on port ${PORT}`);
console.error('send_message error:', err);
```

## Comments

**When to Comment:**
- Route documentation: JSDoc-style comments for API endpoints
- Complex logic: Socket event handlers, rate limiting
- Section dividers: SCREAMING_SNAKE_CASE in backend files

**Example from `backend/routes/auth.js`:**
```javascript
// @route   POST /api/auth/signup
// @desc    Register a new user
// @access  Public
router.post('/signup', [...], async (req, res) => { ... });
```

**Section dividers in `backend/server.js`:**
```javascript
// ─── Socket.io Setup ──────────────────────────────────────────────────────────
// ─── Socket Auth Middleware ───────────────────────────────────────────────────
// ─── Middleware ───────────────────────────────────────────────────────────────
// ─── Routes ───────────────────────────────────────────────────────────────────
```

**JSDoc/TSDoc:** Not used extensively - inline comments preferred

## Function Design

**Size:** Medium - functions typically 10-50 lines

**Parameters:**
- Backend routes: Request object, destructured body/query params
- Frontend: Explicit parameters with clear names

**Return Values:**
- Backend: JSON response via `res.status().json()`
- Frontend hooks: Return arrays or objects (React convention)

## Module Design

**Exports:**
- React components: Default export
- Backend routes: `module.exports = router;`
- Services: Named exports in object literals

**Example from `frontend/src/services/api.js`:**
```javascript
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me')
};

export const contactsAPI = { ... };
export default api;
```

**Barrel Files:** Not used - direct imports from modules

## Component Structure

**React Components:**
- Functional components with hooks
- Single file per component (no internal modules)
- Props destructured in function signature

**Example from `frontend/src/context/AuthContext.js`:**
```javascript
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // ... provider logic
  return (
    <AuthContext.Provider value={{...}}>
      {children}
    </AuthContext.Provider>
  );
};
```

## API Response Patterns

**Success Response:**
```javascript
res.status(200).json({
  success: true,
  data: { ... }
});
```

**Error Response:**
```javascript
res.status(400).json({
  success: false,
  message: 'Error description'
});
```

**Validation Error:**
```javascript
res.status(400).json({
  success: false,
  message: errors.array()[0].msg,
  errors: errors.array()
});
```

---

*Convention analysis: 2026-03-13*
