import requests
import json

# Backend URL
BASE_URL = "http://127.0.0.1:8000/api"

print("=" * 60)
print("JOBSHIELD BACKEND INTEGRATION TEST")
print("=" * 60)

# Test 1: Analyze Message (Job Post)
print("\n[TEST 1] Testing /api/analyze-message endpoint...")
try:
    response = requests.post(
        f"{BASE_URL}/analyze-message",
        json={
            "message_text": "Congratulations! You won a job! Pay KES 1000 registration fee. Contact us on WhatsApp immediately!"
        },
        headers={"Content-Type": "application/json"}
    )
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"[SUCCESS]")
        print(f"   Risk Level: {data.get('risk_level')}")
        print(f"   Risk Score: {data.get('risk_score')}/100")
        print(f"   Detected Patterns: {', '.join(data.get('detected_patterns', []))}")
    else:
        print(f"[FAILED]: {response.text}")
except Exception as e:
    print(f"[ERROR]: {str(e)}")

# Test 2: Analyze Link
print("\n[TEST 2] Testing /api/analyze-link endpoint...")
try:
    response = requests.post(
        f"{BASE_URL}/analyze-link",
        json={"url": "http://example.com"},
        headers={"Content-Type": "application/json"}
    )
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"[SUCCESS]")
        print(f"   Risk Level: {data.get('risk_level')}")
        print(f"   Risk Score: {data.get('risk_score')}/100")
        print(f"   Detected Patterns: {', '.join(data.get('detected_patterns', []))}")
    else:
        print(f"[FAILED]: {response.text}")
except Exception as e:
    print(f"[ERROR]: {str(e)}")

# Test 3: Analyze Email
print("\n[TEST 3] Testing /api/analyze-email endpoint...")
try:
    response = requests.post(
        f"{BASE_URL}/analyze-email",
        json={
            "email_text": "Dear candidate, please pay KES 1500 to secure your spot. Act now!",
            "sender_email": "hr.company@gmail.com"
        },
        headers={"Content-Type": "application/json"}
    )
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"[SUCCESS]")
        print(f"   Risk Level: {data.get('risk_level')}")
        print(f"   Risk Score: {data.get('risk_score')}/100")
        print(f"   Detected Patterns: {', '.join(data.get('detected_patterns', []))}")
    else:
        print(f"[FAILED]: {response.text}")
except Exception as e:
    print(f"[ERROR]: {str(e)}")

# Test 4: Test with complex email format
print("\n[TEST 4] Testing with complex email format...")
try:
    response = requests.post(
        f"{BASE_URL}/analyze-email",
        json={
            "email_text": "Test email content",
            "sender_email": "m7x2k9q4.a8n1z3.p0@gov.barotors.me"
        },
        headers={"Content-Type": "application/json"}
    )
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"[SUCCESS] - Complex email format accepted")
        print(f"   Risk Level: {data.get('risk_level')}")
    else:
        print(f"[FAILED]: {response.text}")
except Exception as e:
    print(f"[ERROR]: {str(e)}")

print("\n" + "=" * 60)
print("INTEGRATION TEST COMPLETE")
print("=" * 60)
