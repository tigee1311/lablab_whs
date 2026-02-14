# OpsTwin AI

**AI Control Tower for Autonomous Warehouses**

A real-time digital twin and robot orchestration platform powered by Gemini AI. Simulates multi-robot warehouse operations with autonomous task planning, congestion avoidance, and dynamic rerouting.

## Architecture

```
Browser (React + Canvas) <--WebSocket--> Node.js Backend (Vultr VM) <--> Gemini API
                                              |
                                         SQLite (SoR)
```

## Quick Start

### Prerequisites
- Node.js 20+
- Gemini API key ([Get one here](https://aistudio.google.com/apikey))

### Run Locally

```bash
# Backend
cd backend
cp .env.example .env        # Add your GEMINI_API_KEY
npm install
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

### Run with Docker

```bash
echo "GEMINI_API_KEY=your_key" > .env
docker compose up --build
```

Open http://localhost:3001

## Features

- **2D Digital Twin** — Grid-based warehouse with racks, aisles, packing/charging stations
- **6 Autonomous Robots** — With battery management, pathfinding, collision avoidance
- **Gemini AI Planning** — Every task assignment decided by AI with structured reasoning
- **Real-time WebSocket** — Live updates at 2Hz tick rate
- **KPI Dashboard** — Orders, throughput, utilization, congestion events
- **Congestion Detection** — Automatic rerouting when robots cluster
- **Battery Management** — AI-driven charging decisions and task reassignment
- **Demo Mode** — Batch order generation for showcasing

## Project Structure

```
opstwin-ai/
├── backend/
│   └── src/
│       ├── server.ts              # Express + WS server
│       ├── config/warehouse.ts    # Grid layout, locations, robot config
│       ├── models/
│       │   ├── database.ts        # SQLite schema + init
│       │   └── types.ts           # Shared types
│       ├── routes/api.ts          # REST endpoints
│       ├── services/
│       │   ├── gemini.ts          # Gemini API integration
│       │   ├── simulation.ts      # Core simulation engine
│       │   └── websocket.ts       # WS broadcaster
│       └── utils/pathfinding.ts   # A* pathfinding + congestion detection
├── frontend/
│   └── src/
│       ├── App.tsx                # Main layout
│       ├── components/
│       │   ├── WarehouseCanvas.tsx # 2D canvas rendering
│       │   ├── KPIDashboard.tsx   # Metrics display
│       │   ├── OrderPanel.tsx     # Order creation UI
│       │   └── EventLog.tsx       # AI decision log
│       ├── hooks/useWebSocket.ts  # WS connection hook
│       └── utils/api.ts           # REST client
├── Dockerfile
├── docker-compose.yml
├── DEPLOY.md                      # Vultr deployment guide
├── DEMO_SCRIPT.md                 # Judge demo walkthrough
└── PITCH.md                       # Startup pitch narrative
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/health | Health check |
| GET | /api/state | Full simulation state |
| GET | /api/robots | All robot states |
| GET | /api/orders | All orders |
| POST | /api/orders | Create order |
| GET | /api/metrics | KPI metrics |
| GET | /api/warehouse | Grid layout + locations |
| POST | /api/reset | Reset simulation |
| POST | /api/demo/batch-orders | Create random orders |
| GET | /api/gemini-logs | AI decision history |
| WS | /ws | Real-time state updates |

## License

MIT
