# Agentic Retail Automation Platform Frontend

# Agentic Retail Automation Platform

Agentic Retail Automation Platform is a web application for creating, managing, and deploying AI agents, built with React and vite.

## 🚀 Features

*   **Agent Management:** Create, configure, edit, duplicate, and delete AI agents.
*   **Tool Integration:** Define and manage custom tools (using OpenAPI schemas) or utilize built-in integrations.
*   **Agent Configuration:** Specify LLM provider, model, API keys, role, backstory, instructions, and select tools for each agent.
*   **Marketplace:** Discover and import pre-built agents (requires `/api/marketplace/agents` endpoint).
*   **User Management:** Placeholder for managing users and roles.
*   **Settings:** Placeholder for managing account and subscription details.
*   **Dynamic Frontend:** Single Page Application (SPA) experience using vanilla JavaScript for page loading and UI updates.
*   **Notifications:** In-app notification system.

## 🏗️ Tech Stack - Frontend

- **Frontend Framework**: React 19.1.1 with TypeScript
- **Build Tool**: Vite 7.1.2 with SWC
- **Styling**: SCSS/Sass with modern CSS features
- **Routing**: React Router DOM 7.8.1
- **Linting**: ESLint with TypeScript rules
- **Package Manager**: npm

## 📋 Prerequisites

Before running this application, ensure you have:

- **Node.js** >= 18.0.0
- **npm** >= 8.0.0
- **Git** for version control

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd agentic-studio-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   
   Create environment files based on your deployment target:
   
   ```bash
   # For local development
   cp .env.example .env.local
   
   # For production
   cp .env.example .env.production
   ```

## 🚦 Development

### Start Development Server

```bash
npm run dev
```


### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint for code quality checks |

## 🏭 Production Build

### Build the Application

```bash
npm run build
```

This creates an optimized build in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

### Build Commands

```bash
# Development build
npm run build

# Production build with specific environment
NODE_ENV=production npm run build
```


## 🔧 Configuration

### Vite Configuration

The project uses Vite with the following key configurations:
- **Port**: 8000 (development and preview)
- **Plugin**: React with SWC for fast refresh
- **Host**: Allows external connections

### TypeScript Configuration

- **Strict mode**: Enabled for type safety
- **Modern target**: ES2020+ for optimal performance
- **Path mapping**: Configured for clean imports

## 🧪 Code Quality

### Linting

```bash
# Run ESLint
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix
```

### TypeScript Checking

```bash
# Type checking
npx tsc --noEmit
```
