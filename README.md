# 🚀 DataFlow: Agentic AI Analytics with Neon Serverless Postgres

[![Python 3.13](https://img.shields.io/badge/python-3.13+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.138.0-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![LangChain / LangGraph](https://img.shields.io/badge/LangGraph-Agentic%20Workflow-FF9900.svg)](https://langchain-ai.github.io/langgraph/)
[![Neon Database](https://img.shields.io/badge/Neon-Serverless%20PostgreSQL-00E599.svg?logo=postgresql&logoColor=white)](https://neon.tech/)
[![OpenAI GPT-4o-mini](https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991.svg?logo=openai&logoColor=white)](https://openai.com/)

**DataFlow** is an autonomous, multi-agent AI data intelligence platform. It translates plain-English business questions into safe, optimized SQL queries against a live [Neon](https://neon.tech/) Serverless PostgreSQL database, computes analytical summaries, visualizes trends via dynamic charts, and broadcasts live insights to a real-time reactive dashboard via Server-Sent Events (SSE).

---

## 📸 Visual Showcase & How It Works

### 1. Natural Language Data Explorer & Live Schema Inspector
Users enter high-level business questions in plain English or click one of the quick starter chips. The right-hand sidebar dynamically inspects the live Neon PostgreSQL database, displaying tables, columns, primary keys, and foreign keys.

![DataFlow Explorer](docs/images/main_explorer.png)

* **Natural Language Input:** Accepts complex analytical questions and automatically determines query intent.
* **Instant Schema Discovery:** Auto-introspects table structures (e.g. `sales_data`, `customer_lookup`, `product_lookup`) and caches them in memory for zero-latency lookups.
* **Starter Exploration Chips:** Pre-configured prompts allow instant discovery of top orders, customer trends, and database record summaries with a single click.

---

### 2. Intelligent Query Execution, Smart Tables & AI Follow-ups
When a query executes, the SQL Agent synthesizes an optimized PostgreSQL statement, runs it against the database, presents a tabular breakdown with sorting/filtering, and offers intelligent follow-ups to keep the analytical workflow moving.

![DataFlow Query Workspace](docs/images/query_results_full.png)

* **Executive Summary:** Synthesizes complex multi-row results into clean, plain-English bullet points.
* **Interactive Smart Table:** Client-side row filtering, column-based sorting, and one-click **CSV download** for immediate export into Excel or Google Sheets.
* **Verified PostgreSQL Query:** Displays the exact query generated and executed, with one-click **Copy SQL** functionality for transparency and auditing.
* **Proactive Follow-up Prompts:** Automatically suggests 3 contextual next questions based on the retrieved dataset to guide deeper business intelligence.

---

### 3. Real-Time Streaming Insights & Chart Dashboard
Visualizations and business takeaways stream in real time over Server-Sent Events (SSE) without requiring any page reload.

![Live Insights Dashboard](docs/images/dashboard_analytics.png)

* **Reactive Chart.js Widgets:** Metric queries automatically generate dynamic Bar, Line, Pie, and Doughnut charts.
* **AI Business Takeaways:** An autonomous insight agent analyzes query results and surfaces actionable executive observations.
* **Full-Screen Focus Mode:** Expand any chart or insight card into a high-resolution modal for executive presentations.

---

## 🔍 How It Works: Step-by-Step Query Lifecycle

Here is what happens under the hood when a user asks a question:

### Example: *"Show summary of all tables and record counts in the database"*

1. **Routing:** The Router Agent receives the question and classifies intent (`data_query` vs. `chart`).
2. **Schema Introspection:** The LangGraph SQL pipeline fetches cached table metadata from Neon PostgreSQL.
3. **Query Generation:** The LLM produces a multi-table `UNION ALL` query with PostgreSQL-compliant syntax:
   ```sql
   SELECT 'sales_data' AS "Table Name", COUNT(*) AS "Record Count" FROM sales_data
   UNION ALL
   SELECT 'customer_lookup', COUNT(*) FROM customer_lookup
   UNION ALL
   SELECT 'product_lookup', COUNT(*) FROM product_lookup;
   ```
4. **Safety Sanitization:** `ensure_read_only_sql()` verifies via regex and AST parsing that only read-only `SELECT` statements are executed, rejecting any mutations or multi-statement attacks.
5. **Database Dispatch:** Query runs over Neon's connection pooler with automatic date formatting (`options="-c datestyle=ISO,DMY"`).
6. **Synthesis:** The LLM converts the result table into an executive summary:
   > *"The summary of all tables and their record counts in the database is as follows: sales_data: 56,046 records, customer_lookup: 18,154 records, product_lookup: 293 records..."*
7. **Follow-ups & SSE Broadcast:** The Follow-up Agent generates 3 deep-dive exploration questions, while the Dashboard Agent broadcasts real-time takeaways to the Live Dashboard via SSE.

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
