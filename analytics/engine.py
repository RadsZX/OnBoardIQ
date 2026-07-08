from __future__ import annotations

from io import StringIO

import numpy as np
import pandas as pd

from synthetic_data.generator import FLOW_STEPS

SESSION_CACHE = {}

def apply_filters(df: pd.DataFrame, filters: dict) -> pd.DataFrame:
    # out = df.copy()
    out = df
    if filters.get("start_date"):
        out = out[out["timestamp"] >= pd.to_datetime(filters["start_date"])]
    if filters.get("end_date"):
        out = out[out["timestamp"] <= pd.to_datetime(filters["end_date"]) + pd.Timedelta(days=1)]
    for key, column in [("loan_type", "loan_type"), ("city", "city"), ("device_type", "device_type"), ("age_group", "age_group")]:
        value = filters.get(key)
        if value and value != "All":
            out = out[out[column] == value]
    return out


def session_level(df: pd.DataFrame) -> pd.DataFrame:
    cache_key = id(df)
    if cache_key in SESSION_CACHE:
        return SESSION_CACHE[cache_key]
    if df.empty:
        return pd.DataFrame()
    
     # 3. Sort once
    df_sorted = df.sort_values(["session_id", "timestamp"])

    # 4. FAST first/last extractions (Runs in 0.1 seconds instead of 5 minutes)
    firsts = df_sorted.drop_duplicates("session_id", keep="first").set_index("session_id")
    lasts = df_sorted.drop_duplicates("session_id", keep="last").set_index("session_id")

    sessions = firsts[["customer_id", "age", "age_group", "gender", "city", "loan_type", 
                       "device_type", "browser", "network_speed", "income_range", 
                       "employment_status", "credit_score"]].copy()
    
    sessions["first_seen"] = firsts["timestamp"]
    sessions["last_seen"] = lasts["timestamp"]
    sessions["final_status"] = lasts["final_status"]
    sessions["exit_step"] = lasts["exit_step"]

    # 5. Fast Aggregations (Notice: NO LAMBDAS!)
    aggs = df.groupby("session_id").agg(
        total_time_seconds=("time_spent_seconds", "sum"),
        otp_attempts=("otp_attempts", "max")
    )
    sessions = sessions.join(aggs)

    # 6. Fast Error Counting (This replaces the slow lambda)
    errors = df[df["error_code"] != "NONE"].groupby("session_id").size().rename("errors")
    sessions = sessions.join(errors)
    sessions["errors"] = sessions["errors"].fillna(0).astype(int)

    sessions["completed"] = sessions["final_status"] == "Completed"
    sessions = sessions.reset_index()

    # 7. ACTUALLY SAVE TO CACHE! (Your snippet forgot this part)
    SESSION_CACHE[cache_key] = sessions
    
    # Keep cache from eating all your RAM
    if len(SESSION_CACHE) > 25:
        SESSION_CACHE.pop(next(iter(SESSION_CACHE)))
        
    return sessions


def dashboard_metrics(df: pd.DataFrame) -> dict:
    sessions = session_level(df)
    total = len(sessions)
    completed = int(sessions["completed"].sum())
    completion_rate = completed / total if total else 0
    completed_time = sessions.loc[sessions["completed"], "total_time_seconds"]
    avg_time = float(completed_time.mean() / 60) if len(completed_time) else 0
    drop_counts = sessions.loc[~sessions["completed"], "exit_step"].value_counts()
    error_counts = df.loc[df["error_code"] != "NONE", "error_code"].value_counts()
    return {
        "total_sessions": total,
        "completion_rate": round(completion_rate * 100, 1),
        "average_completion_time_minutes": round(avg_time, 1),
        "highest_dropoff_step": drop_counts.index[0] if len(drop_counts) else "None",
        "most_common_error": error_counts.index[0] if len(error_counts) else "None",
        "completed_applications": completed,
    }


def chart_payloads(df: pd.DataFrame) -> dict:
    sessions = session_level(df)
    funnel = []
    for step in FLOW_STEPS:
        reached = int(df[df["step_name"] == step]["session_id"].nunique())
        completed = int(df[(df["step_name"] == step) & (df["completed_step"])]["session_id"].nunique())
        funnel.append({"step": step, "reached": reached, "completed": completed, "dropoff": reached - completed})

    dropoff = sessions.loc[~sessions["completed"], "exit_step"].value_counts().reindex(FLOW_STEPS, fill_value=0)
    by_device = sessions.groupby("device_type")["completed"].mean().mul(100).round(1).reset_index(name="completion_rate")
    by_age = sessions.groupby("age_group")["completed"].mean().mul(100).round(1).reset_index(name="completion_rate")
    by_loan = sessions.groupby("loan_type")["completed"].mean().mul(100).round(1).reset_index(name="completion_rate")
    daily = sessions.assign(date=sessions["first_seen"].dt.date.astype(str)).groupby("date").agg(
        sessions=("session_id", "count"), completion_rate=("completed", lambda s: round(float(s.mean() * 100), 1))
    ).reset_index()
    return {
        "funnel": funnel,
        "dropoff": [{"step": k, "dropoffs": int(v)} for k, v in dropoff.items()],
        "completion_by_device": by_device.to_dict("records"),
        "completion_by_age": by_age.to_dict("records"),
        "completion_by_loan": by_loan.to_dict("records"),
        "daily_trend": daily.to_dict("records"),
    }


def journey_for_customer(df: pd.DataFrame, customer_id: str) -> dict:
    journey = df[df["customer_id"].str.upper() == customer_id.upper()].sort_values("timestamp")
    if journey.empty:
        return {"customer_id": customer_id, "found": False, "steps": []}
    session = journey.iloc[0]
    steps = journey[["step_name", "timestamp", "time_spent_seconds", "error_code", "completed_step"]].copy()
    steps["timestamp"] = steps["timestamp"].astype(str)
    return {
        "found": True,
        "customer_id": customer_id,
        "session_id": session["session_id"],
        "final_status": journey.iloc[-1]["final_status"],
        "dropoff_point": journey.iloc[-1]["exit_step"],
        "profile": {
            "age": int(session["age"]),
            "city": session["city"],
            "loan_type": session["loan_type"],
            "device_type": session["device_type"],
            "network_speed": session["network_speed"],
            "employment_status": session["employment_status"],
        },
        "steps": steps.to_dict("records"),
    }


def segmentation(df: pd.DataFrame, dimension: str) -> list[dict]:
    sessions = session_level(df)
    allowed = {"age_group", "income_range", "device_type", "loan_type", "employment_status"}
    if dimension not in allowed:
        dimension = "age_group"
    grouped = sessions.groupby(dimension).agg(
        users=("session_id", "count"),
        completion_rate=("completed", lambda s: round(float(s.mean() * 100), 1)),
        average_time_minutes=("total_time_seconds", lambda s: round(float(s.mean() / 60), 1)),
    ).reset_index().rename(columns={dimension: "segment"})
    exits = sessions.loc[~sessions["completed"]].groupby(dimension)["exit_step"].agg(lambda s: s.value_counts().index[0]).reset_index()
    grouped = grouped.merge(exits.rename(columns={dimension: "segment", "exit_step": "most_common_exit_point"}), on="segment", how="left")
    grouped["dropoff_rate"] = (100 - grouped["completion_rate"]).round(1)
    grouped["most_common_exit_point"] = grouped["most_common_exit_point"].fillna("None")
    return grouped.sort_values("dropoff_rate", ascending=False).to_dict("records")


def root_causes(df: pd.DataFrame) -> list[dict]:
    sessions = session_level(df)
    base_completed = sessions["completed"].mean()
    cause_defs = [
        ("Slow Internet", sessions["network_speed"].eq("Slow"), "Network friction during OTP, KYC, and upload"),
        ("Large Document Upload", sessions["exit_step"].eq("Document Upload") | sessions["errors"].gt(0) & sessions["device_type"].eq("Android"), "Upload timeout, image size, and mobile file handling"),
        ("OTP Timeout", sessions["otp_attempts"].gt(1), "Repeated OTP attempts and delayed SMS delivery"),
        ("Browser Compatibility", sessions["browser"].isin(["Samsung Internet", "Firefox"]), "Higher failures in camera and file APIs"),
        ("Long Time Spent", sessions["total_time_seconds"].gt(sessions["total_time_seconds"].quantile(0.75)), "Cognitive load and form fatigue"),
        ("Multiple Verification Attempts", sessions["errors"].ge(2), "Repeated validation errors before completion"),
    ]
    causes = []
    for name, mask, why in cause_defs:
        affected = int(mask.sum())
        if affected == 0:
            continue
        completion = sessions.loc[mask, "completed"].mean()
        gap = max(0, base_completed - completion)
        impact = int(affected * gap)
        severity = "High" if impact > len(sessions) * 0.035 else "Medium" if impact > len(sessions) * 0.015 else "Low"
        causes.append({
            "cause": name,
            "affected_users": affected,
            "business_impact": f"~{impact:,} recoverable applications",
            "severity": severity,
            "reasoning": why,
            "completion_rate": round(float(completion * 100), 1),
        })
    return sorted(causes, key=lambda x: ({"High": 3, "Medium": 2, "Low": 1}[x["severity"]], x["affected_users"]), reverse=True)


def model_feature_importance(df: pd.DataFrame) -> list[dict]:
    sessions = session_level(df)
    if sessions.empty:
        return []

    categorical = ["age_group", "city", "loan_type", "device_type", "browser", "network_speed", "income_range", "employment_status", "exit_step"]
    numeric = ["credit_score", "total_time_seconds", "errors", "otp_attempts"]
    baseline = float(sessions["completed"].mean())
    ranked: list[tuple[str, float]] = []

    for feature in categorical:
        grouped = sessions.groupby(feature)["completed"].agg(["mean", "count"])
        grouped = grouped[grouped["count"] >= max(25, len(sessions) * 0.01)]
        if grouped.empty:
            continue
        weighted_gap = ((grouped["mean"] - baseline).abs() * grouped["count"]).sum() / len(sessions)
        ranked.append((feature, float(weighted_gap)))

    for feature in numeric:
        buckets = pd.qcut(sessions[feature].rank(method="first"), q=min(5, len(sessions)), duplicates="drop")
        grouped = sessions.groupby(buckets, observed=True)["completed"].agg(["mean", "count"])
        weighted_gap = ((grouped["mean"] - baseline).abs() * grouped["count"]).sum() / len(sessions)
        ranked.append((feature, float(weighted_gap)))

    ranked.sort(key=lambda item: item[1], reverse=True)
    return [{"feature": feature, "importance": round(score, 4)} for feature, score in ranked[:8]]


def _valid_number(value: float) -> bool:
    return bool(pd.notna(value) and np.isfinite(value) and value > 0)


def _priority(impact_points: float, affected_users: int) -> str:
    if impact_points >= 7 or affected_users >= 2500:
        return "High"
    if impact_points >= 3 or affected_users >= 750:
        return "Medium"
    return "Low"


def _impact_text(impact_points: float, recovered_apps: int, revenue: int) -> str:
    return f"+{impact_points:.1f}% completion, ~{recovered_apps:,} additional applications, ~Rs {revenue:,} revenue"


def action_brief_cards(df: pd.DataFrame, min_sample: int = 20) -> list[dict]:
    sessions = session_level(df)
    if len(sessions) < min_sample:
        return []

    total = len(sessions)
    completed_sessions = sessions[sessions["completed"]]
    abandoned_sessions = sessions[~sessions["completed"]]
    revenue_per_application = 1850
    cards: list[dict] = []

    def add_card(kind, finding, evidence, recommendation, impact_points, affected_users, confidence=0.82):
        if not _valid_number(impact_points) or affected_users < min_sample:
            return
        recovered = int(total * impact_points / 100)
        revenue = int(recovered * revenue_per_application)
        cards.append({
            "kind": kind,
            "finding": finding,
            "evidence": evidence,
            "recommendation": recommendation,
            "expected_impact": _impact_text(impact_points, recovered, revenue),
            "priority": _priority(impact_points, affected_users),
            "confidence": int(round(confidence * 100)),
            "affected_users": int(affected_users),
            "business_impact_score": round(float(impact_points * max(1, affected_users)), 2),
        })

    doc_drop = sessions[sessions["exit_step"].eq("Document Upload")]
    if len(abandoned_sessions) >= min_sample and len(doc_drop) >= min_sample and len(completed_sessions) >= min_sample:
        doc_share = len(doc_drop) / len(abandoned_sessions) * 100
        avg_doc_time = df[df["step_name"].eq("Document Upload")].groupby("session_id")["time_spent_seconds"].sum()
        failed_doc_time = avg_doc_time.reindex(doc_drop["session_id"]).dropna().mean()
        success_doc_time = avg_doc_time.reindex(completed_sessions["session_id"]).dropna().mean()
        slow_android_share = doc_drop[doc_drop["device_type"].eq("Android") | doc_drop["network_speed"].eq("Slow")].shape[0] / len(doc_drop) * 100
        if _valid_number(doc_share) and doc_share >= 15 and _valid_number(failed_doc_time) and _valid_number(success_doc_time):
            time_ratio = failed_doc_time / max(success_doc_time, 1)
            add_card(
                "document_upload",
                f"{doc_share:.1f}% of abandonments happen during Document Upload.",
                f"{slow_android_share:.1f}% of these users are on Android or slow networks, and failed upload journeys take {time_ratio:.1f}x longer than completed journeys.",
                "Enable resumable uploads, automatic image compression, pre-upload validation, and clearer upload progress for mobile users.",
                min(9.5, doc_share * 0.23),
                len(doc_drop),
                0.88,
            )

    slow = sessions[sessions["network_speed"].eq("Slow")]
    fast = sessions[sessions["network_speed"].eq("Fast")]
    if len(slow) >= min_sample and len(fast) >= min_sample:
        slow_rate = slow["completed"].mean() * 100
        fast_rate = fast["completed"].mean() * 100
        gap = fast_rate - slow_rate
        slow_upload_exit = slow["exit_step"].eq("Document Upload").mean() * 100
        if _valid_number(gap) and gap >= 3:
            add_card(
                "slow_network",
                f"Slow-network users complete {gap:.1f} percentage points less often than fast-network users.",
                f"Slow-network completion is {slow_rate:.1f}% versus {fast_rate:.1f}% for fast networks; {slow_upload_exit:.1f}% of slow-network sessions end at Document Upload.",
                "Auto-save progress, compress upload payloads, retry failed uploads in the background, and reduce blocking network calls.",
                min(6.8, gap * 0.35),
                len(slow),
                0.84,
            )

    otp = sessions[sessions["otp_attempts"].gt(1)]
    if len(otp) >= min_sample:
        base_rate = sessions["completed"].mean() * 100
        otp_rate = otp["completed"].mean() * 100
        gap = base_rate - otp_rate
        otp_exit = otp["exit_step"].eq("OTP Verification").mean() * 100
        if _valid_number(gap) and gap >= 2:
            add_card(
                "otp",
                f"Users with repeated OTP attempts complete {gap:.1f} percentage points less often.",
                f"{len(otp):,} sessions show multiple OTP attempts; {otp_exit:.1f}% of them exit during OTP Verification.",
                "Increase OTP validity, add one-tap resend, show SMS delivery status, and offer fallback voice OTP.",
                min(4.5, gap * 0.45),
                len(otp),
                0.80,
            )

    older = sessions[sessions["age"].ge(50)]
    younger = sessions[sessions["age"].lt(50)]
    if len(older) >= min_sample and len(younger) >= min_sample:
        older_kyc = older["exit_step"].eq("KYC Verification").mean() * 100
        younger_kyc = younger["exit_step"].eq("KYC Verification").mean() * 100
        gap = older_kyc - younger_kyc
        if _valid_number(gap) and gap >= 2 and younger_kyc > 0:
            add_card(
                "kyc_age",
                f"Applicants aged 50+ abandon KYC {gap:.1f} percentage points more often.",
                f"KYC abandonment is {older_kyc:.1f}% for age 50+ versus {younger_kyc:.1f}% for younger users.",
                "Add a guided KYC walkthrough with larger text, clearer camera framing, permission prompts, and simplified retry instructions.",
                min(3.8, gap * 0.42),
                len(older),
                0.78,
            )

    android = sessions[sessions["device_type"].eq("Android")]
    desktop = sessions[sessions["device_type"].eq("Desktop")]
    if len(android) >= min_sample and len(desktop) >= min_sample:
        android_rate = android["completed"].mean() * 100
        desktop_rate = desktop["completed"].mean() * 100
        gap = desktop_rate - android_rate
        android_upload = android["exit_step"].eq("Document Upload").mean() * 100
        if _valid_number(gap) and gap >= 3:
            add_card(
                "android",
                f"Android completion is {gap:.1f} percentage points below desktop.",
                f"Android completion is {android_rate:.1f}% versus {desktop_rate:.1f}% on desktop; {android_upload:.1f}% of Android sessions end at Document Upload.",
                "Optimize Android file upload APIs, reduce image size before upload, add offline retry support, and improve browser compatibility handling.",
                min(5.2, gap * 0.30),
                len(android),
                0.81,
            )

    self_emp = sessions[sessions["employment_status"].eq("Self-employed")]
    salaried = sessions[sessions["employment_status"].eq("Salaried")]
    if len(self_emp) >= min_sample and len(salaried) >= min_sample:
        self_time = self_emp["total_time_seconds"].mean()
        salaried_time = salaried["total_time_seconds"].mean()
        time_gap = (self_time / max(salaried_time, 1) - 1) * 100
        income_exit = self_emp["exit_step"].eq("Income Details").mean() * 100
        if _valid_number(time_gap) and time_gap >= 15:
            add_card(
                "income_details",
                f"Self-employed applicants spend {time_gap:.1f}% longer in the onboarding journey.",
                f"{income_exit:.1f}% of self-employed sessions exit at Income Details, indicating income-proof friction.",
                "Offer bank-statement ingestion, clearer income-proof examples, and a simplified self-employed verification flow.",
                min(3.5, time_gap * 0.08),
                len(self_emp),
                0.76,
            )

    priority_rank = {"High": 3, "Medium": 2, "Low": 1}
    cards.sort(key=lambda card: (card["business_impact_score"], card["affected_users"], priority_rank[card["priority"]]), reverse=True)
    return cards[:5]


def executive_insights(df: pd.DataFrame, recs: list[dict]) -> dict:
    sessions = session_level(df)
    MIN_N = 20  # minimum sessions in each comparison group for an insight to be valid
    top: list[str] = []

    # Insight 1: Document Upload share of abandonments — only if >= 10%
    abandoned = sessions.loc[~sessions["completed"]]
    if len(abandoned) >= MIN_N:
        doc_pct = float(abandoned["exit_step"].eq("Document Upload").mean() * 100)
        if doc_pct >= 10.0:
            top.append(f"Document Upload contributes {doc_pct:.1f}% of all abandonments.")

    # Insight 2: Android vs Desktop completion gap — only if gap >= 2 pp and both groups present
    android_s = sessions[sessions["device_type"].eq("Android")]
    desktop_s = sessions[sessions["device_type"].eq("Desktop")]
    if len(android_s) >= MIN_N and len(desktop_s) >= MIN_N:
        gap = desktop_s["completed"].mean() * 100 - android_s["completed"].mean() * 100
        if gap >= 2.0:
            top.append(
                f"Android completion is {gap:.1f} percentage points below desktop "
                f"({android_s['completed'].mean() * 100:.1f}% vs {desktop_s['completed'].mean() * 100:.1f}%)."
            )

    # Insight 3: Self-employed vs salaried time — only if gap >= 15% and both groups present
    self_emp_s = sessions[sessions["employment_status"].eq("Self-employed")]
    salaried_s = sessions[sessions["employment_status"].eq("Salaried")]
    if len(self_emp_s) >= MIN_N and len(salaried_s) >= MIN_N:
        self_time = float(self_emp_s["total_time_seconds"].mean())
        sal_time = float(salaried_s["total_time_seconds"].mean())
        if sal_time > 0:
            pct_longer = (self_time / sal_time - 1) * 100
            if pct_longer >= 15.0:
                top.append(
                    f"Self-employed applicants spend {pct_longer:.1f}% longer in the journey than salaried applicants."
                )

    # Insight 4: KYC abandonment ratio 50+ vs younger — only if ratio >= 1.5x and both groups present
    older_s = sessions[sessions["age"].ge(50)]
    younger_s = sessions[sessions["age"].lt(50)]
    if len(older_s) >= MIN_N and len(younger_s) >= MIN_N:
        older_kyc_rate = float(older_s["exit_step"].eq("KYC Verification").mean())
        younger_kyc_rate = float(younger_s["exit_step"].eq("KYC Verification").mean())
        if younger_kyc_rate > 0.01:
            ratio = older_kyc_rate / younger_kyc_rate
            if ratio >= 1.5:
                top.append(
                    f"Users older than 50 abandon KYC {ratio:.1f}x as often as younger users "
                    f"({older_kyc_rate * 100:.1f}% vs {younger_kyc_rate * 100:.1f}%)."
                )
        elif older_kyc_rate >= 0.05:
            # Both groups exist but younger_kyc_rate is negligible — report absolute rate
            top.append(
                f"Users older than 50 have elevated KYC abandonment at {older_kyc_rate * 100:.1f}%."
            )

    # Insight 5: Slow vs fast network completion gap — only if gap >= 3 pp and both groups present
    slow_s = sessions[sessions["network_speed"].eq("Slow")]
    fast_s = sessions[sessions["network_speed"].eq("Fast")]
    if len(slow_s) >= MIN_N and len(fast_s) >= MIN_N:
        slow_rate = float(slow_s["completed"].mean() * 100)
        fast_rate = float(fast_s["completed"].mean() * 100)
        gap = fast_rate - slow_rate
        if gap >= 3.0:
            top.append(
                f"Slow-network users complete at {slow_rate:.1f}% versus {fast_rate:.1f}% on fast networks "
                f"— a clear mobile resilience opportunity."
            )

    return {
        "top_findings": top,
        "top_recommendations": recs[:5],
        "action_cards": action_brief_cards(df),
        "model_drivers": model_feature_importance(df),
    }


def to_csv(df: pd.DataFrame, kind: str) -> str:
    if kind == "sessions":
        export_df = session_level(df)
    elif kind == "root_causes":
        export_df = pd.DataFrame(root_causes(df))
    else:
        export_df = pd.DataFrame(chart_payloads(df).get(kind, []))
    buf = StringIO()
    export_df.to_csv(buf, index=False)
    return buf.getvalue()
