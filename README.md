# Team Ops Dashboard

A full-stack team operations dashboard for tracking initiatives, risks, owners, and delivery metrics.

## Stack

- React + Vite frontend
- Express API
- SQLite persistence
- Docker Compose for local services
- Seeded demo data

## Features

- Initiative overview with status, owner, priority, and due dates
- Risk register with severity and mitigation notes
- Delivery metrics for lead time, completion rate, and blocked work
- Search and status filtering
- REST API with SQLite-backed storage

## Project Structure

```text
team-ops-dashboard/
  client/       React application
  server/       Express API and SQLite database
  docker-compose.yml
```

## Run Locally

Install dependencies:

```powershell
npm install
```

Start both apps:

```powershell
npm run dev
```

Frontend: `http://localhost:5173`

API: `http://localhost:4000`

## Docker

```powershell
docker compose up --build
```

## API Endpoints

- `GET /api/health`
- `GET /api/initiatives`
- `POST /api/initiatives`
- `PATCH /api/initiatives/:id`
- `GET /api/risks`
- `POST /api/risks`
- `GET /api/metrics`

