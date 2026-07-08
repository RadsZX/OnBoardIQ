from __future__ import annotations

import pandas as pd

from analytics.engine import root_causes, session_level


def generate_recommendations(df: pd.DataFrame) -> list[dict]:
    sessions = session_level(df)
    causes = {item["cause"]: item for item in root_causes(df)}
    completed = int(sessions["completed"].sum())
    recommendations = []

    def add(problem, recommendation, impact_pct, priority, reasoning, target):
        recommendations.append({
            "problem": problem,
            "recommendation": recommendation,
            "estimated_impact": f"+{impact_pct:.1f}% completion",
            "estimated_completed_applications": int(len(sessions) * impact_pct / 100),
            "priority": priority,
            "reasoning": reasoning,
            "target_segment": target,
        })

    doc_drop = sessions.loc[~sessions["completed"], "exit_step"].eq("Document Upload").mean() * 100
    if doc_drop > 20:
        add(
            f"{doc_drop:.1f}% of abandoned users exit at Document Upload.",
            "Enable automatic image compression, resumable upload, and pre-upload file validation.",
            min(9.5, doc_drop * 0.27),
            "High",
            "Upload friction is concentrated among slow-network and Android users, so reducing payload size and preserving progress should recover high-intent applicants.",
            "Mobile applicants on slow or average networks",
        )

    if "OTP Timeout" in causes:
        affected = causes["OTP Timeout"]["affected_users"]
        add(
            f"{affected:,} applicants show repeated OTP attempts or timeout behavior.",
            "Extend OTP timeout from 30 to 60 seconds and add one-tap resend with delivery status.",
            3.8,
            "High" if affected > len(sessions) * 0.07 else "Medium",
            "Repeated OTP attempts correlate with lower completion and happen early, so small reliability improvements preserve funnel volume.",
            "OTP Verification",
        )

    older = sessions[(sessions["age"] >= 50) & (sessions["exit_step"].eq("KYC Verification"))].shape[0]
    if older > 250:
        add(
            f"Applicants older than 50 have elevated KYC abandonment.",
            "Introduce guided KYC mode with larger copy, visual camera framing, and assisted retry messaging.",
            2.9,
            "Medium",
            "Older users spend longer in identity checks and are more sensitive to camera permission and face-match errors.",
            "Age 50+ customers",
        )

    self_emp_s = sessions[sessions["employment_status"].eq("Self-employed")]
    salaried_s = sessions[sessions["employment_status"].eq("Salaried")]
    self_emp_time = self_emp_s["total_time_seconds"].mean() if len(self_emp_s) >= 20 else 0
    avg_time = sessions["total_time_seconds"].mean()
    if len(self_emp_s) >= 20 and len(salaried_s) >= 20 and self_emp_time > avg_time * 1.18:
        add(
            "Self-employed applicants take materially longer during income verification.",
            "Offer bank-statement ingestion and clearer income-proof examples for self-employed applicants.",
            2.4,
            "Medium",
            "Income-proof ambiguity creates longer journeys and pushes users into late-stage fatigue.",
            "Self-employed applicants",
        )

    browser_sessions = sessions[sessions["browser"].isin(["Samsung Internet", "Firefox"])]
    all_completion = sessions["completed"].mean()
    if len(browser_sessions) >= 20:
        browser_gap = browser_sessions["completed"].mean()
        if browser_gap < all_completion - 0.025:
            add(
                "Some browsers underperform in camera and document handling steps.",
                "Add browser capability checks and route unsupported flows to a lightweight fallback uploader.",
                1.9,
                "Medium",
                "Compatibility failures are smaller than upload issues but are highly actionable with front-end detection.",
                "Samsung Internet and Firefox",
            )

    # Auto-save: only recommend if long-journey sessions actually complete materially less often
    long_journey = sessions[sessions["total_time_seconds"] >= sessions["total_time_seconds"].quantile(0.75)]
    if len(long_journey) >= 20:
        long_rate = long_journey["completed"].mean() * 100
        overall_rate = sessions["completed"].mean() * 100
        if overall_rate - long_rate >= 5.0:
            add(
                "Long journeys are strongly associated with abandonment.",
                "Turn on auto-save and proactive recovery prompts after 4 minutes of inactivity.",
                3.1,
                "High",
                f"Sessions in the top quartile by duration complete {overall_rate - long_rate:.1f} percentage points less often, suggesting fatigue and accidental exit are material loss drivers.",
                "All incomplete sessions",
            )

    priority_rank = {"High": 3, "Medium": 2, "Low": 1}
    return sorted(recommendations, key=lambda r: (priority_rank[r["priority"]], r["estimated_completed_applications"]), reverse=True)


def simulate_impact(df: pd.DataFrame, assumptions: dict) -> dict:
    sessions = session_level(df)
    base_rate = sessions["completed"].mean() * 100
    uplift = 0.0
    explanation = []

    otp_timeout = int(assumptions.get("otp_timeout_seconds", 30))
    if otp_timeout >= 60:
        uplift += 2.2
        explanation.append("Longer OTP timeout recovers applicants affected by SMS delay.")
    elif otp_timeout >= 45:
        uplift += 1.2
        explanation.append("Moderate OTP timeout extension reduces early retries.")

    if assumptions.get("auto_save", False):
        uplift += 3.1
        explanation.append("Auto-save reduces late-stage restart abandonment.")
    if assumptions.get("document_compression", False):
        uplift += 6.8
        explanation.append("Document compression targets the largest drop-off point.")
    if assumptions.get("guided_kyc", False):
        uplift += 2.4
        explanation.append("Guided KYC improves completion for older and camera-sensitive users.")
    if assumptions.get("fallback_uploader", False):
        uplift += 1.7
        explanation.append("Fallback uploader limits browser compatibility losses.")

    expected_rate = min(92.0, base_rate + uplift)
    extra_completed = int(len(sessions) * (expected_rate - base_rate) / 100)
    revenue_per_application = float(assumptions.get("revenue_per_application", 1850))
    return {
        "current_completion_rate": round(base_rate, 1),
        "expected_completion_rate": round(expected_rate, 1),
        "estimated_increase_completed_applications": extra_completed,
        "estimated_revenue_increase": round(extra_completed * revenue_per_application, 0),
        "uplift_points": round(expected_rate - base_rate, 1),
        "explanation": explanation,
    }
