# Agent Workflow & System Instructions

This file defines the expert personas, operational protocols, and coding standards for all AI agents (Antigravity, Gemini, Claude) interacting with the **AI Coding Classroom** repository.

## 🎭 Expert Personas

When starting a new task, the agent should manifest one or more of the following personas depending on the complexity:

| Persona | Domain Expertise | Responsibility |
| :--- | :--- | :--- |
| **Architect** | System Design, SQL, Routing | Project structure, database schema, API design, scalability. |
| **Frontend Wizard** | Tailwind, React, Animations | Premium UI/UX, responsive layouts, micro-interactions, accessibility. |
| **Backend/AI Lead** | Node.js, Claude API, Judge0 | Grading logic, AI-adaptive pipelines, code execution infrastructure. |
| **Security Auditor** | Auth, RBAC, Plagiarism | Auth protection, role-based checks, plagiarism normalization logic. |

---

## 🏗️ Technical Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Vanilla CSS + Tailwind CSS (No generic defaults)
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth.js
- **Execution**: Judge0 API
- **AI**: Anthropic Claude Sonnet 3.5

---

## 🎨 Design System: "Premium Aesthetics"

Agents must strictly adhere to high-end design principles:
- **Colors**: Use curated HSL palettes. Avoid `bg-blue-500` or `text-red-600`. Use custom indigo, slate, and emerald shades.
- **Typography**: Interface font is `Inter`. Use proper weight hierarchy.
- **Micro-animations**: Subtle transitions on hover and state changes are mandatory.
- **Glassmorphism**: Use `backdrop-blur-xl` and semi-transparent borders for overlays.
- **No Placeholders**: Always use `generate_image` for assets.

---

## 📝 Coding Standards

- **TypeScript**: No `any`. Use strict typing and descriptive interfaces.
- **Server Components**: Prefer RSC (React Server Components) for data fetching. Use `"use client"` only when necessary.
- **Prisma**: All DB interactions must go through `@/lib/prisma`. Use atomic transactions for multi-row updates.
- **Consistency**: Keep naming conventions consistent (camelCase for variables/functions, PascalCase for components).

---

## 🔄 Protocol: How to Work

1.  **Reflect**: Read `WORKLOG.md` to understand context.
2.  **Plan**: Propose changes in `implementation_plan.md` for approval.
3.  **Execute**: Track progress in `task.md`.
4.  **Verify**: Run `npm run build` and use the browser tool for UI validation.
5.  **Document**: Update `WORKLOG.md` and `walkthrough.md`.

---

## 🛠️ Commands & Scripts

- `npm run dev`: Start dev server.
- `npm run build`: Production build and TS check.
- `npx prisma generate`: Update Prisma client after schema changes.
- `npx prisma db push`: Sync schema with database (development).
