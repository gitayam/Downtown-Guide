# Security Principles

Security must be built into the foundation, not added as an afterthought.

---

## The Problem: Security as Phase 2

**What Goes Wrong:**
Building all features first, planning to "add security later" leads to:
- Critical vulnerabilities discovered late
- Massive retrofit work required
- Endpoints without authentication
- Weak token implementations
- No rate limiting (vulnerable to brute force)
- Race conditions in critical flows

**Impact:**
- Potential for token forgery and unauthorized access
- Data integrity issues (e.g., overbooking)
- No protection against abuse
- Complete rewrite of auth system required

---

## Core Principle: Auth Required by Default

Every endpoint should require authentication by default. Explicitly mark public endpoints as open.

**Pattern:**
```javascript
export async function onRequestPost(context) {
  // Step 1: ALWAYS authenticate first
  const user = await requireAuth(context.request, context.env)

  // Step 2: Check authorization
  if (!['ADMIN', 'STAFF'].includes(user.role)) {
    return new Response('Forbidden', { status: 403 })
  }

  // Step 3: Process request
  // ...
}
```

---

## Implementation Priorities

### Phase 0 (MVP Requirements)
- Add auth middleware to ALL endpoints
- Use proper JWT signing (not base64 encoding)
- Implement secure session management

### Phase 1 (Before Public Launch)
- Add rate limiting to prevent abuse
- Implement CSRF protection
- Add request validation/sanitization

### Ongoing
- Security review BEFORE feature deployment
- Threat model every new feature
- Regular dependency audits

---

## Common Vulnerabilities to Prevent

### 1. Weak Token Implementation
**Bad:** Base64-encoded user data (can be forged)
```javascript
// WRONG - Anyone can create this
const token = btoa(JSON.stringify({ userId: 123, role: 'admin' }))
```

**Good:** Cryptographically signed JWTs
```javascript
// CORRECT - Only server can sign
const token = await jwt.sign(
  { userId: 123, role: 'user' },
  env.JWT_SECRET,
  { expiresIn: '24h' }
)
```

### 2. Missing Rate Limiting
**Bad:** No limits on login attempts
```javascript
// WRONG - Vulnerable to brute force
app.post('/login', async (req, res) => {
  const { email, password } = req.body
  // Just check credentials...
})
```

**Good:** Rate limiting with exponential backoff
```javascript
// CORRECT - Limit attempts
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many login attempts'
})
app.post('/login', limiter, async (req, res) => { ... })
```

### 3. Race Conditions
**Bad:** Check-then-act without locking
```javascript
// WRONG - Two users can book the last spot
const event = await db.getEvent(id)
if (event.spots > 0) {
  await db.decrementSpots(id)
  await db.createBooking(userId, id)
}
```

**Good:** Atomic operations
```javascript
// CORRECT - Atomic update with condition
const result = await db.prepare(`
  UPDATE events
  SET spots = spots - 1
  WHERE id = ? AND spots > 0
`).bind(id).run()

if (result.changes === 0) {
  throw new Error('No spots available')
}
```

### 4. SQL Injection
**Bad:** String concatenation
```javascript
// WRONG - SQL injection vulnerability
const query = `SELECT * FROM users WHERE email = '${email}'`
```

**Good:** Parameterized queries
```javascript
// CORRECT - Parameterized
const user = await db.prepare(
  'SELECT * FROM users WHERE email = ?'
).bind(email).first()
```

### 5. XSS (Cross-Site Scripting)
**Bad:** Rendering unsanitized HTML
```javascript
// WRONG - XSS vulnerability
element.innerHTML = userInput
```

**Good:** Use framework escaping or sanitization
```javascript
// CORRECT - React escapes by default
<div>{userInput}</div>

// Or sanitize if HTML is needed
import DOMPurify from 'dompurify'
element.innerHTML = DOMPurify.sanitize(userInput)
```

---

## Security Checklist

Before deploying any feature:

- [ ] All endpoints require authentication (unless explicitly public)
- [ ] Authorization checks verify user has permission
- [ ] User input is validated and sanitized
- [ ] Database queries use parameterized statements
- [ ] Rate limiting is in place for sensitive endpoints
- [ ] Tokens are cryptographically signed
- [ ] Sensitive data is not logged
- [ ] HTTPS is enforced
- [ ] Dependencies are up to date

---

## Key Takeaway

**Security must be in the MVP, not "added later."**

The cost of retrofitting security is 10x higher than building it in from the start. Every day without proper security is a day of accumulated risk.
