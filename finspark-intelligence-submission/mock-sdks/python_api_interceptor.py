import json
import hashlib
import requests
import time
import uuid

# -------------------------------------------------------------------------
# FinSpark Intelligence - Python API Interceptor (Mock)
# 
# Demonstrates how a backend service (e.g. Django/FastAPI) can track 
# features via the FinSpark batch ingestion API.
# -------------------------------------------------------------------------

FINSPARK_API_URL = "http://localhost:4000/api/events/batch"
TENANT_ID = "tenant_b"

def mask_user_id(raw_user_id: str) -> str:
    """One-way hash to protect PII before it leaves the internal network."""
    return hashlib.sha256(raw_user_id.encode('utf-8')).hexdigest()[:16]

class FinSparkInterceptor:
    def __init__(self):
        self.batch_queue = []

    def track(self, feature_id: str, raw_user_id: str, session_id: str = None, outcome: str = "invoked"):
        event = {
            "eventId": str(uuid.uuid4()),
            "tenantId": TENANT_ID,
            "featureId": feature_id,
            "channel": "api", # Designates this came from a backend API
            "userId": mask_user_id(raw_user_id),
            "sessionId": session_id,
            "outcome": outcome,
            "timestamp": time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime()),
            "meta": json.dumps({"source": "python_interceptor", "version": "1.0"})
        }
        self.batch_queue.append(event)
        
        # Flush if batch gets large
        if len(self.batch_queue) >= 50:
            self.flush()

    def flush(self):
        if not self.batch_queue:
            return
            
        print(f"Flushing {len(self.batch_queue)} events to FinSpark...")
        try:
            payload = {"events": self.batch_queue}
            response = requests.post(FINSPARK_API_URL, json=payload, timeout=5)
            if response.status_code == 200:
                print("Successfully ingested.")
                self.batch_queue = []
            else:
                print(f"Failed to ingest: {response.text}")
        except Exception as e:
            print(f"Network error syncing with FinSpark: {e}")

# --- Example Usage ---
if __name__ == "__main__":
    tracker = FinSparkInterceptor()
    
    print("Intercepting backend API calls...")
    tracker.track("loan-origination.credit-check", "user_9942@bank.com", outcome="completed")
    tracker.track("loan-origination.approval", "user_9942@bank.com", outcome="invoked")
    
    tracker.flush()
