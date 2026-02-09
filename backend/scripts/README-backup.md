# Emiti Metrics Database Backup System

Encrypted PostgreSQL backup solution with automatic daily scheduling.

## Features

- PostgreSQL database dumps using `pg_dump`
- Gzip compression (typically 5-10x size reduction)
- Fernet encryption (AES-128-CBC)
- Automatic cleanup of old backups
- Systemd timer for daily scheduling
- Backup verification

## Quick Start

### Manual Backup

```bash
# Set required environment variables
export DATABASE_URL="postgresql://user:password@localhost:5432/emiti_metrics"
export ENCRYPTION_KEY="your-32-byte-base64-encoded-key"

# Create backup
python backup.py backup

# List backups
python backup.py list

# Verify a backup
python backup.py verify emiti_metrics_20240115_030000.sql.gz.enc

# Restore from backup (interactive confirmation required)
python backup.py restore emiti_metrics_20240115_030000.sql.gz.enc

# Cleanup old backups (default: 30 days)
python backup.py cleanup

# Cleanup backups older than 7 days
python backup.py cleanup 7
```

## Systemd Installation

### 1. Create environment file

```bash
sudo mkdir -p /etc/emiti-metrics
sudo nano /etc/emiti-metrics/backup.env
```

Add:
```
DATABASE_URL=postgresql://user:password@localhost:5432/emiti_metrics
ENCRYPTION_KEY=your-fernet-compatible-key
```

Secure the file:
```bash
sudo chmod 600 /etc/emiti-metrics/backup.env
sudo chown emiti:emiti /etc/emiti-metrics/backup.env
```

### 2. Create backup directory

```bash
sudo mkdir -p /var/backups/emiti-metrics
sudo chown emiti:emiti /var/backups/emiti-metrics
sudo chmod 700 /var/backups/emiti-metrics
```

### 3. Install systemd files

```bash
sudo cp emiti-backup.service /etc/systemd/system/
sudo cp emiti-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
```

### 4. Enable and start timer

```bash
sudo systemctl enable emiti-backup.timer
sudo systemctl start emiti-backup.timer
```

### 5. Verify timer is active

```bash
systemctl list-timers | grep emiti
```

### 6. Manual test run

```bash
sudo systemctl start emiti-backup.service
journalctl -u emiti-backup.service -f
```

## Generating an Encryption Key

```python
from cryptography.fernet import Fernet
key = Fernet.generate_key()
print(key.decode())
```

Or via CLI:
```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

## Backup File Format

Filename: `emiti_metrics_YYYYMMDD_HHMMSS.sql.gz.enc`

Structure:
1. Raw SQL dump from pg_dump
2. Compressed with gzip (level 9)
3. Encrypted with Fernet (AES-128-CBC + HMAC)

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `DATABASE_URL` | (required) | PostgreSQL connection string |
| `ENCRYPTION_KEY` | (required) | Fernet encryption key |
| `BACKUP_DIR` | `/var/backups/emiti-metrics` | Backup storage location |
| `BACKUP_RETENTION` | `30` | Days to keep backups |

## Monitoring

View backup logs:
```bash
# Systemd journal
journalctl -u emiti-backup.service

# Log file (if /var/log exists)
tail -f /var/log/emiti-backup.log
```

## Troubleshooting

### Backup fails with "pg_dump not found"
Install PostgreSQL client tools:
```bash
# Ubuntu/Debian
sudo apt install postgresql-client

# macOS
brew install postgresql
```

### Decryption fails
- Verify ENCRYPTION_KEY matches the key used during backup
- Check for key encoding issues (should be base64)

### Restore fails
- Ensure target database exists
- Check user has sufficient privileges
- Verify DATABASE_URL is correct

## Security Notes

- Backup files are encrypted at rest
- Environment file should have restricted permissions (600)
- Backup directory should have restricted permissions (700)
- Never commit encryption keys to version control
- Consider rotating encryption keys periodically
