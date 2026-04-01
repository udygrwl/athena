# Athena

**Multi-LLM adversarial debate platform with synthesis judgment.**

Athena pits three AI models against each other in structured, multi-round debates on any topic. A judge model synthesizes the strongest arguments into a final verdict — producing answers that are more rigorous than any single model could generate alone.

**Live**: [athena-production-c819.up.railway.app](https://athena-production-c819.up.railway.app)

---

## Why Multi-LLM Debate?

Single-model answers have blind spots. Every LLM has biases baked into its training data, reasoning shortcuts it defaults to, and failure modes it can't self-correct. Athena addresses this by making models adversarially challenge each other:

- **Round 0** — Three models independently state their positions on a topic
- **Round 1** — Each model critiques the other two, identifying logical gaps, unsupported claims, and weak reasoning
- **Round 2** — Models revise their positions based on the critiques they received
- **Verdict** — A judge model reads the full anonymized transcript and synthesizes the strongest surviving arguments

The result is a final answer that has been stress-tested from multiple angles — not a consensus, but a synthesis of what survived scrutiny.

### When is this useful?

- **Complex policy questions** where reasonable people disagree and you want the strongest version of each side before forming your own view
- **Technical architecture decisions** where different approaches have real tradeoffs that a single model might gloss over
- **Research and analysis** where you need to pressure-test a hypothesis against strong counterarguments
- **Reducing model bias** by forcing models to defend positions against adversarial critique rather than producing unchallenged answers
- **Model evaluation** — see how different models reason, handle criticism, and adapt under pressure

### Example use cases

1. *"Is microservices architecture better than monoliths for early-stage startups?"* — Three models argue tradeoffs, the judge synthesizes context-dependent guidance
2. *"Should the US adopt universal basic income?"* — Forces models to steelman opposing views and identify which arguments hold up under critique
3. *"Is Rust worth the learning curve over Go for backend services?"* — Models critique each other's assumptions about developer productivity, safety, and ecosystem maturity
4. *"Is Israel a colonizing power given recent events?"* — Models engage with historical, legal, and geopolitical frameworks, the judge identifies what's analytically defensible vs. rhetorically loaded

---

## How It Works

### 1. Pre-Debate: Talk to the Judge

Select a judge model and chat about your topic. The judge evaluates whether the topic is genuinely debate-worthy (has multiple defensible positions) or would be better served by a direct answer. This filters out simple factual questions and saves compute.

### 2. Model Selection

Pick one model per provider (Anthropic, Google, OpenAI) from the same capability tier:

| Tier | Anthropic | Google | OpenAI |
|------|-----------|--------|--------|
| **Flagship** | Claude Opus 4.6 | Gemini 2.5 Pro | GPT-5.4 |
| **Balanced** | Claude Sonnet 4.6 | Gemini 2.5 Flash | GPT-5.4 Mini |
| **Lite** | Claude Haiku 4.5 | Gemini 2.5 Flash Lite | GPT-5.4 Nano |

Tier-matching ensures fair comparison — flagships vs flagships, not a $0.01/request model against a $0.10/request one.

### 3. Anonymized Debate

Models are randomly assigned labels (Advocate A, B, C) so the judge can't infer which model is which. This prevents the judge from relying on stereotypes about model capabilities and forces evaluation purely on argument quality.

### 4. Post-Debate: Discuss the Verdict

After the verdict, continue chatting with the judge — ask follow-up questions, challenge conclusions, or drill into unresolved disagreements.

---

## Features

- **3-round adversarial debate** with opening positions, cross-critique, and revisions
- **Judge synthesis** — final answer, what survived scrutiny, and key unresolved disagreements
- **Anonymized judging** — random advocate labels prevent model-identity bias
- **Judge gatekeeping** — pre-debate conversation filters non-debate-worthy topics
- **Extended thinking** — optional deep reasoning mode for supported models (marked `✦`)
- **Error resilience** — if one model fails mid-debate, the others continue
- **Real-time streaming** — SSE-based progress updates as each round completes
- **Dark/light theme** with browser preference detection

---

## Supported Models

**Anthropic**: Claude Opus 4.6, Sonnet 4.6, 3.7 Sonnet, Haiku 4.5, 3.5 Sonnet, 3.5 Haiku

**Google**: Gemini 3 Pro Preview, 2.5 Pro, 2.5 Flash, 2.5 Flash Lite

**OpenAI**: GPT-5.4 / 5.3 / 5.2 / 5.1 / 5.0 (+ Mini/Nano variants), GPT-4.1 series, GPT-4o series, o4-mini, o3, o1-pro, o1

`✦` = extended thinking &nbsp; `⚡` = always-on reasoning (o-series)

Models without a valid API key are automatically excluded.

---

## Running Locally

### Prerequisites
- Python 3.9+
- Node.js 18+
- API keys for at least one provider

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # then add your API keys
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm install
VITE_API_URL=http://localhost:8000 npm run dev
```

Open `http://localhost:5173`

---

## Deployment

Deployed on [Railway](https://railway.com) as a single service. The backend serves the frontend as static files.

**Environment variables:**
- `ANTHROPIC_API_KEY`
- `GOOGLE_API_KEY` or `GEMINI_API_KEY`
- `OPENAI_API_KEY`
- `PORT` (set automatically by Railway)

---

## Tech Stack

- **Backend**: Python, FastAPI, async/await, SSE streaming
- **Frontend**: React 18, Vite, Tailwind CSS
- **AI SDKs**: Anthropic, Google GenAI, OpenAI (all async)
- **Deployment**: Railway (Nixpacks)

---

## Architecture

```
User --> Judge Chat (pre-debate) --> Topic approved
                                         |
                                    Model Selection
                                    (tier-matched)
                                         |
                              +----------+----------+
                              v          v          v
                          Model A    Model B    Model C
                          (anon)     (anon)     (anon)
                              |          |          |
                    Round 0:  +-- Positions --------+
                    Round 1:  +-- Cross-critique ---+
                    Round 2:  +-- Revisions --------+
                              +----------+----------+
                                         |
                                    Judge Verdict
                                  (synthesis, not
                                   compromise)
                                         |
                              Post-debate discussion
```
