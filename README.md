# Self-Invest

An autonomous AI-powered trading agent that runs locally as a web application. It connects to real brokerage accounts, analyzes markets using artificial intelligence, and executes trades independently with the goal of generating profit.

The agent operates under a single rule: **stay alive**. If the portfolio balance reaches zero, the agent dies. Every decision it makes is driven by survival — analyzing market conditions, managing risk, and executing trades to grow capital.

---

## How It Works

### The Trading Loop

Every 5 minutes during market hours, the agent runs an autonomous pipeline:

1. **Gather** — Pulls current portfolio state, market prices, technical indicators (RSI, MACD, Bollinger Bands, SMAs), financial news, and sentiment data for all watched symbols and held positions.

2. **Analyze** — Sends the compiled data to the selected AI provider. The AI returns a structured market analysis identifying bullish/bearish opportunities, risk factors, and overall market sentiment.

3. **Decide** — If opportunities exist, the AI receives the analysis plus current portfolio state and recommends specific trades with quantities, order types, stop losses, take profits, and confidence scores.

4. **Validate** — Every proposed trade passes through a deterministic risk manager (no AI involvement) that enforces hard limits: maximum position size, portfolio drawdown limits, daily loss caps, cash reserve requirements, and position concentration rules. Trades that violate any rule are rejected regardless of AI confidence.

5. **Execute** — Approved trades are submitted to the broker with stop-loss orders. All trades are logged with the AI reasoning that generated them.

6. **Monitor** — Open positions are tracked in real-time via WebSocket. The death check runs after every cycle — if total portfolio value drops to zero, the agent liquidates all positions, cancels all orders, and terminates.

### AI Provider Flexibility

The AI brain is interchangeable. Switch between providers at any time without restarting:

**Cloud providers:**
- **Claude** (Anthropic) — Default recommendation. Best structured output reliability and reasoning quality for financial analysis. Sonnet for frequent calls, Opus for major decisions.
- **OpenAI GPT-4o** — Strong alternative with native JSON mode.
- **Grok** (xAI) — Real-time X/Twitter data integration for sentiment edge.

**Local providers (free, private):**
- **Ollama** — Run Mistral Nemo, Llama 3.1, Mixtral, or any supported model locally. Zero cost, full privacy.
- **LM Studio** — OpenAI-compatible local inference server. Use any GGUF model.

All providers implement the same interface. The agent doesn't care where the intelligence comes from — it sends market data and receives structured trade decisions.

### Risk Management

The risk manager is a hard gate between the AI and the broker. It is entirely deterministic and cannot be overridden by AI reasoning:

| Rule | Default | Purpose |
|------|---------|---------|
| Max position size | 10% of portfolio | No single bet can sink the ship |
| Max portfolio drawdown | 20% from peak | Pause trading if losing too much |
| Max daily loss | 5% | Stop trading for the day after significant loss |
| Max open positions | 10 | Maintain diversification |
| Minimum stop loss | 3% below entry | Every buy trade must have an exit plan |
| Min cash reserve | 20% | Always keep dry powder |
| Max sector concentration | 30% | Don't overload one sector |

All parameters are configurable through the Settings page.

### Paper vs Live Trading

The application supports two modes:

- **Paper Trading** (simulator) — Connects to Alpaca's paper trading environment with $100k virtual cash. Identical API behavior, no real money at risk. Recommended for testing strategies and validating the agent's behavior.

- **Live Trading** — Connects to your funded Alpaca account. Real money, real market orders. The app requires explicit confirmation before switching to live mode.

All trades are tagged in the database with their mode, so paper and live histories never mix.

---

## Architecture

**Frontend** — React 19 with TypeScript, Vite, Tailwind CSS v4, Zustand for state management, TradingView Lightweight Charts for candlestick/financial charts, Recharts for portfolio visualizations. Real-time updates via WebSocket.

**Backend** — Node.js with Express and TypeScript. Handles broker communication, AI orchestration, the trading pipeline, risk validation, and WebSocket broadcasting. Uses node-cron for scheduling the analysis loop.

**Database** — PostgreSQL for persistent storage (trades, analyses, portfolio snapshots, settings). Redis for market data caching and real-time event pub/sub.

**Broker** — Alpaca Markets API. Chosen for: zero commissions, purpose-built algorithmic trading API, free paper trading, support for US stocks/ETFs and crypto. The adapter pattern allows adding other brokers (Binance, Interactive Brokers) in the future.

---

## The Frontend

Six pages provide full visibility into the agent's operation:

- **Dashboard** — Portfolio value, equity curve, asset allocation donut, daily P&L, agent status indicator, and recent trades at a glance.

- **Positions** — Live table of all open positions with real-time prices, unrealized P&L, entry prices, and stop-loss levels.

- **Trade History** — Searchable, filterable log of every trade with status, cost, and linked AI reasoning explaining why the trade was made.

- **Agent** — The brain view. Shows agent state (idle/analyzing/trading/paused/dead), start/stop/pause controls, manual "Analyze Now" trigger, and a scrollable reasoning log showing every AI analysis with confidence scores, token usage, and cost.

- **Market** — Interactive candlestick charts with TradingView, watchlist with live prices, symbol selector.

- **Settings** — Broker connection (API keys, paper/live toggle), AI provider selector (type + model + API key), and risk parameter configuration with sliders.

When the agent dies (balance reaches zero), a full-screen death overlay displays final statistics.

---

## Getting Started

### Prerequisites

- Node.js 20+
- Docker (for PostgreSQL and Redis)
- An Alpaca Markets account (free signup at alpaca.markets)
- At least one AI provider: an API key (Anthropic, OpenAI, or xAI) OR Ollama installed locally

### Setup

```bash
# Clone and enter the project
cd self-invest

# Run the automated setup (installs deps, starts Docker, creates DB)
npm run setup

# Or manually:
docker compose up -d
npm install
npm run build:shared
npm run db:generate -w packages/backend
npm run db:push -w packages/backend
```

### Configuration

Edit `.env` in the project root:

```env
# Required: at least one AI provider
ANTHROPIC_API_KEY=sk-ant-...
# OR
OPENAI_API_KEY=sk-...
# OR use Ollama locally (no key needed)

# Broker keys (can also be set via the Settings UI)
ALPACA_API_KEY=PK...
ALPACA_API_SECRET=...
ALPACA_PAPER=true
```

### Run

```bash
npm run dev
```

Opens the backend on port 3001 and frontend on port 5173. Navigate to **http://localhost:5173**.

### First Run Workflow

1. Open Settings → Connect your Alpaca paper trading API keys
2. Select an AI provider (or start Ollama: `ollama serve` then `ollama pull mistral-nemo`)
3. Go to the Agent page → Click "Start"
4. Watch the agent analyze the market and begin trading

---

## Key Design Decisions

**Why Alpaca?** — Only broker with a modern REST/WebSocket API explicitly designed for algorithmic trading, free paper trading with identical endpoints, zero commissions, and both equities and crypto support.

**Why the AI is switchable** — Markets change, models improve, costs fluctuate. Being locked to one provider is a liability. Local models provide free, private operation; cloud models provide superior reasoning. The agent should use whatever works best right now.

**Why risk management is deterministic** — An AI optimizing for returns will rationalize excessive risk. The risk manager operates as an independent safety layer with hard rules that cannot be argued with, bypassed, or gradually relaxed by the AI.

**Why all financial math uses decimal strings** — JavaScript floating-point arithmetic introduces rounding errors that compound over many trades. All prices, quantities, and monetary values are stored and transmitted as strings, with Decimal.js used for any calculations.

**Why WebSocket for real-time updates** — Polling the broker every second wastes resources and adds latency. WebSocket provides instant propagation of price changes, trade executions, and agent state transitions to the frontend.

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, Zustand, TanStack Query, Recharts, TradingView Lightweight Charts |
| Backend | Node.js, Express, TypeScript, WebSocket (ws), node-cron |
| AI | Anthropic SDK, OpenAI SDK (also used for Grok and LM Studio), Ollama HTTP API |
| Database | PostgreSQL 16 (Prisma ORM), Redis 7 |
| Broker | Alpaca Markets REST + WebSocket API |
| Infrastructure | Docker Compose, npm workspaces monorepo |

---

## Disclaimer

This software is for educational and experimental purposes. Automated trading carries significant financial risk. The AI agent can and will lose money. Never trade with money you cannot afford to lose. Past performance of any trading strategy does not guarantee future results. The authors are not responsible for any financial losses incurred through the use of this software.
