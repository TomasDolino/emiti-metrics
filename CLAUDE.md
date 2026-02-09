# Emiti Metrics - Project Context

## Overview
Marketing agency metrics dashboard for Meta Ads campaigns analysis.

## Tech Stack
- **Frontend**: React + TypeScript + Vite + Tailwind + Recharts
- **Backend**: FastAPI + Python 3.12 + PostgreSQL
- **Auth**: JWT + 2FA (TOTP) + WebAuthn
- **Deployment**: VPS Hostinger (76.13.166.17)

## URLs
- Production: https://metrics.emiti.cloud
- API: https://metrics.emiti.cloud/api

## Key Directories
```
/frontend          # React app (Vite)
/backend           # FastAPI app
  /app
    /routers       # API endpoints
    /services      # Business logic & security
  /scripts         # Backup scripts
```

## Security Rating: 9.2/10
Implemented: JWT hardened, 2FA, WebAuthn, session fingerprinting, password breach checking, encrypted backups, CSP with reporting, audit logging, rate limiting, SAST in CI/CD.

## Demo Access
- Email: demo@emiti.cloud
- Password: demo123 (weak - for demo only)

## VPS Commands
```bash
# SSH
ssh root@76.13.166.17

# Restart backend
systemctl restart emiti-backend

# View logs
journalctl -u emiti-backend -f

# Manual backup
cd /var/www/metrics-backend && source venv/bin/activate
python scripts/backup.py backup
```

## Pending Tasks
- #26: Configure Cloudflare free
- #27: Configure Backblaze B2 offsite backups
