# Best Practices & What Works Well

Lessons learned from building production applications. These patterns consistently deliver results.

---

## 1. API-First Development

**Approach:** Build all API endpoints before building UI components. Create a unified API client with type-safe calls.

**Why It Works:**
- Clear separation between frontend and backend
- APIs testable independently of UI
- Multiple frontends can share the same APIs
- Well-defined contracts prevent integration issues
- Easy to add new endpoints without touching frontend

**Example:**
```typescript
// Unified API client makes every call consistent
class ApiClient {
  async getEvents(params?: EventParams): Promise<{ data: Event[] }> {
    return this.request<{ data: Event[] }>('/events', params)
  }
}

// Used across multiple pages without duplication
const events = await api.getEvents({ type: 'workshop', status: 'active' })
```

**Recommendation:**
- Always build API first
- Document endpoints as you go
- Use TypeScript for contract enforcement
- Test APIs with curl/Postman before building UI

---

## 2. Real Data from Day 1 (No Mock Data!)

**Approach:** Connect to actual database from the start. No fake numbers, no hardcoded values.

**Why It Works:**
- Stakeholders see immediate value (real data!)
- Avoids painful "mock to real data" migration
- Faster iteration—feedback on real metrics
- Catches data quality issues early
- No false sense of progress from fake data

**Before (Bad):**
```typescript
const stats = {
  revenue: { today: 2847.50 }, // Hardcoded fake data
  orders: { today: 124 }        // Always the same number
}
```

**After (Good):**
```typescript
const todayRevenue = await db.prepare(`
  SELECT SUM(total) as revenue
  FROM orders
  WHERE date(created_at) = ?
`).bind(today).first()
```

**Recommendation:**
- Never use mock data for longer than 1 sprint
- Build database schema first, then query it
- Show stakeholders real data ASAP for feedback

---

## 3. Edge-First Infrastructure

**Approach:** Build on edge platforms (Cloudflare Pages/Workers, Vercel Edge, etc.) instead of traditional servers.

**Why It Works:**
- **Global Edge Deployment:** < 50ms latency worldwide
- **Zero Server Management:** No EC2 instances, no Kubernetes
- **Cost-Effective:** Generous free tiers
- **Integrated:** Services work together seamlessly
- **Fast Cold Starts:** < 1ms startup times
- **Automatic Scaling:** Handles traffic spikes without config

**Metrics Example:**
- API response times: 200-500ms
- Image loading: < 100ms (CDN cached)
- Deployment time: 2 minutes
- Monthly cost: ~$20 for 1M requests

**Recommendation:**
- Use edge platforms for new projects
- Avoid premature infrastructure complexity
- Let the platform handle scaling

---

## 4. TypeScript Everywhere

**Approach:** Use TypeScript for frontend AND backend. Enable strict mode.

**Why It Works:**
- Catches bugs at compile time (not runtime)
- Excellent IDE autocomplete and IntelliSense
- Self-documenting code (types explain intent)
- Refactoring with confidence (compiler catches breaks)
- Zod schema integration for runtime + compile-time safety

**Example:**
```typescript
// TypeScript caught this error before deployment
const event: Event = {
  title: "Workshop",
  startDate: "2025-11-22T14:00:00Z", // String not Date—compiler error!
  capacity: "20" // String not number—compiler error!
}
```

**Recommendation:**
- Use TypeScript for all new code
- Migrate JavaScript files gradually
- Use strict mode (`strict: true` in tsconfig)
- Generate types from database schema

---

## 5. Custom React Hooks for Reusable Logic

**Approach:** Extract common logic into custom React hooks.

**Why It Works:**
- Logic reused across multiple components
- Testable in isolation
- Consistent behavior everywhere
- Easy to add features (just use the hook)

**Example:**
```typescript
// Created once, used everywhere
const useDashboardAnalytics = (refreshInterval = 30000) => {
  const [data, setData] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const interval = setInterval(fetchData, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval])

  return { data, loading, error, refresh: fetchData }
}

// Used in 5+ components with same behavior
const { data: stats, loading, error } = useDashboardAnalytics()
```

**Recommendation:**
- Extract common logic to hooks
- Use hooks for all API calls
- Document hook parameters and return values

---

## 6. Aggressive Caching with Short TTLs

**Approach:** Set short cache times (30 seconds to 5 minutes) to feel real-time while reducing load.

**Why It Works:**
- Feels "real-time" to users
- Reduces database load by 95%
- CDN serves most requests
- Balances freshness vs. performance

**Configuration:**
```javascript
return new Response(JSON.stringify(data), {
  headers: {
    'Cache-Control': 'public, max-age=30',  // 30 seconds
    'Content-Type': 'application/json'
  }
})
```

**Metrics Example:**
- Dashboard: 30s cache = 2 DB queries/minute (was 120/minute)
- Products: 5min cache = 0.2 DB queries/minute
- 98% of requests served from CDN edge

**Recommendation:**
- Use short caches (< 5 minutes) for changing data
- Let CDN handle traffic spikes
- Add cache versioning for instant invalidation

---

## 7. AWS SES for Production Email

**Approach:** Use AWS SES for transactional emails instead of third-party email APIs.

**Why It Works:**
- More reliable deliverability (99.9%)
- Lower cost ($0.10 per 1,000 emails)
- No API rate limits
- Direct SMTP control
- Bounce/complaint handling built-in

**Configuration:**
```javascript
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'

const ses = new SESClient({ region: env.AWS_REGION })
await ses.send(new SendEmailCommand({
  Source: 'noreply@yourdomain.com',
  Destination: { ToAddresses: [email] },
  Message: { Subject, Body }
}))
```

**Recommendation:**
- Use AWS SES for production email
- Third-party APIs are fine for dev/prototyping
- Set up dedicated sending IP for reputation

---

## Summary: Keep Doing These Things

| Practice | Impact |
|----------|--------|
| API-first development | Clear contracts, testable APIs |
| Real data from day 1 | Fast feedback, no migration pain |
| Edge infrastructure | Low latency, no ops overhead |
| TypeScript everywhere | Fewer bugs, better DX |
| Custom React hooks | Reusable, testable logic |
| Short cache TTLs | 95% load reduction, feels real-time |
| AWS SES for email | Reliable, cost-effective delivery |
