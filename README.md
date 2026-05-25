# Expense Tracker CRUD App

Modern full-stack expense tracker built with React, Vite, Tailwind CSS, FastAPI, JWT auth, and MongoDB Atlas.

## Features

- JWT login and registration
- Protected dashboard routes
- Expense CRUD with title, amount, category, date, payment method, notes, and recurrence
- Search, category filters, sorting, pagination
- Monthly summary, category charts, and budget alerts
- CSV and PDF export
- Profile budget management
- Dark and light mode
- Responsive SaaS-style dashboard UI
- Swagger API docs at `/docs`

## Project Structure

```text
backend/
  app/
    api/routes/        FastAPI route modules
    core/              settings and security
    db/                MongoDB connection
    models/            serialization helpers
    schemas/           Pydantic validation schemas
    services/          business logic
    main.py
frontend/
  src/
    api/               Axios client
    components/        reusable UI and layout
    context/           auth and theme providers
    pages/             auth and dashboard screens
    utils/             constants and formatters
```

## Security Note

Do not commit real API keys or database passwords. The MongoDB URI and Groq key shared in chat should be rotated in their provider dashboards because they are now exposed.

## Backend Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Edit `backend/.env`:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.gjhwxy7.mongodb.net/
MONGODB_DB=expense_tracker
JWT_SECRET=use-a-long-random-secret
CORS_ORIGINS=http://localhost:5173
```

Run the API:

```bash
uvicorn app.main:app --reload
```

API docs:

```text
http://localhost:8000/docs
```

## Frontend Setup

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Edit `frontend/.env` if needed:

```env
VITE_API_URL=http://localhost:8000
```

Open:

```text
http://localhost:5173
```

## Required API Endpoints

- `POST /register`
- `POST /login`
- `GET /profile`
- `PUT /profile`
- `GET /expenses`
- `POST /expenses`
- `PUT /expenses/{id}`
- `DELETE /expenses/{id}`
- `GET /expenses/summary/monthly?month=YYYY-MM`
- `GET /expenses/export/csv`
- `GET /expenses/export/pdf`

## MongoDB Atlas Setup

1. Create a MongoDB Atlas cluster.
2. Create a database user with a strong password.
3. Add your IP address or hosting provider egress IPs to Network Access.
4. Copy the SRV connection string into `backend/.env`.
5. Keep the database name in `MONGODB_DB`.

The API creates indexes for users and expenses on startup.

## Deploy Backend on Render

1. Push this repo to GitHub.
2. In Render, choose **New > Blueprint** and select this repository.
3. Render will read `render.yaml` and create `expense-tracker-api`.
4. Add secret environment variables:
   - `MONGODB_URI`
   - `CORS_ORIGINS`
   - `GROQ_API_KEY`
5. After the frontend is deployed, set `CORS_ORIGINS` to your Vercel URL, for example `https://your-app.vercel.app`.

## Deploy Frontend on Vercel

1. Import the repo in Vercel.
2. Root directory: `frontend`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add `VITE_API_URL=https://your-render-api.onrender.com`
6. Redeploy after the backend URL is known.
