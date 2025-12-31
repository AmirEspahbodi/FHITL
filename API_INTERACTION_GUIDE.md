# CogniLoop API Integration Guide

## 📋 Overview

This document details the complete refactoring from static JSON data to RESTful API integration using TanStack Query (React Query v5).

---

## 🎯 Implementation Status

### ✅ Completed

- [x] API types and interfaces (`src/api/types.ts`)
- [x] Axios client with interceptors (`src/api/client.ts`)
- [x] Principle service layer (`src/api/services/principleService.ts`)
- [x] Sample service layer (`src/api/services/sampleService.ts`)
- [x] Query hooks for data fetching (`usePrinciples`, `useSamples`)
- [x] Mutation hooks for data modification (`usePrincipleMutations`, `useSampleMutations`)
- [x] Refactored App.tsx with TanStack Query integration
- [x] Loading and error states
- [x] Optimistic updates for instant UI feedback
- [x] Debounced expert opinion updates (500ms)
- [x] Environment configuration

### ⚠️ Known Limitations

- **Undo System (Ctrl+Z):** Removed - requires backend audit log
- **Offline Support:** Not implemented - requires service workers
- **Real-time Collaboration:** Not implemented - requires WebSocket

---

## 📁 Project Structure

```
src/
├── api/
│   ├── client.ts                    # Axios instance with interceptors
│   ├── types.ts                     # API request/response interfaces
│   └── services/
│       ├── principleService.ts      # Principle CRUD operations
│       ├── sampleService.ts         # Sample CRUD operations
│       └── index.ts                 # Service exports
│
├── hooks/
│   └── queries/
│       ├── usePrinciples.ts         # Principle query hook
│       ├── useSamples.ts            # Sample query hook
│       ├── usePrincipleMutations.ts # Principle mutation hook
│       ├── useSampleMutations.ts    # Sample mutation hook
│       └── index.ts                 # Hook exports
│
├── components/                      # (Minimal changes)
│   ├── Sidebar.tsx
│   ├── HeaderPanel.tsx
│   ├── DataRowItem.tsx              # Updated with debouncing
│   └── ...
│
├── App.tsx                          # Refactored with QueryClientProvider
├── types.ts                         # Domain types (unchanged)
└── index.tsx                        # Entry point
```

---

## 🔧 Installation

### 1. Install Dependencies

```bash
npm install @tanstack/react-query@^5.17.19 axios@^1.6.5
```

### Optional (Recommended):
```bash
npm install react-hot-toast@^2.4.1  # For toast notifications
```

### 2. Environment Configuration

Create `.env` file in project root:

```bash
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

**Production:**
```bash
VITE_API_BASE_URL=https://api.cogniloop.com/v1
```

---

## 🔌 API Endpoint Reference

### Principles

| Method | Endpoint | Request | Response | Trigger |
|--------|----------|---------|----------|---------|
| GET | `/principles` | - | `{ principles: Principle[] }` | App mount |
| GET | `/principles/:id` | - | `{ principle: Principle }` | Optional |
| PATCH | `/principles/:id` | `{ label_name?, definition?, ... }` | `{ principle: Principle }` | Field blur |

### Samples

| Method | Endpoint | Request | Response | Trigger |
|--------|----------|---------|----------|---------|
| GET | `/principles/:id/samples?show_revised={bool}` | - | `{ samples: [], stats: {} }` | Principle select |
| PATCH | `/samples/:id/opinion` | `{ expert_opinion: string }` | `{ sample: DataRow }` | Textarea blur |
| PATCH | `/samples/:id/revision` | `{ is_revised: bool, reviser_name: string }` | `{ sample: DataRow }` | Button click |
| PATCH | `/samples/:id/reassign` | `{ target_principle_id: number, ... }` | `{ sample: DataRow }` | Drag-drop |

---

## 🎨 Features & Behavior

### Optimistic Updates

**What:** UI updates immediately before server confirms the change

**Where:**
- Principle edits (name, definition, criteria)
- Expert opinion changes (with 500ms debounce)

**Flow:**
1. User makes change
2. UI updates instantly (optimistic)
3. API call executes in background
4. On success: Keep optimistic update
5. On error: Rollback to previous state

### Debouncing

**Expert Opinion Field:**
- Saves automatically while typing (500ms delay)
- Immediate save on blur or Enter key
- Reduces API calls from ~50 to ~1 per edit

### Caching Strategy

| Data Type | Stale Time | GC Time | Behavior |
|-----------|------------|---------|----------|
| Principles | 10 min | 15 min | Changes infrequently |
| Samples | 2 min | 5 min | Changes frequently |

### Loading States

1. **Initial Load:** Full-screen spinner with "Loading principles..."
2. **Principle Switch:** Table area spinner with "Loading samples..."
3. **Mutations:** Optimistic update (no spinner)

### Error Handling

**Principles Error:**
- Full-screen error message
- "Reload Page" button
- Displays error message

**Samples Error:**
- In-table error message
- Shows error details
- Principle list remains usable

---

## 🚀 Usage Examples

### Using Query Hooks

```typescript
// Fetch all principles
const { data: principles, isLoading, error } = usePrinciples();

// Fetch samples for a principle
const { data: samplesData } = useSamples({
  principleId: 1,
  showRevised: true
});

const samples = samplesData?.samples || [];
const stats = samplesData?.stats || { total: 0, revised: 0, percentage: 0 };
```

### Using Mutation Hooks

```typescript
const { updatePrinciple } = usePrincipleMutations();
const { updateOpinion, toggleRevision, reassignSample } = useSampleMutations();

// Update principle
updatePrinciple.mutate({
  id: 1,
  updates: { definition: 'New definition' }
});

// Update expert opinion (debounced in component)
updateOpinion.mutate({
  id: 'sample-123',
  opinion: 'This looks correct'
});

// Mark as revised
toggleRevision.mutate({
  id: 'sample-123',
  isRevised: true,
  reviserName: 'Dr. Jane Smith'
});

// Reassign sample
reassignSample.mutate({
  id: 'sample-123',
  targetPrincipleId: 2,
  reviserName: 'Dr. Jane Smith'
});
```

### Manual Cache Invalidation

```typescript
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

// Invalidate and refetch all principles
queryClient.invalidateQueries({ queryKey: ['principles'] });

// Invalidate samples for specific principle
queryClient.invalidateQueries({ queryKey: ['samples', principleId] });

// Invalidate all samples
queryClient.invalidateQueries({ queryKey: ['samples'] });
```

---

## 🧪 Testing Checklist

### Functionality Tests

- [ ] **Principles Load:** App loads principles on mount
- [ ] **Principle Selection:** Clicking principle fetches its samples
- [ ] **Show/Hide Toggle:** Button refetches with correct filter
- [ ] **Principle Rename:** Triple-click sidebar item, edit, blur saves
- [ ] **Definition Edit:** Click definition, edit, blur saves
- [ ] **Criteria Edit:** Click criteria fields, edit, blur saves
- [ ] **Opinion Edit:** Expand row, click opinion, type (debounced save)
- [ ] **Mark Revised:** Click "Set as Revised" button
- [ ] **Drag-Drop:** Expand row, drag to different principle
- [ ] **Progress Bar:** Updates when samples are revised
- [ ] **Revision Stats:** Shows correct count and percentage

### Edge Cases

- [ ] **Empty Principles:** Shows "No Principles Found" message
- [ ] **Empty Samples:** Shows "No data annotations" message
- [ ] **Network Error:** Shows error with reload button
- [ ] **API Timeout:** Shows error after 10 seconds
- [ ] **Invalid Principle ID:** Handles 404 gracefully
- [ ] **Concurrent Edits:** Last write wins (no conflicts)

### Performance Tests

- [ ] **Initial Load:** < 2 seconds on slow 3G
- [ ] **Principle Switch:** < 500ms cache hit, < 2s cache miss
- [ ] **Opinion Typing:** No lag or stuttering
- [ ] **Drag Operations:** Smooth 60fps animation
- [ ] **Memory Leaks:** No memory growth after 100 operations

---

## 🐛 Debugging

### Enable React Query DevTools

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

### Enable Axios Logging

Already enabled in `src/api/client.ts` for development mode:

```typescript
if (import.meta.env.DEV) {
  console.log('[API Request]', config.method, config.url);
}
```

### Common Issues

**Issue:** "Cannot read property 'principles' of undefined"
- **Cause:** Query hasn't loaded yet
- **Fix:** Check `isLoading` before accessing `data`

**Issue:** Optimistic update doesn't rollback on error
- **Cause:** Missing `onError` context restoration
- **Fix:** Verify `onMutate` returns context object

**Issue:** Debounce not working
- **Cause:** Timer ref not cleaned up
- **Fix:** Add cleanup in `useEffect`

**Issue:** CORS error
- **Cause:** Backend not configured for frontend origin
- **Fix:** Add CORS headers in backend

---

## 🔐 Security Considerations

### Current Implementation

- No authentication (public API assumed)
- No rate limiting client-side
- No sensitive data encryption

### Future Enhancements

1. **JWT Authentication:**
```typescript
// In client.ts
const token = localStorage.getItem('auth_token');
if (token) {
  config.headers.Authorization = `Bearer ${token}`;
}
```

2. **CSRF Protection:**
```typescript
// Add CSRF token to headers
config.headers['X-CSRF-Token'] = getCsrfToken();
```

3. **Request Signing:**
```typescript
// Sign requests with HMAC
const signature = generateSignature(config.data);
config.headers['X-Signature'] = signature;
```

---

## 📊 Performance Metrics

### Target Performance

- **Time to First Principle:** < 1.5s
- **Principle Switch:** < 500ms (cached), < 2s (network)
- **Opinion Save:** < 300ms (optimistic), < 1s (confirmed)
- **Bundle Size:** < 500KB (gzipped)

### Monitoring

Use React Query DevTools to monitor:
- Query status (loading, success, error)
- Cache hit/miss ratio
- Background refetch frequency
- Mutation timing

---

## 🔄 Migration from Static Data

### Before (Old Code)

```typescript
// ❌ Static imports
import initialPrinciples from './principles.json';
import initialSamples from './samples.json';

// ❌ useState for server data
const [principles, setPrinciples] = useState(initialPrinciples);
const [data, setData] = useState(initialSamples);

// ❌ Manual state updates
setPrinciples(prev => prev.map(p => p.id === id ? {...p, ...updates} : p));
```

### After (New Code)

```typescript
// ✅ TanStack Query hooks
const { data: principles } = usePrinciples();
const { data: samplesData } = useSamples({ principleId, showRevised });

// ✅ Mutations with optimistic updates
const { updatePrinciple } = usePrincipleMutations();
updatePrinciple.mutate({ id, updates });
```

---

## 📝 Backend Requirements

### Response Schemas

**Principle:**
```json
{
  "id": 1,
  "label_name": "Empathy",
  "definition": "Understanding others' emotions",
  "inclusion_criteria": "Shows understanding...",
  "exclusion_criteria": "Ignores feelings...",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

**Sample:**
```json
{
  "id": "uuid-123",
  "preceding": "I understand",
  "target": "how you feel",
  "following": "about this situation",
  "A1_Score": 4,
  "A2_Score": 5,
  "A3_Score": 4,
  "principle_id": 1,
  "llm_justification": "Shows empathy by...",
  "llm_evidence_quote": "I understand how you feel",
  "expert_opinion": "Correct annotation",
  "is_revised": true,
  "reviser_name": "Dr. Jane Smith",
  "revision_timestamp": "2024-01-15T10:30:00Z",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

### CORS Configuration

```javascript
// Express.js example
app.use(cors({
  origin: ['http://localhost:5173', 'https://cogniloop.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

## 🎓 Best Practices

### Query Keys

Always use consistent, hierarchical query keys:

```typescript
// ✅ Good
['principles']                        // All principles
['principles', principleId]           // Single principle
['samples', principleId, showRevised] // Samples with filters

// ❌ Bad
['getAllPrinciples']                  // Not hierarchical
['samples']                           // Missing filters
```

### Mutation Patterns

```typescript
// ✅ Good: Optimistic update with rollback
onMutate: async (variables) => {
  await queryClient.cancelQueries({ queryKey: ['data'] });
  const previous = queryClient.getQueryData(['data']);
  queryClient.setQueryData(['data'], newData);
  return { previous };
},
onError: (err, variables, context) => {
  queryClient.setQueryData(['data'], context.previous);
}

// ❌ Bad: No optimistic update, no error handling
mutationFn: updateData
```

### Component Organization

```typescript
// ✅ Good: Hooks at top, handlers below, render last
const Component = () => {
  // 1. Query hooks
  const { data } = useData();
  
  // 2. Mutation hooks
  const { update } = useMutations();
  
  // 3. Event handlers
  const handleUpdate = () => update.mutate(...);
  
  // 4. Render
  return <div>...</div>;
};
```

---

## 📚 Additional Resources

- [TanStack Query Docs](https://tanstack.com/query/latest/docs/framework/react/overview)
- [Axios Documentation](https://axios-http.com/docs/intro)
- [React Query Essentials](https://tkdodo.eu/blog/practical-react-query)

---

## 🤝 Support

For issues or questions:
1. Check this guide first
2. Review TanStack Query DevTools
3. Check browser console for errors
4. Contact the backend team for API issues

---

## ✨ Future Enhancements

### Short Term
- [ ] Add toast notifications for user feedback
- [ ] Implement error boundaries
- [ ] Add retry buttons for failed mutations
- [ ] Improve loading skeletons

### Medium Term
- [ ] Pagination for large sample sets
- [ ] Advanced filtering (by score, date, reviser)
- [ ] Export functionality (CSV, JSON)
- [ ] Keyboard shortcuts

### Long Term
- [ ] Real-time collaboration (WebSocket)
- [ ] Undo/redo system (backend audit log)
- [ ] Offline support (service workers)
- [ ] Analytics dashboard

---

**Last Updated:** January 2026
**Version:** 2.0.0
**Author:** Engineering Team
