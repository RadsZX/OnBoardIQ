from __future__ import annotations

import os

import mysql.connector

from synthetic_data.generator import load_or_generate


def load_to_mysql() -> None:
    df = load_or_generate()
    conn = mysql.connector.connect(
        host=os.getenv("MYSQL_HOST", "localhost"),
        user=os.getenv("MYSQL_USER", "root"),
        password=os.getenv("MYSQL_PASSWORD", ""),
        database=os.getenv("MYSQL_DATABASE", "onboardiq"),
    )
    cols = [
        "session_id", "customer_id", "age", "age_group", "gender", "city", "loan_type", "device_type",
        "browser", "network_speed", "income_range", "employment_status", "credit_score", "step_name",
        "timestamp", "date", "time_spent_seconds", "error_code", "completed_step", "final_status",
        "exit_step", "otp_attempts",
    ]
    sql = f"INSERT INTO onboarding_sessions ({','.join(cols)}) VALUES ({','.join(['%s'] * len(cols))})"
    cursor = conn.cursor()
    cursor.executemany(sql, [tuple(row) for row in df[cols].itertuples(index=False, name=None)])
    conn.commit()
    cursor.close()
    conn.close()


if __name__ == "__main__":
    load_to_mysql()
