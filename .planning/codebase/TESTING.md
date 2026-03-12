# Testing Patterns

**Analysis Date:** 2026-03-13

## Test Framework

**Frontend Runner:**
- Framework: React Scripts (Jest + React Testing Library)
- Version: react-scripts 5.0.1
- Config: Default create-react-app configuration
- Test file location: `frontend/src/App.test.js`

**Backend Runner:**
- Framework: None configured
- The `backend/package.json` has a test script but it only echoes an error:
  ```json
  "test": "echo \"Error: no test specified\" && exit 1"
  ```
- No testing framework installed

**Assertion Library:**
- `@testing-library/react` - React Testing Library
- `@testing-library/jest-dom` - DOM matchers
- `@testing-library/user-event` - User event simulation

**Run Commands:**
```bash
# Frontend - run all tests
npm test

# Frontend - watch mode (default when running npm test)
npm test -- --watch

# Frontend - coverage report
npm test -- --coverage

# Backend - no tests configured
npm test  # echoes "Error: no test specified"
```

## Test File Organization

**Location:**
- Co-located with source files in `frontend/src/`
- Default CRA location: `src/*.test.js`

**Naming:**
- Pattern: `{ComponentName}.test.js`
- Example: `App.test.js`

**Backend:** No test files exist

## Test Structure

**Frontend Example from `frontend/src/App.test.js`:**
```javascript
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders learn react link', () => {
  render(<App />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});
```

**Setup File from `frontend/src/setupTests.js`:**
```javascript
import '@testing-library/jest-dom';
```
This imports jest-dom matchers globally for all tests.

## Test Patterns

**Component Testing:**
- Uses `@testing-library/react` `render()` and `screen`
- Uses `expect()` with jest-dom matchers
- Query priority: `getByText`, `getByRole`, `getByLabelText`

**Example queries used in codebase:**
- `screen.getByText(/learn react/i)` - text regex match
- `screen.getByRole('button')` - accessible role
- `screen.getByLabelText('Email address')` - form label association

**State Testing:** Not demonstrated in existing tests

**Async Testing:** Not demonstrated - existing test is synchronous

## Mocking

**Framework:** Jest (via react-scripts)

**Mocking patterns observed in codebase:**
- No explicit mocks in `App.test.js`
- Mocking would use Jest's `jest.fn()` and `jest.spyOn()`

**What to Mock:**
- API calls: Use `jest.spyOn()` on axios or api service
- Socket.io: Mock socket events
- LocalStorage: Use `Object.defineProperty` or mock module

**What NOT to Mock:**
- React components (test behavior, not implementation)
- Context providers (render within provider or mock provider)

**Example mocking pattern (not in codebase but standard):**
```javascript
// Mock API call
jest.spyOn(authAPI, 'login').mockResolvedValue({ data: { token: 'test' } });

// Mock localStorage
const mockStorage = {};
jest.spyOn(localStorage, 'getItem').mockImplementation((key) => mockStorage[key]);
```

## Fixtures and Factories

**Test Data:**
- No dedicated fixture files in codebase
- Test data would be defined inline in test files

**Location:**
- No `__fixtures__` or `__mocks__` directories
- Fixtures would go inline or in test file

## Coverage

**Requirements:** None enforced

**View Coverage:**
```bash
npm test -- --coverage --watchAll=false
```

**Coverage reports:**
- Generated in `coverage/` directory
- Includes: statements, branches, functions, lines

**Current State:** Minimal - only default CRA test exists

## Test Types

**Unit Tests:**
- Scope: Individual React components
- Current: `App.test.js` tests basic render
- Missing: Tests for Login, Dashboard, Chat, AuthContext

**Integration Tests:**
- Not currently implemented
- Would test: Auth flow, API calls, routing

**E2E Tests:**
- Framework: Not used
- Alternative: Manual testing or would use Cypress/Playwright

## Common Patterns (Not in Codebase - Recommended)

**Async Testing with React Testing Library:**
```javascript
test('login submits form', async () => {
  render(<Login />);
  
  const emailInput = screen.getByLabelText('Email address');
  await userEvent.type(emailInput, 'test@example.com');
  
  const submitBtn = screen.getByRole('button', { name: /sign in/i });
  await userEvent.click(submitBtn);
  
  expect(authAPI.login).toHaveBeenCalledWith('test@example.com', 'password');
});
```

**Testing AuthContext:**
```javascript
import { AuthProvider } from './context/AuthContext';

const renderWithAuth = (ui) => {
  return render(
    <AuthProvider>
      {ui}
    </AuthProvider>
  );
};
```

**Testing API Errors:**
```javascript
test('shows error message on failed login', async () => {
  jest.spyOn(authAPI, 'login').mockRejectedValue({
    response: { data: { message: 'Invalid credentials' } }
  });
  
  render(<Login />);
  // ... submit form
  expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
});
```

## Backend Testing Gaps

**Current State:**
- No test framework installed
- No test files
- No mocking of MongoDB/Mongoose

**What would be needed:**
- Testing framework: Jest or Mocha
- MongoDB mocking: `mongodb-memory-server` or `mockgoose`
- HTTP testing: `supertest` for Express routes

**Example backend test structure (not implemented):**
```javascript
const request = require('supertest');
const app = require('./server');

describe('POST /api/auth/login', () => {
  it('returns 401 for invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'wrong@example.com', password: 'wrong' });
    
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
```

## Testing Recommendations

**Frontend Priority:**
1. Test AuthContext (login, logout, loadUser)
2. Test Login/Signup forms (validation, submission)
3. Test Dashboard (data display)
4. Test Chat (socket events, message list)

**Backend Priority:**
1. Install Jest: `npm install --save-dev jest`
2. Add supertest: `npm install --save-dev supertest`
3. Add mongodb-memory-server for DB tests
4. Test routes: auth, contacts, chat

---

*Testing analysis: 2026-03-13*
