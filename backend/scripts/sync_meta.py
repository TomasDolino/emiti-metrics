#!/usr/bin/env python3
"""
Meta Ads Sync Script v2
Fetches metrics from Meta Ads API and saves to database.
Uses account-level insights with daily breakdown for efficiency.
Designed to run 3 times daily via cron/systemd timer.
"""
import asyncio
import sys
import os
from datetime import datetime
from typing import Optional

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load .env file before importing app modules
from dotenv import load_dotenv
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(env_path)

from sqlalchemy.orm import Session
from app.database import SessionLocal, MetaTokenDB, ClientDB, MetricDB
from app.services.meta_oauth import meta_oauth_service

# Configuration
DAYS_TO_FETCH = 7  # Fetch last 7 days of data
LOG_FILE = "/var/log/emiti-meta-sync.log"


def log(message: str):
    """Log message to file and stdout."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_line = f"[{timestamp}] {message}"
    print(log_line)
    try:
        with open(LOG_FILE, "a") as f:
            f.write(log_line + "\n")
    except Exception as e:
        print(f"Warning: Could not write to log file: {e}")


def extract_results(actions: list) -> int:
    """Extract relevant results from actions list."""
    if not actions:
        return 0

    results = 0
    # Priority actions for results
    result_actions = [
        "onsite_conversion.messaging_conversation_started_7d",
        "onsite_conversion.messaging_first_reply",
        "lead",
        "onsite_conversion.lead",
        "purchase",
        "omni_purchase",
        "omni_app_install",
    ]

    for action in actions:
        action_type = action.get("action_type", "")
        if action_type in result_actions:
            try:
                results += int(float(action.get("value", 0)))
            except:
                pass

    return results


async def sync_client(db: Session, client: ClientDB, token: MetaTokenDB) -> dict:
    """Sync a single client's Meta data using account-level insights."""
    stats = {"client": client.name, "ads": 0, "metrics_added": 0, "metrics_updated": 0, "errors": []}

    try:
        log(f"  Syncing {client.name} (account: {token.ad_account_id})...")

        # Get all insights for the account with daily breakdown by ad
        # This is much more efficient than calling per-ad
        insights_list = await meta_oauth_service.get_account_insights_by_ad(
            token.access_token,
            token.ad_account_id,
            days=DAYS_TO_FETCH
        )

        if not insights_list:
            log(f"  No insights found for {client.name}")
            return stats

        # Track unique ads
        unique_ads = set()

        for insight in insights_list:
            ad_id = insight.get("ad_id", "")
            ad_name = insight.get("ad_name", "")
            if not ad_id:
                continue

            unique_ads.add(ad_id)

            # Parse date
            date_str = insight.get("date_start") or insight.get("date_stop")
            if not date_str:
                continue

            try:
                date = datetime.strptime(date_str, "%Y-%m-%d")
            except:
                continue

            # Extract metrics - Meta returns strings
            try:
                spend = float(insight.get("spend", 0) or 0)
            except:
                spend = 0.0

            try:
                impressions = int(float(insight.get("impressions", 0) or 0))
            except:
                impressions = 0

            try:
                reach = int(float(insight.get("reach", 0) or 0))
            except:
                reach = 0

            try:
                clicks = int(float(insight.get("clicks", 0) or 0))
            except:
                clicks = 0

            # Skip if no meaningful data
            if impressions == 0 and spend == 0:
                continue

            # Extract results from actions
            results = extract_results(insight.get("actions", []))

            # Fallback to clicks if no specific results
            if results == 0:
                results = clicks

            # Calculate derived metrics
            frequency = float(insight.get("frequency", 0) or 0)
            if frequency == 0 and reach > 0:
                frequency = impressions / reach

            ctr = float(insight.get("ctr", 0) or 0)
            if ctr == 0 and impressions > 0:
                ctr = (clicks / impressions) * 100

            cpr = spend / results if results > 0 else 0

            cpm = float(insight.get("cpm", 0) or 0)
            if cpm == 0 and impressions > 0:
                cpm = (spend / impressions) * 1000

            # Check if metric already exists for this ad+date (using ad_id for uniqueness)
            existing = db.query(MetricDB).filter(
                MetricDB.client_id == client.id,
                MetricDB.ad_id == ad_id,
                MetricDB.date == date
            ).first()

            if existing:
                # Update existing
                existing.spend = spend
                existing.impressions = impressions
                existing.reach = reach
                existing.clicks = clicks
                existing.results = results
                existing.frequency = frequency
                existing.ctr = ctr
                existing.cost_per_result = cpr
                existing.cpm = cpm
                existing.campaign_name = insight.get("campaign_name", existing.campaign_name or "")
                existing.ad_set_name = insight.get("adset_name", existing.ad_set_name or "")
                stats["metrics_updated"] += 1
            else:
                # Create new
                metric = MetricDB(
                    client_id=client.id,
                    campaign_name=insight.get("campaign_name", ""),
                    ad_set_name=insight.get("adset_name", ""),
                    ad_name=ad_name,
                    ad_id=ad_id,
                    date=date,
                    spend=spend,
                    impressions=impressions,
                    reach=reach,
                    clicks=clicks,
                    results=results,
                    frequency=frequency,
                    ctr=ctr,
                    cost_per_result=cpr,
                    cpm=cpm
                )
                db.add(metric)
                stats["metrics_added"] += 1

        db.commit()
        stats["ads"] = len(unique_ads)
        total_metrics = stats["metrics_added"] + stats["metrics_updated"]
        log(f"  {client.name}: {total_metrics} metrics ({stats['metrics_added']} new, {stats['metrics_updated']} updated) from {stats['ads']} ads")

    except Exception as e:
        stats["errors"].append(str(e))
        log(f"  ERROR syncing {client.name}: {e}")
        import traceback
        traceback.print_exc()

    return stats


async def main():
    """Main sync function."""
    log("=" * 60)
    log("Starting Meta Ads sync v2 (daily breakdown)...")

    db = SessionLocal()

    try:
        # Get all clients with valid Meta tokens
        tokens = db.query(MetaTokenDB).filter(
            MetaTokenDB.access_token.isnot(None),
            MetaTokenDB.ad_account_id.isnot(None)
        ).all()

        log(f"Found {len(tokens)} clients with Meta connections")

        results = []
        for token in tokens:
            client = db.query(ClientDB).filter(
                ClientDB.id == token.client_id,
                ClientDB.is_active == True
            ).first()

            if not client:
                log(f"  Skipping {token.client_id} - client not found or inactive")
                continue

            result = await sync_client(db, client, token)
            results.append(result)

            # Small delay to avoid rate limits
            await asyncio.sleep(1)

        # Summary
        total_ads = sum(r["ads"] for r in results)
        total_added = sum(r["metrics_added"] for r in results)
        total_updated = sum(r["metrics_updated"] for r in results)
        total_errors = sum(len(r["errors"]) for r in results)

        log("-" * 40)
        log(f"Sync complete!")
        log(f"  Clients synced: {len(results)}")
        log(f"  Total unique ads: {total_ads}")
        log(f"  Metrics added: {total_added}")
        log(f"  Metrics updated: {total_updated}")
        log(f"  Errors: {total_errors}")

        if total_errors > 0:
            log("Errors:")
            for r in results:
                for err in r["errors"]:
                    log(f"  - {r['client']}: {err}")

    except Exception as e:
        log(f"FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()

    log("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
