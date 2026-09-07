# Setu: AI-Augmented Societal Problem-Solving Ecosystem

This is the working prototype for SIH PS26043 (Government of Jharkhand).

## Running the Prototype Locally

You need two terminal windows.

### 1. Start the Backend (FastAPI + SQLite)

```bash
cd /Users/mishti./.gemini/antigravity/scratch/setu/backend

# Create a virtual environment and install dependencies
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run the server (auto-seeds the database on first run)
uvicorn main:app --reload --port 8000
```
*Note: The first time it runs, it will download the sentence-transformer model (~120MB) and generate embeddings for 130 mock profiles and 50 problems. This takes about 30-60 seconds.*

### 2. Start the Frontend (React + Vite)

```bash
cd /Users/mishti./.gemini/antigravity/scratch/setu/frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open `http://localhost:5173` in your browser.

## Demo Credentials (Pre-Seeded)

The login page contains one-click buttons to log in as these personas, or you can use:

| Role | Email | Password |
|---|---|---|
| **Problem Owner** | `suresh.kumar@gov.jh.in` | `demo123` |
| **Faculty** | `priya.singh@bitmesra.ac.in` | `demo123` |
| **Student** | `rahul.sharma@bitmesra.ac.in` | `demo123` |
| **Gov Admin** | `secretary@education.jh.gov.in` | `demo123` |

## Demo Script

1. **Gov Admin View:** Log in as Gov Admin. Go to the **Gov. Dashboard** to see the high-level metrics of the state.
2. **Problem Articulation:** Log in as Problem Owner. Click **Post Challenge**. Use the AI Wizard to generate a structured challenge. Review and publish.
3. **Semantic Matching:** Log in as Faculty. Go to **My Matches**. See how the newly posted problem (or existing ones) is semantically matched to the faculty's expertise.
4. **Team Formation:** As the Faculty, click the problem and click **Express Interest**.
5. **Project Creation:** Log back in as Problem Owner. View the problem details, accept the interest request.
6. **Lifecycle Tracking:** Go to **Projects**. View the newly created project. Add a milestone. Advance the stage.
7. **Outcome Verification:** Advance the project to the "Deployment" stage. As the Problem Owner, you will now see the "Verify Outcome" panel. Submit evidence to mark the project as Verified.
# sih2026prototype
