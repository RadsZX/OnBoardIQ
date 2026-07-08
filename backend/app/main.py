from __future__ import annotations

from fastapi import Depends, FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from analytics.engine import (
    apply_filters,
    chart_payloads,
    dashboard_metrics,
    executive_insights,
    journey_for_customer,
    root_causes,
    segmentation,
    to_csv,
)
from backend.app.auth import authenticate, create_token, verify_token
from recommendation_engine.engine import generate_recommendations, simulate_impact
from synthetic_data.generator import GenerationConfig, load_or_generate


app = FastAPI(title="OnboardIQ API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA = load_or_generate(GenerationConfig())


class LoginRequest(BaseModel):
    email: str
    password: str


class FilterRequest(BaseModel):
    start_date: str | None = None
    end_date: str | None = None
    loan_type: str | None = "All"
    city: str | None = "All"
    device_type: str | None = "All"
    age_group: str | None = "All"


class SimulationRequest(FilterRequest):
    otp_timeout_seconds: int = 30
    auto_save: bool = False
    document_compression: bool = False
    guided_kyc: bool = False
    fallback_uploader: bool = False
    revenue_per_application: float = 1850


@app.post("/auth/login")
def login(payload: LoginRequest):
    user = authenticate(payload.email, payload.password)
    if not user:
        return Response(status_code=401, content="Invalid credentials")
    return {"token": create_token(user["email"]), "user": user}


@app.get("/auth/me")
def me(user=Depends(verify_token)):
    return user


@app.get("/metadata")
def metadata(user=Depends(verify_token)):
    return {
        "loan_types": ["All"] + sorted(DATA["loan_type"].unique().tolist()),
        "cities": ["All"] + sorted(DATA["city"].unique().tolist()),
        "devices": ["All"] + sorted(DATA["device_type"].unique().tolist()),
        "age_groups": ["All", "18-24", "25-34", "35-44", "45-54", "55+"],
        "date_min": str(DATA["timestamp"].min().date()),
        "date_max": str(DATA["timestamp"].max().date()),
        "sample_customer_ids": DATA["customer_id"].drop_duplicates().head(8).tolist(),
    }


@app.post("/analytics/dashboard")
def dashboard(filters: FilterRequest, user=Depends(verify_token)):
    df = apply_filters(DATA, filters.model_dump())
    return {"kpis": dashboard_metrics(df), "charts": chart_payloads(df)}


@app.get("/journey/{customer_id}")
def journey(customer_id: str, user=Depends(verify_token)):
    return journey_for_customer(DATA, customer_id)


@app.post("/segmentation/{dimension}")
def segments(dimension: str, filters: FilterRequest, user=Depends(verify_token)):
    df = apply_filters(DATA, filters.model_dump())
    return {"dimension": dimension, "segments": segmentation(df, dimension)}


@app.post("/root-causes")
def causes(filters: FilterRequest, user=Depends(verify_token)):
    df = apply_filters(DATA, filters.model_dump())
    return {"causes": root_causes(df)}


@app.post("/recommendations")
def recommendations(filters: FilterRequest, user=Depends(verify_token)):
    df = apply_filters(DATA, filters.model_dump())
    return {"recommendations": generate_recommendations(df)}


@app.post("/simulator")
def simulator(payload: SimulationRequest, user=Depends(verify_token)):
    filters = payload.model_dump()
    df = apply_filters(DATA, filters)
    return simulate_impact(df, filters)


@app.post("/insights")
def insights(filters: FilterRequest, user=Depends(verify_token)):
    df = apply_filters(DATA, filters.model_dump())
    recs = generate_recommendations(df)
    return executive_insights(df, recs)


@app.post("/export/{kind}")
def export(kind: str, filters: FilterRequest, user=Depends(verify_token)):
    df = apply_filters(DATA, filters.model_dump())
    csv = to_csv(df, kind)
    return Response(
        content=csv,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="onboardiq-{kind}.csv"'},
    )
