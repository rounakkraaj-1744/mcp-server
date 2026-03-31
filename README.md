# READI Compliance Auditor & MCP Server

## Features

### READI Agent
- **Role-based access control**: Supports different user roles (PIC, PM, etc.) with tailored data access
- **Multi-intent classification**: Handles database queries, procedure lookups, and web searches
- **Compliance auditing**: Checks for violations like altitude limits, active alerts during flights, and maintenance issues
- **Real-time responses**: Uses Groq AI for fast, contextual answers

### MCP Server
- Model Context Protocol server for AI agent integration
- Provides tools for database schema exploration and queries

### Schema Query API
- Standalone API for database schema searches using embeddings
- Tools for table/column discovery and natural language queries

## Routes

### READI Agent Routes
- `GET /agent` - Chat interface for the READI Compliance Auditor
- `POST /api/agent/ask` - API endpoint for compliance questions
  - Body: `{"question": "string"}`
  - Headers: `x-user-email`, `x-role`, `x-user-id`, `x-owner-id` (for authentication)
  - Response: `{"answer": "string", "debug": {...}}`

### Other Routes
- `GET /` - Main landing page
- `GET /login` - User authentication page
- `POST /api/ask` - Schema query API with tool calling
  - Body: `{"question": "string"}`
  - Response: `{"answer": "string"}`

## Folder Structure

```
src/
├── app/                          # Next.js App Router
│   ├── agent/                    # READI Agent Pages & API
│   │   ├── page.tsx              # Chat interface for READI agent
│   │   └── api/
│   │       └── ask/
│   │           └── route.ts       
│   ├── api/                      
│   │   └── agent/                # READI agent API handler
│   │       └── ask/
│   │           └── route.ts
│   │   └── ask/                  # Other API routes
│   │       └── route.ts          # Schema query API handler
│   ├── login/
│   │   └── page.tsx              # Login page
│   ├── page.tsx                  # Main page
│   ├── globals.css               
│   └── layout.tsx                # Root layout
├── components/                   # Shared React components
│   ├── AuthGuard.tsx             # Authentication guard
│   └── ...                       # Other UI components
├── lib/                          # Utility libraries
│   ├── auth.ts                   # Authentication logic
│   ├── constants.ts              # App constants
│   ├── gemini.ts                 # Google Gemini integration
│   ├── groq.ts                   # Groq AI integration
│   ├── query-executor.ts         # Database query execution
│   ├── roles.ts                  # Role definitions
│   ├── schema-catalog.ts         # Database schema catalog
│   ├── schema-details.ts         # Schema details
│   ├── schema-knowledge.ts       # Schema knowledge base
│   ├── serp.ts                   # Web search integration
│   ├── supabase.ts               # Supabase client
│   ├── types.ts                  # TypeScript types
│   ├── embeddings/               # Embedding generation
│   │   └── generate.ts
│   ├── schema/                   # Schema definitions
│   │   └── definitions.ts
│   └── vectorstore/              # Vector store utilities
│       └── supabase.ts
├── mcp/                          # Model Context Protocol
│   └── server.ts                 # MCP server implementation
├── scripts/                      # Utility scripts
│   ├── bridge.sql                # Database bridge setup
│   ├── import-data.ts            # Data import script
│   ├── import-public.sql         # Public data import
│   ├── ingest-frd.ts             # FRD document ingestion
│   ├── ingest-manual.ts          # Manual data ingestion
│   ├── ingest.ts                 # Main ingestion script
│   ├── seed-compliance.ts        # Compliance data seeding
│   ├── setup-db.sql              # Database setup
│   ├── translate-frd.ts          # FRD translation
│   └── translate-manual.ts       # Manual translation
└── types/                        # Type definitions
    └── index.ts                  # Global types
```

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase account and project
- Groq API key
- SerpAPI key (for web search)

### Setup

1. Set up environment variables in `.env.local`:
```bash
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
GROQ_API_KEY=your_groq_api_key
SERP_API_KEY=your_serp_api_key
```

## Usage

### READI Agent
1. Navigate to `/agent` or `/login` for authentication
2. Ask compliance-related questions like:
   - "Is mission ID 123 compliant?"
   - "Check for violations in the last week"
   - "What are the procedures for high-altitude flights?"

### MCP Server
Run the MCP server:
```bash
npm run mcp
```

### Schema Query API
Use the `/api/ask` endpoint for database schema exploration.

## Integration Guide

### API Integration
Call the READI agent API from your application:

```javascript
const response = await fetch('/api/agent/ask', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-user-email': 'user@example.com',
    'x-role': 'PIC'
  },
  body: JSON.stringify({ question: 'Your question here' })
});
```

### Embedding in Websites
Deploy the app and embed the `/agent` page via iframe, or integrate the API into your custom UI.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run ingest` - Ingest compliance documents
- `npm run mcp` - Run MCP server
- `npm run import-data` - Import database data

## Technologies Used

- **Frontend**: Next.js 16, React 19, Tailwind CSS
- **AI**: Groq SDK, Google Generative AI
- **Database**: Supabase, PostgreSQL
- **Search**: Vector embeddings, SerpAPI
- **MCP**: Model Context Protocol SDK