# Generate 150 fake rows for `transunion_responses` and save 100 train + 50 test CSVs.
import uuid, random, json
from datetime import datetime, timedelta
from pathlib import Path
import pandas as pd

random.seed(42)

operators = ["MTN", "Vodacom", "Cell C", "Telkom"]
network_types = [ "3G", "4G", "5G"]
country_codes = ["ZAR"]
fraud_signals_pool = [
    "recent_sim_swap",
    "device_change",
    "ip_geovelocity",
    "vpn_detected",
    "number_ported",
    "roaming_high_risk",
    "multiple_failed_otps",
]

def rand_msisdn():
    # South Africa E.164 style without + sign: 27 + 9 digits
    return "27" + "".join(str(random.randint(0,9)) for _ in range(9))

def rand_imei():
    # simple 15-digit IMEI-like number
    return "".join(str(random.randint(0,9)) for _ in range(15))

def rand_timestamp(past_days=365):
    now = datetime.utcnow()
    delta = timedelta(days=random.randint(0, past_days), seconds=random.randint(0, 86400))
    return now - delta

def make_row():
    rid = f"REQ-{str(uuid.uuid4())[:8]}"
    msisdn = rand_msisdn()

    # SIM change block
    sim_change_score = random.randint(0, 100)
    sim_change_detected = sim_change_score > 60 or random.random() < 0.1
    sim_change_date = rand_timestamp(180) if sim_change_detected else None
    sim_change_confidence = min(100, max(0, int(sim_change_score + random.gauss(0, 10))))
    
    # Device change block
    device_change_score = random.randint(0, 100)
    device_change_detected = device_change_score > 55 or random.random() < 0.1
    device_change_date = rand_timestamp(180) if device_change_detected else None
    previous_device_id = rand_imei() if device_change_detected else None
    current_device_id = rand_imei()

    # Network
    network_operator = random.choices(operators, weights=[35, 35, 15, 15], k=1)[0]
    network_type = random.choices(network_types, weights=[15, 55, 30], k=1)[0]
    roaming_status = random.random() < 0.08
    location_country_code = random.choices(
        country_codes, weights=[1], k=1
    )[0]

    # Risk indicators
    velocity_score = random.randint(0, 100)
    fraud_indicators = []
    if sim_change_detected:
        fraud_indicators.append("recent_sim_swap")
    if device_change_detected:
        fraud_indicators.append("device_change")
    if roaming_status and location_country_code != "ZAR":
        fraud_indicators.append("roaming_high_risk")
    if velocity_score > 80:
        fraud_indicators.append("multiple_failed_otps")
    # Add a random extra signal sometimes
    if random.random() < 0.15:
        fraud_indicators.append(random.choice([s for s in fraud_signals_pool if s not in fraud_indicators]))

    # Response metadata
    response_timestamp = rand_timestamp(30)
    api_response_time_ms = random.randint(80, 1200)
    api_status_code = random.choices([200, 429, 500], weights=[93, 4, 3], k=1)[0]

    raw_response = {
        "provider": "transunion",
        "msisdn": msisdn,
        "sim_change": {
            "score": sim_change_score,
            "detected": sim_change_detected,
            "date": sim_change_date.isoformat() if sim_change_date else None,
            "confidence": sim_change_confidence,
        },
        "device_change": {
            "score": device_change_score,
            "detected": device_change_detected,
            "date": device_change_date.isoformat() if device_change_date else None,
            "previous_device_id": previous_device_id,
            "current_device_id": current_device_id,
        },
        "network": {
            "operator": network_operator,
            "type": network_type,
            "roaming": roaming_status,
            "country": location_country_code,
        },
        "metrics": {
            "velocity_score": velocity_score,
            "api_response_time_ms": api_response_time_ms,
            "api_status_code": api_status_code,
        },
        "fraud_indicators": fraud_indicators,
        "response_timestamp": response_timestamp.isoformat(),
        "request_id": rid,
    }

    return {
        "id": str(uuid.uuid4()),
        "request_id": rid,
        "msisdn": msisdn,
        "sim_change_score": sim_change_score,
        "sim_change_detected": sim_change_detected,
        "sim_change_date": sim_change_date,
        "sim_change_confidence": sim_change_confidence,
        "device_change_score": device_change_score,
        "device_change_detected": device_change_detected,
        "device_change_date": device_change_date,
        "previous_device_id": previous_device_id,
        "current_device_id": current_device_id,
        "network_operator": network_operator,
        "network_type": network_type,
        "roaming_status": roaming_status,
        "location_country_code": location_country_code,
        "velocity_score": velocity_score,
        "fraud_indicators": json.dumps(fraud_indicators),  # JSONB as string for CSV
        "response_timestamp": response_timestamp,
        "api_response_time_ms": api_response_time_ms,
        "api_status_code": api_status_code,
        "raw_response": json.dumps(raw_response),  # JSONB as string for CSV
    }

# Build 150 rows
rows = [make_row() for _ in range(150)]
df = pd.DataFrame(rows)

# Split into train 100 and test 50
train_df = df.iloc[:100].reset_index(drop=True)
test_df = df.iloc[100:].reset_index(drop=True)

base_dir = Path(__file__).resolve().parent
target_dir = base_dir / "raw"
target_dir.mkdir(parents=True, exist_ok=True)
train_path = target_dir / "transunion_train.csv"
test_path = target_dir / "transunion_test.csv"
train_df.to_csv(train_path, index=False)
test_df.to_csv(test_path, index=False)

(train_path, test_path)
