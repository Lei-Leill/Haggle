# Haggle — AI Negotiation

A ChatGPT-style web interface for AI-powered negotiation: practice deals, review contracts, and get tactical advice. Built for investor demos with **register/login**, **persistent chats**, and **LLM-backed responses**.

## Run locally

### 1. Backend (API + SQLite + optional OpenAI)

```bash
cd server
cp .env.example .env
# Edit .env: set JWT_SECRET and OPENAI_API_KEY (optional; without it you get placeholder replies)
npm install
npm run dev
```

API runs at **http://localhost:3001**.

### 2. Frontend

```bash
# From project root
npm install
npm run dev
```

Open **http://localhost:5173**. Sign up or sign in, then start or open chats.

### Optional: point frontend at another API

Create `.env` in the project root:

```
VITE_API_URL=http://localhost:3001
```

## Features

- **Auth** — Register and login; JWT stored in `localStorage`.
- **Chat persistence** — Chats and messages stored in SQLite; open past chats from the sidebar.
- **LLM** — Optional OpenAI integration; set `OPENAI_API_KEY` in `server/.env` for real negotiation replies (otherwise placeholder text).
- **Model selector** — Header dropdown: Haggle AI 1.0 (gpt-4o-mini) / Haggle AI Pro (gpt-4o).
- **Sidebar** — New chat, search, category filter (All, Deals, Contracts, Practice, Tactics, Negotiation, Projects), and your chats list.
- **User menu** — Click profile icon for account info, Settings, and Log out.

## Build

```bash
npm run build
npm run preview
```

Run the server separately for production (`cd server && npm start`).
