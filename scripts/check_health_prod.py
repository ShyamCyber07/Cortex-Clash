
import requests
import sys

urls = [
    "https://cortex-clash.onrender.com/",
    "https://cortex-clash.onrender.com/api/v1/health"
]

print("Starting connectivity check...")

for url in urls:
    try:
        print(f"Checking {url}...")
        resp = requests.get(url, timeout=60) # High timeout for Rent cold start
        print(f"URL: {url}")
        print(f"Status: {resp.status_code}")
        print(f"Headers: {resp.headers}")
        print(f"Body Preview: {resp.text[:200]}")
    except Exception as e:
        print(f"Failed to connect to {url}: {e}")
