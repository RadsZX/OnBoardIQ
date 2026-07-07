from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import math

import numpy as np
import pandas as pd


FLOW_STEPS = [
    "Login",
    "Mobile Verification",
    "OTP Verification",
    "PAN Verification",
    "KYC Verification",
    "Income Details",
    "Document Upload",
    "Review",
    "Submit Application",
]

CITIES = ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai", "Pune", "Kolkata", "Ahmedabad", "Jaipur", "Lucknow"]
LOAN_TYPES = ["Personal Loan", "Home Loan", "Auto Loan", "Education Loan", "Business Loan"]
DEVICES = ["Android", "iOS", "Desktop", "Tablet"]
BROWSERS = ["Chrome", "Safari", "Edge", "Firefox", "Samsung Internet"]
NETWORKS = ["Slow", "Average", "Fast"]
INCOME_RANGES = ["<3L", "3L-6L", "6L-12L", "12L-25L", "25L+"]
EMPLOYMENT = ["Salaried", "Self-employed", "Gig Worker", "Student", "Retired"]
GENDERS = ["Female", "Male", "Non-binary"]


@dataclass
class GenerationConfig:
    sessions: int = 50000
    seed: int = 42
    cache_path: str = "backend/data/onboarding_sessions_v3.parquet"


def age_group(age: int) -> str:
    if age < 25:
        return "18-24"
    if age < 35:
        return "25-34"
    if age < 45:
        return "35-44"
    if age < 55:
        return "45-54"
    return "55+"


def _choice(rng: np.random.Generator, values: list[str], probs: list[float]) -> str:
    return str(rng.choice(values, p=np.array(probs) / np.sum(probs)))


def _base_customer(rng: np.random.Generator, idx: int) -> dict:
    age = int(np.clip(rng.normal(36, 11), 18, 72))
    employment = _choice(rng, EMPLOYMENT, [0.54, 0.24, 0.09, 0.06, 0.07])
    income_probs = {
        "Salaried": [0.12, 0.36, 0.32, 0.16, 0.04],
        "Self-employed": [0.18, 0.30, 0.25, 0.19, 0.08],
        "Gig Worker": [0.35, 0.42, 0.17, 0.05, 0.01],
        "Student": [0.68, 0.24, 0.07, 0.01, 0.0],
        "Retired": [0.28, 0.40, 0.22, 0.08, 0.02],
    }[employment]
    income = _choice(rng, INCOME_RANGES, income_probs)
    device = _choice(rng, DEVICES, [0.53, 0.25, 0.18, 0.04])
    browser_probs = [0.62, 0.18, 0.08, 0.07, 0.05] if device != "iOS" else [0.28, 0.62, 0.02, 0.03, 0.05]
    network = _choice(rng, NETWORKS, [0.22, 0.48, 0.30])
    score_mu = {"<3L": 625, "3L-6L": 665, "6L-12L": 705, "12L-25L": 735, "25L+": 765}[income]
    return {
        "customer_id": f"CUST-{idx:06d}",
        "age": age,
        "age_group": age_group(age),
        "gender": _choice(rng, GENDERS, [0.47, 0.51, 0.02]),
        "city": _choice(rng, CITIES, [0.18, 0.15, 0.14, 0.11, 0.10, 0.09, 0.08, 0.06, 0.05, 0.04]),
        "loan_type": _choice(rng, LOAN_TYPES, [0.36, 0.18, 0.20, 0.12, 0.14]),
        "device_type": device,
        "browser": _choice(rng, BROWSERS, browser_probs),
        "network_speed": network,
        "income_range": income,
        "employment_status": employment,
        "credit_score": int(np.clip(rng.normal(score_mu, 48), 480, 850)),
    }


def _drop_probability(step: str, c: dict, attempts: int) -> float:
    base = {
        "Login": 0.015,
        "Mobile Verification": 0.035,
        "OTP Verification": 0.065,
        "PAN Verification": 0.050,
        "KYC Verification": 0.090,
        "Income Details": 0.095,
        "Document Upload": 0.185,
        "Review": 0.045,
        "Submit Application": 0.0,
    }[step]
    if step == "OTP Verification" and attempts > 1:
        base += 0.08
    if step == "KYC Verification" and c["age"] >= 50:
        base += 0.09
    if step == "Document Upload" and c["network_speed"] == "Slow":
        base += 0.15
    if step == "Document Upload" and c["device_type"] == "Android":
        base += 0.055
    if step == "Income Details" and c["employment_status"] == "Self-employed":
        base += 0.07
    if step == "PAN Verification" and c["credit_score"] < 620:
        base += 0.04
    if c["browser"] in {"Samsung Internet", "Firefox"} and step in {"Document Upload", "KYC Verification"}:
        base += 0.035
    return min(base, 0.72)


def _error_for_step(rng: np.random.Generator, step: str, c: dict, dropped: bool, attempts: int) -> str:
    if step == "OTP Verification" and (attempts > 1 or rng.random() < 0.055):
        return _choice(rng, ["OTP_TIMEOUT", "OTP_MISMATCH", "SMS_DELAY"], [0.52, 0.28, 0.20])
    if step == "KYC Verification" and (dropped or rng.random() < 0.045):
        return _choice(rng, ["KYC_FACE_MATCH_LOW", "KYC_CAMERA_PERMISSION", "KYC_RETRY_LIMIT"], [0.45, 0.35, 0.20])
    if step == "Document Upload" and (dropped or rng.random() < 0.075):
        if c["network_speed"] == "Slow":
            return _choice(rng, ["UPLOAD_TIMEOUT", "FILE_TOO_LARGE", "NETWORK_INTERRUPTED"], [0.48, 0.26, 0.26])
        return _choice(rng, ["FILE_TOO_LARGE", "UNSUPPORTED_FORMAT", "BLURRY_IMAGE"], [0.44, 0.24, 0.32])
    if step == "PAN Verification" and rng.random() < 0.025:
        return "PAN_NAME_MISMATCH"
    if step == "Income Details" and c["employment_status"] == "Self-employed" and rng.random() < 0.05:
        return "INCOME_PROOF_AMBIGUOUS"
    return "NONE"


def _time_spent(rng: np.random.Generator, step: str, c: dict, error: str, dropped: bool) -> int:
    base = {
        "Login": 22,
        "Mobile Verification": 38,
        "OTP Verification": 55,
        "PAN Verification": 70,
        "KYC Verification": 140,
        "Income Details": 155,
        "Document Upload": 210,
        "Review": 85,
        "Submit Application": 35,
    }[step]
    multiplier = 1.0
    if c["network_speed"] == "Slow" and step in {"OTP Verification", "KYC Verification", "Document Upload"}:
        multiplier += 0.45
    if c["age"] >= 50 and step in {"KYC Verification", "Document Upload"}:
        multiplier += 0.28
    if c["employment_status"] == "Self-employed" and step == "Income Details":
        multiplier += 0.40
    if error != "NONE":
        multiplier += 0.35
    if dropped:
        multiplier += 0.25
    return int(max(8, rng.lognormal(math.log(base * multiplier), 0.28)))


def generate_onboarding_data(config: GenerationConfig = GenerationConfig()) -> pd.DataFrame:
    rng = np.random.default_rng(config.seed)
    rows: list[dict] = []
    start = pd.Timestamp.today().normalize() - pd.Timedelta(days=89)

    for i in range(1, config.sessions + 1):
        customer = _base_customer(rng, i)
        session_id = f"SES-{i:07d}"
        timestamp = start + pd.Timedelta(minutes=int(rng.integers(0, 90 * 24 * 60)))
        final_status = "Completed"
        exit_step = "Submit Application"
        otp_attempts = 1 + int(rng.random() < 0.08) + int(rng.random() < 0.015)

        for step in FLOW_STEPS:
            attempts = otp_attempts if step == "OTP Verification" else 1
            dropped = rng.random() < _drop_probability(step, customer, attempts)
            error = _error_for_step(rng, step, customer, dropped, attempts)
            time_spent = _time_spent(rng, step, customer, error, dropped)
            row = {
                "session_id": session_id,
                **customer,
                "step_name": step,
                "timestamp": timestamp,
                "date": timestamp.date().isoformat(),
                "time_spent_seconds": time_spent,
                "error_code": error,
                "completed_step": not dropped,
                "final_status": "Completed",
                "otp_attempts": attempts,
            }
            rows.append(row)
            timestamp += pd.Timedelta(seconds=time_spent + int(rng.integers(4, 35)))
            if dropped and step != "Submit Application":
                final_status = "Abandoned"
                exit_step = step
                rows[-1]["final_status"] = final_status
                rows[-1]["completed_step"] = False
                break

        for row in rows[-len(FLOW_STEPS):]:
            if row["session_id"] == session_id:
                row["final_status"] = final_status
                row["exit_step"] = exit_step

    df = pd.DataFrame(rows)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    return df


def load_or_generate(config: GenerationConfig = GenerationConfig()) -> pd.DataFrame:
    path = Path(config.cache_path)
    if path.exists():
        return pd.read_parquet(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    df = generate_onboarding_data(config)
    df.to_parquet(path, index=False)
    return df
