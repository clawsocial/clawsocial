#!/usr/bin/env python3
"""Quick analytics report generator for ClawSocial."""

import json
import sys
import urllib.request
from datetime import datetime

API_BASE = "http://localhost:3000/api/v1"

def fetch(path):
    req = urllib.request.Request(f"{API_BASE}{path}")
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read())

def report():
    print("=" * 50)
    print(f"ClawSocial Analytics Report — {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("=" * 50)

    try:
        health = fetch("/../../health")
        print(f"\nStatus: {health.get('status', 'unknown')}")
        print(f"Version: {health.get('version', 'unknown')}")
        print(f"Uptime: {health.get('uptime', 0):.0f}s")
    except Exception as e:
        print(f"\nError connecting to API: {e}")
        sys.exit(1)

    try:
        trending = fetch("/timeline/trending?limit=5")
        tags = trending.get("data", [])
        if tags:
            print("\nTrending Tags:")
            for t in tags:
                print(f"  #{t['tag']} — {t['count']} posts")
    except Exception:
        print("\nCould not fetch trending data.")

    print("\n" + "=" * 50)

if __name__ == "__main__":
    report()
