# GitHub Explorer 🚀

## 1. Project Title & Brief Description

GitHub Explorer is a full-stack profile exploration dashboard built for the GitHub API Proxy assessment. It allows users to search for any GitHub developer, view profile statistics, explore repositories, and visualize programming language distribution through an interactive chart.

To protect GitHub API rate limits and eliminate CORS concerns, the application uses a custom Next.js backend proxy with an in-memory caching layer.

---

## 2. Live Demo

**Production Deployment:** https://git-dash.dev

---

## 3. Tech Stack

### Next.js 14 (App Router)
Used as a unified full-stack framework, allowing React frontend components and backend API routes to coexist within a single codebase.

### Tailwind CSS
Utility-first CSS framework used to build a responsive and modern UI.

### Recharts
Provides lightweight, responsive data visualizations for language statistics.

### TypeScript
Ensures strong typing across frontend state management and backend API responses.

---

## 4. How to Run Locally

### Prerequisites

- Node.js (v18+ recommended)

### Clone Repository

```bash
git clone https://github.com/Vasudev-1/GIt_repo_exp.git
cd github-explorer
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

Create a `.env.local` file:

```env
GITHUB_TOKEN=ghp_your_personal_access_token_here
```

### Start Development Server

```bash
npm run dev
```

---

## 5. API Documentation

### GET `/api/github`

Fetches a GitHub user's profile, repositories, and aggregated language statistics.

---

## 6. Project Structure

```text
github-explorer/
├── app/
│   ├── api/github/route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── GithubSearch.tsx
├── types/
│   └── github.ts
├── tailwind.config.ts
└── package.json
```

---

## 7. Next Steps & Trade-offs

1. **Distributed Caching** – Replace the in-memory cache with Redis for centralized caching.

2. **Advanced Data Fetching** – Integrate TanStack Query for retries, caching, and background refetching.

3. **Full Repository Pagination** – Follow GitHub pagination links to support users with very large repositories.

---

## 8. AI Attribution & Honesty Declaration

AI tools were used for boilerplate generation, styling assistance, and debugging support. All architectural decisions, implementation logic, and final code understanding remain my own.
