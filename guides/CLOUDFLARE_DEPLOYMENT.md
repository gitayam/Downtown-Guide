# Cloudflare Pages Deployment Guide

Best practices for deploying applications to Cloudflare Pages with Functions.

---

## Recommended: Use a Deploy Script

Create a deploy script that handles all steps correctly:

```bash
#!/bin/bash
# deploy.sh

set -e

echo "Building frontend..."
npm run build

echo "Copying functions to dist..."
rsync -av --delete functions/ dist/functions/

echo "Deploying to Cloudflare Pages..."
npx wrangler pages deploy dist --project-name=your-project-name

echo "Deployment complete!"
```

Or in `package.json`:
```json
{
  "scripts": {
    "deploy": "npm run build && rsync -av --delete functions/ dist/functions/ && npx wrangler pages deploy dist --project-name=your-project-name"
  }
}
```

---

## Why This Works

1. **Builds frontend** to `dist/` with bundled JavaScript assets
2. **Copies Functions** into `dist/functions/` so both are deployed together
3. **Deploys `dist/`** which has the production `index.html` (with bundled assets)
4. **Cloudflare's server-side bundler** handles Functions with external dependencies

---

## Common Mistakes

### Mistake 1: Deploying Root Directory

```bash
# WRONG - Uses root index.html which has development scripts!
npx wrangler pages deploy . --project-name=your-project
```

The root `index.html` is for the dev server and points to source files like `/src/main.tsx`. This causes a **BLANK PAGE** in production!

### Mistake 2: Forgetting to Copy Functions

```bash
# WRONG - Functions won't be deployed!
npm run build
npx wrangler pages deploy dist --project-name=your-project
# Missing: rsync -av --delete functions/ dist/functions/
```

### Mistake 3: Using --no-bundle Flag

The `--no-bundle` flag only applies to `_worker.js`, not Pages Functions. It doesn't help with dependency issues.

---

## Verification Checklist

Before deploying, verify:

```bash
# Check dist/index.html has bundled assets (NOT /src/main.tsx)
grep -q 'src="/assets/index-' dist/index.html && echo "OK" || echo "WRONG"

# Check functions are in dist/
ls dist/functions/api/ | head -5
```

---

## Git-Based Deployment (Alternative)

If your project is connected to GitHub, Cloudflare can build and deploy automatically:

```bash
# 1. Build locally to verify (optional)
npm run build

# 2. Commit your changes
git add .
git commit -m "fix: your commit message"

# 3. Push to GitHub
git push origin main

# 4. Monitor deployment in Cloudflare Dashboard
# Workers & Pages > your-project > Deployments
```

**Why Git-Based Works:**
- Cloudflare's server-side builder properly handles Pages Functions with dependencies
- No local dependency bundling issues
- Automatic preview deployments for branches

---

## Manual Dashboard Deployment

If auto-deploy isn't working:

1. Go to Cloudflare Dashboard → Workers & Pages → your-project
2. Click "Create deployment"
3. Select branch: `main`
4. Click "Deploy"

---

## Verify Deployment

```bash
# Check latest deployment
npx wrangler pages deployment list --project-name=your-project | head -5

# View deployment logs
npx wrangler pages deployment tail --project-name=your-project

# Test the live site
curl https://your-domain.com/api/health
# Should return: {"status":"ok"}
```

---

## Troubleshooting

### Push to GitHub but No Deployment

1. Check GitHub webhook: Settings → Webhooks → Recent Deliveries
2. Manually trigger deployment from Cloudflare Dashboard
3. Verify branch name matches deployment settings

### Deployment Fails with npm install Errors

1. Verify `package.json` has all dependencies
2. Check `package-lock.json` is committed
3. Ensure Node version matches (check `package.json` "engines")

### Test Without Deploying to Production

1. Create feature branch: `git checkout -b feature/my-feature`
2. Push branch: `git push origin feature/my-feature`
3. Cloudflare creates preview deployment: `https://[hash].your-project.pages.dev`

---

## .wranglerignore File

Exclude source files from deployment:

```
# Ignore source files - only deploy dist/ and functions/
src/
node_modules/
migrations/
scripts/
docs/
.git/
.github/
*.md
*.log
.env*
.DS_Store
tsconfig.json
vite.config.ts
package.json
package-lock.json
```

---

## Key Takeaways

| Do | Don't |
|----|-------|
| Deploy `dist/` directory | Deploy root `.` directory |
| Copy functions before deploy | Forget to copy functions |
| Use deploy script | Run manual commands each time |
| Verify build output | Assume build succeeded |
| Use git-based for complex deps | Force local bundling |
