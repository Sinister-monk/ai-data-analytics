# 🚀 DataFlow: Agentic AI Analytics with Neon Serverless Postgres

[![Python 3.13](https://img.shields.io/badge/python-3.13+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.138.0-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![LangChain / LangGraph](https://img.shields.io/badge/LangGraph-Agentic%20Workflow-FF9900.svg)](https://langchain-ai.github.io/langgraph/)
[![Neon Database](https://img.shields.io/badge/Neon-Serverless%20PostgreSQL-00E599.svg?logo=postgresql&logoColor=white)](https://neon.tech/)
[![OpenAI GPT-4o-mini](https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991.svg?logo=openai&logoColor=white)](https://openai.com/)

**DataFlow** is an autonomous, multi-agent AI data intelligence platform. It translates plain-English business questions into safe, optimized SQL queries against a live [Neon](https://neon.tech/) Serverless PostgreSQL database, computes analytical summaries, visualizes trends via dynamic charts, and broadcasts live insights to a real-time reactive dashboard via Server-Sent Events (SSE).

---

## 📸 Visual Showcase

### 1. Natural Language Data Explorer & Schema Inspector
Enter business questions in plain English. The interactive sidebar immediately displays available Neon tables and schema columns for quick discovery.

![DataFlow Explorer](docs/images/main_explorer.png)

---

### 2. Intelligent Query Execution, Smart Tables & Follow-ups
The SQL agent constructs optimized PostgreSQL queries, validates safety, renders tabular results with column sorting and CSV download, and suggests intelligent follow-up exploration paths.

![DataFlow Query Workspace](docs/images/query_results_full.png)

---

### 3. Real-Time Insights & Chart Dashboard
Visualizations and executive summaries stream in real-time. Chart queries automatically route to Chart.js widgets, while AI-generated business insights highlight underlying patterns and opportunities.

![Live Insights Dashboard](docs/images/dashboard_analytics.png)

---

## 🧠 System Architecture & Workflow

DataFlow utilizes an asynchronous multi-agent architecture powered by **LangGraph**, **FastAPI**, and **OpenAI**. Rather than using a single monolithic prompt, tasks are delegated to specialized autonomous agents:

```mermaid
flowchart TD
    User([👤 User / Client]) -->|Natural Language Question| API[⚡ FastAPI Service /ask]
    
    API --> Router{🔀 Router Agent}
    
    %% Chart Flow
    Router -->|Intent: Visualization| ChartAgent[📊 Chart Agent]
    ChartAgent -->|Generates Chart.js Config| BroadcastSSE[📡 SSE Stream /stream]
    BroadcastSSE --> LiveDash[🖥️ Live Insights Dashboard]
    
    %% SQL Flow
    Router -->|Intent: Data Query| SQLGraph[🤖 SQL Agent StateGraph]
    
    subgraph SQLGraphPipeline [SQL Agent Pipeline]
        SchemaNode[1. Get Schema\nCached Neon metadata] --> SQLGenNode[2. Generate SQL\nGPT-4o-mini prompt]
        SQLGenNode --> ValidateNode{3. Read-Only Guard\nRegex & AST Check}
        ValidateNode -->|Passed| ExecNode[4. Execute Query\nNeon PostgreSQL]
        ValidateNode -->|Mutating / Unsafe| ErrorNode[🛡️ Block & Reject]
        ExecNode --> AnswerNode[5. Synthesize Answer\nNatural language response]
    end
    
    SQLGraph --> SQLGraphPipeline
    AnswerNode --> APIResp[📦 Return Answer + Table Data]
    AnswerNode --> InsightAgent[💡 Dashboard Insight Agent]
    InsightAgent --> BroadcastSSE
    
    APIResp --> FollowupAgent[🔮 Follow-up Suggester]
    APIResp --> User
    FollowupAgent -->|Suggested Questions| User
```

---

## 🤖 The Multi-Agent Ensemble

| Agent | Module | Primary Responsibility |
|---|---|---|
| **🔀 Router Agent** | [`pro/router_agent.py`](pro/router_agent.py) | Analyzes user queries using structured LLM classification to route requests to either data extraction (`SQL Agent`) or visualization generation (`Chart Agent`). |
| **🔍 SQL Agent** | [`pro/sql_agent.py`](pro/sql_agent.py) | A **LangGraph `StateGraph`** with 4 core pipeline nodes: schema retrieval, SQL generation, read-only SQL sanitization, and synthesized answer generation. |
| **📊 Chart Agent** | [`pro/chart_agent.py`](pro/chart_agent.py) | Translates metric requests into formatted **Chart.js / Plotly** configuration payloads (Bar, Line, Pie, Doughnut). |
| **💡 Dashboard Agent** | [`pro/dashboard_agent.py`](pro/dashboard_agent.py) | Derives executive business takeaways from query results and broadcasts them to the live dashboard. |
| **🔮 Follow-up Suggester**| [`api.py`](api.py) & [`pro/llm_chat.py`](pro/llm_chat.py) | Generates 3 contextual deep-dive questions based on the query and returned dataset. |
| **🛡️ Error Agent** | [`pro/error_agent.py`](pro/error_agent.py) | Catches raw database exceptions or syntax errors and converts them into friendly, constructive guidance for the user. |

---

## 🛡️ Enterprise Security & Safety Guardrails

- **Strict Read-Only Enforcement:** Every generated SQL statement passes through `ensure_read_only_sql()`. Any query attempting `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, or multi-statement injections (`;`) is rejected prior to database dispatch.
- **Markdown & Fence Sanitization:** Queries enclosed in ` ```sql ... ``` ` code blocks from LLM responses are automatically stripped and normalized using regex cleaning to prevent execution failure.
- **Serverless Schema Caching:** Neon PostgreSQL table and column metadata is cached in-memory after initial inspection, eliminating redundant metadata calls and reducing connection latency.
- **Safe Parameter Handling:** Sensitive credentials (`DATABASE_URL`, `OPENAI_API_KEY`) are kept strictly isolated in `.env` and ignored by source control.

---

## 📁 Repository Structure

```text
├── api.py                      # FastAPI server with REST endpoints and SSE streaming
├── app.py                      # Hugging Face Spaces entrypoint
├── Dockerfile                  # Container definition for containerized deployments
├── render.yaml                 # Infrastructure-as-code blueprint for Render.com
├── pyproject.toml / uv.lock    # Python packaging and dependency lockfile
├── requirements.txt            # Pip dependency definitions
├── docs/
│   └── images/                 # Architecture screenshots and UI previews
├── public/                     # Frontend client assets
│   ├── index.html              # Main workspace and query interface
│   ├── app.js                  # Query execution, dynamic tables & CSV export
│   ├── dashboard.html          # Real-time analytics dashboard
│   ├── dashboard.js            # SSE connection and Chart.js rendering
│   └── style.css               # Clean modern design system
└── pro/                        # Agentic intelligence package
    ├── router_agent.py         # Query intent routing
    ├── sql_agent.py            # LangGraph SQL workflow & safety check
    ├── chart_agent.py          # Visual chart generator
    ├── dashboard_agent.py      # Business insight synthesis
    ├── error_agent.py          # Error handling and recovery
    └── llm_chat.py             # LLM client abstractions
```

---

## ⚡ Quickstart & Setup Guide

### 1. Prerequisites
- **Python 3.11+** (or **Python 3.13**)
- A [Neon](https://neon.tech/) Serverless PostgreSQL account and database
- An [OpenAI](https://platform.openai.com/) API Key (`gpt-4o-mini`)

### 2. Clone the Repository
```bash
git clone https://github.com/Sinister-monk/ai-data-analytics.git
cd ai-data-analytics
```

### 3. Setup Virtual Environment & Dependencies
Using `uv`:
```bash
uv venv
uv sync
```
Or using standard `pip`:
```bash
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
```

### 4. Configure Environment Variables
Create a `.env` file in the project root:
```env
# Neon PostgreSQL Connection URL
DATABASE_URL=postgresql://user:password@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require

# OpenAI API Key
OPENAI_API_KEY=sk-proj-your-openai-api-key
```

### 5. Run the Application
Start the development server with live reload:
```bash
uvicorn api:app --reload --port 8000
```

Open your browser:
- **Main Query Workspace:** [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Live Insights Dashboard:** [http://127.0.0.1:8000/dashboard](http://127.0.0.1:8000/dashboard)
- **Interactive Swagger Docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/ask` | Primary agent endpoint. Accepts `{"question": "..."}`, executes agent pipeline, and returns answer, SQL, and data. |
| `POST` | `/followup` | Accepts `question` and `answer`, generates 3 insightful follow-up prompts. |
| `GET` | `/schema` | Returns the introspected schema (tables and columns) of the Neon database. |
| `GET` | `/stream` | Server-Sent Events (SSE) stream for pushing real-time charts and insights to the dashboard. |
| `GET` | `/history` | Returns historical queries, generated charts, and business insights. |

---

## 🐳 Docker & Cloud Deployment

### Run with Docker
```bash
docker build -t dataflow-analytics .
docker run -p 8000:8000 --env-file .env dataflow-analytics
```

### Deploy to Render
The included `render.yaml` automatically configures the web service:
1. Connect your repository to [Render.com](https://render.com).
2. Configure `DATABASE_URL` and `OPENAI_API_KEY` in environment secrets.
3. Deploy!

---

## 📄 License
This project is licensed under the MIT License.
