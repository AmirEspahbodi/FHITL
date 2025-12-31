# 🚀 Quick Start Guide - API Integration

## 5-Minute Setup

### Step 1: Install Dependencies

```bash
npm install @tanstack/react-query@^5.17.19 axios@^1.6.5
```

### Step 2: Create Environment File

Create `.env` in project root:

```bash
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

### Step 3: Copy New Files

Copy these files into your `src/` directory:

```
src/
├── api/
│   ├── client.ts
│   ├── types.ts
│   └── services/
│       ├── principleService.ts
│       ├── sampleService.ts
│       └── index.ts
└── hooks/
    └── queries/
        ├── usePrinciples.ts
        ├── useSamples.ts
        ├── usePrincipleMutations.ts
        ├── useSampleMutations.ts
        └── index.ts
```

### Step 4: Replace App.tsx

Replace your current `App.tsx` with the refactored version.

### Step 5: Update DataRowItem.tsx

Replace `DataRowItem.tsx` with the debounced version.

### Step 6: Remove Old Imports

Delete or comment out these imports in App.tsx:

```typescript
// ❌ Remove these
import initialPrinciples from './principles.json';
import initialSamples from './_prompt_type1_without_example_samples.json';
```

### Step 7: Start Development Server

```bash
npm run dev
```

---

## Verify It Works

### ✅ Checklist

Open your browser and verify:

1. [ ] App loads without errors
2. [ ] Principles appear in sidebar
3. [ ] Clicking a principle loads samples
4. [ ] Editing a principle name saves
5. [ ] Typing in expert opinion field auto-saves
6. [ ] "Set as Revised" button works
7. [ ] Drag-drop reassignment works
8. [ ] Toggle "Show/Hide Revised" refreshes data

### 🐛 Troubleshooting

**Problem:** "Failed to fetch"
```bash
# Check API is running
curl http://localhost:3000/api/v1/principles
```

**Problem:** CORS error
```javascript
// Backend must allow your frontend origin
Access-Control-Allow-Origin: http://localhost:5173
```

**Problem:** "Cannot read property 'map'"
```typescript
// Add fallback in component
const principles = data?.principles || [];
```

---

## Backend API Requirements

Your backend must implement these endpoints:

### Required Endpoints

```
GET    /api/v1/principles
GET    /api/v1/principles/:id
PATCH  /api/v1/principles/:id
GET    /api/v1/principles/:id/samples?show_revised=true
PATCH  /api/v1/samples/:id/opinion
PATCH  /api/v1/samples/:id/revision
PATCH  /api/v1/samples/:id/reassign
```

### Test with cURL

```bash
# Test principles endpoint
curl http://localhost:3000/api/v1/principles

# Test samples endpoint
curl http://localhost:3000/api/v1/principles/1/samples?show_revised=true

# Test update
curl -X PATCH http://localhost:3000/api/v1/principles/1 \
  -H "Content-Type: application/json" \
  -d '{"definition": "Updated definition"}'
```

---

## Quick Reference

### Import Pattern

```typescript
import {
  usePrinciples,
  useSamples,
  usePrincipleMutations,
  useSampleMutations
} from './hooks/queries';
```

### Basic Usage

```typescript
// Fetch data
const { data: principles, isLoading } = usePrinciples();

// Update data
const { updatePrinciple } = usePrincipleMutations();
updatePrinciple.mutate({ id: 1, updates: { ... } });
```

---

## Next Steps

1. ✅ Read full `API_INTEGRATION_GUIDE.md`
2. ✅ Install React Query DevTools for debugging
3. ✅ Add error toast notifications (optional)
4. ✅ Configure production API URL
5. ✅ Test all functionality thoroughly

---

## Need Help?

- **React Query Issues:** Check [TanStack Query Docs](https://tanstack.com/query/latest)
- **API Issues:** Check backend logs and CORS configuration
- **TypeScript Errors:** Ensure all interfaces match API responses

---

**You're all set! 🎉**

The app should now be fully integrated with your RESTful API with optimistic updates, intelligent caching, and automatic error handling.
