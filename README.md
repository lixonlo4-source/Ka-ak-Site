# Kaçak Site - Cloudflare Pages Deployment

## Architecture
- **Frontend**: Cloudflare Pages (React + Vite)
- **API**: Pages Functions (`frontend/functions/api/*`)
- **Database**: D1 (`DB` binding)
- **File Storage**: R2 (`FILES` binding)

## Project Structure
```
kacak-site/
├── frontend/
│   ├── functions/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── register.js
│   │   │   │   └── login.js
│   │   │   ├── apps/
│   │   │   │   ├── index.js          # GET all, POST create
│   │   │   │   ├── [id].js           # GET one, PUT update, DELETE
│   │   │   │   └── [id]/
│   │   │   │       └── download.js   # GET download
│   │   │   └── health.js
│   │   └── _utils/
│   │       └── auth.js               # JWT, password, file utilities
│   ├── migrations/
│   │   └── 0001_init.sql
│   ├── public/
│   │   └── _routes.json
│   ├── src/
│   │   └── context/
│   │       └── AuthContext.jsx       # Updated with apiFetch
│   ├── wrangler.toml
│   ├── package.json
│   ├── vite.config.js
│   └── .env.example
└── README.md
```

## Setup

### 1. Create D1 Database and R2 Bucket
```bash
# Create D1 database
wrangler d1 create kacak-site-db
wrangler d1 create kacak-site-db-staging

# Create R2 buckets
wrangler r2 bucket create kacak-site-files
wrangler r2 bucket create kacak-site-files-staging
```

### 2. Update wrangler.toml
Update `database_id` in `wrangler.toml` with the IDs from step 1.

### 3. Run Migrations
```bash
# Production
wrangler d1 migrations apply kacak-site-db --remote

# Staging
wrangler d1 migrations apply kacak-site-db-staging --remote
```

### 4. Set Secrets
```bash
# JWT Secret (required)
wrangler pages secret put JWT_SECRET --project-name=kacak-site

# Admin credentials (optional - for auto-creation)
wrangler pages secret put ADMIN_USERNAME --project-name=kacak-site
wrangler pages secret put ADMIN_PASSWORD --project-name=kacak-site
```

### 5. Deploy
```bash
# Build and deploy to Pages
wrangler pages deploy frontend/dist --project-name=kacak-site

# Or use the dashboard for CI/CD
```

## Local Development
```bash
# Install dependencies
cd frontend && npm install

# Start local dev server (uses Miniflare for D1/R2)
wrangler pages dev frontend/dist --binding=DB=kacak-site-db --binding=FILES=kacak-site-files
```

## API Endpoints
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/health` | Health check | No |
| POST | `/api/auth/register` | Register user | No |
| POST | `/api/auth/login` | Login user | No |
| GET | `/api/apps` | List all apps | Optional |
| GET | `/api/apps/:id` | Get app detail | Optional |
| POST | `/api/apps` | Create app | Admin |
| PUT | `/api/apps/:id` | Update app | Admin |
| DELETE | `/api/apps/:id` | Delete app | Admin |
| GET | `/api/apps/:id/download` | Download file | Optional |

## Authentication
- JWT tokens with HS256 (Web Crypto API)
- 7-day expiration
- Admin role required for mutations
- Tokens stored in localStorage on frontend

## File Upload
- Allowed: `.exe`, `.zip`, `.rar`, `.apk`, `.msi`
- Max size: 500MB
- Stored in R2 with UUID keys
- Original filename preserved in D1

## Environment Variables
| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes | Secret for JWT signing (min 32 chars) |
| `ADMIN_USERNAME` | No | Auto-create admin user |
| `ADMIN_PASSWORD` | No | Auto-create admin password |