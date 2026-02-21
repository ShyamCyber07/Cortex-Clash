
import urllib.request
import urllib.error
import time

urls = [
    "https://cortex-clash.onrender.com/",
    "https://cortex-clash.onrender.com/api/v1/health"
]

print("Starting connectivity check...")

for url in urls:
    try:
        print(f"Checking {url}...")
        with urllib.request.urlopen(url, timeout=60) as response:
            print(f"URL: {url}")
            print(f"Status: {response.status}")
            print(f"Headers: {response.info()}")
            print(f"Body Preview: {response.read().decode('utf-8')[:200]}")
    except urllib.error.HTTPError as e:
        print(f"HTTP Error checking {url}: {e.code} {e.reason}")
    except urllib.error.URLError as e:
        print(f"URL Error checking {url}: {e.reason}")
    except Exception as e:
        print(f"Generic Error checking {url}: {e}")
