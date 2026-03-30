# Athena — Multi-LLM Adversarial Debate & Roleplay

Three LLMs argue, critique each other, revise their positions, then a judge synthesizes the truth. Or watch them act out a scene together.

## Quick Start

### 1. Set up API keys

Copy `.env.example` to `.env` and fill in your keys:
```
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
GOOGLE_API_KEY=...   # or GEMINI_API_KEY
```

### 2. Start the backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python3 main.py
```

Backend runs on http://localhost:8000

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:5173

## Modes

### 🧠 Debate
Three LLM advocates argue a topic across three rounds, then a judge synthesizes.

| Round | What happens |
|-------|-------------|
| Round 0 | All 3 advocates generate initial positions in parallel |
| Round 1 | Each advocate critiques the other two (in parallel) |
| Round 2 | Each advocate revises based on critiques received (in parallel) |
| Verdict | Judge model synthesizes the full transcript |

### 🎭 Roleplay
2-3 LLMs act in character with short, snappy responses. Split-screen with a persistent analysis panel powered by any model.

- `/end` in a response ends the scene organically
- STOP button aborts at any time
- Multiple runs as tabs — compare different outcomes
- Analysis panel persists across runs with full transcript context

## Models Supported (15 total)

**Anthropic** (`ANTHROPIC_API_KEY`): Claude Opus 4.6, Sonnet 4.6, Claude 3.7 Sonnet ✦, Haiku 4.5, Claude 3.5 Sonnet, Claude 3.5 Haiku

**Google** (`GOOGLE_API_KEY` or `GEMINI_API_KEY`): Gemini 2.5 Pro ✦, Gemini 2.5 Flash ✦, Gemini 2.0 Flash, Gemini 1.5 Pro

**OpenAI** (`OPENAI_API_KEY`): O3 ⚡, O3 Mini ⚡, O1 ⚡, GPT-4o, GPT-4o Mini

✦ = extended thinking supported &nbsp; ⚡ = always-on reasoning (o-series)

Models without a valid API key are automatically excluded from the available list.
