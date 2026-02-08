import urllib.request
import urllib.error
import ssl
import sys

# Ignore verify certificate
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "http://34.72.125.220:3000/share/a9763f57dba68f0b741948759cd0a691?mode=chat"

output = []

def log(msg):
    print(msg)
    output.append(msg)

log(f"Fetching {url}... ({url})")

try:
    with urllib.request.urlopen(url, context=ctx) as response:
        status_code = response.getcode()
        log(f"Status: {status_code}")
        
        headers = response.info()
        log("Headers:")
        for key, value in headers.items():
            log(f"  {key}: {value}")
            
        body = response.read().decode('utf-8')
        log(f"\nBody Length: {len(body)} chars")
        log("\nPreview Context:")
        log(body[:2000] + "...")
        
        # Analyze content hints
        log("\nAnalysis:")
        if "ShareWithChat" in body:
            log("- Found 'ShareWithChat' in body (Likely rendering Chat Interface)")
        elif "SharePreview" in body:
            log("- Found 'SharePreview' in body (Likely rendering Preview Only)")
            
        if "snapshot_code" in body:
             log("- Found 'snapshot_code' in body.")
             
        if "__NEXT_DATA__" in body:
            log("- Found Next.js hydration data.")

except urllib.error.URLError as e:
    log(f"Error: {e}")

with open("/Users/aaa/Documents/study-demo/check_output_direct.txt", "w") as f:
    f.write("\n".join(output))
