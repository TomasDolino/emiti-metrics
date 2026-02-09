#!/usr/bin/env python3
"""
Encrypted Database Backup Script for Emiti Metrics

Usage:
    python backup.py backup              # Create encrypted backup
    python backup.py restore <file>      # Restore from backup
    python backup.py list                # List available backups
    python backup.py cleanup             # Remove backups older than 30 days
    python backup.py verify <file>       # Verify backup integrity

Environment Variables:
    ENCRYPTION_KEY      - Fernet encryption key (required)
    DATABASE_URL        - PostgreSQL connection string (required)
    BACKUP_DIR          - Backup directory (default: /var/backups/emiti-metrics/)
    BACKUP_RETENTION    - Days to keep backups (default: 30)
"""

import os
import sys
import gzip
import subprocess
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List, Tuple
from urllib.parse import urlparse

try:
    from cryptography.fernet import Fernet, InvalidToken
except ImportError:
    print("Error: cryptography package not installed. Run: pip install cryptography")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("/var/log/emiti-backup.log", mode="a")
        if os.path.exists("/var/log")
        else logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)

# Configuration
BACKUP_DIR = Path(os.getenv("BACKUP_DIR", "/var/backups/emiti-metrics"))
BACKUP_RETENTION_DAYS = int(os.getenv("BACKUP_RETENTION", "30"))
BACKUP_PREFIX = "emiti_metrics_"
BACKUP_SUFFIX = ".sql.gz.enc"


def get_encryption_key() -> bytes:
    """Get the Fernet encryption key from environment variable."""
    key = os.getenv("ENCRYPTION_KEY")
    if not key:
        logger.error("ENCRYPTION_KEY environment variable not set")
        raise ValueError("ENCRYPTION_KEY environment variable is required")

    # Ensure key is properly formatted for Fernet
    try:
        # If it's already a valid Fernet key, use it
        Fernet(key.encode() if isinstance(key, str) else key)
        return key.encode() if isinstance(key, str) else key
    except Exception:
        # If not, try to decode it or generate from it
        try:
            import base64
            import hashlib
            # Create a consistent 32-byte key from the input
            key_bytes = hashlib.sha256(key.encode()).digest()
            return base64.urlsafe_b64encode(key_bytes)
        except Exception as e:
            logger.error(f"Invalid encryption key format: {e}")
            raise ValueError("Invalid ENCRYPTION_KEY format")


def parse_database_url() -> dict:
    """Parse DATABASE_URL into connection components."""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        logger.error("DATABASE_URL environment variable not set")
        raise ValueError("DATABASE_URL environment variable is required")

    parsed = urlparse(database_url)
    return {
        "host": parsed.hostname or "localhost",
        "port": parsed.port or 5432,
        "database": parsed.path.lstrip("/"),
        "user": parsed.username,
        "password": parsed.password,
    }


def ensure_backup_dir() -> Path:
    """Ensure backup directory exists with proper permissions."""
    try:
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)
        # Set restrictive permissions (owner only)
        os.chmod(BACKUP_DIR, 0o700)
        return BACKUP_DIR
    except PermissionError:
        # Fall back to user's home directory
        fallback_dir = Path.home() / ".emiti-backups"
        fallback_dir.mkdir(parents=True, exist_ok=True)
        os.chmod(fallback_dir, 0o700)
        logger.warning(f"Using fallback backup directory: {fallback_dir}")
        return fallback_dir


def generate_backup_filename() -> str:
    """Generate backup filename with timestamp."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"{BACKUP_PREFIX}{timestamp}{BACKUP_SUFFIX}"


def backup() -> Optional[Path]:
    """
    Create an encrypted database backup.

    Steps:
    1. Dump PostgreSQL database using pg_dump
    2. Compress with gzip
    3. Encrypt with Fernet
    4. Save to backup directory

    Returns:
        Path to the created backup file, or None on failure
    """
    logger.info("Starting database backup...")

    try:
        # Get configuration
        db_config = parse_database_url()
        encryption_key = get_encryption_key()
        backup_dir = ensure_backup_dir()
        backup_file = backup_dir / generate_backup_filename()

        fernet = Fernet(encryption_key)

        # Set up environment for pg_dump
        env = os.environ.copy()
        if db_config["password"]:
            env["PGPASSWORD"] = db_config["password"]

        # Build pg_dump command
        pg_dump_cmd = [
            "pg_dump",
            "-h", db_config["host"],
            "-p", str(db_config["port"]),
            "-U", db_config["user"],
            "-d", db_config["database"],
            "--no-password",
            "--format=plain",
            "--no-owner",
            "--no-acl",
        ]

        logger.info(f"Dumping database: {db_config['database']}@{db_config['host']}")

        # Execute pg_dump
        result = subprocess.run(
            pg_dump_cmd,
            capture_output=True,
            env=env,
            timeout=3600,  # 1 hour timeout
        )

        if result.returncode != 0:
            logger.error(f"pg_dump failed: {result.stderr.decode()}")
            raise subprocess.CalledProcessError(result.returncode, pg_dump_cmd)

        sql_data = result.stdout
        logger.info(f"Database dump size: {len(sql_data):,} bytes")

        # Compress with gzip
        logger.info("Compressing backup...")
        compressed_data = gzip.compress(sql_data, compresslevel=9)
        compression_ratio = len(sql_data) / len(compressed_data) if compressed_data else 0
        logger.info(f"Compressed size: {len(compressed_data):,} bytes (ratio: {compression_ratio:.2f}x)")

        # Encrypt with Fernet
        logger.info("Encrypting backup...")
        encrypted_data = fernet.encrypt(compressed_data)
        logger.info(f"Encrypted size: {len(encrypted_data):,} bytes")

        # Write to file
        backup_file.write_bytes(encrypted_data)
        os.chmod(backup_file, 0o600)  # Owner read/write only

        logger.info(f"Backup completed successfully: {backup_file}")
        logger.info(f"Backup file size: {backup_file.stat().st_size:,} bytes")

        return backup_file

    except subprocess.TimeoutExpired:
        logger.error("Database dump timed out after 1 hour")
        return None
    except subprocess.CalledProcessError as e:
        logger.error(f"Database dump failed with exit code {e.returncode}")
        return None
    except Exception as e:
        logger.error(f"Backup failed: {e}")
        return None


def restore(backup_file: str) -> bool:
    """
    Restore database from an encrypted backup.

    Args:
        backup_file: Path to the encrypted backup file

    Returns:
        True on success, False on failure
    """
    logger.info(f"Starting database restore from: {backup_file}")

    backup_path = Path(backup_file)
    if not backup_path.exists():
        # Try looking in backup directory
        backup_path = ensure_backup_dir() / backup_file
        if not backup_path.exists():
            logger.error(f"Backup file not found: {backup_file}")
            return False

    try:
        # Get configuration
        db_config = parse_database_url()
        encryption_key = get_encryption_key()
        fernet = Fernet(encryption_key)

        # Read encrypted data
        logger.info("Reading backup file...")
        encrypted_data = backup_path.read_bytes()
        logger.info(f"Encrypted file size: {len(encrypted_data):,} bytes")

        # Decrypt
        logger.info("Decrypting backup...")
        try:
            compressed_data = fernet.decrypt(encrypted_data)
        except InvalidToken:
            logger.error("Decryption failed: Invalid encryption key or corrupted file")
            return False
        logger.info(f"Decrypted size: {len(compressed_data):,} bytes")

        # Decompress
        logger.info("Decompressing backup...")
        sql_data = gzip.decompress(compressed_data)
        logger.info(f"Decompressed size: {len(sql_data):,} bytes")

        # Set up environment for psql
        env = os.environ.copy()
        if db_config["password"]:
            env["PGPASSWORD"] = db_config["password"]

        # Build psql command
        psql_cmd = [
            "psql",
            "-h", db_config["host"],
            "-p", str(db_config["port"]),
            "-U", db_config["user"],
            "-d", db_config["database"],
            "--no-password",
            "-v", "ON_ERROR_STOP=1",
        ]

        logger.info(f"Restoring to database: {db_config['database']}@{db_config['host']}")
        logger.warning("This will overwrite existing data in the database!")

        # Execute psql
        result = subprocess.run(
            psql_cmd,
            input=sql_data,
            capture_output=True,
            env=env,
            timeout=7200,  # 2 hour timeout for large restores
        )

        if result.returncode != 0:
            logger.error(f"psql restore failed: {result.stderr.decode()}")
            return False

        logger.info("Database restore completed successfully")
        return True

    except subprocess.TimeoutExpired:
        logger.error("Database restore timed out after 2 hours")
        return False
    except Exception as e:
        logger.error(f"Restore failed: {e}")
        return False


def list_backups() -> List[Tuple[Path, datetime, int]]:
    """
    List all available backups.

    Returns:
        List of tuples (path, timestamp, size_bytes) sorted by date (newest first)
    """
    backup_dir = ensure_backup_dir()
    backups = []

    for file in backup_dir.glob(f"{BACKUP_PREFIX}*{BACKUP_SUFFIX}"):
        try:
            # Extract timestamp from filename
            timestamp_str = file.name[len(BACKUP_PREFIX):-len(BACKUP_SUFFIX)]
            timestamp = datetime.strptime(timestamp_str, "%Y%m%d_%H%M%S")
            size = file.stat().st_size
            backups.append((file, timestamp, size))
        except (ValueError, OSError) as e:
            logger.warning(f"Skipping invalid backup file {file.name}: {e}")

    # Sort by timestamp, newest first
    backups.sort(key=lambda x: x[1], reverse=True)
    return backups


def cleanup_old_backups(days: int = BACKUP_RETENTION_DAYS) -> int:
    """
    Remove backups older than specified days.

    Args:
        days: Number of days to retain backups (default from BACKUP_RETENTION env var)

    Returns:
        Number of backups removed
    """
    logger.info(f"Cleaning up backups older than {days} days...")

    cutoff_date = datetime.now() - timedelta(days=days)
    backups = list_backups()
    removed = 0

    for backup_path, timestamp, size in backups:
        if timestamp < cutoff_date:
            try:
                backup_path.unlink()
                logger.info(f"Removed old backup: {backup_path.name} ({timestamp.isoformat()})")
                removed += 1
            except OSError as e:
                logger.error(f"Failed to remove {backup_path.name}: {e}")

    logger.info(f"Cleanup complete. Removed {removed} old backup(s)")
    return removed


def verify_backup(backup_file: str) -> bool:
    """
    Verify backup integrity by decrypting and checking structure.

    Args:
        backup_file: Path to the encrypted backup file

    Returns:
        True if backup is valid, False otherwise
    """
    logger.info(f"Verifying backup: {backup_file}")

    backup_path = Path(backup_file)
    if not backup_path.exists():
        # Try looking in backup directory
        backup_path = ensure_backup_dir() / backup_file
        if not backup_path.exists():
            logger.error(f"Backup file not found: {backup_file}")
            return False

    try:
        # Get encryption key
        encryption_key = get_encryption_key()
        fernet = Fernet(encryption_key)

        # Read and decrypt
        logger.info("Reading and decrypting backup...")
        encrypted_data = backup_path.read_bytes()

        try:
            compressed_data = fernet.decrypt(encrypted_data)
        except InvalidToken:
            logger.error("Verification failed: Invalid encryption key or corrupted file")
            return False

        # Decompress
        logger.info("Decompressing backup...")
        try:
            sql_data = gzip.decompress(compressed_data)
        except gzip.BadGzipFile:
            logger.error("Verification failed: Invalid gzip data")
            return False

        # Basic SQL structure validation
        sql_text = sql_data.decode("utf-8", errors="replace")

        # Check for PostgreSQL dump markers
        has_pg_dump_header = "-- PostgreSQL database dump" in sql_text or "pg_dump" in sql_text.lower()
        has_sql_commands = any(cmd in sql_text.upper() for cmd in ["CREATE", "INSERT", "ALTER", "SET"])

        if not (has_pg_dump_header or has_sql_commands):
            logger.warning("Backup may not contain valid PostgreSQL dump data")

        # Report statistics
        logger.info(f"Backup verification successful:")
        logger.info(f"  - Encrypted size: {len(encrypted_data):,} bytes")
        logger.info(f"  - Compressed size: {len(compressed_data):,} bytes")
        logger.info(f"  - Uncompressed size: {len(sql_data):,} bytes")
        logger.info(f"  - SQL content length: {len(sql_text):,} characters")

        return True

    except Exception as e:
        logger.error(f"Verification failed: {e}")
        return False


def print_usage():
    """Print usage information."""
    print(__doc__)


def format_size(size_bytes: int) -> str:
    """Format byte size to human readable format."""
    for unit in ["B", "KB", "MB", "GB"]:
        if size_bytes < 1024:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.2f} TB"


def main():
    """Main entry point for CLI."""
    if len(sys.argv) < 2:
        print_usage()
        sys.exit(1)

    command = sys.argv[1].lower()

    if command == "backup":
        result = backup()
        if result:
            print(f"Backup created: {result}")
            # Run cleanup after successful backup
            cleanup_old_backups()
            sys.exit(0)
        else:
            print("Backup failed. Check logs for details.")
            sys.exit(1)

    elif command == "restore":
        if len(sys.argv) < 3:
            print("Error: Please specify backup file to restore")
            print("Usage: python backup.py restore <backup_file>")
            sys.exit(1)

        # Confirmation prompt
        backup_file = sys.argv[2]
        print(f"WARNING: This will restore the database from: {backup_file}")
        print("This operation will overwrite existing data.")
        response = input("Are you sure you want to continue? (yes/no): ")

        if response.lower() != "yes":
            print("Restore cancelled.")
            sys.exit(0)

        if restore(backup_file):
            print("Restore completed successfully.")
            sys.exit(0)
        else:
            print("Restore failed. Check logs for details.")
            sys.exit(1)

    elif command == "list":
        backups = list_backups()
        if not backups:
            print("No backups found.")
            sys.exit(0)

        print(f"\nAvailable backups ({len(backups)} total):")
        print("-" * 70)
        print(f"{'Filename':<45} {'Date':<20} {'Size':>10}")
        print("-" * 70)

        for backup_path, timestamp, size in backups:
            print(f"{backup_path.name:<45} {timestamp.strftime('%Y-%m-%d %H:%M:%S'):<20} {format_size(size):>10}")

        print("-" * 70)
        total_size = sum(size for _, _, size in backups)
        print(f"Total size: {format_size(total_size)}")
        sys.exit(0)

    elif command == "cleanup":
        days = BACKUP_RETENTION_DAYS
        if len(sys.argv) >= 3:
            try:
                days = int(sys.argv[2])
            except ValueError:
                print(f"Error: Invalid number of days: {sys.argv[2]}")
                sys.exit(1)

        removed = cleanup_old_backups(days)
        print(f"Removed {removed} old backup(s)")
        sys.exit(0)

    elif command == "verify":
        if len(sys.argv) < 3:
            print("Error: Please specify backup file to verify")
            print("Usage: python backup.py verify <backup_file>")
            sys.exit(1)

        if verify_backup(sys.argv[2]):
            print("Backup verification successful.")
            sys.exit(0)
        else:
            print("Backup verification failed.")
            sys.exit(1)

    elif command in ["--help", "-h", "help"]:
        print_usage()
        sys.exit(0)

    else:
        print(f"Unknown command: {command}")
        print_usage()
        sys.exit(1)


if __name__ == "__main__":
    main()
