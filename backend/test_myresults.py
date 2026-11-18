import requests

BASE = "http://127.0.0.1:5000/api/v1"

login = requests.post(f"{BASE}/auth/login", json={
    "email": "bevbaruese@gmail.com",
    "password": "OptimalPass2026!"
})

print(f"Login status: {login.status_code}")
if login.status_code == 200:
    data = login.json()
    token = data.get("token")
    print(f"Logged in as: {data.get('user', {}).get('fullName')}")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n=== /results/my-results ===")
    r = requests.get(f"{BASE}/results/my-results", headers=headers)
    print(f"Status: {r.status_code}")
    print(f"Response: {r.json()}")
