# Authentication Quick Reference Guide

## 🚀 Quick Start (5 Minutes)

### 1. Setup Environment

```bash
# Copy environment template
cp .env.sample .env

# Update API URL in .env
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

### 2. Verify Backend Requirements

Your backend MUST have this endpoint:

```http
POST /api/v1/login/access-token
Body: { "username": "string", "password": "string" }
Response: { "access_token": "string", "token_type": "bearer" }
```

### 3. Run Application

```bash
npm install
npm run dev
```

### 4. Test Login

- Open browser to `http://localhost:5173`
- You should see the login page
- Enter credentials configured in your backend
- Upon success, you'll see the main application

---

## 📁 File Structure

```
src/
├── contexts/
│   └── AuthContext.tsx          # Authentication state management
├── hooks/
│   └── useAuth.ts                # Hook to access auth state
├── components/
│   ├── Login.tsx                 # Login form UI
│   └── ProtectedRoute.tsx        # Route protection wrapper
├── api/
│   ├── client.ts                 # Axios with auth interceptors ✨
│   ├── types.ts                  # Auth-related TypeScript types ✨
│   └── services/
│       ├── authService.ts        # Login API calls
│       └── index.ts              # Export all services ✨
└── App.tsx                       # Main app with auth integration ✨

✨ = Modified existing files
```

---

## 🔐 Security Quick Facts

| Feature | Implementation | Status |
|---------|---------------|--------|
| Token Storage | Memory-first (React state) | ✅ Secure |
| localStorage | Never used | ✅ Secure |
| sessionStorage | Optional (user opt-in) | ⚠️ Acceptable |
| Token Transmission | Bearer header only | ✅ Secure |
| Auto-logout on 401 | Yes | ✅ Implemented |
| XSS Protection | React JSX escaping | ✅ Secure |
| HTTPS Required | Production only | ⚠️ Manual |
| Rate Limiting | Backend responsibility | ⚠️ Backend |

---

## 🎯 Common Tasks

### Access User Info

```typescript
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { user, isAuthenticated } = useAuth();
  
  return (
    <div>
      {isAuthenticated && <p>Hello, {user?.username}!</p>}
    </div>
  );
}
```

### Logout User

```typescript
import { useAuth } from '@/hooks/useAuth';

function LogoutButton() {
  const { logout } = useAuth();
  
  return <button onClick={logout}>Logout</button>;
}
```

### Check Loading State

```typescript
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { isLoading, isAuthenticated } = useAuth();
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <div>Not logged in</div>;
  }
  
  return <div>Protected content</div>;
}
```

### Make Authenticated API Call

```typescript
// Token is automatically included!
// No changes needed to existing code.

import { apiClient } from '@/api/client';

async function fetchData() {
  const response = await apiClient.get('/protected-endpoint');
  return response.data;
}
```

---

## 🐛 Debugging Checklist

### Login Not Working?

1. **Check console for errors**
   ```
   [API Request] POST /login/access-token
   [API Response] POST /login/access-token { access_token: "...", token_type: "bearer" }
   [Auth Service] Login successful for user: username
   [Auth] Auth token set
   ```

2. **Verify request payload**
   - Open DevTools → Network → login/access-token
   - Check Request Payload: `{ username, password }`

3. **Check response format**
   - Should be: `{ access_token: "jwt...", token_type: "bearer" }`
   - NOT: `{ token: "...", ... }` ← Wrong format!

4. **Verify backend is running**
   - Navigate to `http://localhost:3000/api/v1/docs` (if FastAPI)
   - Try login endpoint manually

### Token Not Being Sent?

1. **Check Authorization header**
   - DevTools → Network → Select any API call
   - Headers tab → Request Headers
   - Should see: `Authorization: Bearer eyJhbGciOi...`

2. **Verify token is set**
   - Console should show: `[API Client] Auth token set`
   - If not, check AuthContext integration in App.tsx

### 401 Errors After Login?

1. **Backend not validating token correctly**
   - Token may be in wrong format
   - Backend expecting different header format
   - Token expiration set too short

2. **CORS issues**
   - Backend must allow `Authorization` header
   - Check CORS configuration on backend

### User Logged Out After Refresh?

This is **expected behavior** if "Remember Me" was not checked!

- Memory-only mode: Loses token on refresh (secure)
- SessionStorage mode: Persists until tab close

To persist: Check "Remember Me" during login.

---

## 🔧 Configuration

### Token Expiration

Set in backend JWT configuration (not frontend):

```python
# Example: FastAPI
from datetime import timedelta

ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours
```

### Session Persistence

User controls via "Remember Me" checkbox:
- ✅ Checked: Token saved to sessionStorage (persists across refreshes)
- ❌ Unchecked: Token in memory only (lost on refresh)

### API Base URL

Set in `.env`:

```bash
# Development
VITE_API_BASE_URL=http://localhost:3000/api/v1

# Production
VITE_API_BASE_URL=https://api.example.com/v1
```

---

## 🧪 Testing

### Manual Testing

1. **Login Flow**
   ```
   1. Open app → Should see login page
   2. Enter invalid credentials → Should see "Invalid credentials"
   3. Enter valid credentials → Should see main app
   4. Check DevTools → Application → Session Storage
      - If "Remember Me" checked: Should see cogniloop_auth_token
      - If unchecked: Should be empty
   ```

2. **Token Transmission**
   ```
   1. Login successfully
   2. Open DevTools → Network
   3. Perform any action (e.g., select principle)
   4. Check request headers → Should see Authorization: Bearer ...
   ```

3. **Auto-Logout**
   ```
   1. Login successfully
   2. In backend, invalidate token or set very short expiration
   3. Make any API call
   4. Should be logged out automatically
   5. Should see login page
   ```

4. **Logout**
   ```
   1. Login successfully
   2. Click "Logout" button in toolbar
   3. Should return to login page
   4. Check DevTools → Application → Session Storage
      - Should be empty (no tokens)
   ```

### Automated Testing

```typescript
// Example: Testing useAuth hook
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';

test('login updates authentication state', async () => {
  const { result } = renderHook(() => useAuth());
  
  expect(result.current.isAuthenticated).toBe(false);
  
  await act(async () => {
    await result.current.login('testuser', 'password', false);
  });
  
  expect(result.current.isAuthenticated).toBe(true);
  expect(result.current.user?.username).toBe('testuser');
});
```

---

## 📊 API Integration Matrix

| Endpoint | Auth Required | Header | Status on No Auth |
|----------|---------------|--------|-------------------|
| POST /login/access-token | ❌ No | - | - |
| GET /principles | ✅ Yes | Bearer {token} | 401 → Auto-logout |
| GET /principles/:id/samples | ✅ Yes | Bearer {token} | 401 → Auto-logout |
| PATCH /principles/:id | ✅ Yes | Bearer {token} | 401 → Auto-logout |
| PATCH /samples/:id/opinion | ✅ Yes | Bearer {token} | 401 → Auto-logout |
| PATCH /samples/:id/revision | ✅ Yes | Bearer {token} | 401 → Auto-logout |
| PATCH /samples/:id/reassign | ✅ Yes | Bearer {token} | 401 → Auto-logout |

All endpoints except `/login` require authentication!

---

## 🆘 Emergency Procedures

### Reset Authentication State (Development)

```javascript
// Run in browser console:

// Clear all storage
sessionStorage.clear();
localStorage.clear();

// Reload page
location.reload();
```

### Force Logout (Development)

```javascript
// Run in browser console:

// Import logout function (if exposed)
// Or just clear storage and reload
sessionStorage.removeItem('cogniloop_auth_token');
sessionStorage.removeItem('cogniloop_auth_user');
sessionStorage.removeItem('cogniloop_persist_session');
location.reload();
```

### Bypass Authentication (⚠️ Development Only!)

**DO NOT DO THIS IN PRODUCTION!**

```typescript
// Temporarily comment out ProtectedRoute in App.tsx:

// Before:
<ProtectedRoute>
  <App />
</ProtectedRoute>

// After (dev only):
<App />

// REMEMBER TO UNCOMMENT BEFORE DEPLOYING!
```

---

## 📚 Additional Resources

- **Full Documentation**: `AUTHENTICATION_IMPLEMENTATION.md`
- **Environment Setup**: `.env.sample`
- **TypeScript Types**: `src/api/types.ts`
- **API Client Logic**: `src/api/client.ts`
- **Auth Context Code**: `src/contexts/AuthContext.tsx`

---

## ✅ Pre-Deployment Checklist

- [ ] HTTPS enabled in production
- [ ] CORS configured for production domain
- [ ] Strong JWT secret configured (256+ bits)
- [ ] Token expiration set appropriately (e.g., 8 hours)
- [ ] Rate limiting enabled on login endpoint
- [ ] Password hashing configured (bcrypt/argon2)
- [ ] Content Security Policy headers set
- [ ] No tokens in localStorage (verify in production build)
- [ ] Error messages are generic (no user enumeration)
- [ ] Logout button visible and functional
- [ ] Session restoration works (if enabled)
- [ ] Auto-logout on 401 tested

---

**Version**: 1.0.0  
**Last Updated**: January 2026  
**Need Help?** Check `AUTHENTICATION_IMPLEMENTATION.md` for detailed guide
