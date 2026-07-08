# OnboardIQ

OnboardIQ is a hackathon-ready decision support platform for fintech onboarding teams. It generates 50,000 realistic customer onboarding sessions, detects where applicants abandon the journey, explains likely root causes, recommends product changes, and simulates business impact.

## Stack

- Frontend: React, Tailwind CSS, Recharts, lucide-react
- Backend: FastAPI
- Analytics: pandas, numpy, scikit-learn, plotly-ready data structures
- Database: MySQL schema and loader included; the demo runs from generated parquet cache by default

## Run locally

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

```bash
cd frontend
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

Demo login:

- Email: `admin@onboardiq.io`
- Password: `OnboardIQ@2026`

## Pages

- Dashboard: KPI cards, funnel, drop-off analysis, completion breakdowns, daily trend, PNG/CSV exports
- Journey Explorer: search by `customer_id` and inspect step-by-step abandonment
- Customer Segmentation: compare completion and drop-off by age, income, device, loan type, and employment
- Root Cause Analysis: identifies slow internet, upload friction, OTP timeout, compatibility issues, long journeys, and repeated attempts
- Recommendations: analytics-driven improvement ideas with reasoning and expected lift
- Business Impact Simulator: estimates completion, recovered applications, and revenue increase from product changes
- Insights: executive-ready findings and top model drivers

## MySQL

Create the schema:

```bash
mysql -u root -p < database/schema.sql
```

Load generated data:

```bash
set MYSQL_HOST=localhost
set MYSQL_USER=root
set MYSQL_PASSWORD=your_password
set MYSQL_DATABASE=onboardiq
python database/mysql_loader.py
```

The FastAPI app uses the local generated parquet cache for fast demos. MySQL artifacts are included so the project satisfies a production-style database path without making the hackathon demo depend on a local database service.
