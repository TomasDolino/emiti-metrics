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
  /scripts         # Backup, sync scripts
```

## Meta Ads Sync (2026-02-10)
Automatic sync from Meta Ads API 3x daily via systemd timer.

```bash
# Timer runs at 8:00, 14:00, 20:00 Argentina time
systemctl status emiti-meta-sync.timer

# Manual sync
cd /var/www/metrics-backend && source venv/bin/activate
python scripts/sync_meta.py

# Logs
cat /var/log/emiti-meta-sync.log
```

**Connected clients**: Estela Dezi, Mora Interiores, Affronti Marcos, Amueblarte PH, Restauracion Central, Wood Store

## Dashboard Features (2026-02-10)
- **Performance Score**: 5-metric weighted score (CPR 30%, CTR 20%, etc.)
- **Period Selector**: Hoy, 7/14/30/60/90 días, custom range
- **Dynamic Titles**: Charts show selected period in title
- **Client Ranking**: All-brands view shows ranked clients
- **Smart Sorting**: Sidebar dropdown shows clients with data first

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

# Deploy frontend
cd frontend && npm run build
scp -r dist/* root@76.13.166.17:/var/www/metrics/
```

## Pending Tasks
- #26: Configure Cloudflare free (WAF, CDN, DDoS protection)
- #27: Configure Backblaze B2 offsite backups (~$5/mes)

## Memory Management
**IMPORTANTE**: Actualizar MEMORY.md frecuentemente para no perder info cuando se compacta el contexto.

Actualizar memory cuando:
- Se aprende algo nuevo del negocio/proyecto
- Se toman decisiones importantes
- Se completan tareas significativas
- Se descubren bugs o soluciones
- Hay info que se va a necesitar en futuras sesiones

Formato: Conciso, con bullets, priorizar lo accionable.
