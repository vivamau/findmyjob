# FindMyJob - AI Powered Job Search & CV Manager

An automated web application designed to help you organize multiple variations of your CV and track individual application statuses, integrating background routines capable of matching relevant skill profiles against scraped search payloads flawlessly.

---

## 📂 Project Structure

Following strict deployment standards, the project is segregated into standalone backend and frontend frameworks:

```text
findmyjob/
├── backend/            # Express, Node.js + SQLite Service Layer
│   ├── db/             # SQLite Initializers
│   ├── migrations/     # SQL Migration buckets (e.g., 001_initial.sql)
│   ├── routes/         # Express API routing nodes
│   ├── services/       # Business logic layer (CV Parsing/Saving)
│   └── tests/          # TDD Jest test suite isolated streams
└── frontend/           # Vite + React (TypeScript) Visuals
    ├── src/
    │   ├── commoncomponents/ # UI Building blocks (TDD checked)
    │   └── pages/      # Views (Dashboard, Tracking table, CV manager)
    └── docs/           # Output static folder allocations
```

---

## 🛠️ Backend Setup & Usage

The backend initializes a local `SQLite` database located cleanly inside `backend/data/` creating automated schemas.

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Run Database Migrations (Automatic)
Your backend strictly uses Squashed migrators. Starting or testing the application runs `.sql` buffers inside `backend/migrations/` sequentially up to user indexing stubs natively without additional commands required.

### 3. Run Application
```bash
# Start server defaults bind to PORT 3000
npm run dev
```

### 4. Running TDD Tests
```bash
# Executes Jest streams isolated in memory buffers
npm test
```

---

## 🎨 Frontend Setup & Usage

The frontend uses `React` over `Vite` compiling highly formatted modular elements with rich visual dashboards designed correctly.

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Start Dev Environment
```bash
npm run dev
```
From there, launch your browser into [`http://localhost:5173`](http://localhost:5173) to see live module nodes!

### 3. Running UI Unit Tests
```bash
npm test
```

### 4. Compiling Build Assets
```bash
npm run build
```

---

## 🔄 Data Ingestion & Processing Flow

The pipeline involves **Fetch Providers**, **AI-Assisted Structuring**, **Vector Storage Sync**, and **Reasoning Models Throttling**.

```mermaid
graph TD
    A[User / Cron Trigger] -->|POST /api/jobs/scrape| B[Job Ingestion Pipeline]
    
    subgraph "1. Data Scraping Phase"
        B --> C{Read Active JobSources}
        C -->|Workday Sites| D[Direct JSON API Adapter]
        C -->|Standard Sites| E[Static axios.get]
        E -->|Anti-bot / Heavy JS| F[Puppeteer browser.content fallback]
    end

    subgraph "2. AI Parsing & Verification"
        D --> G[Job Object Pack]
        E --> G
        F --> G
        G --> H[Clean & Substring HTML Content]
        H --> I[LLM: parseJobListings]
        I -->|Return| J[Structured Job Listing Array]
        
        J --> K[Follow Deeper Detail Links]
        K --> L[LLM: summarizeJobDescription]
        L --> M[Hydrate Detailed Description]
    end

    subgraph "3. Storage & Semantic Sync"
        M --> N[Save to SQLite: JobListings Table]
        N --> O[vectorService.indexJob]
        O --> P[Embed with LanceDB Vector Space]
    end

    subgraph "4. CV Matching & Scoring"
        Q[User Selection / Matches Route] --> R[Extract Resume CV Text]
        R --> S[LLM: matchCvWithJob]
        S --> T[Generate match_score & feedback_tags]
        T --> U[Save Score and Return Results]
    end

    P -.->|Job Vector Search| S
```

### 🛠️ Components Breakdown
* **Scraper (`jobRoutes.js`)**: Static (`axios`) or Dynamic (`Puppeteer`) fetch nodes.
* **AI Extract (`aiService.js`)**: Structuring raw text via context.
* **Vector Index (`vectors`)**: Instant sync with **LanceDB**.
* **Matcher**: Relevancy score generations flawlessly.

---

## 🏆 Current Key Systems Built
- ✅ **Secure CV Text Parsing streams** (Utilizing memory buffer disk storage pipes using `pdf-parse`)
- ✅ **Database schema tables** (Indexing Applications, Resumes cleanly mapped correctly)
- ✅ **Express Endpoint routers** mapped perfectly solving continuous file attachments accurately.
# findmyjob
