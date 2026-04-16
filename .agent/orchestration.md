# Multi-Agent Orchestration Protocol

This document defines how multiple specialized agent personas (Architect, Frontend, Backend, Security) coordinate to solve complex tasks.

## 🤝 Coordination Principles

1.  **Strict Role Boundaries**: Agents should only perform actions within their defined domain unless a multi-domain task is explicitly assigned.
2.  **Shared State**: The `.agent/worklog.md` is the "Global Memory." Every agent must read it at the start of a session and write to it before finishing.
3.  **Atomic Handoffs**: When a task moves from design to implementation (e.g., Architect -> Backend Lead), a formal handoff must be recorded.

## 🔄 Orchestration Workflow

### 1. The Strategy Scan (Architect)
- Initiates the task.
- Researches the codebase.
- Creates/Updates `implementation_plan.md`.
- Identifies which specialized personas are needed for the execution phase.

### 2. Parallel Execution (Specialists)
- **Frontend Wizard**: Focuses on UI/UX, components, and styling.
- **Backend/AI Lead**: Focuses on data flow, API routes, and logic.
- Each specialist tracks their own sub-tasks in `task.md`.

### 3. Verification & Audit (Security Auditor / Architect)
- Runs builds (`npm run build`).
- Checks for security vulnerabilities and RBAC compliance.
- Final approval before the session is declared "Complete."

## 📣 Communication Channels
- **Implementation Plan**: High-level design agreement with the Human User.
- **Task List**: Granular tracking for agents.
- **Work Log**: Contextual persistence for future agents.
